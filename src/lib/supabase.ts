import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-only database client. Never import this into browser code. */
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}