import { NextResponse } from "next/server";
import {
  AssistRequestSchema,
  BumpSchema,
  LaunchPlanSchema,
  OutlineSchema,
  PLAN_CHANNELS,
  type AssistRequest,
} from "@/lib/types";
import { generateJson, GeminiError } from "@/lib/gemini";
import { BUMP_SCHEMA, bumpMax, buildAssistText, LAUNCH_PLAN_SCHEMA, OUTLINE_SCHEMA, SYSTEM_PROMPT } from "@/lib/prompts";
import { str } from "@/lib/postprocess";
import { findRiskyClaims } from "@/lib/claims";
import { logEvent } from "@/lib/events";

export const maxDuration = 60;

const reply = (body: object, status = 200) => NextResponse.json(body, { status });

function cleanOutline(raw: Record<string, unknown>) {
  const sections = Array.isArray(raw.sections)
    ? (raw.sections as Record<string, unknown>[])
        .map((s) => ({
          heading: str(s.heading),
          points: Array.isArray(s.points) ? (s.points as unknown[]).map((p) => str(p)).filter(Boolean).slice(0, 6) : [],
        }))
        .filter((s) => s.heading && s.points.length)
        .slice(0, 8)
    : [];
  return { title: str(raw.title), promise: str(raw.promise), time_to_make: str(raw.time_to_make), format_tip: str(raw.format_tip), sections };
}

function cleanBump(raw: Record<string, unknown>, mainPrice: number) {
  const max = bumpMax(mainPrice);
  const value = Math.min(max, Math.max(49, Number(raw.price_inr) || 99));
  const price = Math.min(max, Math.max(49, Math.round(value / 10) * 10 - 1));
  return { title: str(raw.title), price_inr: price, pitch: str(raw.pitch) };
}

function cleanPlan(raw: Record<string, unknown>) {
  const channels = PLAN_CHANNELS as readonly string[];
  const days = Array.isArray(raw.days)
    ? (raw.days as Record<string, unknown>[]).slice(0, 7).map((d, i) => ({
        day: i + 1,
        channel: (channels.includes(str(d.channel)) ? str(d.channel) : "Post") as (typeof PLAN_CHANNELS)[number],
        title: str(d.title),
        script: str(d.script),
      }))
    : [];
  return { days };
}

export async function POST(request: Request) {
  let input: AssistRequest;
  try {
    input = AssistRequestSchema.parse(await request.json());
  } catch {
    return reply({ status: "error", message: "Your store has an empty field. Fill it in, then try again." }, 400);
  }

  const product = input.productIndex !== undefined ? input.store.products[input.productIndex] : undefined;
  if (input.kind !== "launch_plan" && !product) {
    return reply({ status: "error", message: "That product couldn't be found. Please refresh." }, 400);
  }
  if (input.kind === "bump" && product && product.price_inr === 0) {
    return reply({ status: "error", message: "Bump offers are for paid products." }, 400);
  }

  const schema = input.kind === "outline" ? OUTLINE_SCHEMA : input.kind === "bump" ? BUMP_SCHEMA : LAUNCH_PLAN_SCHEMA;
  const deadline = Date.now() + 50_000;
  let feedback = "";

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data } = await generateJson({
        system: SYSTEM_PROMPT,
        parts: [{ text: buildAssistText(input, feedback) }],
        schema,
        deadline,
        temperature: 0.8,
      });
      const raw = (data ?? {}) as Record<string, unknown>;

      const parsed =
        input.kind === "outline"
          ? OutlineSchema.safeParse(cleanOutline(raw))
          : input.kind === "bump"
            ? BumpSchema.safeParse(cleanBump(raw, product!.price_inr))
            : LaunchPlanSchema.safeParse(cleanPlan(raw));

      if (!parsed.success) {
        feedback = `Field "${parsed.error.issues[0].path.join(".")}" was invalid. Fill every field properly.`;
        continue;
      }
      const risky = findRiskyClaims(JSON.stringify(parsed.data));
      if (risky.length && attempt === 0) {
        feedback = `Rewrite without risky claims (${risky.join(", ")}).`;
        continue;
      }
      void logEvent(input.sessionId, "assist", { kind: input.kind });
      return reply({ status: "ok", result: parsed.data });
    }
    return reply({ status: "error", message: "We couldn't create that this time. Please try again." }, 502);
  } catch (error) {
    const kind = error instanceof GeminiError ? error.kind : "failed";
    console.error("[assist] failed:", kind, error instanceof Error ? error.message : error);
    const message =
      kind === "timeout" || kind === "busy" ? "The AI is busy right now. Please try again in a moment." : "We couldn't create that this time. Please try again.";
    return reply({ status: "error", message }, 503);
  }
}