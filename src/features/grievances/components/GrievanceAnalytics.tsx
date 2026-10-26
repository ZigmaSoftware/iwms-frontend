import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Gauge, Hourglass, Inbox, Tags, Timer } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/api";
import { cn } from "@/lib/utils";
import type {
  ComplaintsReportResponse,
  PendingAgingBucket,
} from "@/pages/admin/modules/reports/complaintReports/types";

// Same aggregates as the admin Complaints Report; limit=1 because only the
// summary blocks are used here, not the register rows.
const REPORT_URL = "/reports/complaints-report/";
const PERIODS = [7, 14, 30, 90] as const;
const RECEIVED_COLOR = "#0EA5E9";
const RESOLVED_COLOR = "#10B981";
const TOP_WARDS = 8;

const AGING_TONE: Record<PendingAgingBucket["key"], string> = {
  "0_24": "border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-200",
  "24_48": "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200",
  "48_72": "border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200",
  "72_plus": "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200",
};

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const rangeFor = (days: number) => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from_date: isoDate(from), to_date: isoDate(to) };
};

const fmt = (n?: number | null) => (typeof n === "number" ? n.toLocaleString("en-IN") : "—");

const fmtDay = (value: string) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

const fmtHours = (hours: number | null) => {
  if (hours == null) return "—";
  return hours < 24 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} d`;
};

export function GrievanceAnalytics({ reloadKey }: { reloadKey: number }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) => t(`dashboard.grievances.analytics.${key}`, opts);
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);

  // Keyed like the list on the page: a mismatch means the fetch is in flight.
  const requestKey = `${days}:${reloadKey}`;
  const [result, setResult] = useState<{ key: string; report: ComplaintsReportResponse | null; error: boolean }>({
    key: "",
    report: null,
    error: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<ComplaintsReportResponse>(REPORT_URL, {
        params: { ...rangeFor(days), page: "1", limit: "1" },
        signal: controller.signal,
      })
      .then(({ data }) => setResult({ key: requestKey, report: data, error: false }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load complaint analytics", err);
        setResult({ key: requestKey, report: null, error: true });
      });
    return () => controller.abort();
  }, [days, requestKey]);

  const loading = result.key !== requestKey;
  const report = result.report;
  const kpis = report?.kpis;
  const maxCategory = Math.max(1, ...(report?.category_breakdown ?? []).map((c) => c.count));
  const wards = (report?.ward_breakdown ?? []).filter((w) => w.received || w.pending).slice(0, TOP_WARDS);

  const insights = [
    { label: k("received"), value: fmt(kpis?.total), sub: k("received_sub", { days }), Icon: Inbox, tone: "text-sky-600 dark:text-sky-300" },
    { label: k("resolution_rate"), value: kpis ? `${kpis.resolved_percent.toFixed(1)}%` : "—", sub: k("resolution_rate_sub", { count: kpis?.resolved ?? 0 }), Icon: Gauge, tone: "text-emerald-600 dark:text-emerald-300" },
    { label: k("avg_resolution"), value: fmtHours(kpis?.avg_resolution_hours ?? null), sub: k("avg_resolution_sub"), Icon: Timer, tone: "text-violet-600 dark:text-violet-300" },
    { label: k("sla_compliance"), value: kpis ? `${kpis.sla_compliance_percent.toFixed(1)}%` : "—", sub: k("sla_compliance_sub", { count: kpis?.escalated ?? 0 }), Icon: Hourglass, tone: "text-amber-600 dark:text-amber-300" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          {k("title")}
        </h3>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label={k("period")}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={days === p}
              onClick={() => setDays(p)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                days === p
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k("days", { count: p })}
            </button>
          ))}
        </div>
      </div>

      {result.error && !loading && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
          {k("error")}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {insights.map(({ label, value, sub, Icon, tone }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className={cn("h-4 w-4 shrink-0", tone)} />
            </div>
            {loading ? (
              <span className="mt-2 block h-7 w-20 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
            ) : (
              <p className={cn("mt-1 text-2xl font-bold tabular-nums", tone)}>{value}</p>
            )}
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          title={k("daily_trend")}
          action={
            <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 rounded" style={{ background: RECEIVED_COLOR }} />{k("received_series")}</span>
              <span className="flex items-center gap-1"><span className="w-3 border-t-2 border-dashed" style={{ borderColor: RESOLVED_COLOR }} />{k("resolved_series")}</span>
            </span>
          }
        >
          {loading ? <Skeleton /> : !report?.daily_trend.length ? <Empty text={k("no_data")} /> : (
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <LineChart data={report.daily_trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  labelFormatter={(v) => fmtDay(String(v))}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Line type="monotone" dataKey="received" name={k("received_series")} stroke={RECEIVED_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="resolved" name={k("resolved_series")} stroke={RESOLVED_COLOR} strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={k("by_category")} icon={<Tags className="h-4 w-4 text-muted-foreground" />}>
          {loading ? <Skeleton /> : !report?.category_breakdown.length ? <Empty text={k("no_data")} /> : (
            <div className="h-full space-y-2.5 overflow-y-auto pr-1 scrollbar-none">
              {report.category_breakdown.map((c) => (
                <div key={c.category_id || c.category_name}>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="truncate font-medium" title={c.category_name}>{c.category_name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {fmt(c.count)} <span className="font-normal text-muted-foreground">({c.share_percent.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title={k("pending_by_age")}
          action={<span className="text-[11px] text-muted-foreground">{k("unresolved", { count: kpis?.pending ?? 0 })}</span>}
        >
          {loading ? <Skeleton /> : (
            <div className="grid h-full grid-cols-2 gap-2">
              {(report?.pending_aging ?? []).map((a) => (
                <div key={a.key} className={cn("flex flex-col justify-center rounded-lg border px-3 py-2", AGING_TONE[a.key])}>
                  <span className="text-[11px] font-medium opacity-80">{a.label}</span>
                  <span className="text-xl font-bold tabular-nums">{fmt(a.count)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h4 className="text-sm font-semibold">{k("wards_by_pendency")}</h4>
          <span className="text-[11px] text-muted-foreground">{k("top_wards", { count: TOP_WARDS })}</span>
        </div>
        {loading ? (
          <div className="p-4"><Skeleton /></div>
        ) : !wards.length ? (
          <Empty text={k("no_data")} />
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-2 font-medium">{k("ward")}</th>
                  <th className="px-4 py-2 text-right font-medium">{k("received_series")}</th>
                  <th className="px-4 py-2 text-right font-medium">{k("resolved_series")}</th>
                  <th className="px-4 py-2 text-right font-medium">{k("pending")}</th>
                  <th className="px-4 py-2 text-right font-medium">{k("escalated")}</th>
                  <th className="px-4 py-2 text-right font-medium">{k("sla")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {wards.map((w) => (
                  <tr key={`${w.zone_id}-${w.ward_id}`}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{w.ward_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{w.zone_name || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmt(w.received)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-300">{fmt(w.resolved)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-amber-600 dark:text-amber-300">{fmt(w.pending)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-rose-600 dark:text-rose-300">{fmt(w.escalated)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{w.sla_compliance_percent.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Panel({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-60 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">{icon}{title}</h4>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-full min-h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />;
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground">{text}</div>;
}
