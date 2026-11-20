"use client";

import type { Product, StoreContent } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import { netAfterFee } from "@/lib/pricing";
import { initials, inr } from "@/lib/format";

export const THEMES = {
  sunrise: {
    name: "Sunrise",
    swatch: "bg-orange-500",
    page: "bg-linear-to-b from-orange-50 via-amber-50 to-white text-stone-900",
    card: "bg-white",
    sub: "text-stone-600",
    chip: "bg-orange-100 text-orange-800",
    accent: "bg-orange-600 text-white",
    ring: "ring-orange-300",
    avatar: "bg-orange-600 text-white",
    faq: "bg-orange-50/60",
  },
  mint: {
    name: "Mint",
    swatch: "bg-emerald-500",
    page: "bg-linear-to-b from-emerald-50 via-teal-50 to-white text-slate-900",
    card: "bg-white",
    sub: "text-slate-600",
    chip: "bg-emerald-100 text-emerald-800",
    accent: "bg-emerald-600 text-white",
    ring: "ring-emerald-300",
    avatar: "bg-emerald-600 text-white",
    faq: "bg-emerald-50/70",
  },
  midnight: {
    name: "Midnight",
    swatch: "bg-indigo-600",
    page: "bg-linear-to-b from-slate-950 via-slate-900 to-slate-900 text-slate-50",
    card: "bg-slate-800/80",
    sub: "text-slate-300",
    chip: "bg-indigo-500/20 text-indigo-200",
    accent: "bg-indigo-500 text-white",
    ring: "ring-indigo-400",
    avatar: "bg-indigo-500 text-white",
    faq: "bg-slate-900/60",
  },
} as const;
export type ThemeKey = keyof typeof THEMES;

type Props = {
  store: StoreContent;
  handle?: string;
  theme?: ThemeKey;
  mode: "edit" | "public";
  onEditProfile?: () => void;
  onEditProduct?: (index: number) => void;
  onProductAction?: (product: Product) => void;
};

function Editable({ enabled, onClick, children }: { enabled: boolean; onClick?: () => void; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="group relative cursor-pointer rounded-2xl outline-2 outline-offset-4 outline-dashed outline-transparent transition hover:outline-orange-300 focus:outline-orange-400"
    >
      <span className="absolute -right-1 -top-2 z-10 rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
        ✏️ Edit
      </span>
      {children}
    </div>
  );
}

export default function StoreView({ store, handle, theme = "sunrise", mode, onEditProfile, onEditProduct, onProductAction }: Props) {
  const t = THEMES[theme] ?? THEMES.sunrise;
  const edit = mode === "edit";

  return (
    <div className={`min-h-full ${t.page}`}>
      <div className="mx-auto max-w-md px-4 pb-16 pt-8">
        <Editable enabled={edit} onClick={onEditProfile}>
          <header className="flex flex-col items-center px-2 text-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-md ${t.avatar}`}>
              {initials(store.display_name)}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold">{store.display_name}</h1>
            {handle && (
              <a
                href={`https://instagram.com/${handle}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => edit && e.preventDefault()}
                className={`mt-0.5 text-sm ${t.sub}`}
              >
                @{handle}
              </a>
            )}
            <p className="mt-3 text-base font-semibold">{store.tagline}</p>
            <p className={`mt-2 text-sm leading-relaxed ${t.sub}`}>{store.bio}</p>
          </header>
        </Editable>

        <section className="mt-8 space-y-5">
          {store.products.map((p, i) => (
            <Editable key={p.id} enabled={edit} onClick={() => onEditProduct?.(i)}>
              <article className={`rounded-2xl p-5 shadow-sm ${t.card} ${p.type === "lead_magnet" ? `ring-2 ${t.ring}` : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.chip}`}>
                    {PRODUCT_TYPE_LABELS[p.type]}
                  </span>
                  <span className={`text-right text-xs ${t.sub}`}>{p.format_label}</span>
                </div>
                <h2 className="mt-3 text-lg font-bold leading-snug">{p.title}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${t.sub}`}>{p.description}</p>

                {edit && (
                  <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-xs leading-relaxed text-stone-700">
                    <b>Why {inr(p.price_inr)}?</b> {p.price_reason}
                    {p.price_inr > 0 && <> · You keep about {inr(netAfterFee(p.price_inr))} per sale after SuperProfile&apos;s 5% fee.</>}
                  </p>
                )}

                {p.faq.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {p.faq.map((f, j) => (
                      <details key={j} className={`rounded-xl px-3 py-2 text-sm ${t.faq}`} onClick={(e) => e.stopPropagation()}>
                        <summary className="cursor-pointer font-medium">{f.q}</summary>
                        <p className={`mt-1 ${t.sub}`}>{f.a}</p>
                      </details>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-2xl font-extrabold">{inr(p.price_inr)}</span>
                  {edit ? (
                    <span className={`rounded-full px-5 py-2.5 text-sm font-semibold ${t.accent}`}>{p.cta_label}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onProductAction?.(p)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 ${t.accent}`}
                    >
                      {p.cta_label}
                    </button>
                  )}
                </div>
              </article>
            </Editable>
          ))}
        </section>

        <footer className={`mt-10 text-center text-xs ${t.sub}`}>Built with PehlaStore</footer>
      </div>
    </div>
  );
}