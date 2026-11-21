"use client";

import { useState } from "react";
import type { Bump, FollowerTier, Outline, Product } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import { charmPrice, netAfterFee, PRICE_BANDS } from "@/lib/pricing";
import { inr } from "@/lib/format";

const TIER_FOLLOWERS: Record<FollowerTier, number> = {
  under_5k: 3000,
  "5k_20k": 12000,
  "20k_50k": 35000,
  "50k_100k": 75000,
  "100k_plus": 150000,
  unknown: 10000,
};
const CONVERSIONS = [0.5, 1, 2];
const num = (n: number) => new Intl.NumberFormat("en-IN").format(n);

type ToolTab = "price" | "build" | "bump" | "copy";

type Props = {
  products: Product[];
  followers: FollowerTier;
  outlines: Record<string, Outline>;
  bumps: Record<string, Bump>;
  onPrice: (productId: string, price: number) => void;
  onAssist: (kind: "outline" | "bump", index: number) => Promise<void>;
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="press rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

export default function ProductToolkit({ products, followers, outlines, bumps, onPrice, onAssist }: Props) {
  const firstPaid = products.find((p) => p.price_inr > 0)?.id ?? products[0]?.id;
  const [openId, setOpenId] = useState<string | undefined>(firstPaid);
  const [tool, setTool] = useState<ToolTab>("price");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function run(kind: "outline" | "bump", index: number, id: string) {
    const key = `${kind}:${id}`;
    setBusy(key);
    setErrors((e) => ({ ...e, [key]: "" }));
    try {
      await onAssist(kind, index);
    } catch (error) {
      setErrors((e) => ({ ...e, [key]: (error as Error).message }));
    }
    setBusy("");
  }

  return (
    <div className="space-y-3">
      {products.map((p, index) => {
        const open = openId === p.id;
        const tools: Array<[ToolTab, string]> = [
          ["price", "💰 Price"],
          ["build", "✨ Build it"],
          ...(p.price_inr > 0 ? ([["bump", "➕ Bump offer"]] as Array<[ToolTab, string]>) : []),
          ["copy", "📋 Copy"],
        ];
        const activeTool = tools.some(([t]) => t === tool) ? tool : "price";

        return (
          <div key={p.id} className={`rounded-2xl bg-white shadow-sm transition ${open ? "ring-2 ring-orange-300" : ""}`}>
            <button type="button" onClick={() => setOpenId(open ? undefined : p.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-orange-700">{PRODUCT_TYPE_LABELS[p.type]}</p>
                <p className="truncate font-bold">{p.title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-extrabold">{inr(p.price_inr)}</span>
                <span className={`text-stone-400 transition ${open ? "rotate-180" : ""}`}>▾</span>
              </div>
            </button>

            {open && (
              <div className="anim-fade-up border-t border-stone-100 p-4">
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {tools.map(([t, label]) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTool(t)}
                      className={`press shrink-0 rounded-full px-3.5 py-1.5 text-sm ${
                        activeTool === t ? "bg-orange-600 font-semibold text-white" : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div key={activeTool} className="anim-fade-up mt-4">
                  {activeTool === "price" && <PriceTab product={p} followers={followers} onPrice={onPrice} />}
                  {activeTool === "build" && (
                    <OutlineTab
                      outline={outlines[p.id]}
                      busy={busy === `outline:${p.id}`}
                      error={errors[`outline:${p.id}`]}
                      onGenerate={() => run("outline", index, p.id)}
                    />
                  )}
                  {activeTool === "bump" && (
                    <BumpTab
                      bump={bumps[p.id]}
                      busy={busy === `bump:${p.id}`}
                      error={errors[`bump:${p.id}`]}
                      onGenerate={() => run("bump", index, p.id)}
                    />
                  )}
                  {activeTool === "copy" && <CopyTab product={p} bump={bumps[p.id]} />}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PriceTab({ product, followers, onPrice }: { product: Product; followers: FollowerTier; onPrice: (id: string, price: number) => void }) {
  const band = PRICE_BANDS[product.type];
  const [value, setValue] = useState(product.price_inr);
  const [conversion, setConversion] = useState(1);
  const [goal, setGoal] = useState(25000);

  if (band.max === 0) {
    return (
      <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
        🎁 Free resources build trust and grow your list. Keep this one free; your paid products earn the money.
      </p>
    );
  }

  const price = Math.min(band.max, Math.max(band.min, charmPrice(value)));
  const third = (band.max - band.min) / 3;
  const zone = price < band.min + third ? "Budget" : price < band.min + third * 2 ? "Fair" : "Premium";
  const zoneStyle = zone === "Budget" ? "bg-sky-100 text-sky-800" : zone === "Fair" ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800";
  const net = netAfterFee(price);
  const audience = TIER_FOLLOWERS[followers];
  const sales = Math.max(1, Math.round((audience * conversion) / 100));
  const needed = Math.ceil(goal / Math.max(1, net));

  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-extrabold">{inr(price)}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${zoneStyle}`}>{zone}</span>
      </div>
      <input
        type="range"
        min={band.min}
        max={band.max}
        step={10}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-3 w-full accent-orange-600"
        aria-label="Price"
      />
      <div className="flex justify-between text-[11px] text-stone-500">
        <span>{inr(band.min)}</span>
        <span>Budget · Fair · Premium</span>
        <span>{inr(band.max)}</span>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Typical range for a {PRODUCT_TYPE_LABELS[product.type].toLowerCase()} in India: {inr(band.min)}–{inr(band.max)} {band.unit}.
      </p>

      <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
        <p>
          You keep <b>{inr(net)}</b> per sale after SuperProfile&apos;s 5% fee.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span>If</span>
          {CONVERSIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConversion(c)}
              className={`press rounded-full px-2.5 py-1 ${conversion === c ? "bg-emerald-700 font-semibold text-white" : "bg-white"}`}
            >
              {c}%
            </button>
          ))}
          <span>of your ~{num(audience)} followers buy:</span>
        </div>
        <p className="mt-1.5 text-xl font-extrabold">
          {num(sales)} sales ≈ {inr(sales * net)}
        </p>
      </div>

      <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm">
        <label className="flex items-center gap-2">
          <span>Monthly goal ₹</span>
          <input
            type="number"
            inputMode="numeric"
            value={goal}
            onChange={(e) => setGoal(Math.max(0, Number(e.target.value) || 0))}
            className="w-28 rounded-lg border border-stone-300 bg-white px-2 py-1"
          />
        </label>
        <p className="mt-1.5">
          = <b>{num(needed)}</b> sales a month at {inr(price)}
        </p>
      </div>

      <p className="mt-2 text-[11px] text-stone-400">Estimates only: real results depend on your content and how often you share your link.</p>

      {price !== product.price_inr && (
        <button type="button" onClick={() => onPrice(product.id, price)} className="press mt-3 w-full rounded-full bg-orange-600 py-3 font-semibold text-white">
          Use {inr(price)} for this product
        </button>
      )}
    </div>
  );
}

function outlineText(o: Outline): string {
  return [o.title, o.promise, `Time to make: ${o.time_to_make}`, "", ...o.sections.flatMap((s) => [s.heading, ...s.points.map((p) => `- ${p}`), ""]), `Tip: ${o.format_tip}`].join("\n");
}

function OutlineTab({ outline, busy, error, onGenerate }: { outline?: Outline; busy: boolean; error?: string; onGenerate: () => void }) {
  if (!outline) {
    return (
      <div className="rounded-xl bg-orange-50 p-4 text-center">
        <p className="text-sm text-orange-900">Turn this idea into a plan you can make this weekend: sections, what goes in each, and how long it takes.</p>
        <button type="button" onClick={onGenerate} disabled={busy} className="press mt-3 rounded-full bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {busy ? "Writing your outline…" : "✨ Build it with AI"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <p className="font-bold">{outline.title}</p>
      <p className="mt-0.5 text-sm text-stone-600">{outline.promise}</p>
      <span className="mt-2 inline-block rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">⏱️ {outline.time_to_make}</span>
      <ol className="mt-3 space-y-3">
        {outline.sections.map((s, i) => (
          <li key={i} className="rounded-xl bg-stone-50 p-3">
            <p className="text-sm font-semibold">{s.heading}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-stone-600">
              {s.points.map((point, j) => (
                <li key={j}>{point}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs text-orange-900">💡 {outline.format_tip}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={outlineText(outline)} label="Copy outline" />
        <button type="button" onClick={onGenerate} disabled={busy} className="press rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? "Rewriting…" : "↻ Another version"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function BumpTab({ bump, busy, error, onGenerate }: { bump?: Bump; busy: boolean; error?: string; onGenerate: () => void }) {
  if (!bump) {
    return (
      <div className="rounded-xl bg-orange-50 p-4 text-center">
        <p className="text-sm text-orange-900">A small add-on buyers can tick at checkout, like a template or bonus checklist. It raises what each buyer spends.</p>
        <button type="button" onClick={onGenerate} disabled={busy} className="press mt-3 rounded-full bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {busy ? "Thinking of one…" : "➕ Suggest a bump offer"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">What buyers see at checkout</p>
      <div className="mt-2 flex items-start gap-3 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/60 p-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-orange-500 bg-white text-xs text-orange-600">✓</span>
        <div>
          <p className="text-sm font-semibold">
            {bump.title} · {inr(bump.price_inr)}
          </p>
          <p className="mt-0.5 text-sm text-stone-600">{bump.pitch}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={`${bump.title} - ₹${bump.price_inr}\n${bump.pitch}`} />
        <button type="button" onClick={onGenerate} disabled={busy} className="press rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? "Thinking…" : "↻ Another idea"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function CopyTab({ product, bump }: { product: Product; bump?: Bump }) {
  const text = [
    `Product type: ${PRODUCT_TYPE_LABELS[product.type]}`,
    `Title: ${product.title}`,
    `Price: ${product.price_inr === 0 ? "Free" : `₹${product.price_inr}`}`,
    `Format: ${product.format_label}`,
    `Description: ${product.description}`,
    `Button text: ${product.cta_label}`,
    ...product.faq.map((f) => `FAQ: ${f.q} - ${f.a}`),
    ...(bump ? [`Bump offer: ${bump.title} - ₹${bump.price_inr} (${bump.pitch})`] : []),
  ].join("\n");

  return (
    <div>
      <p className="text-sm text-stone-600">
        Ready to paste into SuperProfile: create a <b>{PRODUCT_TYPE_LABELS[product.type].toLowerCase()}</b> and copy each field across.
      </p>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-xs leading-relaxed">{text}</pre>
      <div className="mt-3">
        <CopyButton text={text} label="Copy all fields" />
      </div>
    </div>
  );
}