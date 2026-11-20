"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { inr } from "@/lib/format";

type Stats = { views: number; interest: Record<string, number> };

export default function DemandCard({ slug, editToken, products }: { slug: string; editToken: string; products: Product[] }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stats?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(editToken)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) setStats({ views: data.views, interest: data.interest });
      else setError("Couldn't load your numbers.");
    } catch {
      setError("Couldn't load your numbers.");
    }
    setLoading(false);
  }, [slug, editToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const taps = products.map((p) => ({ p, n: stats?.interest[p.id] ?? 0 }));
  const totalTaps = taps.reduce((sum, t) => sum + t.n, 0);
  const max = Math.max(1, ...taps.map((t) => t.n));
  const topPaid = taps.filter((t) => t.p.price_inr > 0).sort((a, b) => b.n - a.n)[0];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">📊 What your audience wants</p>
        <button type="button" onClick={load} disabled={loading} className="text-xs font-semibold text-orange-700">
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {stats ? `${stats.views} ${stats.views === 1 ? "visit" : "visits"} · ${totalTaps} product taps` : "Loading…"}
      </p>

      <div className="mt-3 space-y-2">
        {taps.map(({ p, n }) => (
          <div key={p.id}>
            <div className="flex justify-between text-xs">
              <span className="truncate pr-2">{p.title}</span>
              <span className="font-semibold">{n}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-stone-100">
              <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-900">
        {topPaid && topPaid.n > 0 ? (
          <>
            📈 <b>{topPaid.p.title}</b> ({inr(topPaid.p.price_inr)}) has the most interest. Build this one first.
          </>
        ) : (
          "Share your link. Every tap on a product shows what your audience will actually pay for, before you spend time building it."
        )}
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}