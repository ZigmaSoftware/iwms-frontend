import type { ReportResponse, ReportRow, LocationComparisonRow, WasteTypeBreakdownRow } from "./types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import notify from "@/lib/notify";
import { api } from "@/api";
import { adminApi } from "@/helpers/admin/registry";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";
import WasteReportView, { FilterField, ReportFilterBar } from "../WasteReportView";
import { C, fieldCls, fieldStyle, useWasteReportFilters, type ReportKpis } from "../wasteReportShared";

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
const fmtMonth = (ym: string) =>
  ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "";
const fmtShortMonth = (ym: string) =>
  ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : "";

/* ══════════════════════════════════════════════════════════════════
    MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function MonthlyWasteComparisonListPage({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { t } = useTranslation();

  // "" = every month on record (the trend then compares months)
  const [month, setMonth] = useState(currentMonth());
  const [sortMode, setSortMode] = useState("weight");
  const filters = useWasteReportFilters();

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<ReportResponse["monthly_trends"]>([]);
  const [plbComparison, setPlbComparison] = useState<LocationComparisonRow[]>([]);
  const [wasteTypeBreakdown, setWasteTypeBreakdown] = useState<WasteTypeBreakdownRow[]>([]);
  const [kpis, setKpis] = useState<ReportResponse["kpis"]>(initialKpis);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const buildParams = () => {
    const params: Record<string, string> = { ...filters.params, sort: sortMode };
    if (month) params.month = month;
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
      setMonthlyTrends(Array.isArray(data?.monthly_trends) ? data.monthly_trends : []);
      setPlbComparison(Array.isArray(data?.location_comparison) ? data.location_comparison : []);
      setWasteTypeBreakdown(Array.isArray(data?.waste_type_breakdown) ? data.waste_type_breakdown : []);
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
  }, [month, sortMode, filters.params, detailPage, detailPageSize]);

  /* Reset to page 1 whenever a filter OTHER than pagination changes — the
     server refetch above also fires when detailPage/detailPageSize change
     (i.e. on a "next page" click), so an unconditional reset there would
     immediately snap the user back to page 1. */
  useEffect(() => {
    setDetailPage(1);
  }, [month, sortMode, filters.params]);

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
          Company: r.company_name ?? "",
          Project: r.project_name ?? "",
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

  /* ── normalise the payload for the shared view ── */
  const viewKpis: ReportKpis = {
    weight: kpis.total_actual_weight,
    trips: kpis.total_trips,
    points: kpis.collection_points_covered,
    avgPerTrip: kpis.average_weight_per_trip ?? 0,
    locations: kpis.local_body_count ?? plbComparison.length,
    wasteTypes: kpis.waste_type_count ?? wasteTypeBreakdown.length,
  };

  const periodControl = (
    <FilterField label="Month">
      <div className="flex items-center gap-1">
        <input
          type="month"
          value={month}
          max={currentMonth()}
          onChange={(e) => setMonth(e.target.value)}
          className={fieldCls}
          style={fieldStyle}
          aria-label="Month"
        />
        <button
          type="button"
          onClick={() => setMonth(month ? "" : currentMonth())}
          className={`${fieldCls} font-semibold`}
          style={{ ...fieldStyle, color: month ? C.inkSoft : C.primary, borderColor: month ? C.line : C.primary }}
          title={month ? "Compare every month on record" : "Back to the current month"}
        >
          {month ? "Compare all months" : "This month"}
        </button>
      </div>
    </FilterField>
  );

  return (
    <WasteReportView
      embedded={embedded}
      title="Monthly Waste Collection"
      scopeLabel={`${filters.locationFiltered ? filters.locationLabel : "Across all locations"} · ${month ? fmtMonth(month) : "All months"}`}
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
      periodNoun="month"
      periodHeading="Month"
      fmtTick={fmtShortMonth}
      fmtPeriod={fmtMonth}
      kpis={viewKpis}
      trends={monthlyTrends.map((m) => ({
        period: String(m.month ?? ""),
        weight: Number(m.total_actual_weight ?? 0),
        trips: Number(m.total_trips ?? 0),
        points: Number(m.collection_points_covered ?? 0),
        avgPerTrip: Number(m.average_weight_per_trip ?? 0),
      }))}
      records={rows.map((r, i) => ({
        id: r.unique_id ?? `${r.month}-${r.local_body_id}-${r.waste_type_id}-${i}`,
        period: r.month,
        locationName: r.local_body_name,
        locationType: r.local_body_type,
        companyName: r.company_name,
        projectName: r.project_name,
        wasteTypeId: r.waste_type_id,
        wasteType: r.waste_type,
        weight: r.total_actual_weight,
        trips: r.total_trips,
        points: r.collection_points_covered,
        avgPerTrip: r.average_weight_per_trip,
      }))}
      locations={plbComparison.map((p) => ({
        key: `${p.local_body_field}-${p.local_body_id}`,
        name: p.local_body_name,
        type: p.local_body_type,
        weight: p.total_actual_weight,
        trips: p.total_trips,
        points: p.collection_points_covered,
        avgPerTrip: p.average_weight_per_trip ?? (p.total_trips ? p.total_actual_weight / p.total_trips : 0),
      }))}
      wasteTypes={wasteTypeBreakdown.map((w) => ({
        id: w.waste_type_id,
        name: w.waste_type,
        weight: w.total_actual_weight,
        trips: w.total_trips,
        points: w.collection_points_covered,
        share: w.share_percent,
        locations: w.location_count,
      }))}
      wasteTypeOrder={filters.wasteTypeOptions.map((o) => o.value)}
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
