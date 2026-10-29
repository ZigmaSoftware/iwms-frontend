import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Gauge,
  Layers,
  MapPin,
  Minus,
  Truck,
  Weight,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ReportMultiSelect from "./ReportMultiSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  C,
  fieldCls,
  fieldStyle,
  fmtNum,
  type ReportKpis,
  type ReportPeriodRow,
  type ReportRecordRow,
  type ReportLocationRow,
  type ReportWasteTypeRow,
  type WasteReportFilters,
} from "./wasteReportShared";

/* ══════════════════════════════════════════════════════════════════
   Shared layout for the Daily and Monthly Waste Collection reports.
   Each page owns its period filter, fetch and export, normalises the
   API payload into the wasteReportShared shapes and hands it to <WasteReportView>.
══════════════════════════════════════════════════════════════════ */

/* categorical slots (validated set, light + dark steps); a waste type keeps
   its slot from the master list order so filtering never repaints it */
const SERIES_COUNT = 8;
const OTHER_COLOR = "var(--wr-other)";
const seriesVar = (i: number) => `var(--wr-s${i + 1})`;

const STYLES = `
.dwcr{font-family:var(--app-font-family),system-ui,sans-serif;color:${C.ink};
  --wr-s1:#2a78d6;--wr-s2:#eb6834;--wr-s3:#1baf7a;--wr-s4:#eda100;
  --wr-s5:#e87ba4;--wr-s6:#008300;--wr-s7:#6250d6;--wr-s8:#e34948;--wr-other:#9ca3af;}
.dark .dwcr{color-scheme:dark;
  --wr-s1:#3987e5;--wr-s2:#d95926;--wr-s3:#199e70;--wr-s4:#c98500;
  --wr-s5:#d55181;--wr-s6:#008300;--wr-s7:#9085e9;--wr-s8:#e66767;--wr-other:#6b7280;}
.dwcr .font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.dwcr ::-webkit-scrollbar{height:6px;width:6px;}
.dwcr ::-webkit-scrollbar-thumb{background:${C.line};border-radius:4px;}
.dwcr .dwcr-select{background:${C.surfaceSunk};border-color:${C.line};color:${C.ink};font-size:0.75rem;height:2.25rem;}
.dwcr tbody tr:hover td{background:color-mix(in srgb, var(--admin-primary) 5%, transparent);}
`;

/* ── helpers ─────────────────────────────────────────────────────── */
const fmtAxis = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
const fmtWeight = (kg: number) =>
  Math.abs(kg) >= 1000 ? `${fmtNum(kg / 1000, 2)} MT` : `${fmtNum(kg, 1)} kg`;

/* ── local, small select wrapper for the "value=all/none" placeholder pattern ── */
const NONE = "__none__";

function FilterSelect({
  value,
  onChange,
  placeholder,
  disabled,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className="dwcr-select rounded-lg">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const fieldLabel = "mb-1 block text-[10px] font-bold uppercase tracking-wider";

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="shrink-0">
      <span className={fieldLabel} style={{ color: C.inkFaint }}>{label}</span>
      {children}
    </div>
  );
}

