import Link from "next/link";
import { currentAdmin } from "@/lib/admin-auth";
import { istDay, loadAdminData, type Row } from "@/lib/admin-data";
import AdminLogin from "@/components/admin/AdminLogin";
import AskAi from "@/components/admin/AskAi";
import AdminSettings from "@/components/admin/AdminSettings";
import { BarList, Card, LineChart, StatCard, formatValue } from "@/components/admin/Charts";

const TABS = [
  ["overview", "📈 Overview"],
  ["ask", "✨ Ask AI"],
  ["stores", "🏪 Stores"],
  ["health", "🤖 AI health"],
  ["activity", "🕒 Activity"],
  ["settings", "⚙️ Settings"],
] as const;

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const rate = (a: number, b: number) => (b ? (a / b) * 100 : null);
const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
function countPoints(rows: Row[], field: string, limit = 8) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    const k = v === null || v === undefined || v === "" ? "unknown" : String(v);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([label, value]) => ({ label, value }));
}
const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  return user && domain ? `${user.slice(0, 2)}•••@${domain}` : "";
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await currentAdmin();
  if (!admin) return <AdminLogin />;
  const { tab = "overview" } = await searchParams;
  const { events, stores } = await loadAdminData();

  const sessions = new Map<string, Row[]>();
  for (const e of events) {
    const id = String(e.session_id);
    const list = sessions.get(id);
    if (list) list.push(e);
    else sessions.set(id, [e]);
  }
  const withEvent = (name: string) => {
    let n = 0;
    for (const list of sessions.values()) if (list.some((e) => e.event === name)) n++;
    return n;
  };
  const firstAt = (list: Row[], names: string[]) => {
    let min: string | null = null;
    for (const e of list) {
      if (!names.includes(String(e.event))) continue;
      const t = String(e.created_at);
      if (!min || t < min) min = t;
    }
    return min;
  };

  const visited = withEvent("home_viewed");
  const tried = withEvent("generate_started");
  const gotStore = withEvent("generated");
  const published = withEvent("published");
  const shared = withEvent("link_shared");

  const timeToPublish: number[] = [];
  for (const list of sessions.values()) {
    const start = firstAt(list, ["home_viewed", "generate_started"]);
    const pub = firstAt(list, ["published"]);
    if (start && pub && pub >= start) timeToPublish.push(Date.parse(pub) - Date.parse(start));
  }

  const days = Array.from({ length: 14 }, (_, i) => istDay(new Date(Date.now() - (13 - i) * 86_400_000).toISOString()));
  const visitorsPerDay = days.map((day) => ({ label: day, value: new Set(events.filter((e) => e.day === day).map((e) => String(e.session_id))).size }));
  const publishedPerDay = days.map((day) => ({ label: day, value: events.filter((e) => e.day === day && e.event === "published").length }));
  const today = istDay(new Date().toISOString());

  const totalViews = stores.reduce((a, s) => a + (Number(s.views) || 0), 0);
  const totalTaps = stores.reduce((a, s) => a + (Number(s.taps) || 0), 0);

  const starts = events.filter((e) => e.event === "generate_started");
  const generated = events.filter((e) => e.event === "generated");
  const genMs = generated.map((e) => Number(e.ms)).filter((n) => Number.isFinite(n) && n > 0);
  const failed = events.filter((e) => e.event === "generate_failed");
  const needsMore = events.filter((e) => e.event === "needs_more");
  const aiTools = events.filter((e) => e.event === "ai_rewrite" || e.event === "ai_assist");

  const funnel: Array<[string, number, number | null]> = [
    ["Visited", visited, null],
    ["Tried generating", tried, rate(tried, visited)],
    ["Got a store", gotStore, rate(gotStore, tried)],
    ["Published", published, rate(published, gotStore)],
    ["Shared on WhatsApp", shared, rate(shared, published)],
  ];

  return (
    <div className="min-h-dvh pb-16">
      <header className="bg-stone-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-5 lg:px-8">
          <div>
            <p className="text-lg font-extrabold">
              Pehla<span className="text-orange-500">Store</span>
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs font-semibold">Admin</span>
            </p>
            <p className="text-xs text-stone-400">Live data · test sessions excluded · {events.length.toLocaleString("en-IN")} events</p>
          </div>
          <Link href={`/admin?tab=${tab}`} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
            ↻ Refresh
          </Link>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-4 lg:px-8">
          {TABS.map(([id, label]) => (
            <Link
              key={id}
              href={`/admin?tab=${id}`}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${tab === id ? "bg-white font-semibold text-stone-900" : "text-stone-300 hover:bg-white/10"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard accent label="Publish rate" value={formatValue(rate(published, visited), "%")} hint="Visitors who published a store" />
              <StatCard label="Median time to published store" value={formatValue(percentile(timeToPublish, 50), "ms")} hint={`${timeToPublish.length} stores timed`} />
              <StatCard label="Stores live" value={String(stores.length)} hint={`${publishedPerDay[publishedPerDay.length - 1].value} today`} />
              <StatCard label="Store visits → taps" value={`${totalViews} → ${totalTaps}`} hint={`Tap rate ${formatValue(rate(totalTaps, totalViews), "%")}`} />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <Card title="Visitors per day" subtitle="Unique sessions, last 14 days (IST)">
                <LineChart points={visitorsPerDay} />
              </Card>
              <Card title="Stores published per day" subtitle="Last 14 days (IST)">
                <LineChart points={publishedPerDay} />
              </Card>
            </div>

            <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
              <Card title="Funnel" subtitle="Unique sessions; % = conversion from the step above">
                <div className="space-y-3">
                  {funnel.map(([label, value, conv]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-bold">
                          {value}
                          {conv !== null && <span className="ml-1 font-normal text-stone-500">({formatValue(conv, "%")})</span>}
                        </span>
                      </div>
                      <div className="mt-1 h-3 rounded-full bg-stone-100">
                        <div
                          className="h-3 rounded-full bg-linear-to-r from-orange-500 to-amber-400"
                          style={{ width: `${visited ? (value / visited) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Today" subtitle={today}>
                <BarList points={countPoints(events.filter((e) => e.day === today), "event", 7)} />
              </Card>
            </div>

            <Link
              href="/admin?tab=ask"
              className="flex items-center justify-between rounded-2xl bg-stone-900 px-5 py-4 text-white shadow-sm"
            >
              <span>
                <b>✨ Need a different view?</b> <span className="text-stone-300">Ask AI for any chart or table.</span>
              </span>
              <span>→</span>
            </Link>
          </div>
        )}

        {tab === "ask" && <AskAi />}

        {tab === "stores" && (
          <div className="space-y-3">
            {stores.length === 0 && <p className="text-sm text-stone-500">No stores yet.</p>}
            {stores.map((s) => (
              <div key={String(s.slug)} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-bold">{String(s.name)}</p>
                  <a href={`/s/${s.slug}`} target="_blank" rel="noreferrer" className="text-sm text-orange-700 underline">
                    /s/{String(s.slug)}
                  </a>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {ago(String(s.created_at))} · {String(s.language)} · {String(s.theme)} · {String(s.products)} products · {String(s.sections)} sections
                  </p>
                </div>
                <div className="flex gap-5 text-center">
                  {(
                    [
                      ["visits", String(s.views)],
                      ["taps", String(s.taps)],
                      ["tap rate", formatValue(Number(s.tap_rate), "%")],
                      ["link clicks", String(s.link_clicks)],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-lg font-extrabold">{value}</p>
                      <p className="text-[11px] text-stone-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "health" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard accent label="Generation success" value={formatValue(rate(generated.length, starts.length), "%")} hint={`${generated.length} of ${starts.length}`} />
              <StatCard label="Median generation time" value={formatValue(percentile(genMs, 50), "ms")} />
              <StatCard label="p90 generation time" value={formatValue(percentile(genMs, 90), "ms")} hint="Slowest 10%" />
              <StatCard label="Asked a follow-up" value={String(needsMore.length)} hint="Vague or gibberish input" />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Used a voice note" value={formatValue(rate(starts.filter((e) => e.audio === true).length, starts.length), "%")} />
              <StatCard label="Used screenshots" value={formatValue(rate(starts.filter((e) => Number(e.images) > 0).length, starts.length), "%")} />
              <StatCard label="Failures shown" value={String(failed.length)} hint="Creator saw a retry message" />
              <StatCard label="Generations per session" value={tried ? (starts.length / tried).toFixed(1) : "-"} hint="Above 1 = regenerations" />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <Card title="Which model answered">
                <BarList points={countPoints(generated, "model")} />
              </Card>
              <Card title="Failures by reason">
                <BarList points={countPoints(failed, "reason")} />
              </Card>
              <Card title="Follow-up questions by reason">
                <BarList points={countPoints(needsMore, "reason")} />
              </Card>
              <Card title="AI tools used">
                <BarList points={countPoints(aiTools.map((e) => ({ ...e, tool: `${e.event} · ${e.section ?? e.kind ?? ""}` })), "tool")} />
              </Card>
              <Card title="Store language">
                <BarList points={countPoints(starts, "language")} />
              </Card>
              <Card title="Audience size">
                <BarList points={countPoints(starts, "followers")} />
              </Card>
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-sm">
            {events.slice(0, 60).map((e, i) => {
              const details = Object.entries(e)
                .filter(([k, v]) => !["event", "session_id", "created_at", "day", "hour"].includes(k) && v !== null)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ");
              return (
                <div key={i} className="flex items-start gap-3 border-b border-stone-100 px-4 py-2.5 text-sm last:border-0">
                  <span className="w-16 shrink-0 text-xs text-stone-400">{ago(String(e.created_at))}</span>
                  <span className="w-36 shrink-0 font-semibold">{String(e.event)}</span>
                  <span className="w-14 shrink-0 font-mono text-xs text-stone-400">{String(e.session_id).slice(0, 6)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{details}</span>
                </div>
              );
            })}
            {events.length === 0 && <p className="p-4 text-sm text-stone-500">No events yet.</p>}
          </div>
        )}

                      {tab === "settings" && <AdminSettings email={admin} />}
      </main>
    </div>
  );
}