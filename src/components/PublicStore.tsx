"use client";

import { useEffect, useState } from "react";
import StoreView, { THEMES, type ThemeKey } from "./StoreView";
import type { Product, StoreContent } from "@/lib/types";

function track(slug: string, kind: "view" | "interest" | "cta", productKey?: string) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, kind, productKey }),
    keepalive: true,
  }).catch(() => {});
}

export default function PublicStore({
  slug,
  store,
  handle,
  theme,
}: {
  slug: string;
  store: StoreContent;
  handle: string;
  theme: string;
}) {
  const [picked, setPicked] = useState<Product | null>(null);
  const [copied, setCopied] = useState(false);
  const themeKey = (theme in THEMES ? theme : "sunrise") as ThemeKey;
  const dmLink = handle ? `https://ig.me/m/${handle}` : "https://instagram.com";
  const keyword = store.launch_kit.comment_keyword;

  useEffect(() => {
    try {
      const key = `pehlastore:viewed:${slug}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        track(slug, "view");
      }
    } catch {
      track(slug, "view");
    }
  }, [slug]);

  return (
    <>
      <StoreView
        store={store}
        handle={handle}
        theme={themeKey}
        mode="public"
        onProductAction={(product) => {
          track(slug, "interest", product.id);
          setPicked(product);
          setCopied(false);
        }}
      />

      {picked && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setPicked(null)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200" />
            {picked.type === "lead_magnet" ? (
              <>
                <p className="text-2xl">🎁</p>
                <h3 className="mt-2 text-xl font-bold">Get “{picked.title}” free</h3>
                <p className="mt-2 text-stone-600">
                  Send <b>{keyword}</b> to {handle ? `@${handle}` : "the creator"} on Instagram and you&apos;ll get it in your DMs.
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(keyword).catch(() => {});
                      setCopied(true);
                    }}
                    className="flex-1 rounded-full border border-stone-300 py-3 font-semibold"
                  >
                    {copied ? "Copied ✓" : `Copy “${keyword}”`}
                  </button>
                  <a href={dmLink} target="_blank" rel="noreferrer" className="flex-1 rounded-full bg-orange-600 py-3 text-center font-semibold text-white">
                    Open Instagram
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="text-2xl">🙌</p>
                <h3 className="mt-2 text-xl font-bold">You&apos;re on the early list</h3>
                <p className="mt-2 text-stone-600">
                  {store.display_name} is opening “{picked.title}” soon. Your interest has been counted: it helps decide what launches
                  first.
                </p>
                <a
                  href={dmLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 block rounded-full bg-orange-600 py-3 text-center font-semibold text-white"
                >
                  Message {handle ? `@${handle}` : "the creator"} on Instagram
                </a>
              </>
            )}
            <p className="mt-4 text-center text-xs text-stone-400">Payments open soon · Built with PehlaStore</p>
          </div>
        </div>
      )}
    </>
  );
}