export function ReportFilterBar({
  filters,
  periodControl,
  onDownload,
  exporting,
  canDownload,
}: {
  filters: WasteReportFilters;
  periodControl: ReactNode;
  onDownload: () => void;
  exporting: boolean;
  canDownload: boolean;
}) {
  const { selection } = filters;
  return (
    <div className="flex flex-wrap items-end gap-2">
      {periodControl}

      <FilterField label="Location">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`${fieldCls} flex max-w-[200px] items-center gap-1.5`}
              style={{ ...fieldStyle, borderColor: filters.locationFiltered ? C.primary : C.line }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: C.inkFaint }} />
              <span className="truncate">{filters.locationLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: C.inkFaint }} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[440px] max-w-[calc(100vw-2rem)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: C.inkSoft }}>Filter by company, project, panchayat and zone</p>
              {filters.locationFiltered && (
                <Button variant="link" onClick={filters.clearLocation} className="h-auto p-0 text-xs font-semibold" style={{ color: C.teal }}>
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selection.isSuperAdmin && (
                <FilterSelect
                  value={selection.companyUniqueId}
                  onChange={selection.onCompanyChange}
                  placeholder="All companies"
                  disabled={!selection.companiesLoaded}
                  options={selection.companies}
                />
              )}
              <FilterSelect
                value={selection.projectId}
                onChange={selection.setProjectId}
                placeholder={selection.showAllProjectsOption ? "All projects" : "Select project"}
                disabled={!selection.projectsLoaded}
                options={selection.projects}
              />
              <ReportMultiSelect
                value={filters.panchayatIds}
                onChange={filters.setPanchayatIds}
                options={filters.panchayatOptions}
                placeholder="All panchayats"
                ariaLabel="Panchayats"
              />
              <ReportMultiSelect
                value={filters.zoneIds}
                onChange={filters.setZoneIds}
                options={filters.zoneOptions}
                placeholder="All zones"
                ariaLabel="Zones"
              />
            </div>
            <p className="mt-2 text-[10px]" style={{ color: C.inkFaint }}>
              Bin-collection trips are panchayat-scoped; household trips are zone-scoped.
            </p>
          </PopoverContent>
        </Popover>
      </FilterField>

      <FilterField label="Source">
        <select value={filters.source} onChange={(e) => filters.setSource(e.target.value)} className={`${fieldCls} max-w-[170px]`} style={fieldStyle}>
          <option value="bin">Bin collection</option>
          <option value="household">Household collection</option>
          <option value="all">All sources</option>
        </select>
      </FilterField>

      <FilterField label="Waste type">
        <select value={filters.wasteTypeId} onChange={(e) => filters.setWasteTypeId(e.target.value)} className={`${fieldCls} max-w-[160px]`} style={fieldStyle}>
          <option value="">All types</option>
          {filters.wasteTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </FilterField>

      <Button
        onClick={onDownload}
        disabled={!canDownload || exporting}
        title="Download all rows (Excel)"
        className="ml-auto flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
        style={{ background: C.primary, color: "var(--admin-onPrimary)" }}
      >
        <Download className="h-3.5 w-3.5" /> {exporting ? "Downloading…" : "Export Excel"}
      </Button>
    </div>
  );
}

/* ── verification status pill ────────────────────────────────────── */
export const StatusPill = ({ status }: { status?: string }) => {
  const verified = status === "Verified";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        color: verified ? C.leaf : C.ochre,
        background: verified ? `${C.leaf}1A` : `${C.ochre}1A`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: verified ? C.leaf : C.ochre }} />
      {status ?? "Unverified"}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════════
    VIEW
══════════════════════════════════════════════════════════════════ */
type TrendMetric = "weight" | "trips" | "avgPerTrip";
const TREND_METRICS: Array<{ key: TrendMetric; label: string; unit: string }> = [
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "trips", label: "Trips", unit: "trips" },
  { key: "avgPerTrip", label: "Avg / trip", unit: "kg" },
];
/* the slice of recharts' tooltip props our custom tooltips read */
type ChartTooltipProps<T> = { active?: boolean; payload?: ReadonlyArray<{ payload: T }> };
type TableTab = "records" | "location" | "wasteType" | "period";
const MAX_PIE_SLICES = 7;

export type WasteReportViewProps = {
  embedded?: boolean;
  title: string;
  scopeLabel: string;
  headerBadge?: ReactNode;
  filterBar: ReactNode;
  loading: boolean;
  error: string;
  /** "day" | "month" — used in labels */
  periodNoun: string;
  periodHeading: string;
  fmtTick: (period: string) => string;
  fmtPeriod: (period: string) => string;
  kpis: ReportKpis;
  trends: ReportPeriodRow[];
  records: ReportRecordRow[];
  locations: ReportLocationRow[];
  wasteTypes: ReportWasteTypeRow[];
  /** waste type ids in master-list order — fixes each type's colour */
  wasteTypeOrder: string[];
  showStatus?: boolean;
  sortMode: string;
  onSortMode: (v: string) => void;
  page: number;
  pageSize: number;
  totalCount: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
};

