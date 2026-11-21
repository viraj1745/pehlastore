"use client";

import { useState } from "react";
import type { LaunchPlan } from "@/lib/types";

const CHANNEL_STYLE: Record<string, string> = {
  Reel: "bg-pink-100 text-pink-800",
  Story: "bg-amber-100 text-amber-800",
  Post: "bg-sky-100 text-sky-800",
  Carousel: "bg-indigo-100 text-indigo-800",
  WhatsApp: "bg-emerald-100 text-emerald-800",
  Live: "bg-red-100 text-red-800",
};

export default function LaunchPlanPanel({
  plan,
  liveUrl,
  onGenerate,
}: {
  plan?: LaunchPlan;
  liveUrl: string;
  onGenerate: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const fill = (text: string) => text.replaceAll("{link}", liveUrl || "[your store link]");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      await onGenerate();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">📅 7-day launch plan</h2>
        {plan && (
          <button type="button" onClick={generate} disabled={busy} className="press text-sm font-semibold text-orange-700 disabled:opacity-60">
            {busy ? "Planning…" : "↻ New plan"}
          </button>
        )}
      </div>

      {!plan ? (
        <div className="mt-2">
          <p className="text-sm text-stone-600">
            A day-by-day plan for your first week: a teaser, a poll to see what followers want, your free resource drop and launch day, each with a
            ready-to-use script.
          </p>
          <button type="button" onClick={generate} disabled={busy} className="press mt-3 w-full rounded-full bg-orange-600 py-3 font-semibold text-white disabled:opacity-60">
            {busy ? "Planning your week…" : "✨ Create my 7-day plan"}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <ol className="relative mt-4 space-y-4 border-l-2 border-orange-200 pl-5">
          {plan.days.map((d, i) => (
            <li key={d.day} className={`anim-fade-up delay-${Math.min(i, 5)}`}>
              <span className="absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">{d.day}</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHANNEL_STYLE[d.channel] ?? "bg-stone-100"}`}>{d.channel}</span>
                <p className="text-sm font-bold">{d.title}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{fill(d.script)}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(fill(d.script)).catch(() => {});
                  setCopied(d.day);
                  setTimeout(() => setCopied(null), 1800);
                }}
                className="press mt-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold"
              >
                {copied === d.day ? "Copied ✓" : "Copy script"}
              </button>
            </li>
          ))}
        </ol>
      )}
      {plan && error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}