"use client";

import { FONT_FAMILY, THEMES, type ThemeKey } from "./StoreView";
import { BUTTON_STYLES, CARD_STYLES, FONT_STYLES, type Design } from "@/lib/types";

const FONT_LABEL: Record<Design["font"], string> = { modern: "Modern", elegant: "Elegant", rounded: "Rounded" };
const BUTTON_LABEL: Record<Design["button"], string> = { pill: "Pill", rounded: "Soft", square: "Sharp" };
const BUTTON_SHAPE: Record<Design["button"], string> = { pill: "rounded-full", rounded: "rounded-lg", square: "rounded-sm" };
const CARD_LABEL: Record<Design["card"], string> = { shadow: "Shadow", outline: "Outline", flat: "Flat" };
const CARD_PREVIEW: Record<Design["card"], string> = { shadow: "bg-white shadow-md", outline: "bg-white border-2 border-stone-300", flat: "bg-stone-200" };

export default function DesignPanel({
  theme,
  design,
  onTheme,
  onDesign,
}: {
  theme: ThemeKey;
  design: Design;
  onTheme: (theme: ThemeKey) => void;
  onDesign: (design: Design) => void;
}) {
  const option = (active: boolean) =>
    `press rounded-xl border px-2 py-2 text-center text-sm transition ${active ? "border-stone-900 ring-2 ring-stone-900/10 font-semibold" : "border-stone-200 bg-white"}`;
  const heading = "mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500";

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm font-bold">🎨 Design</p>

      <p className={heading}>Colour theme</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
          <button key={key} type="button" onClick={() => onTheme(key)} className={`${option(theme === key)} flex items-center gap-2`}>
            <span className={`h-5 w-5 shrink-0 rounded-full ${THEMES[key].swatch}`} />
            {THEMES[key].name}
          </button>
        ))}
      </div>

      <p className={heading}>Font</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {FONT_STYLES.map((f) => (
          <button key={f} type="button" onClick={() => onDesign({ ...design, font: f })} className={option(design.font === f)} style={{ fontFamily: FONT_FAMILY[f] }}>
            <span className="block text-lg leading-none">Aa</span>
            <span className="text-xs">{FONT_LABEL[f]}</span>
          </button>
        ))}
      </div>

      <p className={heading}>Buttons</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {BUTTON_STYLES.map((s) => (
          <button key={s} type="button" onClick={() => onDesign({ ...design, button: s })} className={option(design.button === s)}>
            <span className={`mx-auto block h-3.5 w-12 bg-orange-500 ${BUTTON_SHAPE[s]}`} />
            <span className="mt-1 block text-xs">{BUTTON_LABEL[s]}</span>
          </button>
        ))}
      </div>

      <p className={heading}>Cards</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {CARD_STYLES.map((c) => (
          <button key={c} type="button" onClick={() => onDesign({ ...design, card: c })} className={option(design.card === c)}>
            <span className={`mx-auto block h-6 w-12 rounded-md ${CARD_PREVIEW[c]}`} />
            <span className="mt-1 block text-xs">{CARD_LABEL[c]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}