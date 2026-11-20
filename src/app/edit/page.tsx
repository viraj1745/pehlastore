"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StoreView from "@/components/StoreView";
import EditSheet, { type SheetField } from "@/components/EditSheet";
import { clearDraft, loadDraft, saveDraft, type StoreDraft } from "@/lib/client/storage";
import { netAfterFee } from "@/lib/pricing";
import type { StoreContent } from "@/lib/types";

type Sheet = { kind: "profile" } | { kind: "product"; index: number } | null;

const PROFILE_FIELDS: SheetField[] = [
  { key: "display_name", label: "Name", kind: "text", max: 60 },
  { key: "tagline", label: "Tagline", kind: "text", max: 140 },
  { key: "bio", label: "About you", kind: "textarea", max: 700 },
  {
    key: "instagram_bio",
    label: "Instagram bio (copy this to Instagram)",
    kind: "textarea",
    max: 150,
    help: () => "Instagram allows 150 characters",
  },
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
      return n > 0 ? `You keep about ₹${netAfterFee(n)} per sale after the 5% fee` : "0 = free";
    },
  },
  { key: "cta_label", label: "Button text", kind: "text", max: 30 },
];

export default function EditPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<StoreDraft | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    const saved = loadDraft();
    if (!saved) router.replace("/");
    else setDraft(saved);
  }, [router]);

  if (!draft) return <p className="p-8 text-center text-sm text-stone-500">Loading your store…</p>;

  const update = (store: StoreContent) => {
    const next = { ...draft, store, savedAt: new Date().toISOString() };
    setDraft(next);
    saveDraft(next);
  };

  const notes = [
    ...draft.meta.warnings,
    ...(draft.meta.priceAdjustments.length
      ? [`We adjusted prices to fit Indian price bands: ${draft.meta.priceAdjustments.join("; ")}`]
      : []),
  ];

  const product = sheet?.kind === "product" ? draft.store.products[sheet.index] : null;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-[#fffbf2]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (confirm("Start over? Your current store will be cleared.")) {
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
            disabled
            title="Publishing comes in the next step"
            className="rounded-full bg-stone-300 px-4 py-2 text-sm font-bold text-white"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 pt-4">
        <p className="rounded-2xl bg-stone-900 px-4 py-3 text-sm text-white">
          ✨ Ready in {Math.round(draft.meta.ms / 1000)}s. <b>Tap any section to edit it.</b>
        </p>
        {notes.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {notes.map((n) => (
              <p key={n}>• {n}</p>
            ))}
          </div>
        )}
      </div>

      <StoreView
        store={draft.store}
        handle={draft.input.handle}
        theme="sunrise"
        mode="edit"
        onEditProfile={() => setSheet({ kind: "profile" })}
        onEditProduct={(index) => setSheet({ kind: "product", index })}
      />

      {sheet?.kind === "profile" && (
        <EditSheet
          title="Edit your profile"
          fields={PROFILE_FIELDS}
          values={{
            display_name: draft.store.display_name,
            tagline: draft.store.tagline,
            bio: draft.store.bio,
            instagram_bio: draft.store.instagram_bio,
          }}
          onClose={() => setSheet(null)}
          onSave={(v) => {
            update({
              ...draft.store,
              display_name: String(v.display_name).trim() || draft.store.display_name,
              tagline: String(v.tagline).trim(),
              bio: String(v.bio).trim(),
              instagram_bio: String(v.instagram_bio).trim(),
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
          onSave={(v) => {
            const products = draft.store.products.map((p, i) =>
              i === sheet.index
                ? {
                    ...p,
                    title: String(v.title).trim() || p.title,
                    format_label: String(v.format_label).trim(),
                    description: String(v.description).trim(),
                    price_inr: Math.max(0, Math.round(Number(v.price_inr) || 0)),
                    cta_label: String(v.cta_label).trim() || p.cta_label,
                  }
                : p,
            );
            update({ ...draft.store, products });
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}