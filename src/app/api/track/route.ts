import { NextResponse } from "next/server";
import { TrackRequestSchema } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = TrackRequestSchema.parse(await request.json());
    const db = supabaseAdmin();
    const { data } = await db.from("stores").select("id").eq("slug", body.slug).maybeSingle();
    if (data?.id) {
      await db.from("store_events").insert({ store_id: data.id, kind: body.kind, product_key: body.productKey ?? null });
    }
  } catch {
    // tracking must never break the store page
  }
  return NextResponse.json({ ok: true });
}