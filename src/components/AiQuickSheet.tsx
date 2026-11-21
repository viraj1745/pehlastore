"use client";

import { useState } from "react";
import type { Language } from "@/lib/types";

type Quick = { label: string; instruction: string };

const GROUPS: Record<"profile" | "product", Array<{ name: string; items: Quick[] }>> = {
  profile: [
    {
      name: "Length",
      items: [
        { label: "✂️ Shorter", instruction: "Make it shorter and punchier." },
        { label: "📝 More detail", instruction: "Add a little more detail about who I help and how, still concise." },
      ],
    },
    {
      name: "Tone",
      items: [
        { label: "😊 Friendly", instruction: "Sound warmer and more friendly, like talking to a follower." },
        { label: "💼 Professional", instruction: "Sound more confident and professional." },
        { label: "🎉 Fun + emojis", instruction: "Make it playful and add 2-3 fitting emojis." },
      ],
    },
    {
      name: "Focus",
      items: [{ label: "🎯 Who I help", instruction: "Make it clearer exactly who I help and the result they get." }],
    },
  ],
  product: [
    {
      name: "Length",
      items: [
        { label: "✂️ Shorter", instruction: "Make the title and description shorter and punchier." },
        { label: "📝 More detail", instruction: "Add more concrete detail about what the buyer gets, still concise." },
      ],
    },
    {
      name: "Tone",
      items: [
        { label: "💎 Premium", instruction: "Position it as a more premium, higher-value offer." },
        { label: "🌱 For beginners", instruction: "Use simpler words for complete beginners." },
        { label: "🎉 Fun + emojis", instruction: "Make it playful and add 2-3 fitting emojis." },
      ],
    },
    {
      name: "Focus",
      items: [
        { label: "🎯 Clearer benefit", instruction: "Make the buyer's benefit clearer and more concrete." },
        {
          label: "⏳ Honest urgency",
          instruction: "Add gentle, honest urgency (for example limited live seats). Never invent deadlines, discounts or fake scarcity.",
        },
        { label: "🔄 Different idea", instruction: "" },
      ],
    },
  ],
};

const LANGS: Array<{ label: string; language: Language }> = [
  { label: "English", language: "en" },
  { label: "Hinglish", language: "hinglish" },
  { label: "हिंदी", language: "hi" },
];

export default function AiQuickSheet({
  kind,
  title,
  onRun,
  onClose,
}: {
  kind: "profile" | "product";
  title: string;
  onRun: (instruction: string, language?: Language) => Promise<void>;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function run(key: string, instruction: string, language?: Language) {
    setBusy(key);
    setError("");
    try {
      await onRun(instruction, language);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  }

  const chip = (key: string) =>
    `press inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition disabled:opacity-60 ${
      busy === key ? "border-orange-500 bg-orange-50 font-semibold" : "border-stone-200 bg-white hover:border-orange-300"
    }`;
  const spinner = <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />;
  const heading = "text-xs font-semibold uppercase tracking-wide text-stone-500";

  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <div
        className="anim-sheet-up max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-200 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">✨ Rewrite with AI</h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-stone-500">{title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(busy)} className="text-sm text-stone-500 disabled:opacity-40">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {GROUPS[kind].map((group) => (
            <div key={group.name}>
              <p className={heading}>{group.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.items.map((q) => (
                  <button key={q.label} type="button" onClick={() => run(q.label, q.instruction)} disabled={Boolean(busy)} className={chip(q.label)}>
                    {q.label}
                    {busy === q.label && spinner}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className={heading}>Rewrite in</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGS.map((l) => {
                const key = `lang-${l.language}`;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => run(key, `Rewrite this in ${l.label}, keeping the same meaning.`, l.language)}
                    disabled={Boolean(busy)}
                    className={chip(key)}
                  >
                    🌐 {l.label}
                    {busy === key && spinner}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-orange-50 p-3">
          <p className="text-sm font-semibold text-orange-900">Or tell the AI what to change</p>
          <div className="mt-2 flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={300}
              placeholder={kind === "profile" ? "e.g. mention I'm a certified trainer" : "e.g. make it for college students"}
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
            <button
              type="button"
              onClick={() => run("custom", custom.trim())}
              disabled={Boolean(busy) || !custom.trim()}
              className="press shrink-0 rounded-xl bg-orange-600 px-4 font-semibold text-white disabled:bg-stone-300"
            >
              {busy === "custom" ? "…" : "Go"}
            </button>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-3 text-center text-xs text-stone-400">Changes appear in your preview right away. You can undo.</p>
      </div>
    </div>
  );
}