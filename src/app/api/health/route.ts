import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

export async function GET() {
  const result: Record<string, string> = {};

  // Database: a normal (non-head) read so the real error message comes back
  try {
    const { error } = await supabaseAdmin().from("stores").select("id").limit(1);
    result.database = error ? `error: ${error.code ?? ""} ${error.message} ${error.hint ?? ""}`.trim() : "ok";
  } catch (e) {
    result.database = `error: ${(e as Error).message}`;
  }

  // Gemini: try the main model, then the backup
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    result.gemini = "error: GEMINI_API_KEY missing";
  } else {
    const attempts: string[] = [];
    for (const model of MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with just: OK" }] }] }),
          },
        );
        const data = await res.json().catch(() => ({}));
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (res.ok && text) {
          result.gemini = `ok (${model})`;
          break;
        }
        attempts.push(`${model}: HTTP ${res.status} ${data?.error?.message ?? ""}`.trim());
      } catch (e) {
        attempts.push(`${model}: ${(e as Error).message}`);
      }
    }
    if (!result.gemini) result.gemini = `error: ${attempts.join(" | ")}`;
  }

  return NextResponse.json(result);
}