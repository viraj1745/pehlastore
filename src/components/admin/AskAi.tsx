"use client";

import { useEffect, useState } from "react";
import type { Spec, WidgetResult } from "@/lib/admin-query";
import { WidgetView } from "./Charts";

type View = { question: string; spec: Spec; results: WidgetResult[] };
const PINS_KEY = "ps_admin_pins";
const SUGGESTIONS = [
  "Publish rate and funnel",
  "Visitors per day, last 14 days",
  "Which AI model is fastest?",
  "Why did generations fail?",
  "Top stores by product taps",
  "Voice note vs typed input",
];

function ViewGrid({ view }: { view: View }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {view.spec.widgets.map((w, i) => {
        const result = view.results[i] ?? { kind: "error", message: "No result" };
        return (
          <div key={i} className={result.kind === "number" ? "" : "sm:col-span-2"}>
            <WidgetView type={w.type} title={w.title} result={result} />
          </div>
        );
      })}
    </div>
  );
}

export default function AskAi() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState<View | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [pins, setPins] = useState<View[]>([]);

  useEffect(() => {
    let saved: Array<{ question: string; spec: Spec }> = [];
    try {
      saved = JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]");
    } catch {}
    if (!saved.length) return;
    Promise.all(
      saved.map(async (p) => {
        try {
          const res = await fetch("/api/admin/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec: p.spec }) });
          const data = await res.json();
          return data?.status === "ok" ? { ...p, results: data.results as WidgetResult[] } : null;
        } catch {
          return null;
        }
      }),
    ).then((list) => setPins(list.filter((v): v is View => v !== null)));
  }, []);

  function savePins(list: View[]) {
    setPins(list);
    try {
      localStorage.setItem(PINS_KEY, JSON.stringify(list.map(({ question: q, spec }) => ({ question: q, spec }))));
    } catch {}
  }

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    setBusy(true);
    setError("");
    setShowPlan(false);
    try {
      const res = await fetch("/api/admin/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      const data = await res.json().catch(() => null);
      if (data?.status === "ok") setAnswer({ question: text, spec: data.spec, results: data.results });
      else setError(data?.message ?? "Couldn't build that view. Please try again.");
    } catch {
      setError("Connection problem. Please try again.");
    }
    setBusy(false);
  }

  const pinned = answer ? pins.some((p) => p.question === answer.question) : false;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-linear-to-br from-stone-900 to-stone-800 p-6 text-white shadow-lg">
        <p className="text-lg font-bold">✨ Ask for any dashboard</p>
        <p className="mt-1 text-sm text-stone-300">
          Ask in plain English. The AI picks the data and the chart; the server calculates every number from real rows.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={400}
            placeholder="e.g. Publish rate by store language"
            className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-base text-stone-900 outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button type="submit" disabled={busy || !question.trim()} className="press shrink-0 rounded-xl bg-orange-500 px-5 font-semibold disabled:bg-stone-600">
            {busy ? "…" : "Ask"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} disabled={busy} className="press rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      </div>

      {busy && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-32 animate-pulse rounded-2xl bg-stone-200/70 ${i === 2 ? "sm:col-span-2" : ""}`} />
          ))}
        </div>
      )}

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {answer && !busy && (
        <div className="anim-fade-up space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{answer.spec.title}</p>
              {answer.spec.summary && <p className="mt-0.5 max-w-2xl text-sm text-stone-600">{answer.spec.summary}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPlan(!showPlan)} className="press rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">
                🧾 {showPlan ? "Hide plan" : "Show plan"}
              </button>
              <button
                type="button"
                disabled={pinned}
                onClick={() => savePins([answer, ...pins].slice(0, 8))}
                className="press rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-600"
              >
                {pinned ? "Pinned ✓" : "📌 Pin"}
              </button>
            </div>
          </div>
          {showPlan && (
            <pre className="max-h-72 overflow-auto rounded-2xl bg-stone-900 p-4 text-xs text-emerald-200">{JSON.stringify(answer.spec, null, 2)}</pre>
          )}
          <ViewGrid view={answer} />
        </div>
      )}

      {pins.length > 0 && (
        <div className="space-y-4 border-t border-stone-200 pt-6">
          <p className="text-sm font-bold uppercase tracking-wide text-stone-500">📌 Pinned views · fresh data</p>
          {pins.map((p) => (
            <div key={p.question} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold">{p.spec.title}</p>
                <button type="button" onClick={() => savePins(pins.filter((x) => x.question !== p.question))} className="text-sm text-stone-500 hover:text-red-600">
                  Unpin
                </button>
              </div>
              <ViewGrid view={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}