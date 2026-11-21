"use client";

import { useState } from "react";
import type { Block, Product } from "@/lib/types";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from "@/lib/types";
import { BLOCK_META, blankProduct, youtubeId } from "@/lib/blocks";
import { inr } from "@/lib/format";

const field =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
const label = "text-sm font-semibold text-stone-700";
const addBtn = "press w-full rounded-full border-2 border-dashed border-orange-300 py-2.5 text-sm font-semibold text-orange-700 disabled:opacity-40";

function clean(b: Block): Block {
  return {
    ...b,
    title: b.title.trim(),
    text: b.text.trim(),
    url: b.url.trim(),
    links: b.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.label && l.url.length >= 4),
    quotes: b.quotes.map((q) => ({ quote: q.quote.trim(), name: q.name.trim() })).filter((q) => q.quote.length >= 3),
    faqs: b.faqs.map((f) => ({ q: f.q.trim(), a: f.a.trim() })).filter((f) => f.q.length >= 3 && f.a),
    socials: {
      instagram: b.socials.instagram.trim(),
      youtube: b.socials.youtube.trim(),
      whatsapp: b.socials.whatsapp.trim(),
      telegram: b.socials.telegram.trim(),
    },
  };
}

function Small({ label: aria, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={onClick}
      disabled={disabled}
      className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-sm disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function BlockSheet({
  block,
  products,
  onSave,
  onSaveProducts,
  onClose,
}: {
  block: Block;
  products: Product[];
  onSave: (block: Block) => void;
  onSaveProducts: (products: Product[]) => void;
  onClose: () => void;
}) {
  const [b, setB] = useState<Block>(block);
  const [items, setItems] = useState<Product[]>(products);
  const meta = BLOCK_META[block.type];
  const set = (patch: Partial<Block>) => setB((prev) => ({ ...prev, ...patch }));

  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  function save() {
    if (block.type === "products") onSaveProducts(items);
    else onSave(clean(b));
    onClose();
  }

  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="anim-sheet-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {meta.icon} {meta.label}
          </h3>
          <button type="button" onClick={onClose} className="text-sm text-stone-500">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {block.type === "products" && (
            <>
              <div className="space-y-2">
                {items.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-orange-700">{PRODUCT_TYPE_LABELS[p.type]}</p>
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                    </div>
                    <span className="text-sm font-bold">{inr(p.price_inr)}</span>
                    <Small label="Move up" onClick={() => moveItem(i, -1)} disabled={i === 0}>
                      ↑
                    </Small>
                    <Small label="Move down" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}>
                      ↓
                    </Small>
                    <Small label="Remove" onClick={() => setItems(items.filter((x) => x.id !== p.id))} disabled={items.length <= 1}>
                      🗑
                    </Small>
                  </div>
                ))}
              </div>
              <p className={label}>Add a product</p>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={items.length >= 6}
                    onClick={() => setItems([...items, blankProduct(type)])}
                    className="press rounded-xl border border-stone-200 px-3 py-2.5 text-left text-sm hover:border-orange-300 disabled:opacity-40"
                  >
                    + {PRODUCT_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-500">Up to 6 products. After saving, tap the new product in the preview and use ✨ AI to write it.</p>
            </>
          )}

          {block.type === "about" && (
            <>
              <label className="block">
                <span className={label}>Heading</span>
                <input className={field} value={b.title} maxLength={80} placeholder="About me" onChange={(e) => set({ title: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>Your story</span>
                <textarea
                  rows={6}
                  className={field}
                  maxLength={800}
                  value={b.text}
                  placeholder="How you started, who you help, and why people trust you."
                  onChange={(e) => set({ text: e.target.value })}
                />
              </label>
            </>
          )}

          {block.type === "links" && (
            <>
              <label className="block">
                <span className={label}>Heading (optional)</span>
                <input className={field} value={b.title} maxLength={80} placeholder="More from me" onChange={(e) => set({ title: e.target.value })} />
              </label>
              {b.links.map((l, i) => (
                <div key={i} className="rounded-xl bg-stone-50 p-3">
                  <input
                    className={field}
                    placeholder="Button text, e.g. My YouTube channel"
                    value={l.label}
                    maxLength={60}
                    onChange={(e) => set({ links: b.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                  />
                  <input
                    className={field}
                    placeholder="https://…"
                    value={l.url}
                    maxLength={300}
                    onChange={(e) => set({ links: b.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
                  />
                  <button type="button" onClick={() => set({ links: b.links.filter((_, j) => j !== i) })} className="mt-2 text-xs font-semibold text-red-600">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" disabled={b.links.length >= 8} onClick={() => set({ links: [...b.links, { label: "", url: "" }] })} className={addBtn}>
                + Add link
              </button>
            </>
          )}

          {block.type === "socials" && (
            <>
              {(
                [
                  ["instagram", "Instagram handle", "yourhandle"],
                  ["youtube", "YouTube channel (link or @handle)", "@yourchannel"],
                  ["whatsapp", "WhatsApp number", "10-digit mobile number"],
                  ["telegram", "Telegram (username or link)", "yourchannel"],
                ] as const
              ).map(([key, name, hint]) => (
                <label key={key} className="block">
                  <span className={label}>{name}</span>
                  <input
                    className={field}
                    value={b.socials[key]}
                    placeholder={hint}
                    inputMode={key === "whatsapp" ? "tel" : undefined}
                    onChange={(e) => set({ socials: { ...b.socials, [key]: e.target.value } })}
                  />
                </label>
              ))}
            </>
          )}

          {block.type === "testimonials" && (
            <>
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                Only add real messages from your followers or buyers (DM screenshots are a great source). Made-up reviews break trust.
              </p>
              <label className="block">
                <span className={label}>Heading</span>
                <input className={field} value={b.title} maxLength={80} placeholder="What people say" onChange={(e) => set({ title: e.target.value })} />
              </label>
              {b.quotes.map((q, i) => (
                <div key={i} className="rounded-xl bg-stone-50 p-3">
                  <textarea
                    rows={3}
                    className={field}
                    placeholder="What they said"
                    value={q.quote}
                    maxLength={300}
                    onChange={(e) => set({ quotes: b.quotes.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)) })}
                  />
                  <input
                    className={field}
                    placeholder="Name or first name (optional)"
                    value={q.name}
                    maxLength={60}
                    onChange={(e) => set({ quotes: b.quotes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                  />
                  <button type="button" onClick={() => set({ quotes: b.quotes.filter((_, j) => j !== i) })} className="mt-2 text-xs font-semibold text-red-600">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" disabled={b.quotes.length >= 6} onClick={() => set({ quotes: [...b.quotes, { quote: "", name: "" }] })} className={addBtn}>
                + Add testimonial
              </button>
            </>
          )}

          {block.type === "video" && (
            <>
              <label className="block">
                <span className={label}>Heading (optional)</span>
                <input className={field} value={b.title} maxLength={80} placeholder="Watch a free lesson" onChange={(e) => set({ title: e.target.value })} />
              </label>
              <label className="block">
                <span className={label}>YouTube link</span>
                <input className={field} value={b.url} maxLength={300} placeholder="https://youtu.be/…" onChange={(e) => set({ url: e.target.value })} />
              </label>
              <p className={`text-xs ${youtubeId(b.url) ? "text-emerald-700" : "text-stone-500"}`}>
                {youtubeId(b.url) ? "✓ Video found" : "Paste a YouTube video or Shorts link"}
              </p>
            </>
          )}

          {block.type === "faq" && (
            <>
              <label className="block">
                <span className={label}>Heading</span>
                <input className={field} value={b.title} maxLength={80} placeholder="Questions" onChange={(e) => set({ title: e.target.value })} />
              </label>
              {b.faqs.map((f, i) => (
                <div key={i} className="rounded-xl bg-stone-50 p-3">
                  <input
                    className={field}
                    placeholder="Question"
                    value={f.q}
                    maxLength={160}
                    onChange={(e) => set({ faqs: b.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })}
                  />
                  <textarea
                    rows={3}
                    className={field}
                    placeholder="Answer"
                    value={f.a}
                    maxLength={500}
                    onChange={(e) => set({ faqs: b.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })}
                  />
                  <button type="button" onClick={() => set({ faqs: b.faqs.filter((_, j) => j !== i) })} className="mt-2 text-xs font-semibold text-red-600">
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" disabled={b.faqs.length >= 8} onClick={() => set({ faqs: [...b.faqs, { q: "", a: "" }] })} className={addBtn}>
                + Add question
              </button>
            </>
          )}

          {block.type === "announcement" && (
            <label className="block">
              <span className={label}>Announcement</span>
              <textarea
                rows={3}
                className={field}
                maxLength={200}
                value={b.text}
                placeholder="e.g. 🚀 New batch starts 1 December · 20 seats"
                onChange={(e) => set({ text: e.target.value })}
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-stone-300 py-3 font-semibold">
            Cancel
          </button>
          <button type="button" onClick={save} className="flex-1 rounded-full bg-stone-900 py-3 font-semibold text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}