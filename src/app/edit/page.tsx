"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StoreView from "@/components/StoreView";
import EditSheet, { type SheetField } from "@/components/EditSheet";
import { clearDraft, getSessionId, loadDraft, saveDraft, type StoreDraft } from "@/lib/client/storage";
import { netAfterFee } from "@/lib/pricing";
import { inr } from "@/lib/format";
import type { Product, StoreContent } from "@/lib/types";

type Sheet = { kind: "profile" } | { kind: "product"; index: number } | null;

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

export default function EditPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<StoreDraft | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState<"" | "regenerate" | "publish">("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = loadDraft();
    if (!saved) router.replace("/");
    else setDraft(saved);
  }, [router]);

  if (!draft) return <p className="p-8 text-center text-sm text-stone-500">Loading your store…</p>;
  const d = draft;

  const persist = (next: StoreDraft) => {
    setDraft(next);
    saveDraft(next);
  };
  const update = (store: StoreContent) => persist({ ...d, store, savedAt: new Date().toISOString() });

  const contextDescription =
    d.input.description.trim() || [d.meta.detected?.niche, d.store.bio].filter(Boolean).join(". ");
  const context = {
    handle: d.input.handle,
    description: contextDescription,
    language: d.input.language,
    followers: d.input.followers,
  };
  const liveUrl = d.published ? `${origin}/s/${d.published.slug}` : "";
  const unpublishedChanges = Boolean(d.published?.publishedAt && d.savedAt > d.published.publishedAt);

  const notes = [
    ...d.meta.warnings,
    ...(d.meta.priceAdjustments.length ? [`We adjusted prices to fit Indian price bands: ${d.meta.priceAdjustments.join("; ")}`] : []),
  ];

  async function regenerateAll() {
    if (!confirm("Get a fresh set of ideas? Your current edits will be replaced.")) return;
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
          avoidTitles: d.store.products.map((p) => p.title),
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") {
        persist({ ...d, store: data.store, meta: data.meta, savedAt: new Date().toISOString() });
        setMessage({ kind: "info", text: "Fresh ideas ready. Tap any section to edit." });
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
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          handle: d.input.handle,
          theme: d.theme,
          language: d.input.language,
          store: d.store,
          slug: d.published?.slug,
          editToken: d.published?.editToken,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") {
        const now = new Date().toISOString();
        persist({ ...d, savedAt: now, published: { slug: data.slug, editToken: data.editToken, publishedAt: now } });
        setMessage({ kind: "info", text: d.published ? "Your live page is updated." : "🎉 Your store is live! Share the link below." });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setMessage({ kind: "error", text: data?.message ?? "Couldn't publish. Please try again." });
      }
    } catch {
      setMessage({ kind: "error", text: "Connection problem. Your store is safe. Please try again." });
    }
    setBusy("");
  }

  async function rewrite(section: "profile" | "product", index?: number, instruction = "") {
    const res = await fetch("/api/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId(), section, productIndex: index, instruction, context, store: d.store }),
    });
    const data = await res.json().catch(() => null);
    if (data?.status !== "ok") throw new Error(data?.message ?? "Couldn't rewrite this. Please try again.");

    if (section === "profile") {
      const store = { ...d.store, ...data.profile };
      update(store);
      return { display_name: store.display_name, tagline: store.tagline, bio: store.bio, instagram_bio: store.instagram_bio };
    }
    const product = data.product as Product;
    update({ ...d.store, products: d.store.products.map((p, i) => (i === index ? product : p)) });
    return {
      title: product.title,
      format_label: product.format_label,
      description: product.description,
      price_inr: product.price_inr,
      cta_label: product.cta_label,
    };
  }

  const product = sheet?.kind === "product" ? d.store.products[sheet.index] : null;
  const publishLabel =
    busy === "publish" ? "Publishing…" : d.published ? (unpublishedChanges ? "Update" : "Live ✓") : "Publish";

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-[#fffbf2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (confirm("Start over? This store will be cleared from this phone. A published link stays live.")) {
                clearDraft();
                router.push("/");
              }
            }}
            className="text-sm text-stone-600"
          >
            ← Start over
          </button>
          <span className="text-sm font-bold">Your store</span>
          <button
            type="button"
            onClick={publish}
            disabled={busy !== "" || Boolean(d.published && !unpublishedChanges)}
            className="rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:bg-stone-300"
          >
            {publishLabel}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-3 px-4 pt-4">
        {message && (
          <p
            className={`rounded-2xl px-4 py-3 text-sm ${
              message.kind === "error" ? "border border-red-200 bg-red-50 text-red-800" : "bg-emerald-600 text-white"
            }`}
          >
            {message.text}
          </p>
        )}

        {d.published && (
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
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out my new store 👉 ${liveUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white"
              >
                Share on WhatsApp
              </a>
              <a href={liveUrl} target="_blank" rel="noreferrer" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm">
                Open
              </a>
            </div>
            {unpublishedChanges && <p className="mt-2 text-xs text-amber-800">You have edits that aren&apos;t live yet. Tap Update.</p>}
          </div>
        )}

        {!d.published && (
          <p className="rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white">
            ✨ Ready in {Math.round(d.meta.ms / 1000)}s. <b>Tap any section to edit it.</b>
          </p>
        )}

        {notes.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {notes.map((n) => (
              <p key={n}>• {n}</p>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={regenerateAll}
          disabled={busy !== ""}
          className="w-full rounded-full border border-stone-300 bg-white py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          ↻ Not quite right? Get fresh ideas
        </button>
      </div>

      <StoreView
        store={d.store}
        handle={d.input.handle}
        theme="sunrise"
        mode="edit"
        onEditProfile={() => setSheet({ kind: "profile" })}
        onEditProduct={(index) => setSheet({ kind: "product", index })}
      />

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
          values={{
            title: product.title,
            format_label: product.format_label,
            description: product.description,
            price_inr: product.price_inr,
            cta_label: product.cta_label,
          }}
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

      {busy === "regenerate" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#fffbf2]/90 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <p className="mt-4 font-semibold">Finding fresh ideas…</p>
        </div>
      )}
    </div>
  );
}