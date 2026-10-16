import type { ReportResponse, ReportRow, LocationComparisonRow, WasteTypeBreakdownRow } from "./types";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReportMultiSelect from "../ReportMultiSelect";
import { api } from "@/api";
import { adminApi } from "@/helpers/admin/registry";
import {
  panchayatApi,
  wasteTypeApi,
  zoneApi,
} from "@/helpers/admin";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import notify from "@/lib/notify";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

/* ── Palette (fixed categorical order — never cycled/regenerated) ──── */
const SERIES = [
  "#10B981", // emerald
  "#0EA5E9", // cyan
  "#F59E0B", // amber
  "#0F766E", // teal
  "#8B5CF6", // violet
  "#EF4444", // red
  "#14B8A6", // aqua
  "#F97316", // orange
];
const OTHER_SLICE_COLOR = "#94A3B8";

/* ── tokens shared with the Daily Waste Comparison page (same layout) ── */
const C = {
  bg: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceSunk: "#F1F5F9",
  ink: "#0F172A",
  inkSoft: "#475569",
  inkFaint: "#94A3B8",
  line: "#E2E8F0",
  primary: "#0F766E",
  primaryDeep: "#0F2744",
  leaf: "#10B981",
  teal: "#0EA5E9",
  ochre: "#F59E0B",
  brick: "#EF4444",
  violet: "#8B5CF6",
} as const;

const FONTS = `
.dwcr{font-family:var(--app-font-family),system-ui,sans-serif;color:${C.ink};background:${C.bg};}
.dwcr .font-display{font-family:var(--app-font-family),system-ui,sans-serif;}
.dwcr .font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.dwcr ::-webkit-scrollbar{height:6px;width:6px;}
.dwcr ::-webkit-scrollbar-thumb{background:${C.line};border-radius:4px;}
.dwcr .dwcr-select{background:${C.surfaceSunk};border-color:${C.line};color:${C.ink};font-size:0.75rem;height:2.25rem;}
`;

const initialKpis: ReportResponse["kpis"] = {
  total_actual_weight: 0,
  average_weight_per_trip: 0,
  total_trips: 0,
  collection_points_covered: 0,
  waste_type_count: 0,
  local_body_count: 0,
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const resolveGeoId = (record: any): string => String(record?.unique_id ?? record?.id ?? "");
const resolveGeoName = (record: any): string =>
  String(
    record?.name ??
      record?.panchayat_name ??
      record?.zone_name ??
      record?.ward_name ??
      resolveGeoId(record),
  );
const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object");
  if (value && typeof value === "object") {
    const r = (value as { results?: unknown }).results;
    if (Array.isArray(r)) return r.filter((x) => x && typeof x === "object");
  }
  return [];
};
const toGeoOptions = (records: any[]) =>
  records.filter((r) => resolveGeoId(r)).map((r) => ({ value: resolveGeoId(r), label: resolveGeoName(r) }));

/* ── Helpers ─────────────────────────────────────────────────────── */
const fmtKg = (v?: number | string | null, dec = 2) => {
  const n = Number(v);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-IN", { maximumFractionDigits: dec });
};
const fmtAxis = (v: number) =>
  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

/* ── Tooltip components ──────────────────────────────────────────── */
const MonthTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <Calendar className="h-3 w-3" /> {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mt-1">
          <span style={{ color: p.stroke ?? p.fill }}>{p.name}</span>
          <span className="font-bold">{fmtKg(p.value)} kg</span>
        </div>
      ))}
    </div>
  );
};

const WasteTypeTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const row = p.payload as WasteTypeBreakdownRow & { color: string };
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[170px]">
      <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: row.color }}
        />
        {row.waste_type}
      </p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Weight</span>
        <span className="font-bold">{fmtKg(row.total_actual_weight)} kg</span>
      </div>
      <div className="flex justify-between gap-4 mt-1">
        <span className="text-gray-500">Share</span>
        <span className="font-bold">{fmtKg(row.share_percent, 1)}%</span>
      </div>
      <div className="flex justify-between gap-4 mt-1">
        <span className="text-gray-500">Trips</span>
        <span className="font-bold">{row.total_trips}</span>
      </div>
    </div>
  );
};

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

