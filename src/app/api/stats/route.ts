import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const token = url.searchParams.get("token") ?? "";
  try {
    const db = supabaseAdmin();
    const { data: store } = await db.from("stores").select("id, edit_token").eq("slug", slug).maybeSingle();
    if (!store || store.edit_token !== token) return NextResponse.json({ ok: false }, { status: 404 });

    const { data: events } = await db
      .from("store_events")
      .select("kind, product_key")
      .eq("store_id", store.id)
      .limit(5000);

    let views = 0;
    const interest: Record<string, number> = {};
    for (const e of events ?? []) {
      if (e.kind === "view") views++;
      else if (e.kind === "interest" && e.product_key) interest[e.product_key] = (interest[e.product_key] ?? 0) + 1;
    }
    return NextResponse.json({ ok: true, views, interest }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}