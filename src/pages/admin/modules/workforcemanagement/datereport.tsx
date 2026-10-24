import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import { ProjectSelectorBar } from "@/components/common/ProjectSelectorBar";

import { DataTable } from "@/components/common/SafeDataTable";
import { StackCell } from "@/components/common/TableCells";
import { FilterBar } from "@/components/common/FilterBar";
import { FilterSection, type ActiveFilterChip } from "@/components/common/ListToolbar";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import { combineFilters, type FilterPart } from "@/components/filters/useOptionFilter";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { getEncryptedRoute } from "@/utils/routeCache";
import "./datereport.css";
import { useTranslation } from "react-i18next";
import { applyTableFilters } from "@/utils/tableFilterMatch";
import {
  DAY_REPORT_GLOBAL_FIELDS,
  dayTicketColumns,
  fetchDayTickets,
  type DayTicketRow,
} from "./dayTickets";

// ---------- Type definition (matches the API response) ----------
type ApiRow = {
  date: string;
  Start_Time: string | null;
  End_Time: string | null;
  total_trip: number;
  dry_weight: number;
  wet_weight: number;
  mix_weight: number;
  total_net_weight: number;
  average_weight_per_trip: number;
};

const DATE_REPORT_GLOBAL_FIELDS = [
  "date",
  "Start_Time",
  "End_Time",
  "total_trip",
  "dry_weight",
  "wet_weight",
  "mix_weight",
  "total_net_weight",
  "average_weight_per_trip",
];

// ---------- Helpers ----------
const today = new Date();
const getLastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const formatNumber = (v?: number | null) =>
  v !== null && v !== undefined ? v.toLocaleString() : "-";
const formatTime = (v: string | null) => (v ? v : "-");

