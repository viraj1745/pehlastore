import { supabaseAdmin } from "./supabase";
import { StoreContentSchema, type StoreContent } from "./types";

export type PublishedStore = {
  id: string;
  slug: string;
  content: StoreContent;
  theme: string;
  language: string;
  handle: string;
  createdAt: string;
};

export async function getStoreBySlug(slug: string): Promise<PublishedStore | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("stores")
      .select("id, slug, content, theme, language, input, created_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    const parsed = StoreContentSchema.safeParse(data.content);
    if (!parsed.success) return null;
    const input = (data.input ?? {}) as { handle?: string };
    return {
      id: data.id,
      slug: data.slug,
      content: parsed.data,
      theme: data.theme,
      language: data.language,
      handle: input.handle ?? "",
      createdAt: data.created_at,
    };
  } catch {
    return null;
  }
}

/** "fitwithpriya" from the handle, else from the name; non-Latin names fall back to "store". */
export function slugBase(handle: string, name: string): string {
  const source = handle || name;
  const slug = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length >= 3 ? slug : "store";
}