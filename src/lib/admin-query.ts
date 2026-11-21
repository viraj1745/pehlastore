import { z } from "zod";
import { FIELDS, type Cell, type Datasets, type Row } from "./admin-data";

const Value = z.union([z.string(), z.number(), z.boolean()]);
export const FilterSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "in", "contains", "gte", "lte", "exists"]),
  value: z.union([Value, z.array(Value)]).nullish(),
});
type Filter = z.infer<typeof FilterSchema>;

export const WidgetSchema = z.object({
  type: z.enum(["number", "bar", "line", "table"]),
  title: z.string().min(1).max(90),
  dataset: z.enum(["events", "stores", "store_events"]),
  filters: z.array(FilterSchema).max(6).nullish().transform((v) => v ?? []),
  group_by: z.string().nullish().transform((v) => v || null),
  metric: z
    .enum(["count", "unique_sessions", "sum", "avg", "median", "p90", "rate"])
    .nullish()
    .catch(null)
    .transform((v) => v ?? "count"),
  metric_field: z.string().nullish().transform((v) => v || null),
  rate_filters: z.array(FilterSchema).max(4).nullish().transform((v) => v ?? []),
  sort: z
    .enum(["desc", "asc", "key"])
    .nullish()
    .catch(null)
    .transform((v) => v ?? "desc"),
  limit: z.coerce.number().int().min(1).max(60).nullish().catch(null).transform((v) => v ?? 12),
  columns: z.array(z.string()).max(8).nullish().transform((v) => v ?? []),
});
export type Widget = z.infer<typeof WidgetSchema>;

export const SpecSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(500).nullish().transform((v) => v ?? ""),
  widgets: z.array(WidgetSchema).min(1).max(4),
});
export type Spec = z.infer<typeof SpecSchema>;

export type WidgetResult =
  | { kind: "number"; value: number | null; unit: string }
  | { kind: "series"; points: Array<{ label: string; value: number }>; unit: string }
  | { kind: "rows"; columns: string[]; rows: Cell[][] }
  | { kind: "error"; message: string };

const toNum = (v: unknown): number | null => {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
};
const round = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

function compare(v: Cell | undefined, target: unknown, op: "gte" | "lte") {
  const a = toNum(v);
  const b = toNum(target);
  if (a !== null && b !== null) return op === "gte" ? a >= b : a <= b;
  return op === "gte" ? String(v ?? "") >= String(target ?? "") : String(v ?? "") <= String(target ?? "");
}

function match(row: Row, f: Filter): boolean {
  const v = row[f.field];
  const t = f.value;
  switch (f.op) {
    case "exists":
      return v !== null && v !== undefined && v !== "";
    case "eq":
      return String(v) === String(t);
    case "neq":
      return String(v) !== String(t);
    case "in":
      return Array.isArray(t) ? t.map(String).includes(String(v)) : String(v) === String(t);
    case "contains":
      return String(v ?? "").toLowerCase().includes(String(t ?? "").toLowerCase());
    case "gte":
    case "lte":
      return compare(v, Array.isArray(t) ? null : t, f.op);
  }
}

function aggregate(rows: Row[], w: Widget): number | null {
  const nums = () => rows.map((r) => toNum(r[w.metric_field ?? ""])).filter((n): n is number => n !== null);
  const sessions = (list: Row[]) => new Set(list.map((r) => String(r.session_id))).size;
  switch (w.metric) {
    case "count":
      return rows.length;
    case "unique_sessions":
      return sessions(rows);
    case "sum":
      return nums().reduce((a, b) => a + b, 0);
    case "avg": {
      const n = nums();
      return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
    }
    case "median":
      return percentile(nums(), 50);
    case "p90":
      return percentile(nums(), 90);
    case "rate": {
      if (!rows.length) return null;
      const hits = rows.filter((r) => w.rate_filters.every((f) => match(r, f)));
      if (w.dataset === "events") return (sessions(hits) / sessions(rows)) * 100;
      return (hits.length / rows.length) * 100;
    }
  }
}

export function runWidget(w: Widget, data: Datasets): WidgetResult {
  const allowed = new Set(Object.keys(FIELDS[w.dataset]));
  const used = [w.group_by, w.metric_field, ...w.filters.map((f) => f.field), ...w.rate_filters.map((f) => f.field), ...w.columns].filter(
    (f): f is string => Boolean(f),
  );
  const unknown = used.filter((f) => !allowed.has(f));
  if (unknown.length) return { kind: "error", message: `Unknown field: ${unknown.join(", ")}` };
  if (["sum", "avg", "median", "p90"].includes(w.metric) && !w.metric_field) return { kind: "error", message: "This metric needs a number field." };

  const rows = data[w.dataset].filter((r) => w.filters.every((f) => match(r, f)));
  const unit = w.metric === "rate" || w.metric_field === "tap_rate" ? "%" : w.metric_field === "ms" ? "ms" : "";

  if (w.type === "table" && !w.group_by) {
    const columns = w.columns.length ? w.columns : Object.keys(FIELDS[w.dataset]).slice(0, 5);
    const sorted = [...rows].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    return { kind: "rows", columns, rows: sorted.slice(0, w.limit).map((r) => columns.map((c) => r[c] ?? null)) };
  }
  if (w.type === "number" || !w.group_by) return { kind: "number", value: round(aggregate(rows, w)), unit };

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r[w.group_by];
    const key = k === null || k === undefined || k === "" ? "(none)" : String(k);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  let points = [...groups.entries()].map(([label, list]) => ({ label, value: round(aggregate(list, w)) ?? 0 }));
  if (w.type === "line" || w.sort === "key") points.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  else points.sort((a, b) => (w.sort === "asc" ? a.value - b.value : b.value - a.value));
  points = w.type === "line" ? points.slice(-w.limit) : points.slice(0, w.limit);

  if (w.type === "table") {
    const metricLabel = w.metric === "rate" ? "rate %" : w.metric === "count" ? "count" : `${w.metric} ${w.metric_field ?? ""}`.trim();
    return { kind: "rows", columns: [w.group_by, metricLabel], rows: points.map((p) => [p.label, p.value]) };
  }
  return { kind: "series", points, unit };
}

export const runSpec = (spec: Spec, data: Datasets) => spec.widgets.map((w) => runWidget(w, data));