// ---------- Per-day ticket popup (day-wise API for a single date) ----------
function DayTicketsDialog({
  summary,
  apiBase,
  apiKey,
  onClose,
}: {
  summary: ApiRow;
  apiBase: string | null | undefined;
  apiKey: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DayTicketRow[]>([]);
  const [search, setSearch] = useState("");
  const filters = useMemo(
    () => ({ global: { value: search || null, matchMode: FilterMatchMode.CONTAINS } }),
    [search],
  );
  const exportRows = useMemo(
    () => applyTableFilters(rows, filters, DAY_REPORT_GLOBAL_FIELDS),
    [filters, rows],
  );

  // Starts in the loading state; the dialog is remounted for each day viewed.
  const [loading, setLoading] = useState(Boolean(apiBase));
  const [error, setError] = useState<string | null>(
    apiBase ? null : "admin.workforce_management.day_report.error_no_api",
  );

  useEffect(() => {
    if (!apiBase) return;
    let cancelled = false;
    fetchDayTickets(apiBase, apiKey, summary.date, summary.date)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        if (data.length === 0) setError("admin.workforce_management.day_report.error_no_data");
      })
      .catch((err) => {
        console.error("❌ Day tickets fetch error:", err);
        if (cancelled) return;
        setRows([]);
        setError("admin.workforce_management.day_report.error_load_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, apiKey, summary.date]);

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div>
          <p className="text-lg font-bold text-gray-800">
            {t("admin.workforce_management.day_report.title")} — {summary.date}
          </p>
          <p className="text-xs text-gray-500 font-normal mt-0.5">
            {t("admin.workforce_management.date_report.columns.trips")}: {formatNumber(summary.total_trip)}
            {" · "}
            {t("admin.workforce_management.date_report.columns.net")}: {formatNumber(summary.total_net_weight)}
          </p>
        </div>
      }
      style={{ width: "90vw", maxWidth: "1200px" }}
      modal
      draggable={false}
      resizable={false}
    >
      {error && <p className="text-red-600 mb-3">{t(error)}</p>}
      <DataTable
        localData
        value={rows}
        exportRows={exportRows}
        exportFilename={`weighbridge-tickets-${summary.date}`}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        filters={filters}
        header={
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("admin.workforce_management.day_report.search_placeholder")}
          />
        }
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
    </Dialog>
  );
}

export default function DateReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { encWorkforceManagement } = getEncryptedRoute();
  const { weighmentApiUrl, dayWiseWeighmentApiUrl, loading: contextLoading } = useProjectSelector();
  const [viewing, setViewing] = useState<ApiRow | null>(null);

  const API_BASE = weighmentApiUrl;
  const API_KEY = import.meta.env.VITE_WEIGHBRIDGE_WASTE_COLLECTION_KEY || "ZIGMA-DELHI-WEIGHMENT-2025-SECURE";

  // ---------- Date state ----------
  const initialFromDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const initialToDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
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
            {t("admin.workforce_management.date_report.filters.from")}
            <input
              type="date"
              value={dateRange.draft.from}
              max={dateRange.draft.to || undefined}
              onChange={(e) => dateRange.setField("from", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-gray-500">
            {t("admin.workforce_management.date_report.filters.to")}
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

  // ---------- Global search filter ----------
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
      searchPlaceholder={t("admin.workforce_management.date_report.search_placeholder")}
    />
  );

  // ---------- Data fetching ----------
  async function loadData() {
    // 1. Validate date range
    if (new Date(fromDate) > new Date(toDate)) {
      setError("admin.workforce_management.date_report.error_from_after_to");
      return;
    }

    if (!API_BASE) {
      console.error("❌ Date-wise weighment API URL is not configured for this project");
      setError("admin.workforce_management.date_report.error_no_api");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 3. Build the exact working URL
      const url = `${API_BASE}?action=day_wise_data&from_date=${fromDate}&to_date=${toDate}&key=${API_KEY}`;
      console.log("📡 Fetching:", url);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      console.log("📡 Response:", json);

      // 4. Validate response structure
      if (json.status === true && Array.isArray(json.data)) {
        if (json.data.length === 0) {
          setRows([]);
          setError("admin.workforce_management.date_report.error_no_data");
        } else {
          setRows(json.data);
          // Clear any previous error
          setError(null);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("❌ Fetch error:", err);
      setRows([]);
      setError("admin.workforce_management.date_report.error_load_failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contextLoading) return;
    if (weighmentApiUrl) {
      loadData();
    } else {
      // Project has no weighment API — clear stale data from the previous project.
      setRows([]);
      setError("admin.workforce_management.date_report.error_no_api");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weighmentApiUrl, contextLoading, fromDate, toDate]);

  // ---------- Table index column ----------
  const indexTemplate = (_: ApiRow, { rowIndex }: any) => rowIndex + 1;
  const exportRows = useMemo(
    () => applyTableFilters(rows, filters, DATE_REPORT_GLOBAL_FIELDS),
    [filters, rows],
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
              onClick={() => navigate(`/${encWorkforceManagement}/${encWorkforceManagement}`)}
            />
          </div>
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-base font-medium">{t("admin.workforce_management.date_report.error_no_api")}</p>
            <p className="text-sm mt-1">Set a Weighment API URL in the project settings to enable this report.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <ProjectSelectorBar />
      <div className="p-3">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        {/* Header with Back button */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t("admin.workforce_management.date_report.title")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("admin.workforce_management.date_report.subtitle")}
            </p>
          </div>
          <Button
            icon="pi pi-arrow-left"
            label={t("common.back")}
            severity="success"
            onClick={() =>
              navigate(`/${encWorkforceManagement}/${encWorkforceManagement}`)
            }
          />
        </div>

        {/* Error message */}
        {error && <p className="text-red-600 mb-3">{t(error)}</p>}

        {/* DataTable */}
        <DataTable
          value={rows}
          exportRows={exportRows}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          filters={filters}
          header={renderHeader()}
          filterPanel={combineFilters(dateFilter)}
          loading={loading}
          stripedRows
          showGridlines
          globalFilterFields={DATE_REPORT_GLOBAL_FIELDS}
          emptyMessage={t("admin.workforce_management.date_report.empty_message")}
          className="p-datatable-sm"
          fitWidth
        >
          <Column
            header={t("admin.workforce_management.date_report.columns.s_no")}
            body={indexTemplate}
            style={{ width: "6%" }}
          />
          <Column
            field="date"
            header={t("admin.workforce_management.date_report.columns.date")}
            sortable
            style={{ width: "14%" }}
          />
          <Column
            header="Time"
            style={{ width: "18%" }}
            body={(r: ApiRow) => (
              <StackCell
                lines={[
                  {
                    label: t("admin.workforce_management.date_report.columns.start_time"),
                    value: formatTime(r.Start_Time),
                  },
                  {
                    label: t("admin.workforce_management.date_report.columns.end_time"),
                    value: formatTime(r.End_Time),
                  },
                ]}
              />
            )}
          />
          <Column
            field="total_trip"
            header={t("admin.workforce_management.date_report.columns.trips")}
            sortable
            style={{ width: "10%" }}
          />
          <Column
            header="Waste Split"
            style={{ width: "26%" }}
            body={(r: ApiRow) => (
              <StackCell
                lines={[
                  {
                    label: t("admin.workforce_management.date_report.columns.dry"),
                    value: formatNumber(r.dry_weight),
                  },
                  {
                    label: t("admin.workforce_management.date_report.columns.wet"),
                    value: formatNumber(r.wet_weight),
                  },
                  {
                    label: t("admin.workforce_management.date_report.columns.mixed"),
                    value: formatNumber(r.mix_weight),
                  },
                ]}
              />
            )}
          />
          <Column
            field="total_net_weight"
            header={t("admin.workforce_management.date_report.columns.net")}
            sortable
            style={{ width: "26%" }}
            body={(r: ApiRow) => (
              <StackCell
                primary={formatNumber(r.total_net_weight)}
                lines={[
                  {
                    label: t("admin.workforce_management.date_report.columns.avg_trip"),
                    value: Number(r.average_weight_per_trip).toFixed(2),
                  },
                ]}
              />
            )}
          />
          <Column
            header={t("common.actions", "Actions")}
            exportable={false}
            style={{ width: "6%" }}
            body={(r: ApiRow) => (
              <div className="flex justify-center">
                <Button
                  icon="pi pi-eye"
                  rounded
                  text
                  severity="info"
                  aria-label="View tickets"
                  tooltip="View tickets for this day"
                  tooltipOptions={{ position: "left" }}
                  onClick={() => setViewing(r)}
                />
              </div>
            )}
          />
        </DataTable>
      </div>
    </div>
    {viewing && (
      <DayTicketsDialog
        summary={viewing}
        apiBase={dayWiseWeighmentApiUrl}
        apiKey={API_KEY}
        onClose={() => setViewing(null)}
      />
    )}
    </>
  );
}
