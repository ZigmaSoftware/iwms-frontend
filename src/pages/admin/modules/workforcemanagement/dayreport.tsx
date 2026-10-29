import { useEffect, useMemo, useState } from "react";
import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import { ProjectSelectorBar } from "@/components/common/ProjectSelectorBar";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/common/SafeDataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { FilterSection, type ActiveFilterChip } from "@/components/common/ListToolbar";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import {
  combineFilters,
  useOptionFilter,
  type FilterPart,
} from "@/components/filters/useOptionFilter";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";

import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import "./dayreport.css";
import { useTranslation } from "react-i18next";
import { applyTableFilters } from "@/utils/tableFilterMatch";
import {
  DAY_REPORT_GLOBAL_FIELDS,
  dayTicketColumns,
  fetchDayTickets,
  type DayTicketRow,
} from "./dayTickets";

type ApiRow = DayTicketRow;

// ---------- Helpers ----------
const today = new Date();
const getLastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

export default function DayReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dayWiseWeighmentApiUrl, loading: contextLoading } = useProjectSelector();

  const API_BASE = dayWiseWeighmentApiUrl;
  const API_KEY = import.meta.env.VITE_WEIGHBRIDGE_WASTE_COLLECTION_KEY || "ZIGMA-DELHI-WEIGHMENT-2025-SECURE";

  const initialFromDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-01`;

  const initialToDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(
    getLastDayOfMonth(today.getFullYear(), today.getMonth() + 1)
  ).padStart(2, "0")}`;

  // From / To are required by the API: the Filters panel edits a draft,
  // Reset (and removing a chip) goes back to the current month.
  const defaultRange = { from: initialFromDate, to: initialToDate };
  const dateRange = useDraftFilter({ empty: defaultRange });
  const { from: fromDate, to: toDate } = dateRange.applied;
  const dateChips: ActiveFilterChip[] = (["from", "to"] as const)
    .filter((key) => dateRange.applied[key] !== defaultRange[key])
    .map((key) => ({
      key,
      label: key === "from" ? "From date" : "To date",
      value: dateRange.applied[key],
      onRemove: () => dateRange.commit({ ...dateRange.applied, [key]: defaultRange[key] }),
    }));
  const dateFilter: FilterPart = {
    field: (
      <FilterSection label="Date range">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-500">
            {t("admin.workforce_management.day_report.filters.from")}
            <input
              type="date"
              value={dateRange.draft.from}
              max={dateRange.draft.to || undefined}
              onChange={(e) => dateRange.setField("from", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-gray-500">
            {t("admin.workforce_management.day_report.filters.to")}
            <input
              type="date"
              value={dateRange.draft.to}
              min={dateRange.draft.from || undefined}
              onChange={(e) => dateRange.setField("to", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
        </div>
      </FilterSection>
    ),
    chips: dateChips,
    count: dateChips.length,
    // an emptied date input falls back to the default instead of sending ""
    apply: () =>
      dateRange.commit({
        from: dateRange.draft.from || defaultRange.from,
        to: dateRange.draft.to || defaultRange.to,
      }),
    reset: () => dateRange.commit(defaultRange),
  };
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- Vehicle filter (options from the loaded tickets) ----------
  const vehicleOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.Vehicle_No).filter((v) => v && v !== "-"))]
        .sort()
        .map((v) => ({ label: v, value: v })),
    [rows],
  );
  const vehicleFilter = useOptionFilter({
    param: "vehicle",
    label: "Vehicle",
    options: vehicleOptions,
    allLabel: "All vehicles",
  });
  const vehicleRows = useMemo(
    () =>
      vehicleFilter.value
        ? rows.filter((r) => r.Vehicle_No === vehicleFilter.value)
        : rows,
    [rows, vehicleFilter.value],
  );
  const vehicleTotals = useMemo(
    () => ({
      trips: vehicleRows.length,
      net: vehicleRows.reduce((sum, r) => sum + r.Net_Wt, 0),
      dry: vehicleRows.reduce((sum, r) => sum + r.Dry_Wt, 0),
      wet: vehicleRows.reduce((sum, r) => sum + r.Wet_Wt, 0),
      mix: vehicleRows.reduce((sum, r) => sum + r.Mix_Wt, 0),
    }),
    [vehicleRows],
  );

  // ---------- Filters ----------
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const onGlobalFilterChange = (value: string) => {
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilterValue(value);
  };

  const renderHeader = () => (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={onGlobalFilterChange}
      searchPlaceholder={t("admin.workforce_management.day_report.search_placeholder")}
    />
  );

  // ---------- Fetch Data ----------
  async function fetchData() {
    if (new Date(fromDate) > new Date(toDate)) {
      setError("admin.workforce_management.day_report.error_from_after_to");
      return;
    }

    if (!API_BASE) {
      setError("admin.workforce_management.day_report.error_no_api");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mapped = await fetchDayTickets(API_BASE, API_KEY, fromDate, toDate);

      if (mapped.length === 0) {
        setRows([]);
        setError("admin.workforce_management.day_report.error_no_data");
        return;
      }

      setRows(mapped);
    } catch (err: any) {
      console.error("❌ DayReport fetch error:", err);
      setError("admin.workforce_management.day_report.error_load_failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contextLoading) return;
    if (dayWiseWeighmentApiUrl) {
      fetchData();
    } else {
      // Project has no day-wise API — clear stale data from the previous project.
      setRows([]);
      setError("admin.workforce_management.day_report.error_no_api");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayWiseWeighmentApiUrl, contextLoading, fromDate, toDate]);

  const exportRows = useMemo(
    () => applyTableFilters(vehicleRows, filters, DAY_REPORT_GLOBAL_FIELDS),
    [filters, vehicleRows],
  );

  // ---------- UI ----------
  if (!contextLoading && !API_BASE) {
    return (
      <>
        <ProjectSelectorBar />
        <div className="p-3">
          <div className="flex justify-end mb-4">
            <Button
              icon="pi pi-arrow-left"
              label={t("common.back")}
              severity="success"
              onClick={() => navigate(-1)}
            />
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-base font-medium">{t("admin.workforce_management.day_report.error_no_api")}</p>
            <p className="text-sm mt-1">Set a Day-wise Weighment API URL in the project settings to enable this report.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ProjectSelectorBar />
      <div className="p-3">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t("admin.workforce_management.day_report.title")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("admin.workforce_management.day_report.subtitle")}
            </p>
          </div>

          <Button
            icon="pi pi-arrow-left"
            label={t("common.back")}
            severity="success"
            onClick={() => navigate(-1)}
          />
        </div>

        {error && <p className="text-red-600 mb-3">{t(error)}</p>}

        {vehicleFilter.value && (
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-gray-700 dark:border-green-900 dark:bg-green-950 dark:text-gray-200">
            <span className="font-semibold">
              <i className="pi pi-truck mr-2" />
              {vehicleFilter.value}
            </span>
            <span>Trips: {vehicleTotals.trips.toLocaleString()}</span>
            <span>Net Wt: {vehicleTotals.net.toLocaleString()}</span>
            <span>Dry: {vehicleTotals.dry.toLocaleString()}</span>
            <span>Wet: {vehicleTotals.wet.toLocaleString()}</span>
            <span>Mix: {vehicleTotals.mix.toLocaleString()}</span>
          </div>
        )}

        <DataTable
          value={vehicleRows}
          exportRows={exportRows}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          filters={filters}
          header={renderHeader()}
          filterPanel={combineFilters(dateFilter, vehicleFilter)}
          loading={loading}
          globalFilterFields={DAY_REPORT_GLOBAL_FIELDS}
          stripedRows
          showGridlines
          emptyMessage={t("admin.workforce_management.day_report.empty_message")}
          className="p-datatable-sm"
          fitWidth
        >
          {dayTicketColumns()}
        </DataTable>
      </div>
    </>
  );
}
