"use client";

import type { Block, Product, StoreContent } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import { netAfterFee } from "@/lib/pricing";
import { initials, inr } from "@/lib/format";
import { blockHasContent, defaultBlocks, normalizeUrl, socialLinks, youtubeId } from "@/lib/blocks";

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
    border: "border-orange-200",
    flat: "bg-orange-100/60",
  },
  blush: {
    name: "Blush",
    swatch: "bg-pink-500",
    page: "bg-linear-to-b from-pink-50 via-rose-50 to-white text-stone-900",
    card: "bg-white",
    sub: "text-stone-600",
    chip: "bg-pink-100 text-pink-800",
    accent: "bg-pink-600 text-white",
    ring: "ring-pink-300",
    avatar: "bg-pink-600 text-white",
    faq: "bg-pink-50/70",
    border: "border-pink-200",
    flat: "bg-pink-100/60",
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
    border: "border-emerald-200",
    flat: "bg-emerald-100/60",
  },
  ocean: {
    name: "Ocean",
    swatch: "bg-sky-500",
    page: "bg-linear-to-b from-sky-50 via-blue-50 to-white text-slate-900",
    card: "bg-white",
    sub: "text-slate-600",
    chip: "bg-sky-100 text-sky-800",
    accent: "bg-blue-600 text-white",
    ring: "ring-sky-300",
    avatar: "bg-blue-600 text-white",
    faq: "bg-sky-50/70",
    border: "border-sky-200",
    flat: "bg-sky-100/60",
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
    border: "border-slate-700",
    flat: "bg-slate-800/50",
  },
  mono: {
    name: "Mono",
    swatch: "bg-neutral-900",
    page: "bg-white text-neutral-900",
    card: "bg-white",
    sub: "text-neutral-600",
    chip: "bg-neutral-100 text-neutral-800",
    accent: "bg-neutral-900 text-white",
    ring: "ring-neutral-300",
    avatar: "bg-neutral-900 text-white",
    faq: "bg-neutral-50",
    border: "border-neutral-300",
    flat: "bg-neutral-100",
  },
} as const;
export type ThemeKey = keyof typeof THEMES;

export const FONT_FAMILY = {
  modern: "inherit",
  elegant: "Georgia, 'Times New Roman', serif",
  rounded: "ui-rounded, 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif",
} as const;
const BUTTON_SHAPE = { pill: "rounded-full", rounded: "rounded-xl", square: "rounded-md" } as const;

type Props = {
  store: StoreContent;
  handle?: string;
  theme?: ThemeKey;
  mode: "edit" | "public";
  onEditProfile?: () => void;
  onEditProduct?: (index: number) => void;
  onAiProfile?: () => void;
  onAiProduct?: (index: number) => void;
  onEditBlock?: (id: string) => void;
  onAddProduct?: () => void;
  onProductAction?: (product: Product) => void;
  onLinkClick?: () => void;
};

function Editable({ enabled, onClick, onAi, children }: { enabled: boolean; onClick?: () => void; onAi?: () => void; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      className="group relative cursor-pointer rounded-2xl outline-2 outline-offset-4 outline-dashed outline-transparent transition hover:outline-orange-300 focus:outline-orange-400"
    >
      <span className="absolute -right-1 -top-3 z-10 flex gap-1">
        {onAi && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAi();
            }}
            className="press rounded-full bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white shadow"
          >
            ✨ AI
          </button>
        )}
        <span className="rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow">✏️ Edit</span>
      </span>
      {children}
    </div>
  );
}

