import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/** Public status check. Never calls the AI, so it costs nothing to open. */
export async function GET() {
  let database = "ok";
  try {
    const { error } = await supabaseAdmin().from("stores").select("id").limit(1);
    if (error) database = "error";
  } catch {
    database = "error";
  }
  return NextResponse.json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    ai_key_configured: Boolean(process.env.GEMINI_API_KEY),
  });
}