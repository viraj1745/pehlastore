import { ImageResponse } from "next/og";
import { getStoreBySlug } from "@/lib/stores";
import { initials, inr } from "@/lib/format";

const PALETTES = {
  sunrise: { bg: "linear-gradient(180deg, #ffedd5 0%, #fffbeb 55%, #ffffff 100%)", ink: "#1c1917", sub: "#57534e", accent: "#ea580c", card: "#ffffff" },
  mint: { bg: "linear-gradient(180deg, #d1fae5 0%, #f0fdfa 55%, #ffffff 100%)", ink: "#0f172a", sub: "#475569", accent: "#059669", card: "#ffffff" },
  midnight: { bg: "linear-gradient(180deg, #020617 0%, #0f172a 100%)", ink: "#f8fafc", sub: "#cbd5e1", accent: "#6366f1", card: "#1e293b" },
} as const;

/** Loads just the glyphs we need from Google Fonts (works for English and Hindi). */
async function loadFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@700&text=${encodeURIComponent(text)}`)
    ).text();
    const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) return new Response("Store not found", { status: 404 });

  const c = store.content;
  const p = PALETTES[store.theme as keyof typeof PALETTES] ?? PALETTES.sunrise;
  const link = `${new URL(request.url).host}/s/${slug}`;
  const products = c.products.slice(0, 4);

  const allText = [c.display_name, c.tagline, initials(c.display_name), link, "WHAT I'M LAUNCHING", "Link in my bio", "Free", ...products.map((x) => `${x.title} ${inr(x.price_inr)}`)].join(" ");
  const glyphs = Array.from(new Set(Array.from(allText))).join("");
  const [latin, devanagari] = await Promise.all([loadFont("Noto Sans", glyphs), loadFont("Noto Sans Devanagari", glyphs)]);
  const fonts = [
    ...(latin ? [{ name: "Noto Sans", data: latin, weight: 700 as const, style: "normal" as const }] : []),
    ...(devanagari ? [{ name: "Noto Sans Devanagari", data: devanagari, weight: 700 as const, style: "normal" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: p.bg, color: p.ink, padding: "110px 80px 90px" }}>
        <div style={{ display: "flex", width: 220, height: 220, borderRadius: 110, background: p.accent, color: "#ffffff", fontSize: 100, alignItems: "center", justifyContent: "center" }}>
          {initials(c.display_name)}
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 76, textAlign: "center" }}>{c.display_name}</div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 42, color: p.sub, textAlign: "center", justifyContent: "center" }}>{c.tagline}</div>
        <div style={{ display: "flex", marginTop: 70, fontSize: 32, letterSpacing: 4, color: p.accent }}>WHAT I&apos;M LAUNCHING</div>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: 16 }}>
          {products.map((x) => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: p.card, borderRadius: 36, padding: "32px 44px", marginTop: 22 }}>
              <div style={{ display: "flex", fontSize: 38, maxWidth: 680 }}>{x.title}</div>
              <div style={{ display: "flex", fontSize: 44, color: p.accent }}>{inr(x.price_inr)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", background: p.accent, color: "#ffffff", fontSize: 54, padding: "32px 72px", borderRadius: 80 }}>
          Link in my bio
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: p.sub }}>{link}</div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: fonts.length ? fonts : undefined, headers: { "Cache-Control": "no-store" } },
  );
}