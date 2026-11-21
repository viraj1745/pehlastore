"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StoreView, { THEMES, type ThemeKey } from "@/components/StoreView";
import LaunchKit from "@/components/LaunchKit";
import LaunchPlanPanel from "@/components/LaunchPlanPanel";
import DemandCard from "@/components/DemandCard";
import ProductToolkit from "@/components/ProductToolkit";
import Celebration from "@/components/Celebration";
import EditSheet, { type SheetField } from "@/components/EditSheet";
import AiQuickSheet from "@/components/AiQuickSheet";
import SectionsManager from "@/components/SectionsManager";
import BlockSheet from "@/components/BlockSheet";
import DesignPanel from "@/components/DesignPanel";
import { clearDraft, getSessionId, loadDraft, saveDraft, type StoreDraft, type StoreExtras } from "@/lib/client/storage";
import { trackEvent } from "@/lib/client/track";
import { netAfterFee } from "@/lib/pricing";
import { inr } from "@/lib/format";
import { defaultBlocks, newBlock } from "@/lib/blocks";
import type { Block, BlockType, Design, Language, Product, StoreContent } from "@/lib/types";

type Sheet = { kind: "profile" } | { kind: "product"; index: number } | null;
type Tab = "store" | "products" | "launch" | "insights";

const TABS: Array<{ id: Tab; icon: string; label: string }> = [
  { id: "store", icon: "🛍️", label: "Store" },
  { id: "products", icon: "🧰", label: "Products" },
  { id: "launch", icon: "📣", label: "Launch" },
  { id: "insights", icon: "📊", label: "Insights" },
];

const PROFILE_FIELDS: SheetField[] = [
  { key: "display_name", label: "Name", kind: "text", max: 60 },
  { key: "tagline", label: "Tagline", kind: "text", max: 140 },
  { key: "bio", label: "About you", kind: "textarea", max: 700 },
  { key: "instagram_bio", label: "Instagram bio (copy this to Instagram)", kind: "textarea", max: 150, help: () => "Instagram allows 150 characters" },
];

const PRODUCT_FIELDS: SheetField[] = [
  { key: "title", label: "Title", kind: "text", max: 90 },
  { key: "format_label", label: "Format", kind: "text", max: 60 },
  { key: "description", label: "Description", kind: "textarea", max: 600 },
  {
    key: "price_inr",
    label: "Price (₹)",
    kind: "number",
    help: (v) => {
      const n = Number(v) || 0;
      return n > 0 ? `You keep about ${inr(netAfterFee(n))} per sale after the 5% fee` : "0 = free";
    },
  },
  { key: "cta_label", label: "Button text", kind: "text", max: 30 },
];

const DEFAULT_DESIGN: Design = { font: "modern", button: "pill", card: "shadow" };

function without<T>(record: Record<string, T> | undefined, key: string): Record<string, T> {
  const next = { ...(record ?? {}) };
  delete next[key];
  return next;
}