/* ══════════════════════════════════════════════════════════════════
    MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function MonthlyWasteComparisonListPage({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { t } = useTranslation();

  const [monthValue, setMonthValue] = useState(currentMonth());
  const [appliedMonth, setAppliedMonth] = useState(currentMonth());
  const [sortMode, setSortMode] = useState("weight");
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [wasteTypeOptions, setWasteTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [bottomTab, setBottomTab] = useState<"locality" | "localbody">("locality");
  const [source, setSource] = useState("bin");

  /* ── company / project / panchayat / zone filter ── */
  const {
    companyUniqueId,
    projectId,
    companies,
    projects,
    companiesLoaded,
    projectsLoaded,
    isSuperAdmin,
    showAllProjectsOption,
    onCompanyChange,
    setProjectId,
  } = useCompanyProjectSelection({ isEdit: false, defaultToAll: true });
  const [panchayatIds, setPanchayatIds] = useState<string[]>([]);
  const [panchayatRecords, setPanchayatRecords] = useState<Record<string, unknown>[]>([]);
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [zoneRecords, setZoneRecords] = useState<Record<string, unknown>[]>([]);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<
    ReportResponse["monthly_trends"]
  >([]);
  const [plbComparison, setPlbComparison] = useState<LocationComparisonRow[]>([]);
  const [wasteTypeBreakdown, setWasteTypeBreakdown] = useState<WasteTypeBreakdownRow[]>([]);
  const [kpis, setKpis] = useState<ReportResponse["kpis"]>(initialKpis);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  /* panchayat / zone options follow the selected company + project */
  useEffect(() => {
    let active = true;
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    panchayatApi.readAll({ params }).then((value) => {
      if (active) setPanchayatRecords(toRecordList(value));
    }).catch(() => {
      if (active) setPanchayatRecords([]);
    });
    zoneApi.readAll({ params }).then((value) => {
      if (active) setZoneRecords(toRecordList(value));
    }).catch(() => {
      if (active) setZoneRecords([]);
    });
    setPanchayatIds([]);
    setZoneIds([]);
    return () => { active = false; };
  }, [companyUniqueId, projectId]);

  const panchayatOptions = toGeoOptions(panchayatRecords);
  const zoneOptions = toGeoOptions(zoneRecords);

  /* waste type filter options */
  useEffect(() => {
    let cancelled = false;
    wasteTypeApi
      .readAll({ params: { lite: 1 } })
      .then((list) => {
        if (cancelled) return;
        setWasteTypeOptions(
          toRecordList(list)
            .map((w) => ({ value: resolveGeoId(w), label: String(w.waste_type_name ?? w.name ?? resolveGeoId(w)) }))
            .filter((o) => o.value),
        );
      })
      .catch(() => { if (!cancelled) setWasteTypeOptions([]); });
    return () => { cancelled = true; };
  }, []);

  /* the page fills the space left in its shell (admin layout, or the
     dashboard's Reports tab) — no page scroll; the tables scroll inside
     their cards. Measured, since the
     shell's header / breadcrumb / paddings vary with the sidebar state. */
  const rootRef = useRef<HTMLDivElement>(null);
  const [fitHeight, setFitHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el || window.innerWidth < 1024) return setFitHeight(null);
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      // the shell's own bottom padding / borders between this page and the
      // bottom of <main> (the document height itself is clamped by the
      // shell's min-h-screen, so it can't be used to measure this)
      // — plus anything laid out after us on the way up (footers, margins)
      let below = 0;
      for (let child: Element = el, n = el.parentElement; n && n.tagName !== "BODY"; child = n, n = n.parentElement) {
        const cs = getComputedStyle(n);
        below += parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth) + parseFloat(getComputedStyle(child).marginBottom);
        for (let sib = child.nextElementSibling; sib; sib = sib.nextElementSibling) {
          const pos = getComputedStyle(sib).position;
          if (pos !== "absolute" && pos !== "fixed") below += sib.getBoundingClientRect().height;
        }
      }
      setFitHeight(Math.max(480, Math.floor(window.innerHeight - top - below)));
    };
    measure();
    const ro = new ResizeObserver(measure); // same value → React skips the update
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const buildParams = () => {
    const params: Record<string, string> = { sort: sortMode, source };
    if (appliedMonth) params.month = appliedMonth;
    if (wasteTypeId) params.waste_type_id = wasteTypeId;
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (panchayatIds.length) params.panchayat_id = panchayatIds.join(",");
    if (zoneIds.length) params.zone_id = zoneIds.join(",");
    return params;
  };

  /* ── fetch report ── */
  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...buildParams(),
        page: String(detailPage),
        limit: String(detailPageSize),
      };

      const { data } = await api.get<ReportResponse>(
        "/reports/monthly-waste-comparison/",
        { params },
      );
      setRows(Array.isArray(data?.results) ? data.results : []);
      setTotalCount(
        typeof data?.count === "number"
          ? data.count
          : Array.isArray(data?.results)
            ? data.results.length
            : 0,
      );
      setMonthlyTrends(
        Array.isArray(data?.monthly_trends) ? data.monthly_trends : [],
      );
      setPlbComparison(
        Array.isArray(data?.location_comparison)
          ? data.location_comparison
          : [],
      );
      setWasteTypeBreakdown(
        Array.isArray(data?.waste_type_breakdown) ? data.waste_type_breakdown : [],
      );
      setKpis(data?.kpis ?? initialKpis);
    } catch {
      setRows([]);
      setTotalCount(0);
      setMonthlyTrends([]);
      setPlbComparison([]);
      setWasteTypeBreakdown([]);
      setKpis(initialKpis);
      setError("Unable to load monthly waste collection report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appliedMonth,
    wasteTypeId,
    sortMode,
    source,
    companyUniqueId,
    projectId,
    panchayatIds,
    zoneIds,
    detailPage,
    detailPageSize,
  ]);

  /* Reset to page 1 whenever a filter OTHER than pagination changes — the
     server refetch above also fires when detailPage/detailPageSize change
     (i.e. on a "next page" click), so an unconditional reset there would
     immediately snap the user back to page 1. */
  useEffect(() => {
    setDetailPage(1);
  }, [appliedMonth, wasteTypeId, sortMode, source, companyUniqueId, projectId, panchayatIds, zoneIds]);

  /* ── derived ── */
  const MAX_PIE_SLICES = 7;
  const wasteTypePieData = useMemo(() => {
    const sorted = [...wasteTypeBreakdown].sort(
      (a, b) => b.total_actual_weight - a.total_actual_weight,
    );
    const head = sorted.slice(0, MAX_PIE_SLICES).map((row, i) => ({
      ...row,
      color: SERIES[i % SERIES.length],
    }));
    const tail = sorted.slice(MAX_PIE_SLICES);
    if (tail.length > 0) {
      const tailWeight = tail.reduce((s, r) => s + r.total_actual_weight, 0);
      const tailTrips = tail.reduce((s, r) => s + r.total_trips, 0);
      const tailPoints = tail.reduce((s, r) => s + r.collection_points_covered, 0);
      const tailShare = tail.reduce((s, r) => s + r.share_percent, 0);
      head.push({
        waste_type_id: "__other__",
        waste_type: `Other (${tail.length})`,
        total_actual_weight: tailWeight,
        total_trips: tailTrips,
        collection_points_covered: tailPoints,
        share_percent: tailShare,
        color: OTHER_SLICE_COLOR,
      });
    }
    return head;
  }, [wasteTypeBreakdown]);

  const selectedLocationLabel = [
    ...panchayatOptions.filter((option) => panchayatIds.includes(option.value)),
    ...zoneOptions.filter((option) => zoneIds.includes(option.value)),
  ]
    .map((option) => option.label)
    .join(", ");
  const detailPageCount = Math.max(1, Math.ceil(totalCount / detailPageSize));
  const safeDetailPage = Math.min(detailPage, detailPageCount);
  const visibleDetailPages = useMemo(() => {
    const visibleCount = Math.min(5, detailPageCount);
    const start = Math.max(
      1,
      Math.min(safeDetailPage - 2, detailPageCount - visibleCount + 1),
    );
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [detailPageCount, safeDetailPage]);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const exportRows = await adminApi.monthlyWasteComparison.readAllForExport(
        { params: buildParams() },
      );
      await exportRecordsToExcel(
        exportRows.map((r) => ({
          Month: r.month,
          "Location Type": r.local_body_type,
          Location: r.local_body_name,
          "Waste Type": r.waste_type,
          "Weight Collected (kg)": r.total_actual_weight,
          Trips: r.total_trips,
          Points: r.collection_points_covered,
          "Avg/Trip (kg)": r.average_weight_per_trip,
        })),
        getAdminScreenExcelFilename("all"),
        "Monthly Waste Comparison",
      );
    } catch {
      notify.fire(
        t("common.error"),
        "Failed to download monthly waste collection data.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  };

  const clearLocationFilter = () => {
    setPanchayatIds([]);
    setZoneIds([]);
  };

  /* ── presentational helpers ── */
  const card = "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border shadow-sm";
  const cardStyle = { background: C.surface, borderColor: C.line };
  const label = "mb-1 block text-[10px] font-bold uppercase tracking-wider";
  const fieldCls = "h-9 rounded-lg border px-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-100";
  const fieldStyle = { borderColor: C.line, background: C.surface, color: C.ink };
  const th = "px-3 py-2 text-[10px] font-semibold uppercase tracking-wide";
  const td = "px-3 py-2 text-xs";
  const spinner = (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-xs" style={{ color: C.inkFaint }}>
      <span className="h-7 w-7 animate-spin rounded-full" style={{ border: `3px solid ${C.line}`, borderTopColor: C.primary }} />
      Loading…
    </div>
  );
  const empty = (msg: string) => (
    <div className="flex h-full min-h-[120px] items-center justify-center text-xs" style={{ color: C.inkFaint }}>{msg}</div>
  );

  const rangeLabel = appliedMonth
    ? new Date(`${appliedMonth}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "All months";
  const locationLabel = selectedLocationLabel || "All locations";
  const locationFiltered = !!(panchayatIds.length || zoneIds.length);
  const monthCount = monthlyTrends.length;
  const topBodies = [...plbComparison]
    .sort((a, b) => (sortMode === "trips" ? b.total_trips - a.total_trips : b.total_actual_weight - a.total_actual_weight))
    .slice(0, 5);
  const topMax = Math.max(1, ...topBodies.map((p) => (sortMode === "trips" ? p.total_trips : p.total_actual_weight)));
  const wasteRows = [...wasteTypeBreakdown].sort((a, b) => b.total_actual_weight - a.total_actual_weight);
  const wasteColor = (id: string) => wasteTypePieData.find((w) => w.waste_type_id === id)?.color ?? OTHER_SLICE_COLOR;

  const kpiTiles = [
    { label: "Total weight", value: fmtKg(kpis.total_actual_weight), unit: "kg", sub: `${fmtKg(kpis.total_actual_weight / 1000, 2)} MT this period` },
    { label: "Total trips", value: fmtKg(kpis.total_trips), sub: monthCount ? `across ${monthCount} month${monthCount === 1 ? "" : "s"}` : "no trips" },
    { label: "Points covered", value: fmtKg(kpis.collection_points_covered), sub: "collection points" },
    { label: "Waste types", value: fmtKg(kpis.waste_type_count), sub: "tracked categories" },
    { label: "Locations", value: fmtKg(kpis.local_body_count), sub: `avg ${fmtKg(kpis.average_weight_per_trip, 1)} kg / trip` },
  ];

  /* ══════════════════════════════════════════════════════════════
      RENDER — one screen: header + KPIs + 3 chart cards + tables
  ══════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={rootRef}
      className={`dwcr flex flex-col gap-3 ${embedded ? "overflow-hidden rounded-2xl p-4" : "rounded-2xl p-4"}`}
      style={fitHeight ? { minHeight: fitHeight } : undefined}
    >
      <style>{FONTS}</style>

      {/* ── header: title + filters ── */}
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight">Monthly Waste Collection</h1>
          <p className="mt-0.5 truncate text-xs" style={{ color: C.inkFaint }}>
            {locationFiltered ? locationLabel : "Across all locations"} · {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="shrink-0">
            <span className={label} style={{ color: C.inkFaint }}>Month</span>
            <div className="flex items-center gap-1">
              <input
                type="month"
                value={monthValue}
                max={currentMonth()}
                onChange={(e) => {
                  setMonthValue(e.target.value);
                  setAppliedMonth(e.target.value);
                }}
                className={fieldCls}
                style={{ ...fieldStyle, colorScheme: "light" }}
                aria-label="Month"
              />
              {appliedMonth && (
                <button
                  type="button"
                  onClick={() => {
                    setMonthValue("");
                    setAppliedMonth("");
                  }}
                  className={`${fieldCls} font-semibold`}
                  style={{ ...fieldStyle, color: C.inkSoft }}
                  title="Show every month on record"
                >
                  All months
                </button>
              )}
            </div>
          </div>

          <div>
            <span className={label} style={{ color: C.inkFaint }}>Location</span>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className={`${fieldCls} flex max-w-[170px] items-center gap-1.5`} style={{ ...fieldStyle, borderColor: locationFiltered ? C.primary : C.line }}>
                  <span className="truncate">{locationLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: C.inkFaint }} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[440px] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold" style={{ color: C.inkSoft }}>Filter by company, project, panchayat and zone</p>
                  {locationFiltered && (
                    <Button variant="link" onClick={clearLocationFilter} className="h-auto p-0 text-xs font-semibold" style={{ color: C.teal }}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {isSuperAdmin && (
                    <FilterSelect
                      value={companyUniqueId}
                      onChange={onCompanyChange}
                      placeholder="All companies"
                      disabled={!companiesLoaded}
                      options={companies}
                    />
                  )}
                  <FilterSelect
                    value={projectId}
                    onChange={setProjectId}
                    placeholder={showAllProjectsOption ? "All projects" : "Select project"}
                    disabled={!projectsLoaded}
                    options={projects}
                  />
                  <ReportMultiSelect
                    value={panchayatIds}
                    onChange={setPanchayatIds}
                    options={panchayatOptions}
                    placeholder="All panchayats"
                    ariaLabel="Panchayats"
                  />
                  <ReportMultiSelect
                    value={zoneIds}
                    onChange={setZoneIds}
                    options={zoneOptions}
                    placeholder="All zones"
                    ariaLabel="Zones"
                  />
                </div>
                <p className="mt-2 text-[10px]" style={{ color: C.inkFaint }}>
                  Bin-collection trips are panchayat-scoped; household trips are zone-scoped.
                </p>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <span className={label} style={{ color: C.inkFaint }}>Source</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className={`${fieldCls} max-w-[150px]`} style={fieldStyle}>
              <option value="bin">Bin collection</option>
              <option value="household">Household collection</option>
              <option value="all">All sources</option>
            </select>
          </div>

          <div>
            <span className={label} style={{ color: C.inkFaint }}>Waste type</span>
            <select value={wasteTypeId} onChange={(e) => setWasteTypeId(e.target.value)} className={`${fieldCls} max-w-[130px]`} style={fieldStyle}>
              <option value="">All types</option>
              {wasteTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <Button
            onClick={handleDownload}
            disabled={!totalCount || exporting}
            variant="outline"
            title="Download all rows (Excel)"
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
            style={{ borderColor: C.line, color: C.ink, background: C.surface }}
          >
            <Download className="h-3.5 w-3.5" /> <span className="hidden 2xl:inline">{exporting ? "Downloading…" : "Download"}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 rounded-xl px-4 py-2.5 text-sm" style={{ background: `${C.brick}14`, border: `1px solid ${C.brick}44`, color: C.brick }}>
          {error}
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpiTiles.map((k) => (
          <div key={k.label} className="min-w-0 rounded-2xl border px-4 py-3 shadow-sm" style={cardStyle}>
            <p className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: C.inkFaint }}>{k.label}</p>
            {loading ? (
              <>
                <span className="mt-2 block h-6 w-24 animate-pulse rounded-md" style={{ background: C.surfaceSunk }} />
                <span className="mt-2 block h-3 w-28 animate-pulse rounded-md" style={{ background: C.surfaceSunk }} />
              </>
            ) : (
              <>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: C.ink }}>{k.value}</span>
                  {k.unit && <span className="text-xs font-semibold" style={{ color: C.inkFaint }}>{k.unit}</span>}
                </p>
                <p className="mt-0.5 truncate text-[11px]" style={{ color: C.inkFaint }}>{k.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── trend · composition · top locations ── */}
      <div className="grid shrink-0 gap-3 lg:grid-cols-3">
        <div className={`${card} h-[180px] p-4`} style={cardStyle}>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold">Monthly trend</h2>
            <span className="text-[10px]" style={{ color: C.inkFaint }}>{rangeLabel} · kg</span>
          </div>
          <div className="min-h-0 flex-1">
            {loading ? spinner : monthlyTrends.length === 0 ? empty("No trend data for this period.") : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                <AreaChart data={monthlyTrends} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.primary} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={C.primary} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.inkFaint }} axisLine={false} tickLine={false} tickFormatter={(m: string) => m.slice(2)} />
                  <YAxis tick={{ fontSize: 10, fill: C.inkFaint }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={36} />
                  <Tooltip content={<MonthTooltip />} />
                  <Area type="linear" dataKey="total_actual_weight" name="Collected weight" stroke={C.primary} strokeWidth={2} fill="url(#gradTrend)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={`${card} h-[180px] p-4`} style={cardStyle}>
          <h2 className="mb-1 text-sm font-bold">Waste composition</h2>
          {loading ? spinner : wasteTypePieData.length === 0 ? empty("No waste-type data for this period.") : (
            <div className="flex min-h-0 flex-1 items-center gap-4">
              <div className="h-[128px] w-[128px] shrink-0">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                  <PieChart>
                    <Tooltip content={<WasteTypeTooltip />} />
                    <Pie data={wasteTypePieData} dataKey="total_actual_weight" nameKey="waste_type" innerRadius={38} outerRadius={60} paddingAngle={1.5} stroke={C.surface} strokeWidth={2}>
                      {wasteTypePieData.map((entry) => <Cell key={entry.waste_type_id} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5 overflow-y-auto text-xs">
                {wasteTypePieData.map((w) => (
                  <li key={w.waste_type_id} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: w.color }} />
                    <span className="min-w-0 flex-1 truncate" style={{ color: C.inkSoft }} title={w.waste_type}>{w.waste_type}</span>
                    <span className="font-semibold tabular-nums">{w.share_percent.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={`${card} h-[180px] p-4`} style={cardStyle}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Top locations · {sortMode === "trips" ? "trips" : "weight"}</h2>
            <button type="button" onClick={() => setBottomTab("localbody")} className="text-[11px] font-semibold hover:underline" style={{ color: C.primary }}>
              View all
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
            {loading ? spinner : topBodies.length === 0 ? empty("No location data for this period.") : (
              topBodies.map((p, i) => {
                const v = sortMode === "trips" ? p.total_trips : p.total_actual_weight;
                return (
                  <div key={`${p.local_body_field}-${p.local_body_id}`}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-semibold" title={p.local_body_name}>{i + 1}. {p.local_body_name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{sortMode === "trips" ? fmtKg(v) : `${fmtKg(v)} kg`}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: C.surfaceSunk }}>
                      <div className="h-full rounded-full" style={{ width: `${(v / topMax) * 100}%`, background: "#4f46e5" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── tables: rows (tab) · waste type summary ── */}
      <div className={`${card} h-[480px] lg:h-auto lg:min-h-[240px] lg:shrink lg:grow lg:basis-[0px]`} style={cardStyle}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: C.line, background: C.surfaceSunk }}>
            {([
              { key: "locality", label: "By locality" },
              { key: "localbody", label: "By location" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setBottomTab(tab.key)}
                className="rounded-md px-3 py-1 text-xs font-semibold transition-colors"
                style={bottomTab === tab.key ? { background: C.surface, color: C.ink, boxShadow: "0 1px 2px rgba(15,23,42,.08)" } : { color: C.inkFaint }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="h-7 rounded-lg border px-2 text-[11px] outline-none" style={fieldStyle} aria-label="Sort">
              <option value="weight">Highest weight</option>
              <option value="trips">Most trips</option>
            </select>
            <span className="text-[11px]" style={{ color: C.inkFaint }}>
              {bottomTab === "locality" ? `${fmtKg(totalCount)} rows` : `${fmtKg(plbComparison.length)} locations`}
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* left: detailed rows / location totals */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border" style={{ borderColor: C.line }}>
            <div className="min-h-0 flex-1 overflow-auto">
              {bottomTab === "locality" ? (
                loading && rows.length === 0 ? spinner : rows.length === 0 ? empty("No records for this selection.") : (
                  <table className="w-full text-left">
                    <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                      <tr style={{ color: C.inkFaint }}>
                        <th className={th}>Month</th>
                        <th className={th}>Locality</th>
                        <th className={th}>Waste type</th>
                        <th className={`${th} text-right`}>Weight</th>
                        <th className={`${th} text-right`}>Trips</th>
                      </tr>
                    </thead>
                    <tbody className={loading ? "opacity-50" : undefined}>
                      {rows.map((r) => (
                        <tr key={r.unique_id} className="border-t" style={{ borderColor: C.line }}>
                          <td className={`${td} whitespace-nowrap tabular-nums`} style={{ color: C.inkSoft }}>{r.month}</td>
                          <td className={td}>
                            <span className="block font-medium">{r.local_body_name}</span>
                            <span className="text-[10px]" style={{ color: C.inkFaint }}>{r.local_body_type}</span>
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ background: wasteColor(r.waste_type_id) }} />
                              {r.waste_type}
                            </span>
                          </td>
                          <td className={`${td} text-right font-semibold tabular-nums`}>{fmtKg(r.total_actual_weight)} kg</td>
                          <td className={`${td} text-right tabular-nums`}>{fmtKg(r.total_trips)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : loading && plbComparison.length === 0 ? spinner : plbComparison.length === 0 ? empty("No locations for this selection.") : (
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                    <tr style={{ color: C.inkFaint }}>
                      <th className={th}>#</th>
                      <th className={th}>Location</th>
                      <th className={`${th} text-right`}>Weight</th>
                      <th className={`${th} text-right`}>Trips</th>
                      <th className={`${th} text-right`}>Points</th>
                      <th className={`${th} text-right`}>Avg / trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...plbComparison]
                      .sort((a, b) => (sortMode === "trips" ? b.total_trips - a.total_trips : b.total_actual_weight - a.total_actual_weight))
                      .map((p, i) => (
                        <tr key={`${p.local_body_field}-${p.local_body_id}`} className="border-t" style={{ borderColor: C.line }}>
                          <td className={`${td} tabular-nums`} style={{ color: C.inkFaint }}>{i + 1}</td>
                          <td className={td}>
                            <span className="block font-medium">{p.local_body_name}</span>
                            <span className="text-[10px]" style={{ color: C.inkFaint }}>{p.local_body_type}</span>
                          </td>
                          <td className={`${td} text-right font-semibold tabular-nums`}>{fmtKg(p.total_actual_weight)} kg</td>
                          <td className={`${td} text-right tabular-nums`}>{fmtKg(p.total_trips)}</td>
                          <td className={`${td} text-right tabular-nums`}>{fmtKg(p.collection_points_covered)}</td>
                          <td className={`${td} text-right tabular-nums`}>
                            {fmtKg(p.average_weight_per_trip ?? (p.total_trips ? p.total_actual_weight / p.total_trips : 0), 1)} kg
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            {bottomTab === "locality" && totalCount > 0 && (
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-3 py-2" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: C.inkFaint }}>
                  <span>
                    Showing {(safeDetailPage - 1) * detailPageSize + 1}–{Math.min(safeDetailPage * detailPageSize, totalCount)} of {fmtKg(totalCount)}
                  </span>
                  {/* inline buttons, not a native <select>: at the bottom of the
                      screen the browser opens a select's list off-screen */}
                  <span className="inline-flex items-center gap-0.5" role="group" aria-label="Rows per page">
                    {[10, 25, 50].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setDetailPageSize(size);
                          setDetailPage(1);
                        }}
                        aria-pressed={detailPageSize === size}
                        className="h-6 rounded-md border px-1.5 text-[11px] font-semibold tabular-nums"
                        style={detailPageSize === size ? { background: C.ink, borderColor: C.ink, color: "#fff" } : { borderColor: C.line, color: C.inkSoft }}
                      >
                        {size}
                      </button>
                    ))}
                    <span className="ml-1">/ page</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setDetailPage((page) => Math.max(1, page - 1))} disabled={safeDetailPage === 1} className="flex h-6 w-6 items-center justify-center rounded-md border disabled:opacity-40" style={{ borderColor: C.line }} aria-label="Previous page">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {visibleDetailPages.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setDetailPage(page)}
                      className="h-6 min-w-6 rounded-md border px-1.5 text-[11px] font-semibold tabular-nums"
                      style={page === safeDetailPage ? { background: "#4f46e5", borderColor: "#4f46e5", color: "#fff" } : { borderColor: C.line, color: C.inkSoft }}
                    >
                      {page}
                    </button>
                  ))}
                  <button type="button" onClick={() => setDetailPage((page) => Math.min(detailPageCount, page + 1))} disabled={safeDetailPage === detailPageCount} className="flex h-6 w-6 items-center justify-center rounded-md border disabled:opacity-40" style={{ borderColor: C.line }} aria-label="Next page">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* right: waste type summary */}
          <div className="min-h-0 min-w-0 overflow-auto rounded-xl border" style={{ borderColor: C.line }}>
            {loading && wasteRows.length === 0 ? spinner : wasteRows.length === 0 ? empty("No waste types for this selection.") : (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10" style={{ background: C.surfaceSunk }}>
                  <tr style={{ color: C.inkFaint }}>
                    <th className={th}>Waste type</th>
                    <th className={`${th} text-right`}>Total</th>
                    <th className={`${th} text-right`}>Avg / trip</th>
                    <th className={`${th} text-right`}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteRows.map((w) => (
                    <tr key={w.waste_type_id} className="border-t" style={{ borderColor: C.line }}>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: wasteColor(w.waste_type_id) }} />
                          {w.waste_type}
                        </span>
                      </td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{fmtKg(w.total_actual_weight)} kg</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtKg(w.total_trips ? w.total_actual_weight / w.total_trips : 0, 1)} kg</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtKg(w.collection_points_covered)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
