import { NextResponse } from "next/server";
import { z } from "zod";
import { ProductSchema, RegenerateRequestSchema, type RegenerateRequest } from "@/lib/types";
import { generateJson, GeminiError } from "@/lib/gemini";
import { buildSectionText, PRODUCT_SCHEMA, PROFILE_SCHEMA, SYSTEM_PROMPT } from "@/lib/prompts";
import { clip, parseRawProduct, str } from "@/lib/postprocess";
import { normalisePrice } from "@/lib/pricing";
import { findRiskyClaims } from "@/lib/claims";
import { logEvent } from "@/lib/events";

export const maxDuration = 60;

const reply = (body: object, status = 200) => NextResponse.json(body, { status });

const ProfilePatchSchema = z.object({
  tagline: z.string().min(3).max(140),
  bio: z.string().min(20).max(700),
  instagram_bio: z.string().min(10).max(160),
});

export async function POST(request: Request) {
  let input: RegenerateRequest;
  try {
    input = RegenerateRequestSchema.parse(await request.json());
  } catch {
    return reply({ status: "error", message: "Your store has an empty field. Fill it in, then try the AI rewrite again." }, 400);
  }
  if (input.section === "product" && (input.productIndex === undefined || !input.store.products[input.productIndex])) {
    return reply({ status: "error", message: "That product couldn't be found. Please refresh." }, 400);
  }

  const deadline = Date.now() + 45_000;
  let feedback = "";

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data } = await generateJson({
        system: SYSTEM_PROMPT,
        parts: [{ text: buildSectionText(input, feedback) }],
        schema: input.section === "profile" ? PROFILE_SCHEMA : PRODUCT_SCHEMA,
        deadline,
        temperature: 0.9,
      });
      const raw = (data ?? {}) as Record<string, unknown>;

      if (input.section === "profile") {
        const parsed = ProfilePatchSchema.safeParse({
          tagline: str(raw.tagline),
          bio: str(raw.bio),
          instagram_bio: clip(str(raw.instagram_bio), 150),
        });
        if (!parsed.success) {
          feedback = "Fill tagline, bio and instagram_bio properly.";
          continue;
        }
        const risky = findRiskyClaims(JSON.stringify(parsed.data));
        if (risky.length && attempt === 0) {
          feedback = `Rewrite without risky claims (${risky.join(", ")}).`;
          continue;
        }
        void logEvent(input.sessionId, "regenerated", { section: "profile" });
        return reply({ status: "ok", profile: parsed.data });
      }

      const current = input.store.products[input.productIndex!];
      const product = parseRawProduct(raw);
      const { price } = normalisePrice(current.type, product.price_inr);
      const parsed = ProductSchema.safeParse({ ...product, id: current.id, type: current.type, price_inr: price });
      if (!parsed.success) {
        feedback = `Field "${parsed.error.issues[0].path.join(".")}" was invalid. Fill every field properly.`;
        continue;
      }
      const risky = findRiskyClaims(JSON.stringify(parsed.data));
      if (risky.length && attempt === 0) {
        feedback = `Rewrite without risky claims (${risky.join(", ")}).`;
        continue;
      }
      void logEvent(input.sessionId, "regenerated", { section: "product" });
      return reply({ status: "ok", product: parsed.data });
    }
    return reply({ status: "error", message: "We couldn't rewrite this section. Please try again." }, 502);
  } catch (error) {
    const kind = error instanceof GeminiError ? error.kind : "failed";
    const message =
      kind === "timeout" || kind === "busy"
        ? "The AI is busy right now. Please try again in a moment."
        : "We couldn't rewrite this section. Please try again.";
    return reply({ status: "error", message }, 503);
  }
}