export default function WasteReportView(props: WasteReportViewProps) {
  const {
    embedded, title, scopeLabel, headerBadge, filterBar, loading, error,
    periodNoun, periodHeading, fmtTick, fmtPeriod,
    kpis, trends, records, locations, wasteTypes, wasteTypeOrder,
    showStatus, sortMode, onSortMode, page, pageSize, totalCount, onPage, onPageSize,
  } = props;

  const [metric, setMetric] = useState<TrendMetric>("weight");
  const [tab, setTab] = useState<TableTab>("records");

  /* ── derived ── */
  const wasteColor = (id: string) => {
    const i = wasteTypeOrder.indexOf(id);
    return i >= 0 && i < SERIES_COUNT ? seriesVar(i) : OTHER_COLOR;
  };

  const wasteSorted = useMemo(
    () => [...wasteTypes].sort((a, b) => b.weight - a.weight),
    [wasteTypes],
  );

  /* donut — the tail past the slice ceiling folds into "Other" */
  const pieData = useMemo(() => {
    const head = wasteSorted.slice(0, MAX_PIE_SLICES).map((w) => ({ ...w, color: wasteColor(w.id) }));
    const tail = wasteSorted.slice(MAX_PIE_SLICES);
    if (tail.length) {
      head.push({
        id: "__other__",
        name: `Other (${tail.length})`,
        weight: tail.reduce((s, r) => s + r.weight, 0),
        trips: tail.reduce((s, r) => s + r.trips, 0),
        points: tail.reduce((s, r) => s + r.points, 0),
        share: tail.reduce((s, r) => s + r.share, 0),
        color: OTHER_COLOR,
      });
    }
    return head;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wasteSorted, wasteTypeOrder]);

  const locationSorted = useMemo(
    () => [...locations].sort((a, b) => (sortMode === "trips" ? b.trips - a.trips : b.weight - a.weight)),
    [locations, sortMode],
  );
  const topLocations = locationSorted.slice(0, 8);
  const topMax = Math.max(1, ...topLocations.map((l) => (sortMode === "trips" ? l.trips : l.weight)));

  const periodRows = useMemo(
    () =>
      trends.map((t, i) => {
        const prev = trends[i - 1];
        return { ...t, change: prev && prev.weight ? pct(t.weight - prev.weight, prev.weight) : null };
      }),
    [trends],
  );

  const periodCount = trends.length;
  const avgPerPeriod = periodCount ? kpis.weight / periodCount : 0;
  const peak = trends.reduce<ReportPeriodRow | null>((best, t) => (!best || t.weight > best.weight ? t : best), null);
  const low = trends.reduce<ReportPeriodRow | null>((best, t) => (!best || t.weight < best.weight ? t : best), null);
  const busiest = trends.reduce<ReportPeriodRow | null>((best, t) => (!best || t.trips > best.trips ? t : best), null);
  const latest = periodRows[periodRows.length - 1];
  const metricMeta = TREND_METRICS.find((m) => m.key === metric)!;
  const metricAvg = periodCount ? trends.reduce((s, t) => s + t[metric], 0) / periodCount : 0;

  const kpiTiles = [
    { icon: Weight, label: "Total collected", value: fmtNum(kpis.weight), unit: "kg", sub: `${fmtNum(kpis.weight / 1000, 2)} MT this period` },
    { icon: Truck, label: "Total trips", value: fmtNum(kpis.trips), sub: periodCount ? `across ${periodCount} ${periodNoun}${periodCount === 1 ? "" : "s"}` : "no trips" },
    { icon: Gauge, label: "Avg load / trip", value: fmtNum(kpis.avgPerTrip, 1), unit: "kg", sub: `${fmtNum(kpis.trips ? kpis.points / kpis.trips : 0, 1)} points per trip` },
    { icon: CalendarDays, label: `Avg per ${periodNoun}`, value: fmtNum(avgPerPeriod), unit: "kg", sub: peak ? `peak ${fmtTick(peak.period)} · ${fmtWeight(peak.weight)}` : "—" },
    { icon: MapPin, label: "Collection points", value: fmtNum(kpis.points), sub: `${fmtNum(kpis.locations)} location${kpis.locations === 1 ? "" : "s"}` },
    { icon: Layers, label: "Waste types", value: fmtNum(kpis.wasteTypes), sub: wasteSorted[0] ? `top: ${wasteSorted[0].name} (${fmtNum(wasteSorted[0].share, 0)}%)` : "—" },
  ];

  const highlights = [
    { label: `Peak ${periodNoun}`, value: peak ? fmtPeriod(peak.period) : "—", detail: peak ? fmtWeight(peak.weight) : "" },
    { label: `Lowest ${periodNoun}`, value: low ? fmtPeriod(low.period) : "—", detail: low ? fmtWeight(low.weight) : "" },
    { label: `Busiest ${periodNoun}`, value: busiest ? fmtPeriod(busiest.period) : "—", detail: busiest ? `${fmtNum(busiest.trips)} trips` : "" },
    { label: "Top location", value: locationSorted[0]?.name ?? "—", detail: locationSorted[0] ? `${fmtWeight(locationSorted[0].weight)} · ${fmtNum(pct(locationSorted[0].weight, kpis.weight), 1)}%` : "" },
    { label: "Top waste type", value: wasteSorted[0]?.name ?? "—", detail: wasteSorted[0] ? `${fmtWeight(wasteSorted[0].weight)} · ${fmtNum(wasteSorted[0].share, 1)}%` : "" },
    {
      label: `Latest vs previous ${periodNoun}`,
      value: latest ? fmtPeriod(latest.period) : "—",
      detail: latest ? fmtWeight(latest.weight) : "",
      change: latest?.change ?? null,
    },
  ];

  /* ── presentational helpers ── */
  const card = "flex min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm";
  const cardStyle = { background: C.surface, borderColor: C.line };
  const th = "whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide";
  const td = "px-3 py-2.5 text-xs";
  const tfoot = "px-3 py-2.5 text-xs font-bold tabular-nums";
  const spinner = (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-xs" style={{ color: C.inkFaint }}>
      <span className="h-7 w-7 animate-spin rounded-full" style={{ border: `3px solid ${C.line}`, borderTopColor: C.primary }} />
      Loading…
    </div>
  );
  const empty = (msg: string) => (
    <div className="flex h-full min-h-[160px] items-center justify-center text-xs" style={{ color: C.inkFaint }}>{msg}</div>
  );
  const cardHeader = (heading: string, sub?: string, right?: ReactNode) => (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-sm font-bold">{heading}</h2>
        {sub && <p className="mt-0.5 text-[11px]" style={{ color: C.inkFaint }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
  const swatch = (color: string) => <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />;
  const shareBar = (value: number, color: string = C.primary) => (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: C.surfaceSunk }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="w-11 text-right tabular-nums">{fmtNum(value, 1)}%</span>
    </div>
  );
  const changeBadge = (change: number | null) => {
    if (change == null) return <span style={{ color: C.inkFaint }}>—</span>;
    const flat = Math.abs(change) < 0.05;
    const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
    const color = flat ? C.inkSoft : change > 0 ? C.leaf : C.brick;
    return (
      <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        {change > 0 ? "+" : ""}{fmtNum(change, 1)}%
      </span>
    );
  };

  const TrendTooltip = ({ active, payload }: ChartTooltipProps<ReportPeriodRow>) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    const lines: Array<[TrendMetric | "points", string, string]> = [
      ["weight", "Weight", `${fmtNum(row.weight, 1)} kg`],
      ["trips", "Trips", fmtNum(row.trips)],
      ["avgPerTrip", "Avg / trip", `${fmtNum(row.avgPerTrip, 1)} kg`],
      ["points", "Points", fmtNum(row.points)],
    ];
    return (
      <div className="rounded-lg border px-3 py-2.5 text-xs shadow-lg" style={{ background: C.surface, borderColor: C.line, color: C.ink, minWidth: 170 }}>
        <p className="mb-1.5 font-semibold">{fmtPeriod(row.period)}</p>
        {lines.map(([key, name, value]) => (
          <div key={key} className="flex justify-between gap-4" style={{ color: key === metric ? C.ink : C.inkSoft }}>
            <span>{name}</span>
            <span className={`tabular-nums ${key === metric ? "font-bold" : "font-medium"}`}>{value}</span>
          </div>
        ))}
      </div>
    );
  };

  const WasteTooltip = ({ active, payload }: ChartTooltipProps<ReportWasteTypeRow & { color: string }>) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-lg border px-3 py-2.5 text-xs shadow-lg" style={{ background: C.surface, borderColor: C.line, color: C.ink, minWidth: 170 }}>
        <p className="mb-1.5 flex items-center gap-1.5 font-semibold">{swatch(row.color)}{row.name}</p>
        {([
          ["Weight", `${fmtNum(row.weight, 1)} kg`],
          ["Share", `${fmtNum(row.share, 1)}%`],
          ["Trips", fmtNum(row.trips)],
          ["Points", fmtNum(row.points)],
        ] as const).map(([name, value]) => (
          <div key={name} className="flex justify-between gap-4" style={{ color: C.inkSoft }}>
            <span>{name}</span>
            <span className="font-semibold tabular-nums" style={{ color: C.ink }}>{value}</span>
          </div>
        ))}
      </div>
    );
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, pageCount);
  const visiblePages = useMemo(() => {
    const count = Math.min(5, pageCount);
    const start = Math.max(1, Math.min(safePage - 2, pageCount - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [pageCount, safePage]);

  const tabs: Array<{ key: TableTab; label: string; count: number }> = [
    { key: "records", label: "Detailed records", count: totalCount },
    { key: "location", label: "By location", count: locations.length },
    { key: "wasteType", label: "By waste type", count: wasteTypes.length },
    { key: "period", label: `${periodNoun === "day" ? "Day" : "Month"}-wise`, count: trends.length },
  ];

  /* ══════════════════════════════════════════════════════════════
      RENDER — header · KPIs · trend + composition · locations +
      highlights · tabbed tables
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className={`dwcr flex flex-col gap-4 rounded-2xl p-4 ${embedded ? "overflow-hidden" : ""}`}>
      <style>{STYLES}</style>

      {/* ── header + filters ── */}
      <div className={`${card} gap-4 p-4`} style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {headerBadge}
          <span className="w-full text-xs sm:ml-auto sm:w-auto" style={{ color: C.inkFaint }}>{scopeLabel}</span>
        </div>
        {filterBar}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: `${C.brick}14`, border: `1px solid ${C.brick}44`, color: C.brick }}>
          {error}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpiTiles.map((k) => (
          <div key={k.label} className="min-w-0 rounded-2xl border px-4 py-3 shadow-sm" style={cardStyle}>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${C.primary} 12%, transparent)`, color: C.primary }}>
                <k.icon className="h-3.5 w-3.5" />
              </span>
              <p className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: C.inkFaint }}>{k.label}</p>
            </div>
            {loading ? (
              <>
                <span className="mt-3 block h-6 w-24 animate-pulse rounded-md" style={{ background: C.surfaceSunk }} />
                <span className="mt-2 block h-3 w-28 animate-pulse rounded-md" style={{ background: C.surfaceSunk }} />
              </>
            ) : (
              <>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums tracking-tight">{k.value}</span>
                  {k.unit && <span className="text-xs font-semibold" style={{ color: C.inkFaint }}>{k.unit}</span>}
                </p>
                <p className="mt-0.5 truncate text-[11px]" style={{ color: C.inkFaint }} title={k.sub}>{k.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── trend · composition ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} h-[340px] p-4 lg:col-span-2`} style={cardStyle}>
          {cardHeader(
            `Collection trend · ${metricMeta.label.toLowerCase()}`,
            periodCount ? `Dashed line = ${periodNoun} average (${fmtNum(metricAvg, metric === "trips" ? 0 : 1)} ${metricMeta.unit})` : undefined,
            <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: C.line, background: C.surfaceSunk }} role="group" aria-label="Trend metric">
              {TREND_METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetric(m.key)}
                  aria-pressed={metric === m.key}
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={metric === m.key ? { background: C.surface, color: C.ink, boxShadow: "0 1px 2px rgba(15,23,42,.08)" } : { color: C.inkFaint }}
                >
                  {m.label}
                </button>
              ))}
            </div>,
          )}
          <div className="min-h-0 flex-1">
            {loading ? spinner : trends.length === 0 ? empty("No trend data for this period.") : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <BarChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: C.inkFaint }} axisLine={false} tickLine={false} tickFormatter={fmtTick} minTickGap={12} />
                  <YAxis tick={{ fontSize: 10, fill: C.inkFaint }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={40} />
                  <Tooltip content={<TrendTooltip />} cursor={{ fill: C.surfaceSunk }} />
                  <ReferenceLine y={metricAvg} stroke={C.inkSoft} strokeDasharray="4 4" strokeWidth={1} />
                  <Bar dataKey={metric} name={metricMeta.label} fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${card} h-[340px] p-4`} style={cardStyle}>
          {cardHeader("Waste composition", "Share of collected weight")}
          {loading ? spinner : pieData.length === 0 ? empty("No waste-type data for this period.") : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="relative h-[150px] shrink-0">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                  <PieChart>
                    <Tooltip content={<WasteTooltip />} />
                    <Pie data={pieData} dataKey="weight" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={1.5} stroke={C.surface} strokeWidth={2}>
                      {pieData.map((entry) => <Cell key={entry.id} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold tabular-nums">{fmtWeight(kpis.weight)}</span>
                  <span className="text-[10px]" style={{ color: C.inkFaint }}>{fmtNum(kpis.wasteTypes)} types</span>
                </div>
              </div>
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 text-xs">
                {pieData.map((w) => (
                  <li key={w.id} className="flex items-center gap-2">
                    {swatch(w.color)}
                    <span className="min-w-0 flex-1 truncate" style={{ color: C.inkSoft }} title={w.name}>{w.name}</span>
                    <span className="tabular-nums" style={{ color: C.inkSoft }}>{fmtWeight(w.weight)}</span>
                    <span className="w-11 text-right font-semibold tabular-nums">{fmtNum(w.share, 1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── top locations · highlights ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${card} p-4`} style={cardStyle}>
          {cardHeader(
            `Top locations · ${sortMode === "trips" ? "trips" : "weight"}`,
            `${fmtNum(locations.length)} location${locations.length === 1 ? "" : "s"} collected this period`,
            <button type="button" onClick={() => setTab("location")} className="text-[11px] font-semibold hover:underline" style={{ color: C.primary }}>
              View all
            </button>,
          )}
          <div className="space-y-3">
            {loading ? spinner : topLocations.length === 0 ? empty("No location data for this period.") : (
              topLocations.map((l, i) => {
                const v = sortMode === "trips" ? l.trips : l.weight;
                return (
                  <div key={l.key}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-baseline gap-1.5">
                        <span className="w-4 shrink-0 tabular-nums" style={{ color: C.inkFaint }}>{i + 1}</span>
                        <span className="truncate font-semibold" title={l.name}>{l.name}</span>
                        <span className="shrink-0 text-[10px]" style={{ color: C.inkFaint }}>{l.type}</span>
                      </span>
                      <span className="shrink-0 tabular-nums" style={{ color: C.inkSoft }}>
                        <span className="font-semibold" style={{ color: C.ink }}>{sortMode === "trips" ? `${fmtNum(v)} trips` : fmtWeight(v)}</span>
                        {" · "}{sortMode === "trips" ? fmtWeight(l.weight) : `${fmtNum(l.trips)} trips`}
                        {" · "}{fmtNum(pct(l.weight, kpis.weight), 1)}%
                      </span>
                    </div>
                    <div className="mt-1 ml-[22px] h-1.5 overflow-hidden rounded-full" style={{ background: C.surfaceSunk }}>
                      <div className="h-full rounded-full" style={{ width: `${(v / topMax) * 100}%`, background: C.primary }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={`${card} p-4`} style={cardStyle}>
          {cardHeader("Highlights", `What stands out in the selected ${periodNoun === "day" ? "range" : "period"}`)}
          {loading ? spinner : periodCount === 0 ? empty("Nothing collected for this selection.") : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {highlights.map((h) => (
                <div key={h.label} className="min-w-0 rounded-xl border px-3 py-2.5" style={{ borderColor: C.line, background: C.surfaceSunk }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.inkFaint }}>{h.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold" title={h.value}>{h.value}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums" style={{ color: C.inkSoft }}>
                    {h.detail}
                    {"change" in h && changeBadge(h.change ?? null)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── tabbed tables ── */}
      <div className={card} style={cardStyle}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: C.line }}>
          <div className="flex flex-wrap gap-1" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                style={tab === t.key
                  ? { background: `color-mix(in srgb, ${C.primary} 12%, transparent)`, color: C.primary }
                  : { color: C.inkSoft }}
              >
                {t.label}
                <span className="rounded-full px-1.5 text-[10px] tabular-nums" style={{ background: C.surfaceSunk, color: C.inkSoft }}>{fmtNum(t.count)}</span>
              </button>
            ))}
          </div>
          {(tab === "records" || tab === "location") && (
            <select value={sortMode} onChange={(e) => onSortMode(e.target.value)} className="h-8 rounded-lg border px-2 text-[11px] outline-none" style={fieldStyle} aria-label="Sort">
              <option value="weight">Sort: highest weight</option>
              <option value="trips">Sort: most trips</option>
            </select>
          )}
        </div>

        <div className="max-h-[560px] min-h-[200px] overflow-auto">
          {tab === "records" && (
            loading && records.length === 0 ? spinner : records.length === 0 ? empty("No records for this selection.") : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                  <tr style={{ color: C.inkFaint }}>
                    <th className={th}>{periodHeading}</th>
                    <th className={th}>Location</th>
                    <th className={th}>Company / project</th>
                    <th className={th}>Waste type</th>
                    <th className={`${th} text-right`}>Weight (kg)</th>
                    <th className={`${th} text-right`}>Share</th>
                    <th className={`${th} text-right`}>Trips</th>
                    <th className={`${th} text-right`}>Points</th>
                    <th className={`${th} text-right`}>Avg / trip (kg)</th>
                    {showStatus && <th className={th}>Status</th>}
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-50" : undefined}>
                  {records.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: C.line }}>
                      <td className={`${td} whitespace-nowrap tabular-nums`} style={{ color: C.inkSoft }}>{fmtPeriod(r.period)}</td>
                      <td className={td}>
                        <span className="block font-medium">{r.locationName}</span>
                        <span className="text-[10px]" style={{ color: C.inkFaint }}>{r.locationType}</span>
                      </td>
                      <td className={td}>
                        <span className="block">{r.projectName || "—"}</span>
                        {r.companyName && <span className="text-[10px]" style={{ color: C.inkFaint }}>{r.companyName}</span>}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">{swatch(wasteColor(r.wasteTypeId))}{r.wasteType}</span>
                      </td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{fmtNum(r.weight, 2)}</td>
                      <td className={`${td} text-right tabular-nums`} style={{ color: C.inkSoft }}>{fmtNum(pct(r.weight, kpis.weight), 1)}%</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(r.trips)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(r.points)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(r.avgPerTrip, 1)}</td>
                      {showStatus && <td className={`${td} whitespace-nowrap`}><StatusPill status={r.status} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === "location" && (
            loading && locations.length === 0 ? spinner : locations.length === 0 ? empty("No locations for this selection.") : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                  <tr style={{ color: C.inkFaint }}>
                    <th className={th}>#</th>
                    <th className={th}>Location</th>
                    <th className={th}>Type</th>
                    <th className={`${th} text-right`}>Weight (kg)</th>
                    <th className={`${th} text-right`}>Share of total</th>
                    <th className={`${th} text-right`}>Trips</th>
                    <th className={`${th} text-right`}>Points</th>
                    <th className={`${th} text-right`}>Avg / trip (kg)</th>
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-50" : undefined}>
                  {locationSorted.map((l, i) => (
                    <tr key={l.key} className="border-t" style={{ borderColor: C.line }}>
                      <td className={`${td} tabular-nums`} style={{ color: C.inkFaint }}>{i + 1}</td>
                      <td className={`${td} font-medium`}>{l.name}</td>
                      <td className={td} style={{ color: C.inkSoft }}>{l.type}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{fmtNum(l.weight, 2)}</td>
                      <td className={td}>{shareBar(pct(l.weight, kpis.weight))}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(l.trips)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(l.points)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(l.avgPerTrip, 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 border-t" style={{ background: C.surfaceSunk, borderColor: C.line }}>
                  <tr>
                    <td className={tfoot} colSpan={3}>Total</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.weight, 2)}</td>
                    <td className={`${tfoot} text-right`}>100%</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.trips)}</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.points)}</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.avgPerTrip, 1)}</td>
                  </tr>
                </tfoot>
              </table>
            )
          )}

          {tab === "wasteType" && (
            loading && wasteTypes.length === 0 ? spinner : wasteTypes.length === 0 ? empty("No waste types for this selection.") : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                  <tr style={{ color: C.inkFaint }}>
                    <th className={th}>Waste type</th>
                    <th className={`${th} text-right`}>Weight (kg)</th>
                    <th className={`${th} text-right`}>Share of total</th>
                    <th className={`${th} text-right`}>Trips</th>
                    <th className={`${th} text-right`}>Points</th>
                    <th className={`${th} text-right`}>Locations</th>
                    <th className={`${th} text-right`}>Avg / trip (kg)</th>
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-50" : undefined}>
                  {wasteSorted.map((w) => (
                    <tr key={w.id} className="border-t" style={{ borderColor: C.line }}>
                      <td className={`${td} whitespace-nowrap font-medium`}>
                        <span className="inline-flex items-center gap-1.5">{swatch(wasteColor(w.id))}{w.name}</span>
                      </td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{fmtNum(w.weight, 2)}</td>
                      <td className={td}>{shareBar(w.share, wasteColor(w.id))}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(w.trips)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(w.points)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(w.locations)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(w.trips ? w.weight / w.trips : 0, 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 border-t" style={{ background: C.surfaceSunk, borderColor: C.line }}>
                  <tr>
                    <td className={tfoot}>Total</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(wasteTypes.reduce((s, w) => s + w.weight, 0), 2)}</td>
                    <td className={`${tfoot} text-right`}>100%</td>
                    <td className={`${tfoot} text-right`} colSpan={4} style={{ color: C.inkFaint, fontWeight: 500 }}>
                      trips and points can repeat across waste types
                    </td>
                  </tr>
                </tfoot>
              </table>
            )
          )}

          {tab === "period" && (
            loading && trends.length === 0 ? spinner : trends.length === 0 ? empty("No collections for this selection.") : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                  <tr style={{ color: C.inkFaint }}>
                    <th className={th}>{periodHeading}</th>
                    <th className={`${th} text-right`}>Weight (kg)</th>
                    <th className={`${th} text-right`}>vs previous</th>
                    <th className={`${th} text-right`}>Share of total</th>
                    <th className={`${th} text-right`}>Trips</th>
                    <th className={`${th} text-right`}>Points</th>
                    <th className={`${th} text-right`}>Avg / trip (kg)</th>
                  </tr>
                </thead>
                <tbody className={loading ? "opacity-50" : undefined}>
                  {[...periodRows].reverse().map((p) => (
                    <tr key={p.period} className="border-t" style={{ borderColor: C.line }}>
                      <td className={`${td} whitespace-nowrap font-medium tabular-nums`}>{fmtPeriod(p.period)}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{fmtNum(p.weight, 2)}</td>
                      <td className={`${td} text-right`}>{changeBadge(p.change)}</td>
                      <td className={td}>{shareBar(pct(p.weight, kpis.weight))}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(p.trips)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(p.points)}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtNum(p.avgPerTrip, 1)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 border-t" style={{ background: C.surfaceSunk, borderColor: C.line }}>
                  <tr>
                    <td className={tfoot}>Total · {fmtNum(periodCount)} {periodNoun}{periodCount === 1 ? "" : "s"}</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.weight, 2)}</td>
                    <td className={tfoot} />
                    <td className={`${tfoot} text-right`}>100%</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.trips)}</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.points)}</td>
                    <td className={`${tfoot} text-right`}>{fmtNum(kpis.avgPerTrip, 1)}</td>
                  </tr>
                </tfoot>
              </table>
            )
          )}
        </div>

        {tab === "records" && totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5" style={{ borderColor: C.line }}>
            <div className="flex flex-wrap items-center gap-3 text-[11px]" style={{ color: C.inkFaint }}>
              <span>
                Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalCount)} of {fmtNum(totalCount)}
              </span>
              {/* inline buttons, not a native <select>: at the bottom of the
                  screen the browser opens a select's list off-screen */}
              <span className="inline-flex items-center gap-0.5" role="group" aria-label="Rows per page">
                {[10, 25, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onPageSize(size)}
                    aria-pressed={pageSize === size}
                    className="h-6 rounded-md border px-1.5 text-[11px] font-semibold tabular-nums"
                    style={pageSize === size ? { background: C.primary, borderColor: C.primary, color: "var(--admin-onPrimary)" } : { borderColor: C.line, color: C.inkSoft }}
                  >
                    {size}
                  </button>
                ))}
                <span className="ml-1">/ page</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => onPage(Math.max(1, safePage - 1))} disabled={safePage === 1} className="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-40" style={{ borderColor: C.line }} aria-label="Previous page">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPage(p)}
                  className="h-7 min-w-7 rounded-md border px-1.5 text-[11px] font-semibold tabular-nums"
                  style={p === safePage ? { background: C.primary, borderColor: C.primary, color: "var(--admin-onPrimary)" } : { borderColor: C.line, color: C.inkSoft }}
                >
                  {p}
                </button>
              ))}
              <button type="button" onClick={() => onPage(Math.min(pageCount, safePage + 1))} disabled={safePage === pageCount} className="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-40" style={{ borderColor: C.line }} aria-label="Next page">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
