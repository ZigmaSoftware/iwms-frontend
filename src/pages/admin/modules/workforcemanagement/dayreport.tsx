import { useEffect, useMemo, useState } from "react";
import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import { ProjectSelectorBar } from "@/components/common/ProjectSelectorBar";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/common/SafeDataTable";
import { FilterBar } from "@/components/common/FilterBar";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import "./dayreport.css";
import { useTranslation } from "react-i18next";
import { applyTableFilters } from "@/utils/tableFilterMatch";

// Matches the actual day-wise API response shape
type ApiRow = {
  Ticket_No: string;
  date: string;
  Start_Time: string | null;
  Vehicle_No: string;
  Loaded_Wt_W1: number;
  Wet_Wt_with_Vehicle_W2: number;
  Vehicle_Tare_Wt_W3: number;
  Dry_Wt: number;
  Wet_Wt: number;
  Mix_Wt: number;
  Net_Wt: number;
};

const DAY_REPORT_GLOBAL_FIELDS = ["Ticket_No", "Vehicle_No", "date"];

// ---------- Helpers ----------
const today = new Date();
const getLastDayOfMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const parseNum = (v: string | undefined) => Number((v ?? "0").replace(/,/g, ""));
const fmtNum = (v: number) => v.toLocaleString();
const fmtTime = (v: string | null) => v ?? "-";

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

  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [rows, setRows] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex justify-between items-center">
      <div className="flex gap-3 items-center">
        <label>
          {t("admin.workforce_management.day_report.filters.from")}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="ml-2 wf-date-input"
          />
        </label>
        <label>
          {t("admin.workforce_management.day_report.filters.to")}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="ml-2 wf-date-input"
          />
        </label>
        <Button label={t("common.go")} onClick={fetchData} />
      </div>
      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("admin.workforce_management.day_report.search_placeholder")}
      />
    </div>
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
      const url = `${API_BASE}?action=day_wise_data&from_date=${fromDate}&to_date=${toDate}&key=${API_KEY}`;
      console.log("📡 DayReport fetch URL:", url);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      console.log("📡 DayReport response:", json);

      if (!json.status || !Array.isArray(json.data)) {
        throw new Error("Invalid API response");
      }

      if (json.data.length === 0) {
        setRows([]);
        setError("admin.workforce_management.day_report.error_no_data");
        return;
      }

      const mapped: ApiRow[] = json.data.map((row: any) => {
        const [datePart, timePart] = (row.Date ?? "").split(" ");
        return {
          Ticket_No: row.Ticket_No ?? "-",
          date: datePart ?? "",
          Start_Time: timePart ?? null,
          Vehicle_No: row.Vehicle_No ?? "-",
          Loaded_Wt_W1: parseNum(row.Loaded_Wt_W1),
          Wet_Wt_with_Vehicle_W2: parseNum(row.Wet_Wt_with_Vehicle_W2),
          Vehicle_Tare_Wt_W3: parseNum(row.Vehicle_Tare_Wt_W3),
          Dry_Wt: parseNum(row.Dry_Wt),
          Wet_Wt: parseNum(row.Wet_Wt),
          Mix_Wt: parseNum(row.Mix_Wt),
          Net_Wt: parseNum(row.Net_Wt),
        };
      });

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
  }, [dayWiseWeighmentApiUrl, contextLoading]);

  const indexTemplate = (_: ApiRow, { rowIndex }: any) => rowIndex + 1;
  const exportRows = useMemo(
    () => applyTableFilters(rows, filters, DAY_REPORT_GLOBAL_FIELDS),
    [filters, rows],
  );

  // ---------- UI ----------
  if (!contextLoading && !API_BASE) {
    return (
      <>
        <ProjectSelectorBar />
        <div className="p-4">
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
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t("admin.workforce_management.day_report.title")}
            </h1>
            <p className="text-gray-500 text-sm">
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

        <DataTable
          value={rows}
          exportRows={exportRows}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          filters={filters}
          header={renderHeader()}
          loading={loading}
          globalFilterFields={DAY_REPORT_GLOBAL_FIELDS}
          stripedRows
          showGridlines
          emptyMessage={t("admin.workforce_management.day_report.empty_message")}
          className="p-datatable-sm"
        >
          <Column
            header="#"
            body={indexTemplate}
            style={{ width: "60px" }}
          />
          <Column field="date" header="Date" sortable />
          <Column
            header="Time"
            body={(r: ApiRow) => fmtTime(r.Start_Time)}
          />
          <Column field="Ticket_No" header="Ticket No" sortable />
          <Column field="Vehicle_No" header="Vehicle No" sortable />
          <Column
            header="Loaded Wt (W1)"
            body={(r: ApiRow) => fmtNum(r.Loaded_Wt_W1)}
          />
          <Column
            header="Wet Wt + Vehicle (W2)"
            body={(r: ApiRow) => fmtNum(r.Wet_Wt_with_Vehicle_W2)}
          />
          <Column
            header="Tare Wt (W3)"
            body={(r: ApiRow) => fmtNum(r.Vehicle_Tare_Wt_W3)}
          />
          <Column
            header="Dry Wt"
            body={(r: ApiRow) => fmtNum(r.Dry_Wt)}
          />
          <Column
            header="Wet Wt"
            body={(r: ApiRow) => fmtNum(r.Wet_Wt)}
          />
          <Column
            header="Mix Wt"
            body={(r: ApiRow) => fmtNum(r.Mix_Wt)}
          />
          <Column
            header="Net Wt"
            body={(r: ApiRow) => fmtNum(r.Net_Wt)}
            sortable
          />
        </DataTable>
      </div>
    </>
  );
}
