"use client";

import { useMemo, useState } from "react";

const COLORS = ["#ea580c", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

export default function Celebration({
  url,
  onClose,
  onLaunchKit,
  onShare,
}: {
  url: string;
  onClose: () => void;
  onLaunchKit: () => void;
  onShare: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 1.6,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
      })),
    [],
  );

  return (
    <div className="anim-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {pieces.map((p, i) => (
          <span
            key={i}
            className="absolute top-0 block rounded-sm"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              background: p.color,
              animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            }}
          />
        ))}
      </div>

      <div
        className="anim-sheet-up relative w-full max-w-md rounded-t-3xl bg-white p-6 pb-10 text-center shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="anim-pop text-5xl">🎉</p>
        <h2 className="mt-3 text-2xl font-extrabold">Your store is live!</h2>
        <p className="mt-1 text-stone-600">Share it while it&apos;s fresh. Your launch kit has everything ready to post.</p>
        <p className="mt-4 break-all rounded-2xl bg-stone-100 px-4 py-3 text-sm font-medium">{url.replace(/^https?:\/\//, "")}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(url).catch(() => {});
              setCopied(true);
            }}
            className="press rounded-full border border-stone-300 py-3 font-semibold"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out my new store 👉 ${url}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={onShare}
            className="press rounded-full bg-[#25D366] py-3 font-semibold text-white"
          >
            WhatsApp
          </a>
        </div>
        <button type="button" onClick={onLaunchKit} className="press mt-3 w-full rounded-full bg-stone-900 py-3.5 font-semibold text-white">
          📣 Get my launch kit
        </button>
        <button type="button" onClick={onClose} className="mt-3 text-sm text-stone-500">
          Keep editing
        </button>
      </div>
    </div>
  );
}