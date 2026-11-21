import { ImageResponse } from "next/og";
import { getStoreBySlug } from "@/lib/stores";
import { initials, inr } from "@/lib/format";
import { fontsFor, OG_PALETTES } from "@/lib/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Creator store preview";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  const p = OG_PALETTES[(store?.theme ?? "sunrise") as keyof typeof OG_PALETTES] ?? OG_PALETTES.sunrise;

  if (!store) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: p.bg, fontSize: 60 }}>
        PehlaStore
      </div>,
      size,
    );
  }

  const c = store.content;
  const products = c.products.slice(0, 3);
  const short = (t: string) => (Array.from(t).length > 48 ? Array.from(t).slice(0, 47).join("") + "…" : t);
  const fonts = await fontsFor([c.display_name, c.tagline, initials(c.display_name), "Built with PehlaStore", "Free", ...products.map((x) => `${short(x.title)} ${inr(x.price_inr)}`)].join(" "));

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: p.bg, color: p.ink, padding: "56px 64px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", width: 120, height: 120, borderRadius: 60, background: p.accent, color: "#ffffff", fontSize: 56, alignItems: "center", justifyContent: "center" }}>
            {initials(c.display_name)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 32, maxWidth: 900 }}>
            <div style={{ display: "flex", fontSize: 58 }}>{c.display_name}</div>
            <div style={{ display: "flex", fontSize: 30, color: p.sub, marginTop: 6 }}>{short(c.tagline)}</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 48 }}>
          {products.map((x, i) => (
            <div key={x.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, background: p.card, borderRadius: 28, padding: "26px 28px", marginLeft: i === 0 ? 0 : 20, height: 220 }}>
              <div style={{ display: "flex", fontSize: 28 }}>{short(x.title)}</div>
              <div style={{ display: "flex", fontSize: 40, color: p.accent }}>{inr(x.price_inr)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: p.sub }}>Built with PehlaStore</div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}