export default function EditPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<StoreDraft | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<"" | "regenerate" | "publish">("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("store");
  const [celebrate, setCelebrate] = useState(false);
  const [seenLaunch, setSeenLaunch] = useState(false);
  const [aiSheet, setAiSheet] = useState<{ kind: "profile" } | { kind: "product"; index: number } | null>(null);
  const [undo, setUndo] = useState<{ store: StoreContent; label: string } | null>(null);
  const [blockSheet, setBlockSheet] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = loadDraft();
    if (!saved) router.replace("/");
    else setDraft(saved);
  }, [router]);

  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 9000);
    return () => clearTimeout(id);
  }, [undo]);

  if (!draft) return <p className="p-8 text-center text-sm text-stone-500">Loading your store…</p>;
  const d = draft;

  const persist = (next: StoreDraft) => {
    setDraft(next);
    saveDraft(next);
  };
  const update = (store: StoreContent) => {
    trackEvent("edited");
    persist({ ...d, store, savedAt: new Date().toISOString() });
  };
  /** Extras change independently (several AI helpers can finish at once), so always merge into the latest draft. */
  const patchExtras = (fn: (extras: StoreExtras) => StoreExtras) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, extras: fn(prev.extras ?? {}) };
      saveDraft(next);
      return next;
    });

  const blocks: Block[] = d.store.blocks ?? defaultBlocks(d.input.handle);
  const design: Design = d.store.design ?? DEFAULT_DESIGN;
  const productsBlockId = blocks.find((b) => b.type === "products")?.id ?? "products";
  const setBlocks = (next: Block[]) => update({ ...d.store, blocks: next });
  function addBlock(type: BlockType) {
    const block = newBlock(type, d.input.handle);
    setBlocks([...blocks, block]);
    setBlockSheet(block.id);
  }

  const contextDescription = d.input.description.trim() || [d.meta.detected?.niche, d.store.bio].filter(Boolean).join(". ");
  const context = { handle: d.input.handle, description: contextDescription, language: d.input.language, followers: d.input.followers };
  const themeKey = (d.theme in THEMES ? d.theme : "sunrise") as ThemeKey;
  const liveUrl = d.published ? `${origin}/s/${d.published.slug}` : "";
  const unpublishedChanges = Boolean(d.published?.publishedAt && d.savedAt > d.published.publishedAt);
  const notes = [
    ...d.meta.warnings,
    ...(d.meta.priceAdjustments.length ? [`We adjusted prices to fit Indian price bands: ${d.meta.priceAdjustments.join("; ")}`] : []),
  ];

  function openTab(next: Tab) {
    setTab(next);
    if (next === "launch") setSeenLaunch(true);
    window.scrollTo({ top: 0 });
  }

  async function regenerateAll() {
    if (!confirm("Get a fresh set of ideas? Your current products and edits will be replaced.")) return;
    setBusy("regenerate");
    setMessage(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          handle: d.input.handle,
          description: contextDescription,
          language: d.input.language,
          followers: d.input.followers,
          images: [],
          audio: null,
          avoidTitles: d.store.products.map((p) => p.title).slice(0, 6),
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") {
        const store: StoreContent = { ...data.store, blocks: d.store.blocks, design: d.store.design };
        persist({ ...d, store, meta: data.meta, extras: {}, savedAt: new Date().toISOString() });
        setMessage({ kind: "info", text: "Fresh ideas ready. Your sections and design are kept." });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setMessage({ kind: "error", text: data?.message ?? data?.question ?? "Couldn't get new ideas. Please try again." });
      }
    } catch {
      setMessage({ kind: "error", text: "Connection problem. Your store is safe. Please try again." });
    }
    setBusy("");
  }

  async function publish() {
    setBusy("publish");
    setMessage(null);
    const firstTime = !d.published;
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          handle: d.input.handle,
          theme: d.theme,
          language: d.input.language,
          store: { ...d.store, blocks, design },
          slug: d.published?.slug,
          editToken: d.published?.editToken,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") {
        const now = new Date().toISOString();
        persist({ ...d, store: { ...d.store, blocks, design }, savedAt: now, published: { slug: data.slug, editToken: data.editToken, publishedAt: now } });
        if (firstTime) setCelebrate(true);
        else setMessage({ kind: "info", text: "Your live page is updated." });
      } else {
        setMessage({ kind: "error", text: data?.message ?? "Couldn't publish. Please try again." });
      }
    } catch {
      setMessage({ kind: "error", text: "Connection problem. Your store is safe. Please try again." });
    }
    setBusy("");
  }

  async function rewrite(
    section: "profile" | "product",
    index?: number,
    instruction = "",
    language?: Language,
  ): Promise<Record<string, string | number>> {
    const res = await fetch("/api/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        section,
        productIndex: index,
        instruction,
        context: { ...context, language: language ?? context.language },
        store: d.store,
      }),
    });
    const data = await res.json().catch(() => null);
    if (data?.status !== "ok") throw new Error(data?.message ?? "Couldn't rewrite this. Please try again.");
    trackEvent("ai_rewrite", { section });

    if (section === "profile") {
      const store = { ...d.store, ...data.profile };
      update(store);
      return { display_name: store.display_name, tagline: store.tagline, bio: store.bio, instagram_bio: store.instagram_bio };
    }
    const product = data.product as Product;
    update({ ...d.store, products: d.store.products.map((p, i) => (i === index ? product : p)) });
    patchExtras((e) => ({ ...e, outlines: without(e.outlines, product.id), bumps: without(e.bumps, product.id) }));
    return { title: product.title, format_label: product.format_label, description: product.description, price_inr: product.price_inr, cta_label: product.cta_label };
  }

  async function quickRewrite(section: "profile" | "product", index: number | undefined, instruction: string, language?: Language) {
    const before = d.store;
    await rewrite(section, index, instruction, language);
    setUndo({ store: before, label: section === "profile" ? "Profile rewritten with AI" : "Product rewritten with AI" });
  }

  async function assist(kind: "outline" | "bump" | "launch_plan", index?: number) {
    const res = await fetch("/api/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), kind, productIndex: index, context, store: d.store }),
    });
    const data = await res.json().catch(() => null);
    if (data?.status !== "ok") throw new Error(data?.message ?? "Couldn't do that right now. Please try again.");
    trackEvent("ai_assist", { kind });
    const productId = index !== undefined ? d.store.products[index]?.id : undefined;
    patchExtras((e) => {
      if (kind === "outline" && productId) return { ...e, outlines: { ...(e.outlines ?? {}), [productId]: data.result } };
      if (kind === "bump" && productId) return { ...e, bumps: { ...(e.bumps ?? {}), [productId]: data.result } };
      return { ...e, launchPlan: data.result };
    });
  }

  const product = sheet?.kind === "product" ? d.store.products[sheet.index] : null;
  const activeBlock = blockSheet ? blocks.find((b) => b.id === blockSheet) : undefined;
  const publishLabel = busy === "publish" ? "Publishing…" : d.published ? (unpublishedChanges ? "Update" : "Live ✓") : "Publish";

  const preview = (
    <StoreView
      store={{ ...d.store, blocks, design }}
      handle={d.input.handle}
      theme={themeKey}
      mode="edit"
      onEditProfile={() => setSheet({ kind: "profile" })}
      onEditProduct={(index) => setSheet({ kind: "product", index })}
      onAiProfile={() => setAiSheet({ kind: "profile" })}
      onAiProduct={(index) => setAiSheet({ kind: "product", index })}
      onEditBlock={(id) => setBlockSheet(id)}
      onAddProduct={() => setBlockSheet(productsBlockId)}
    />
  );

  const shareCard = d.published ? (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
      <p className="text-sm font-bold text-emerald-900">🟢 Your store is live</p>
      <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-emerald-800 underline">
        {liveUrl.replace(/^https?:\/\//, "")}
      </a>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(liveUrl).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="press rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Check out my new store 👉 ${liveUrl}`)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent("link_shared")}
          className="press rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
        >
          Share on WhatsApp
        </a>
        <a href={liveUrl} target="_blank" rel="noreferrer" className="press rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm">
          Open
        </a>
      </div>
      {unpublishedChanges && <p className="mt-2 text-xs text-amber-800">You have edits that aren&apos;t live yet. Tap Update.</p>}
    </div>
  ) : null;

  const publishPrompt = (title: string, body: string, icon: string) => (
    <div className="rounded-2xl border border-orange-200 bg-white p-6 text-center shadow-sm">
      <p className="text-3xl">{icon}</p>
      <p className="mt-2 font-bold">{title}</p>
      <p className="mt-1 text-sm text-stone-600">{body}</p>
      <button type="button" onClick={publish} disabled={busy !== ""} className="press mt-4 rounded-full bg-orange-600 px-6 py-3 font-semibold text-white disabled:bg-stone-300">
        {busy === "publish" ? "Publishing…" : "Publish my store"}
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh pb-28 lg:pb-10">
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-[#fffbf2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3 lg:max-w-6xl lg:px-8">
          <button
            type="button"
            onClick={() => {
              if (confirm("Start over? This store will be cleared from this device. A published link stays live.")) {
                clearDraft();
                router.push("/");
              }
            }}
            className="shrink-0 text-sm text-stone-600"
          >
            ← Start over
          </button>
          <span className="truncate text-sm font-bold lg:text-base">
            <span className="hidden lg:inline">
              Pehla<span className="text-orange-600">Store</span> ·{" "}
            </span>
            {d.store.display_name}
          </span>
          <button
            type="button"
            onClick={publish}
            disabled={busy !== "" || Boolean(d.published && !unpublishedChanges)}
            className="press shrink-0 rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:bg-stone-300 lg:px-6"
          >
            {publishLabel}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start lg:gap-12 lg:px-8">
        <div>
          {message && (
            <div className="px-4 pt-4 lg:px-0 lg:pt-6">
              <p
                className={`anim-pop rounded-2xl px-4 py-3 text-sm ${
                  message.kind === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-emerald-600 text-white"
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <div className="hidden pt-6 lg:block">
            <div className="inline-flex rounded-full bg-white p-1 shadow-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTab(t.id)}
                  className={`press relative rounded-full px-5 py-2 text-sm transition ${
                    tab === t.id ? "bg-stone-900 font-semibold text-white" : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {t.icon} {t.label}
                  {t.id === "launch" && d.published && !seenLaunch && tab !== "launch" && (
                    <span className="anim-pulse-ring absolute right-2 top-1.5 h-2 w-2 rounded-full bg-orange-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div key={tab} className="anim-fade-up">
            {tab === "store" && (
              <>
                <div className="space-y-3 px-4 pt-4 lg:px-0 lg:pt-6">
                  {!d.published && (
                    <p className="rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white">
                      ✨ Ready in {Math.round(d.meta.ms / 1000)}s. <b className="lg:hidden">Tap any section to edit it, or ✨ AI to rewrite.</b>
                      <b className="hidden lg:inline">Click any section in the preview to edit it, or ✨ AI to rewrite it.</b>
                    </p>
                  )}
                  {notes.length > 0 && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      {notes.map((n) => (
                        <p key={n}>• {n}</p>
                      ))}
                    </div>
                  )}

                  <SectionsManager blocks={blocks} onChange={setBlocks} onEdit={(id) => setBlockSheet(id)} onAdd={addBlock} />

                  <DesignPanel
                    theme={themeKey}
                    design={design}
                    onTheme={(key) => persist({ ...d, theme: key, savedAt: new Date().toISOString() })}
                    onDesign={(next) => update({ ...d.store, blocks, design: next })}
                  />

                  <button
                    type="button"
                    onClick={() => openTab("products")}
                    className="press flex w-full items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 text-left text-sm text-orange-900"
                  >
                    <span>
                      🧰 <b>Price explorer, content outlines and bump offers</b> for each product
                    </span>
                    <span className="font-semibold">Open →</span>
                  </button>

                  <button
                    type="button"
                    onClick={regenerateAll}
                    disabled={busy !== ""}
                    className="press w-full rounded-full border border-stone-300 bg-white py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    ↻ Not quite right? Get fresh product ideas
                  </button>
                </div>
                <div className="lg:hidden">{preview}</div>
              </>
            )}

            {tab === "products" && (
              <div className="space-y-3 px-4 pt-4 lg:px-0 lg:pt-6">
                <div className="rounded-2xl bg-stone-900 p-4 text-sm text-white">
                  <p className="font-bold">🧰 Turn ideas into products</p>
                  <p className="mt-1 text-stone-300">Test your price, get a step-by-step outline to make it, add a checkout add-on, and copy everything into SuperProfile.</p>
                </div>
                <ProductToolkit
                  products={d.store.products}
                  followers={d.input.followers}
                  outlines={d.extras?.outlines ?? {}}
                  bumps={d.extras?.bumps ?? {}}
                  onPrice={(id, price) => update({ ...d.store, products: d.store.products.map((p) => (p.id === id ? { ...p, price_inr: price } : p)) })}
                  onAssist={(kind, index) => assist(kind, index)}
                />
                <button
                  type="button"
                  onClick={() => setBlockSheet(productsBlockId)}
                  className="press w-full rounded-2xl border-2 border-dashed border-orange-300 py-3 text-sm font-semibold text-orange-700"
                >
                  + Add, remove or reorder products
                </button>
              </div>
            )}

            {tab === "launch" && (
              <div className="space-y-3 px-4 pt-4 lg:px-0 lg:pt-6">
                {shareCard ?? publishPrompt("Publish to get your link", "Your launch kit and audience insights use your live link.", "🚀")}
                <LaunchPlanPanel plan={d.extras?.launchPlan} liveUrl={liveUrl} onGenerate={() => assist("launch_plan")} />
                <LaunchKit
                  kit={d.store.launch_kit}
                  instagramBio={d.store.instagram_bio}
                  liveUrl={liveUrl}
                  storyUrl={d.published ? `/api/story/${d.published.slug}?v=${encodeURIComponent(d.published.publishedAt ?? "")}` : ""}
                />
              </div>
            )}

            {tab === "insights" && (
              <div className="space-y-3 px-4 pt-4 lg:px-0 lg:pt-6">
                {d.published ? (
                  <>
                    <DemandCard slug={d.published.slug} editToken={d.published.editToken} products={d.store.products} />
                    <button
                      type="button"
                      onClick={() => openTab("products")}
                      className="press flex w-full items-center justify-between rounded-2xl bg-orange-600 px-4 py-3 text-left text-sm font-semibold text-white"
                    >
                      <span>✨ Build your most-wanted product with AI</span>
                      <span>→</span>
                    </button>
                    <div className="rounded-2xl bg-white p-4 text-sm text-stone-600 shadow-sm">
                      <p className="font-bold text-stone-900">How this works</p>
                      <p className="mt-1">
                        Every tap on a product button counts as interest. Before you spend a week making a course, your audience tells you which product
                        they actually want.
                      </p>
                    </div>
                  </>
                ) : (
                  publishPrompt(
                    "See what your audience wants",
                    "After you publish and share your link, every product tap shows up here, so you know what to build first.",
                    "📊",
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 py-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500">Live preview · click to edit</p>
            <div className="no-scrollbar mx-auto h-[720px] w-[390px] overflow-y-auto rounded-[2.75rem] border-[10px] border-stone-900 shadow-2xl">
              {preview}
            </div>
          </div>
        </aside>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => openTab(t.id)}
              className={`press relative flex flex-col items-center gap-0.5 py-2.5 text-xs ${tab === t.id ? "font-bold text-orange-600" : "text-stone-500"}`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
              {t.id === "launch" && d.published && !seenLaunch && tab !== "launch" && (
                <span className="anim-pulse-ring absolute right-[26%] top-2 h-2.5 w-2.5 rounded-full bg-orange-600" />
              )}
              {tab === t.id && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-orange-600" />}
            </button>
          ))}
        </div>
      </nav>

      {sheet?.kind === "profile" && (
        <EditSheet
          title="Edit your profile"
          fields={PROFILE_FIELDS}
          values={{ display_name: d.store.display_name, tagline: d.store.tagline, bio: d.store.bio, instagram_bio: d.store.instagram_bio }}
          onClose={() => setSheet(null)}
          onAiRewrite={(instruction) => rewrite("profile", undefined, instruction)}
          aiHint="Optional: e.g. sound more friendly, mention students"
          onSave={(v) => {
            update({
              ...d.store,
              display_name: String(v.display_name).trim() || d.store.display_name,
              tagline: String(v.tagline).trim() || d.store.tagline,
              bio: String(v.bio).trim() || d.store.bio,
              instagram_bio: String(v.instagram_bio).trim() || d.store.instagram_bio,
            });
            setSheet(null);
          }}
        />
      )}

      {sheet?.kind === "product" && product && (
        <EditSheet
          title="Edit product"
          fields={PRODUCT_FIELDS}
          values={{ title: product.title, format_label: product.format_label, description: product.description, price_inr: product.price_inr, cta_label: product.cta_label }}
          onClose={() => setSheet(null)}
          onAiRewrite={(instruction) => rewrite("product", sheet.index, instruction)}
          onSave={(v) => {
            update({
              ...d.store,
              products: d.store.products.map((p, i) =>
                i === sheet.index
                  ? {
                      ...p,
                      title: String(v.title).trim() || p.title,
                      format_label: String(v.format_label).trim() || p.format_label,
                      description: String(v.description).trim() || p.description,
                      price_inr: Math.max(0, Math.round(Number(v.price_inr) || 0)),
                      cta_label: String(v.cta_label).trim() || p.cta_label,
                    }
                  : p,
              ),
            });
            setSheet(null);
          }}
        />
      )}

      {activeBlock && (
        <BlockSheet
          key={activeBlock.id}
          block={activeBlock}
          products={d.store.products}
          onClose={() => setBlockSheet(null)}
          onSave={(next) => setBlocks(blocks.map((x) => (x.id === next.id ? next : x)))}
          onSaveProducts={(items) => update({ ...d.store, products: items, blocks })}
        />
      )}

      {aiSheet && (
        <AiQuickSheet
          kind={aiSheet.kind}
          title={aiSheet.kind === "profile" ? "Your profile" : (d.store.products[aiSheet.index]?.title ?? "Product")}
          onClose={() => setAiSheet(null)}
          onRun={(instruction, language) =>
            quickRewrite(aiSheet.kind, aiSheet.kind === "product" ? aiSheet.index : undefined, instruction, language)
          }
        />
      )}

      {undo && (
        <div className="anim-sheet-up fixed inset-x-0 bottom-20 z-[55] flex justify-center px-4 lg:bottom-6">
          <div className="flex items-center gap-3 rounded-full bg-stone-900 px-4 py-2.5 text-sm text-white shadow-xl">
            <span>✨ {undo.label}</span>
            <button
              type="button"
              onClick={() => {
                update(undo.store);
                setUndo(null);
              }}
              className="font-bold text-orange-300"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {busy === "regenerate" && (
        <div className="anim-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fffbf2]/90 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <p className="mt-4 font-semibold">Finding fresh ideas…</p>
        </div>
      )}

      {celebrate && d.published && (
        <Celebration
          url={liveUrl}
          onClose={() => setCelebrate(false)}
          onShare={() => trackEvent("link_shared")}
          onLaunchKit={() => {
            setCelebrate(false);
            openTab("launch");
          }}
        />
      )}
    </div>
  );
}