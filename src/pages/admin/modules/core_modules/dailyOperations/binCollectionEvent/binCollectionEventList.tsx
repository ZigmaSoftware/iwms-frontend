import type { BinCERecord } from "./types";
import type { TableFilters } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { PencilIcon } from "@/icons";
import { binCollectionEventApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { FilterBar } from "@/components/common/FilterBar";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";


const extractError = (error: unknown): string | null => {
  const data = (error as any)?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
};

const BreakdownCell = ({ row }: { row: BinCERecord }) => {
  const bd = row.breakdown_info;
  if (!bd) return <span className="text-xs text-gray-300">—</span>;

  const isApproved = bd.approval_status === "APPROVED";
  const isPending  = bd.approval_status === "PENDING";

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isApproved ? "bg-green-100 text-green-700" :
        isPending  ? "bg-orange-100 text-orange-700" :
                     "bg-red-100 text-red-700"
      }`}>
        {isApproved ? "✓ Replaced" : isPending ? "⚠ Pending" : "✕ Rejected"}
      </span>
      {isApproved && bd.replacement_vehicle_no && (
        <div className="text-[10px] text-gray-600 leading-tight">
          <span className="font-medium">Veh:</span> {bd.replacement_vehicle_no}
        </div>
      )}
      {isApproved && (bd.replacement_driver || bd.replacement_operator) && (
        <div className="text-[10px] text-gray-600 leading-tight">
          {bd.replacement_driver && <span><span className="font-medium">Drv:</span> {bd.replacement_driver}</span>}
          {bd.replacement_driver && bd.replacement_operator && <span className="mx-1">·</span>}
          {bd.replacement_operator && <span><span className="font-medium">Opr:</span> {bd.replacement_operator}</span>}
        </div>
      )}
    </div>
  );
};

const formatDate = (val?: string) => {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// A5: BinCollectionEvent.STATUS_CHOICES.
const STATUS_OPTIONS = [
  { value: "Collected", label: "Collected" },
  { value: "Not Collected", label: "Not Collected" },
  { value: "Collect Later", label: "Collect Later" },
];

const STATUS_STYLES: Record<string, string> = {
  Collected: "bg-green-100 text-green-800",
  "Not Collected": "bg-red-100 text-red-800",
  "Collect Later": "bg-amber-100 text-amber-800",
};

const StatusBadge = ({ value }: { value?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[value ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
    {value ?? "Collected"}
  </span>
);

const today = new Date().toISOString().split("T")[0];

export default function BinCollectionEventList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, showAllProjectsOption, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encScheduleMasters, encBinCollectionEvent } = getEncryptedRoute();
  const { newPath: NEW_PATH } = createCrudRoutePaths(encScheduleMasters, encBinCollectionEvent);
  const { editPath: VIEW_PATH } = createCrudRoutePaths(
    encScheduleMasters,
    encBinCollectionEvent,
  );

  const [records, setRecords] = useState<BinCERecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _trip_plan: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _collection_point: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _bin: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _waste_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _panchayat: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _ward: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _zone: { value: null, matchMode: FilterMatchMode.CONTAINS },
    collection_date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const loadRecords = useCallback(() => {
    if (isSuperAdmin && companies.length === 0) { setRecords([]); return; }
    if (!companyUniqueId && !isSuperAdmin) { setRecords([]); return; }
    setLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    const dateFilter = filters.collection_date?.value;
    if (dateFilter) params.collection_date = dateFilter;
    // A5: viewset supports ward_id/zone_id/status query-param filters.
    const statusFilter = filters.status?.value;
    if (statusFilter) params.status = statusFilter;
    binCollectionEventApi
      .readAll({ params })
      .then((data) => setRecords(Array.isArray(data) ? (data as BinCERecord[]) : []))
      .catch((error) => {
        setRecords([]);
        Swal.fire(t("common.error"), extractError(error) ?? t("common.fetch_failed"), "error");
      })
      .finally(() => setLoading(false));
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, filters.collection_date, filters.status, t]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const rows = useMemo(
    () =>
      records.map((r) => ({
        ...r,
        _trip_plan: r.trip_plan?.display_code ?? r.trip_assignment_id ?? "-",
        _collection_point: r.collection_point?.cp_name ?? r.collection_point_id ?? "-",
        _bin: r.bin?.bin_name ?? "-",
        _waste_type: r.waste_type?.waste_type_name ?? "-",
        _vehicle: r.vehicle?.vehicle_no ?? "-",
        _panchayat: r.panchayat_name ?? r.panchayat_id ?? "-",
        _ward: r.ward_name ?? r.ward_id ?? "-",
        _zone: typeof r.zone_name === "object" && r.zone_name !== null ? (r.zone_name as Record<string, unknown>).zone_name ?? "-" : r.zone_name ?? "-",
        collection_date: r.collection_date ?? "",
        status: r.status ?? "Collected",
      })),
    [records],
  );

  /* ── apply filters locally to get the visible subset ─────────────────────
     PrimeReact filters internally but doesn't expose the result. We replicate
     the same CONTAINS logic so the summary pills always match what's on screen. */
  const GLOBAL_FIELDS = ["_trip_plan", "_collection_point", "_bin", "_waste_type", "_panchayat", "_ward", "_zone", "collection_date", "status"] as const;
  type FilterableField = (typeof GLOBAL_FIELDS)[number];
  const isFilterableField = (field: string): field is FilterableField =>
    (GLOBAL_FIELDS as readonly string[]).includes(field);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const [field, filter] of Object.entries(filters)) {
        const val = filter.value;
        if (!val) continue;
        const needle = String(val).toLowerCase();
        if (field === "global") {
          const hit = GLOBAL_FIELDS.some((f) => String(row[f] ?? "").toLowerCase().includes(needle));
          if (!hit) return false;
        } else if (isFilterableField(field)) {
          if (!String(row[field] ?? "").toLowerCase().includes(needle)) return false;
        }
      }
      return true;
    });
  }, [rows, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    exportRecordsToExcel(
      filteredRows.map((r) => ({
        "Trip Plan": r._trip_plan,
        "Collection Point": r._collection_point,
        PLB: r._panchayat,
        Ward: r._ward,
        Zone: r._zone,
        Bin: r._bin,
        "Waste Type": r._waste_type,
        Vehicle: r._vehicle,
        "Weight (kg)": r.collected_weight_kg ?? "-",
        "Collection Date": r.collection_date,
        Status: r.status ?? "Collected",
      })),
      getAdminScreenExcelFilename("all"),
      "Bin Collection Events",
    );
  };

  /* ── summary stats — computed from filtered rows only ── */
  const { dailyWeight, overallWeight, totalRecords } = useMemo(() => {
    let daily = 0;
    let overall = 0;
    filteredRows.forEach((r) => {
      const w = Number(r.collected_weight_kg ?? 0);
      overall += w;
      if (r.collection_date === today) daily += w;
    });
    return {
      dailyWeight: daily.toFixed(2),
      overallWeight: overall.toFixed(2),
      totalRecords: filteredRows.length,
    };
  }, [filteredRows]);

  const header = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Bin Collection Events</h1>
          <p className="text-sm text-gray-500">Scan audit log — one record per operator bin scan</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            className="rounded border px-3 py-2 text-sm"
          >
            {showAllProjectsOption && <option value="">All Projects</option>}
            {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Button
            label="Add Bin Collection Event"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
           
            onClick={() => navigate(NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      {/* Daily / Overall / Records — same pattern as Panchayat Base Collection */}
      <div className="flex gap-3 text-sm">
        <span className="bg-slate-100 px-4 py-2 rounded-full">Daily: {dailyWeight}</span>
        <span className="bg-slate-100 px-4 py-2 rounded-full">Overall: {overallWeight}</span>
        <span className="bg-slate-100 px-4 py-2 rounded-full">Records: {totalRecords}</span>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={(value) => {
          setGlobalFilterValue(value);
          setFilters((f) => ({ ...f, global: { value, matchMode: FilterMatchMode.CONTAINS } }));
        }}
        searchPlaceholder={t("common.search_placeholder")}
        trailing={
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <i className="pi pi-file-excel mr-1.5 text-green-600" />
            {t("common.export_excel", "Export to Excel")}
          </button>
        }
      >
        <InputText
          type="date"
          value={filters.collection_date.value ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              collection_date: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS },
            }))
          }
          className="p-inputtext-sm rounded border px-3 py-2 text-sm"
        />
        <select
          value={filters.status.value ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: { value: e.target.value || null, matchMode: FilterMatchMode.CONTAINS },
            }))
          }
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </FilterBar>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        onFilter={(e: DataTableFilterEvent) => setFilters(e.filters as TableFilters)}
        globalFilterFields={["_trip_plan", "_collection_point", "_bin", "_waste_type", "_panchayat", "_ward", "_zone", "collection_date"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No bin collection events found"
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="_trip_plan" header="Trip Plan" filter showFilterMatchModes={false} />
        <Column field="_collection_point" header="Collection Point" filter showFilterMatchModes={false} />
        <Column field="_panchayat" header="PLB" filter showFilterMatchModes={false} />
        <Column field="_ward" header="Ward" filter showFilterMatchModes={false} />
        <Column field="_zone" header="Zone" filter showFilterMatchModes={false} />
        <Column field="_bin" header="Bin" filter showFilterMatchModes={false} />
        <Column field="_waste_type" header="Waste Type" filter showFilterMatchModes={false} />
        <Column field="_vehicle" header="Vehicle" />
        <Column
          header="Vehicle Breakdown"
          body={(row: BinCERecord) => <BreakdownCell row={row} />}
          style={{ width: 160 }}
        />
        <Column
          header="Weight (kg)"
          body={(row: BinCERecord) => row.collected_weight_kg ?? "-"}
          style={{ width: 110 }}
        />
        <Column
          field="collection_date"
          header="Collection Date"
          filter
          showFilterMatchModes={false}
          body={(row: BinCERecord) => formatDate(row.collection_date)}
          style={{ width: 120 }}
        />
        <Column
          field="status"
          header="Status"
          filter
          showFilterMatchModes={false}
          body={(row: BinCERecord) => <StatusBadge value={row.status} />}
          style={{ width: 130 }}
        />
        <Column
          header={t("common.actions")}
          style={{ width: 90 }}
          body={(row: BinCERecord) => (
            <button
              title="Edit"
          onClick={() =>
            navigate(VIEW_PATH(row.unique_id ?? ""), { state: { companyUniqueId, projectId } })
          }
              className="text-blue-600 hover:text-blue-800"
            >
              <PencilIcon className="size-5" />
            </button>
          )}
        />
      </DataTable>
    </div>
  );
}
