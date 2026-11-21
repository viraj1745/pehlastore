import type { WidgetResult } from "@/lib/admin-query";

type Point = { label: string; value: number };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatValue(v: number | null | undefined, unit = ""): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  if (unit === "ms") return v >= 60_000 ? `${(v / 60_000).toFixed(1)} min` : `${(v / 1000).toFixed(1)}s`;
  if (unit === "%") return `${Math.round(v)}%`;
  return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toFixed(1);
}

export function shortLabel(label: string) {
  const m = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : label;
}

const Empty = () => <p className="py-6 text-center text-sm text-stone-400">No data yet</p>;

export function Card({ title, subtitle, children, className = "" }: { title?: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm ${className}`}>
      {title && <p className="text-sm font-bold">{title}</p>}
      {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      <div className={title || subtitle ? "mt-4" : ""}>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, hint, accent = false }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${accent ? "bg-linear-to-br from-orange-500 to-amber-500 text-white" : "border border-stone-200/70 bg-white"}`}>
      <p className={`text-xs font-medium ${accent ? "text-orange-50" : "text-stone-500"}`}>{label}</p>
      <p className="mt-1.5 text-3xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? "text-orange-100" : "text-stone-400"}`}>{hint}</p>}
    </div>
  );
}

export function BarList({ points, unit = "" }: { points: Point[]; unit?: string }) {
  if (!points.length) return <Empty />;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="space-y-2.5">
      {points.map((p) => (
        <div key={p.label}>
          <div className="flex justify-between gap-3 text-xs">
            <span className="truncate">{shortLabel(p.label)}</span>
            <span className="font-semibold">{formatValue(p.value, unit)}</span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-stone-100">
            <div className="h-2.5 rounded-full bg-linear-to-r from-orange-500 to-amber-400" style={{ width: `${(p.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ points, unit = "" }: { points: Point[]; unit?: string }) {
  if (!points.length) return <Empty />;
  const W = 600;
  const H = 180;
  const P = 6;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => (points.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${x(0)},${H - P} ${line} ${x(points.length - 1)},${H - P}`;
  const ticks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  return (
    <div>
      <div className="flex justify-between text-xs text-stone-400">
        <span>Peak {formatValue(max, unit)}</span>
        <span>Latest {formatValue(points[points.length - 1].value, unit)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-40 w-full">
        <polygon points={area} className="fill-orange-500/15" />
        <polyline points={line} fill="none" className="stroke-orange-500" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-stone-500">
        {ticks.map((i) => (
          <span key={i}>{shortLabel(points[i].label)}</span>
        ))}
      </div>
    </div>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number | boolean | null>> }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            {columns.map((c) => (
              <th key={c} className="px-2 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-stone-100 last:border-0">
              {r.map((v, j) => (
                <td key={j} className="max-w-56 truncate px-2 py-2">
                  {v === null ? "-" : typeof v === "number" ? formatValue(v) : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WidgetView({ type, title, result }: { type: string; title: string; result: WidgetResult }) {
  if (result.kind === "number") return <StatCard label={title} value={formatValue(result.value, result.unit)} />;
  return (
    <Card title={title}>
      {result.kind === "error" && <p className="text-sm text-red-600">⚠️ {result.message}</p>}
      {result.kind === "series" && (type === "line" ? <LineChart points={result.points} unit={result.unit} /> : <BarList points={result.points} unit={result.unit} />)}
      {result.kind === "rows" && <DataTable columns={result.columns} rows={result.rows} />}
    </Card>
  );
}