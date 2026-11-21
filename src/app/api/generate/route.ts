import { NextResponse } from "next/server";
import { AssessmentSchema, GenerateRequestSchema, type GenerateRequest } from "@/lib/types";
import { generateJson, GeminiError } from "@/lib/gemini";
import { buildParts, GENERATION_SCHEMA, SYSTEM_PROMPT } from "@/lib/prompts";
import { finaliseStore, type FinaliseResult } from "@/lib/postprocess";
import { logEvent } from "@/lib/events";

export const maxDuration = 60;

const MAX_IMAGE_CHARS = 2_000_000;
const MAX_AUDIO_CHARS = 3_500_000;

const DEFAULT_QUESTION =
  "Tell us a bit more: what do you post about, and who follows you? For example, \"I share easy home workouts for working women.\"";

const reply = (body: object, status = 200) => NextResponse.json(body, { status });
const stripDataUrl = (data: string) => data.replace(/^data:[^,]*,/, "");
const cleanHandle = (h: string) =>
  h.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@+/, "").replace(/[/?].*$/, "").toLowerCase();

type Ok = Extract<FinaliseResult, { ok: true }>;

export async function POST(request: Request) {
  let input: GenerateRequest;
  try {
    input = GenerateRequestSchema.parse(await request.json());
  } catch {
    return reply({ status: "error", retryable: false, message: "We couldn't read that request. Please refresh and try again." }, 400);
  }

  // Clean inputs
  const typedHandle = cleanHandle(input.handle);
  const handle = /^[a-z0-9._]{1,30}$/.test(typedHandle) ? typedHandle : "";
  const notes: string[] = [];
  if (typedHandle && !handle) notes.push("That doesn't look like a valid Instagram handle, so we left it out.");

  input.images = input.images
    .map((img) => ({ ...img, data: stripDataUrl(img.data) }))
    .filter((img) => img.data.length <= MAX_IMAGE_CHARS);
  if (input.audio) {
    input.audio = { ...input.audio, data: stripDataUrl(input.audio.data) };
    if (input.audio.data.length > MAX_AUDIO_CHARS) {
      input.audio = null;
      notes.push("Your voice note was too long, so we used your other inputs.");
    }
  }

  const text = input.description.trim();
  const hasMedia = input.images.length > 0 || Boolean(input.audio);

  // Cheap checks before spending an AI call
  if (!text && !hasMedia) {
    return reply({
      status: "needs_more",
      reason: handle ? "handle_only" : "empty",
      question: handle
        ? `We can't read Instagram profiles directly. Add 2-3 screenshots of @${handle}, record a voice note, or tell us in one line what you post about.`
        : DEFAULT_QUESTION,
    });
  }
  if (!hasMedia && text.length < 15 && text.split(/\s+/).filter(Boolean).length < 3) {
    return reply({ status: "needs_more", reason: "too_short", question: DEFAULT_QUESTION });
  }

  void logEvent(input.sessionId, "generate_started", {
    language: input.language,
    followers: input.followers,
    images: input.images.length,
    audio: Boolean(input.audio),
  });

  const started = Date.now();
  const deadline = started + 56_000;
  let feedback = "";
  let fallback: Ok | null = null;
  let modelUsed = "";
  let detected: { handle: string; followers: string; niche: string } | undefined;

  const success = (result: Ok) => {
    const warnings = [...notes];
    if (handle && detected?.handle) {
      const seen = cleanHandle(detected.handle);
      if (seen && seen !== handle) warnings.push(`Your screenshot shows @${seen}, but you typed @${handle}.`);
    }
    for (const label of result.warnings) warnings.push(`Please review: we spotted possible ${label}.`);
    void logEvent(input.sessionId, "generated", { ms: Date.now() - started, model: modelUsed });
    return reply({
      status: "ok",
      store: result.store,
      meta: { model: modelUsed, ms: Date.now() - started, warnings, priceAdjustments: result.priceAdjustments, detected },
    });
  };

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, model } = await generateJson({
        system: SYSTEM_PROMPT,
        parts: buildParts(input, handle, feedback),
        schema: GENERATION_SCHEMA,
        deadline,
        temperature: attempt === 0 ? 0.8 : 0.6,
      });
      modelUsed = model;
      const root = (data ?? {}) as Record<string, unknown>;

      const assessment = AssessmentSchema.safeParse(root.assessment);
      if (assessment.success) {
        detected = {
          handle: assessment.data.detected_handle,
          followers: assessment.data.detected_followers,
          niche: assessment.data.detected_niche,
        };
        if (assessment.data.input_quality !== "ok") {
          void logEvent(input.sessionId, "needs_more", { reason: assessment.data.input_quality });
          return reply({
            status: "needs_more",
            reason: assessment.data.input_quality,
            question: assessment.data.follow_up_question || DEFAULT_QUESTION,
            detected,
          });
        }
      }

      const result = finaliseStore(root.store, handle);
      if (!result.ok) {
        feedback = `Your previous answer was rejected because ${result.error}. Follow every rule.`;
        continue;
      }
      if (result.warnings.length > 0 && attempt === 0) {
        fallback = result;
        feedback = `Rewrite without risky claims (${result.warnings.join(", ")}). Keep everything else the same.`;
        continue;
      }
      return success(result);
    }

    if (fallback) return success(fallback);
    void logEvent(input.sessionId, "generate_failed", { reason: "invalid_output" });
    return reply(
      { status: "error", retryable: true, message: "We couldn't build a store good enough to show you. Please try again, or add a little more detail." },
      502,
    );
  } catch (error) {
    if (fallback) return success(fallback);
    const kind = error instanceof GeminiError ? error.kind : "failed";
    console.error("[generate] failed:", kind, error instanceof Error ? error.message : error);
    void logEvent(input.sessionId, "generate_failed", { reason: kind });
    const messages: Record<string, string> = {
      timeout: "The AI took too long to respond. Your inputs are saved. Tap Try again.",
      busy: "The AI is very busy right now. Your inputs are saved. Please try again in a moment.",
      blocked: "We couldn't create a store from this input. Try describing your work in a different way.",
      config: "The generator isn't configured correctly. Please try again later.",
      bad_output: "Something went wrong while building your store. Please try again.",
      failed: "Something went wrong while building your store. Please try again.",
    };
    return reply(
      { status: "error", retryable: kind !== "blocked" && kind !== "config", message: messages[kind] ?? messages.failed },
      503,
    );
  }
}