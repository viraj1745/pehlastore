"use client";

import { useState } from "react";
import type { LaunchKit as Kit } from "@/lib/types";
import { trackEvent } from "@/lib/client/track";

export default function LaunchKit({
  kit,
  instagramBio,
  liveUrl,
  storyUrl,
}: {
  kit: Kit;
  instagramBio: string;
  liveUrl: string;
  storyUrl: string;
}) {
  const [copied, setCopied] = useState("");
  const fill = (text: string) => text.replaceAll("{link}", liveUrl || "[your store link]");

  const items = [
    { id: "bio", label: "1 · Instagram bio", hint: "Instagram → Edit profile → Bio. Add your store link under Links.", text: instagramBio },
    { id: "reel", label: "2 · Reel caption", hint: "Post a Reel about your free resource with this caption.", text: kit.reel_caption },
    {
      id: "dm",
      label: `3 · Auto-DM reply · keyword ${kit.comment_keyword}`,
      hint: `In SuperProfile Auto-DM, set the keyword ${kit.comment_keyword} on your Reel and paste this reply.`,
      text: fill(kit.auto_dm_reply),
    },
    { id: "story", label: "4 · Story text", hint: "Add a link sticker with your store link.", text: kit.story_text },
    { id: "wa", label: "5 · WhatsApp broadcast", hint: "Send to your contacts and groups.", text: fill(kit.whatsapp_message) },
  ];

  function copy(id: string, text: string) {
    trackEvent("launch_kit_copied", { item: id });
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(""), 1800);
  }

  return (
    <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-extrabold">📣 Launch kit</h2>
      <p className="mt-1 text-sm text-stone-600">
        A store with no visitors doesn&apos;t sell. Here&apos;s everything to announce yours, written in your voice.
      </p>
      {!liveUrl && <p className="mt-2 text-xs font-semibold text-amber-700">Publish first, so your real link is filled in below.</p>}

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-stone-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{item.label}</p>
              <button
                type="button"
                onClick={() => copy(item.id, item.text)}
                className="shrink-0 rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white"
              >
                {copied === item.id ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <p className="mt-0.5 text-xs text-stone-500">{item.hint}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{item.text}</p>
            {item.id === "wa" && liveUrl && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(item.text)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Send on WhatsApp
              </a>
            )}
          </div>
        ))}

        <div className="rounded-2xl bg-stone-50 p-3">
          <p className="text-sm font-bold">6 · Story image</p>
          {storyUrl ? (
            <div className="mt-2 flex items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={storyUrl} alt="Story image preview" className="h-48 rounded-xl border border-stone-200" />
                            <a
                href={storyUrl}
                download="my-store-story.png"
                onClick={() => trackEvent("story_downloaded")}
                className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Download
              </a>
            </div>
          ) : (
            <p className="mt-1 text-xs text-stone-500">Publish to get a ready-made 1080×1920 story image.</p>
          )}
        </div>
      </div>
    </section>
  );
}