export default function StoreView({
  store,
  handle,
  theme = "sunrise",
  mode,
  onEditProfile,
  onEditProduct,
  onAiProfile,
  onAiProduct,
  onEditBlock,
  onAddProduct,
  onProductAction,
  onLinkClick,
}: Props) {
  const t = THEMES[theme] ?? THEMES.sunrise;
  const edit = mode === "edit";
  const design = { font: store.design?.font ?? "modern", button: store.design?.button ?? "pill", card: store.design?.card ?? "shadow" };
  const btn = BUTTON_SHAPE[design.button];
  const cardClass = design.card === "shadow" ? `${t.card} shadow-sm` : design.card === "outline" ? `border ${t.border}` : t.flat;
  const blocks = (store.blocks && store.blocks.length ? store.blocks : defaultBlocks(handle ?? "")).filter(
    (b) => !b.hidden && (edit || blockHasContent(b)),
  );

  const placeholder = (text: string) =>
    edit ? <p className={`mt-2 rounded-xl border-2 border-dashed ${t.border} px-3 py-4 text-center text-sm ${t.sub}`}>＋ {text}</p> : null;

  const productCard = (p: Product) => (
    <article className={`rounded-2xl p-5 ${cardClass} ${p.type === "lead_magnet" ? `ring-2 ${t.ring}` : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.chip}`}>{PRODUCT_TYPE_LABELS[p.type]}</span>
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
          <span className={`${btn} px-5 py-2.5 text-sm font-semibold ${t.accent}`}>{p.cta_label}</span>
        ) : (
          <button type="button" onClick={() => onProductAction?.(p)} className={`press ${btn} px-5 py-2.5 text-sm font-semibold ${t.accent}`}>
            {p.cta_label}
          </button>
        )}
      </div>
    </article>
  );

  const renderBlock = (b: Block) => {
    switch (b.type) {
      case "products":
        return (
          <section className="space-y-5">
            {store.products.map((p, i) => (
              <Editable key={p.id} enabled={edit} onClick={() => onEditProduct?.(i)} onAi={onAiProduct ? () => onAiProduct(i) : undefined}>
                {productCard(p)}
              </Editable>
            ))}
            {edit && onAddProduct && (
              <button
                type="button"
                onClick={onAddProduct}
                className={`press w-full rounded-2xl border-2 border-dashed ${t.border} py-4 text-sm font-semibold ${t.sub}`}
              >
                + Add a product
              </button>
            )}
          </section>
        );
      case "about":
        return (
          <section className={`rounded-2xl p-5 ${cardClass}`}>
            <h2 className="text-lg font-bold">{b.title || "About me"}</h2>
            {b.text ? <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${t.sub}`}>{b.text}</p> : placeholder("Tell your story")}
          </section>
        );
      case "links":
        return (
          <section className="space-y-2.5">
            {b.title && <h2 className="text-center text-sm font-bold uppercase tracking-wide opacity-70">{b.title}</h2>}
            {b.links.length
              ? b.links.map((l, i) =>
                  edit ? (
                    <span key={i} className={`block w-full border ${t.border} ${t.card} ${btn} px-4 py-3 text-center text-sm font-semibold`}>
                      {l.label}
                    </span>
                  ) : (
                    <a
                      key={i}
                      href={normalizeUrl(l.url)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onLinkClick?.()}
                      className={`press block w-full border ${t.border} ${t.card} ${btn} px-4 py-3 text-center text-sm font-semibold`}
                    >
                      {l.label}
                    </a>
                  ),
                )
              : placeholder("Add links")}
          </section>
        );
      case "socials": {
        const links = socialLinks(b.socials);
        return (
          <section className="text-center">
            {b.title && <h2 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-70">{b.title}</h2>}
            {links.length ? (
              <div className="flex flex-wrap justify-center gap-2">
                {links.map((l) =>
                  edit ? (
                    <span key={l.label} className={`rounded-full border ${t.border} ${t.card} px-4 py-2 text-sm font-semibold`}>
                      {l.label}
                    </span>
                  ) : (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onLinkClick?.()}
                      className={`press rounded-full border ${t.border} ${t.card} px-4 py-2 text-sm font-semibold`}
                    >
                      {l.label}
                    </a>
                  ),
                )}
              </div>
            ) : (
              placeholder("Add your Instagram, YouTube or WhatsApp")
            )}
          </section>
        );
      }
      case "testimonials":
        return (
          <section>
            <h2 className="text-lg font-bold">{b.title || "What people say"}</h2>
            {b.quotes.length ? (
              <div className="mt-3 space-y-3">
                {b.quotes.map((q, i) => (
                  <figure key={i} className={`rounded-2xl p-4 ${cardClass}`}>
                    <blockquote className="text-sm leading-relaxed">“{q.quote}”</blockquote>
                    {q.name && <figcaption className={`mt-2 text-xs font-semibold ${t.sub}`}>— {q.name}</figcaption>}
                  </figure>
                ))}
              </div>
            ) : (
              placeholder("Add real messages from your followers")
            )}
          </section>
        );
      case "video": {
        const id = youtubeId(b.url);
        return (
          <section>
            {b.title && <h2 className="mb-3 text-lg font-bold">{b.title}</h2>}
            {id ? (
              <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                <iframe
                  className={`h-full w-full ${edit ? "pointer-events-none" : ""}`}
                  src={`https://www.youtube-nocookie.com/embed/${id}`}
                  title={b.title || "Video"}
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              placeholder("Paste a YouTube link")
            )}
          </section>
        );
      }
      case "faq":
        return (
          <section>
            <h2 className="text-lg font-bold">{b.title || "Questions"}</h2>
            {b.faqs.length ? (
              <div className="mt-3 space-y-2">
                {b.faqs.map((f, i) => (
                  <details key={i} className={`rounded-xl px-4 py-3 text-sm ${cardClass}`} onClick={(e) => e.stopPropagation()}>
                    <summary className="cursor-pointer font-semibold">{f.q}</summary>
                    <p className={`mt-1.5 ${t.sub}`}>{f.a}</p>
                  </details>
                ))}
              </div>
            ) : (
              placeholder("Add questions people ask you")
            )}
          </section>
        );
      case "announcement":
        return b.text ? (
          <div className={`rounded-2xl px-4 py-3.5 text-center text-sm font-semibold ${t.accent}`}>{b.text}</div>
        ) : (
          placeholder("Write an announcement, e.g. a launch date")
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-full ${t.page}`} style={{ fontFamily: FONT_FAMILY[design.font] }}>
      <div className="mx-auto max-w-md px-4 pb-16 pt-8">
        <Editable enabled={edit} onClick={onEditProfile} onAi={onAiProfile}>
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

        <div className="mt-8 space-y-7">
          {blocks.map((b) =>
            b.type === "products" ? (
              <div key={b.id}>{renderBlock(b)}</div>
            ) : (
              <Editable key={b.id} enabled={edit} onClick={() => onEditBlock?.(b.id)}>
                {renderBlock(b)}
              </Editable>
            ),
          )}
        </div>

        <footer className={`mt-10 text-center text-xs ${t.sub}`}>
          {edit ? (
            "Built with PehlaStore"
          ) : (
            <a href="/about" className="underline-offset-2 hover:underline">
              ⚡ Made with PehlaStore · make yours
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}