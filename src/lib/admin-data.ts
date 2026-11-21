import { supabaseAdmin } from "@/lib/supabase";

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export type DatasetName = "events" | "stores" | "store_events";
export type Datasets = Record<DatasetName, Row[]>;

const IST = 5.5 * 3_600_000;
export const istDay = (iso: string) => new Date(new Date(iso).getTime() + IST).toISOString().slice(0, 10);
const istHour = (iso: string) => new Date(new Date(iso).getTime() + IST).getUTCHours();

/** What the AI (and you) can query. Keep notes short and concrete. */
export const FIELDS: Record<DatasetName, Record<string, string>> = {
  events: {
    event: "funnel or action name",
    session_id: "anonymous browser session",
    day: "IST date YYYY-MM-DD",
    hour: "IST hour 0-23",
    created_at: "ISO timestamp",
    model: "AI model that answered (only on 'generated')",
    ms: "generation time in milliseconds (only on 'generated')",
    reason: "why it failed or asked a question (only on 'generate_failed' and 'needs_more')",
    language: "store language en, hinglish or hi (only on 'generate_started')",
    followers: "follower tier (only on 'generate_started')",
    audio: "true if a voice note was used (only on 'generate_started')",
    images: "number of screenshots (only on 'generate_started')",
    kind: "AI helper type (only on 'ai_assist')",
    section: "rewritten section (only on 'ai_rewrite')",
  },
  stores: {
    name: "creator display name",
    slug: "public link /s/slug",
    language: "store language",
    theme: "colour theme",
    products: "number of products",
    sections: "number of page sections",
    views: "store visits",
    taps: "product button taps",
    link_clicks: "link and social clicks",
    tap_rate: "taps per visit in percent",
    day: "IST date the store was published",
    created_at: "ISO timestamp",
  },
  store_events: {
    kind: "view, interest (product tap) or cta (link click)",
    product_key: "product id or 'link'",
    store: "store slug",
    day: "IST date",
    hour: "IST hour 0-23",
    created_at: "ISO timestamp",
  },
};

const META_KEYS = ["model", "ms", "reason", "language", "followers", "audio", "images", "kind", "section"];
const NO_SAMPLE = new Set(["session_id", "created_at", "slug", "name", "ms", "views", "taps", "link_clicks", "tap_rate", "hour"]);

const cell = (v: unknown): Cell => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : null);

export async function loadAdminData(): Promise<Datasets> {
  const db = supabaseAdmin();
  const [ev, st, se] = await Promise.all([
    db.from("app_events").select("session_id, event, meta, created_at").order("created_at", { ascending: false }).limit(20000),
    db.from("stores").select("id, slug, content, theme, language, created_at").order("created_at", { ascending: false }).limit(1000),
    db.from("store_events").select("*").limit(50000),
  ]);

  const events: Row[] = ((ev.data ?? []) as Array<{ session_id: string; event: string; meta: Record<string, unknown> | null; created_at: string }>)
    .filter((e) => !e.session_id.startsWith("test-session"))
    .map((e) => {
      const row: Row = { event: e.event, session_id: e.session_id, created_at: e.created_at, day: istDay(e.created_at), hour: istHour(e.created_at) };
      for (const k of META_KEYS) row[k] = cell(e.meta?.[k]);
      return row;
    });

  const rawStores = (st.data ?? []) as Array<{
    id: string;
    slug: string;
    content: { display_name?: string; products?: unknown[]; blocks?: unknown[] } | null;
    theme: string;
    language: string;
    created_at: string;
  }>;
  const slugById = new Map(rawStores.map((s) => [s.id, s.slug]));

  const counts = new Map<string, { views: number; taps: number; links: number }>();
  const storeEvents: Row[] = ((se.data ?? []) as Array<Record<string, unknown>>).map((e) => {
    const id = String(e.store_id ?? "");
    const kind = String(e.kind ?? "");
    const c = counts.get(id) ?? { views: 0, taps: 0, links: 0 };
    if (kind === "view") c.views++;
    else if (kind === "interest") c.taps++;
    else c.links++;
    counts.set(id, c);
    const created = typeof e.created_at === "string" ? e.created_at : null;
    return {
      kind,
      product_key: cell(e.product_key),
      store: slugById.get(id) ?? null,
      created_at: created,
      day: created ? istDay(created) : null,
      hour: created ? istHour(created) : null,
    };
  });

  const stores: Row[] = rawStores.map((s) => {
    const c = counts.get(s.id) ?? { views: 0, taps: 0, links: 0 };
    return {
      name: s.content?.display_name ?? s.slug,
      slug: s.slug,
      language: s.language,
      theme: s.theme,
      products: Array.isArray(s.content?.products) ? s.content.products.length : 0,
      sections: Array.isArray(s.content?.blocks) ? s.content.blocks.length : 1,
      views: c.views,
      taps: c.taps,
      link_clicks: c.links,
      tap_rate: c.views ? Math.round((c.taps / c.views) * 1000) / 10 : 0,
      day: istDay(s.created_at),
      created_at: s.created_at,
    };
  });

  return { events, stores, store_events: storeEvents };
}

/** Field list with real example values, so the AI uses event names that actually exist. */
export function describeData(d: Datasets): string {
  return (Object.keys(FIELDS) as DatasetName[])
    .map((name) => {
      const rows = d[name];
      const lines = Object.entries(FIELDS[name]).map(([field, note]) => {
        const values = new Map<string, number>();
        for (const r of rows) {
          const v = r[field];
          if (v === null || v === undefined || v === "") continue;
          values.set(String(v), (values.get(String(v)) ?? 0) + 1);
        }
        const sample =
          !NO_SAMPLE.has(field) && values.size > 0 && values.size <= 40
            ? ` Values: ${[...values.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k]) => k).join(", ")}`
            : "";
        return `  - ${field}: ${note}.${sample}`;
      });
      return `${name} (${rows.length} rows)\n${lines.join("\n")}`;
    })
    .join("\n\n");
}