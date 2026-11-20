import { supabaseAdmin } from "./supabase";

/** Fire-and-forget funnel event. Never throws, never blocks the creator. */
export async function logEvent(sessionId: string | undefined, event: string, meta: Record<string, unknown> = {}) {
  if (!sessionId) return;
  try {
    await supabaseAdmin().from("app_events").insert({ session_id: sessionId.slice(0, 64), event, meta });
  } catch {
    // analytics must never break the product
  }
}