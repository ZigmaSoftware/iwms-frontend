import type { DailyReportResponse, DailyReportRow, LocationComparisonRow, WasteTypeBreakdownRow } from "./types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import notify from "@/lib/notify";
import { api } from "@/api";
import { dailyWasteComparisonApi } from "@/helpers/admin";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";
import WasteReportView, { FilterField, ReportFilterBar, StatusPill } from "../WasteReportView";
import { C, fieldCls, fieldStyle, useWasteReportFilters, type ReportKpis } from "../wasteReportShared";

const initialKpis: DailyReportResponse["kpis"] = {
  total_actual_weight_kg: 0,
  average_weight_per_trip: 0,
  total_trips: 0,
  collection_points_covered: 0,
  waste_type_count: 0,
  local_body_count: 0,
};

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayValue = () => isoDate(new Date());
const monthStartValue = () => {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
};
const fmtDay = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
const fmtShortDay = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

/* ══════════════════════════════════════════════════════════════════
    MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function DailyWasteComparisonList({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { t } = useTranslation();

  // date range (defaults to this month so far); either end may be cleared
  const [dateFrom, setDateFrom] = useState(monthStartValue());
  const [dateTo, setDateTo] = useState(todayValue());
  const [sortMode, setSortMode] = useState("weight");
  const filters = useWasteReportFilters();

  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [dateTrends, setDateTrends] = useState<DailyReportResponse["date_trends"]>([]);
  const [plbCompare, setPlbCompare] = useState<LocationComparisonRow[]>([]);
  const [wasteTypeBreakdown, setWasteTypeBreakdown] = useState<WasteTypeBreakdownRow[]>([]);
  const [kpis, setKpis] = useState<DailyReportResponse["kpis"]>(initialKpis);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const buildParams = () => {
    const params: Record<string, string> = { ...filters.params, sort: sortMode };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
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

      const { data } = await api.get<DailyReportResponse>(
        "/reports/daily-waste-comparisons/",
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
      setDateTrends(Array.isArray(data?.date_trends) ? data.date_trends : []);
      setPlbCompare(Array.isArray(data?.location_comparison) ? data.location_comparison : []);
      setWasteTypeBreakdown(Array.isArray(data?.waste_type_breakdown) ? data.waste_type_breakdown : []);
      setKpis(data?.kpis ?? initialKpis);
    } catch {
      setRows([]);
      setTotalCount(0);
      setDateTrends([]);
      setPlbCompare([]);
      setWasteTypeBreakdown([]);
      setKpis(initialKpis);
      setError("Unable to load daily waste collection data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, sortMode, filters.params, detailPage, detailPageSize]);

  /* Reset to page 1 whenever a filter OTHER than pagination changes — the
     server refetch above also fires when detailPage/detailPageSize change
     (i.e. on a "next page" click), so an unconditional reset there would
     immediately snap the user back to page 1. */
  useEffect(() => {
    setDetailPage(1);
  }, [dateFrom, dateTo, sortMode, filters.params]);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const exportRows = await dailyWasteComparisonApi.readAllForExport({
        params: buildParams(),
      });
      await exportRecordsToExcel(
        exportRows.map((r) => ({
          Date: r.collection_date,
          "Location Type": r.local_body_type,
          Location: r.local_body_name,
          Company: r.company_name ?? "",
          Project: r.project_name ?? "",
          "Waste Type": r.waste_type,
          "Weight Collected (kg)": r.actual_weight_kg,
          Trips: r.total_trips,
          Points: r.collection_points_covered,
          "Avg Weight / Trip (kg)": r.average_weight_per_trip,
          Status: r.verification_status ?? "Unverified",
        })),
        getAdminScreenExcelFilename("all"),
        "Daily Waste Collection",
      );
    } catch {
      notify.fire(
        t("common.error"),
        "Failed to download daily waste collection data.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  };

  /* ── normalise the payload for the shared view ── */
  const viewKpis: ReportKpis = {
    weight: kpis.total_actual_weight_kg,
    trips: kpis.total_trips,
    points: kpis.collection_points_covered,
    avgPerTrip: kpis.average_weight_per_trip ?? 0,
    locations: kpis.local_body_count ?? plbCompare.length,
    wasteTypes: kpis.waste_type_count ?? wasteTypeBreakdown.length,
  };

  const rangeLabel =
    dateFrom && dateTo ? `${fmtShortDay(dateFrom)} – ${fmtDay(dateTo)}`
      : dateFrom ? `From ${fmtDay(dateFrom)}`
        : dateTo ? `Up to ${fmtDay(dateTo)}`
          : "All dates";

  const periodControl = (
    <FilterField label="Date range">
      <div className={`${fieldCls} flex items-center gap-1`} style={fieldStyle}>
        <input type="date" value={dateFrom} className="w-[110px] bg-transparent outline-none" max={dateTo || todayValue()} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <span style={{ color: C.inkFaint }}>–</span>
        <input type="date" value={dateTo} className="w-[110px] bg-transparent outline-none" min={dateFrom || undefined} max={todayValue()} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
      </div>
    </FilterField>
  );

  return (
    <WasteReportView
      embedded={embedded}
      title="Daily Waste Collection"
      scopeLabel={`${filters.locationFiltered ? filters.locationLabel : "Across all locations"} · ${rangeLabel}`}
      headerBadge={!loading && totalCount > 0 ? <StatusPill status={kpis.verification_status} /> : undefined}
      filterBar={
        <ReportFilterBar
          filters={filters}
          periodControl={periodControl}
          onDownload={handleDownload}
          exporting={exporting}
          canDownload={totalCount > 0}
        />
      }
      loading={loading}
      error={error}
      periodNoun="day"
      periodHeading="Date"
      fmtTick={fmtShortDay}
      fmtPeriod={fmtDay}
      kpis={viewKpis}
      trends={dateTrends.map((d) => ({
        period: String(d.collection_date ?? ""),
        weight: Number(d.actual_weight_kg ?? 0),
        trips: Number(d.total_trips ?? 0),
        points: Number(d.collection_points_covered ?? 0),
        avgPerTrip: Number(d.average_weight_per_trip ?? 0),
      }))}
      records={rows.map((r) => ({
        id: r.unique_id,
        period: r.collection_date,
        locationName: r.local_body_name,
        locationType: r.local_body_type,
        companyName: r.company_name,
        projectName: r.project_name,
        wasteTypeId: r.waste_type_id,
        wasteType: r.waste_type,
        weight: r.actual_weight_kg,
        trips: r.total_trips,
        points: r.collection_points_covered,
        avgPerTrip: r.average_weight_per_trip ?? (r.total_trips ? r.actual_weight_kg / r.total_trips : 0),
        status: r.verification_status,
      }))}
      locations={plbCompare.map((p) => ({
        key: `${p.local_body_field}-${p.local_body_id}`,
        name: p.local_body_name,
        type: p.local_body_type,
        weight: p.actual_weight_kg,
        trips: p.total_trips,
        points: p.collection_points_covered,
        avgPerTrip: p.average_weight_per_trip ?? (p.total_trips ? p.actual_weight_kg / p.total_trips : 0),
      }))}
      wasteTypes={wasteTypeBreakdown.map((w) => ({
        id: w.waste_type_id,
        name: w.waste_type,
        weight: w.actual_weight_kg,
        trips: w.total_trips,
        points: w.collection_points_covered,
        share: w.share_percent,
        locations: w.location_count,
      }))}
      wasteTypeOrder={filters.wasteTypeOptions.map((o) => o.value)}
      showStatus
      sortMode={sortMode}
      onSortMode={setSortMode}
      page={detailPage}
      pageSize={detailPageSize}
      totalCount={totalCount}
      onPage={setDetailPage}
      onPageSize={(size) => {
        setDetailPageSize(size);
        setDetailPage(1);
      }}
    />
  );
}
