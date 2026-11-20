import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { PublishRequestSchema, type PublishRequest } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase";
import { slugBase } from "@/lib/stores";
import { cleanHandle } from "@/lib/format";
import { logEvent } from "@/lib/events";

const suffix = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 4);
const makeToken = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", 32);
const reply = (body: object, status = 200) => NextResponse.json(body, { status });

const FIELD_NAMES: Record<string, string> = {
  display_name: "Name",
  tagline: "Tagline",
  bio: "About you",
  instagram_bio: "Instagram bio",
  title: "Title",
  description: "Description",
  format_label: "Format",
  cta_label: "Button text",
  price_reason: "Price note",
};

export async function POST(request: Request) {
  let body: PublishRequest;
  try {
    const parsed = PublishRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue?.path[issue.path.length - 1] ?? "");
      const where = issue?.path.includes("products") ? ` in product ${Number(issue.path[2]) + 1}` : "";
      return reply({ status: "error", message: `Please check "${FIELD_NAMES[field] ?? field}"${where}: it's empty or too long.` }, 400);
    }
    body = parsed.data;
  } catch {
    return reply({ status: "error", message: "We couldn't read that request. Please refresh and try again." }, 400);
  }

  const db = supabaseAdmin();
  const handle = cleanHandle(body.handle);
  const input = { handle };

  // Update an existing live page (the edit token is only in the creator's browser)
  if (body.slug && body.editToken) {
    const { data: existing } = await db.from("stores").select("id, edit_token").eq("slug", body.slug).maybeSingle();
    if (existing && existing.edit_token === body.editToken) {
      const { error } = await db
        .from("stores")
        .update({ content: body.store, theme: body.theme, language: body.language, input, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return reply({ status: "error", message: "Couldn't update your live page. Please try again." }, 500);
      void logEvent(body.sessionId, "updated", { slug: body.slug });
      return reply({ status: "ok", slug: body.slug, editToken: body.editToken });
    }
  }

  // Publish a new page: try the clean name first, then add a short suffix
  const base = slugBase(handle, body.store.display_name);
  const editToken = makeToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${suffix()}`;
    const { error } = await db
      .from("stores")
      .insert({ slug, edit_token: editToken, content: body.store, theme: body.theme, language: body.language, input });
    if (!error) {
      void logEvent(body.sessionId, "published", { slug });
      return reply({ status: "ok", slug, editToken });
    }
    if (error.code !== "23505") {
      return reply({ status: "error", message: "Couldn't publish right now. Please try again." }, 500);
    }
  }
  return reply({ status: "error", message: "Couldn't find a free link name. Please try again." }, 500);
}