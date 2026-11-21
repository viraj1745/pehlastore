export const OG_PALETTES = {
  sunrise: { bg: "linear-gradient(135deg, #ffedd5 0%, #fffbeb 60%, #ffffff 100%)", ink: "#1c1917", sub: "#57534e", accent: "#ea580c", card: "#ffffff" },
  mint: { bg: "linear-gradient(135deg, #d1fae5 0%, #f0fdfa 60%, #ffffff 100%)", ink: "#0f172a", sub: "#475569", accent: "#059669", card: "#ffffff" },
  midnight: { bg: "linear-gradient(135deg, #020617 0%, #0f172a 100%)", ink: "#f8fafc", sub: "#cbd5e1", accent: "#6366f1", card: "#1e293b" },
} as const;

/** Loads just the glyphs we need from Google Fonts (English and Hindi). */
export async function loadFont(family: string, text: string): Promise<ArrayBuffer | null> {
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

export async function fontsFor(text: string) {
  const glyphs = Array.from(new Set(Array.from(text))).join("");
  const [latin, devanagari] = await Promise.all([loadFont("Noto Sans", glyphs), loadFont("Noto Sans Devanagari", glyphs)]);
  return [
    ...(latin ? [{ name: "Noto Sans", data: latin, weight: 700 as const, style: "normal" as const }] : []),
    ...(devanagari ? [{ name: "Noto Sans Devanagari", data: devanagari, weight: 700 as const, style: "normal" as const }] : []),
  ];
}