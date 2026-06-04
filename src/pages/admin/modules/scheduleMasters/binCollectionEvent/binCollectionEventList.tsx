/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { EyeIcon } from "@/icons";
import { binCollectionEventApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";

type BinCERecord = {
  unique_id: string;
  trip_assignment_id?: string;
  trip_plan?: { display_code?: string };
  collection_point_id?: string;
  collection_point?: { cp_name?: string } | null;
  bin?: { bin_name?: string };
  waste_type?: { waste_type_name?: string };
  vehicle?: { vehicle_no?: string };
  panchayat_id?: string;
  panchayat_name?: string | null;
  ward_id?: string | null;
  ward_name?: string | null;
  zone_name?: string | null;
  collected_weight_kg?: string | number;
  driver_latitude?: string | number | null;
  driver_longitude?: string | number | null;
  notes?: string | null;
  created_at?: string;
  company_id?: string;
  project_id?: string;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  _trip_plan: { value: string | null; matchMode: FilterMatchMode };
  _collection_point: { value: string | null; matchMode: FilterMatchMode };
  _bin: { value: string | null; matchMode: FilterMatchMode };
  _waste_type: { value: string | null; matchMode: FilterMatchMode };
  _panchayat: { value: string | null; matchMode: FilterMatchMode };
  _ward: { value: string | null; matchMode: FilterMatchMode };
  _zone: { value: string | null; matchMode: FilterMatchMode };
};

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

const formatDate = (val?: string) => {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const today = new Date().toISOString().split("T")[0];

export default function BinCollectionEventList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encScheduleMasters, encBinCollectionEvent } = getEncryptedRoute();
  const NEW_PATH = `/${encScheduleMasters}/${encBinCollectionEvent}/new`;
  const VIEW_PATH = (id: string) => `/${encScheduleMasters}/${encBinCollectionEvent}/${id}/edit`;

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
  });

  const loadRecords = useCallback(() => {
    if (!companyUniqueId) { setRecords([]); return; }
    setLoading(true);
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    binCollectionEventApi
      .list({ params })
      .then((data) => setRecords(Array.isArray(data) ? (data as BinCERecord[]) : []))
      .catch((error) => {
        setRecords([]);
        Swal.fire(t("common.error"), extractError(error) ?? t("common.fetch_failed"), "error");
      })
      .finally(() => setLoading(false));
  }, [companyUniqueId, projectId, t]);

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
        _zone: r.zone_name ?? "-",
      })),
    [records],
  );

  /* ── apply filters locally to get the visible subset ─────────────────────
     PrimeReact filters internally but doesn't expose the result. We replicate
     the same CONTAINS logic so the summary pills always match what's on screen. */
  const GLOBAL_FIELDS = ["_trip_plan", "_collection_point", "_bin", "_waste_type", "_panchayat", "_ward", "_zone"] as const;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      for (const [field, filter] of Object.entries(filters)) {
        const val = filter.value;
        if (!val) continue;
        const needle = String(val).toLowerCase();
        if (field === "global") {
          const hit = GLOBAL_FIELDS.some((f) => String(row[f] ?? "").toLowerCase().includes(needle));
          if (!hit) return false;
        } else {
          if (!String(row[field] ?? "").toLowerCase().includes(needle)) return false;
        }
      }
      return true;
    });
  }, [rows, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── summary stats — computed from filtered rows only ── */
  const { dailyWeight, overallWeight, totalRecords } = useMemo(() => {
    let daily = 0;
    let overall = 0;
    filteredRows.forEach((r) => {
      const w = Number(r.collected_weight_kg ?? 0);
      overall += w;
      if (r.created_at && String(r.created_at).startsWith(today)) daily += w;
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
            <option value="" disabled>{t("common.select_item_placeholder", { item: t("admin.nav.company") })}</option>
            {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="" disabled>{t("common.select_item_placeholder", { item: t("admin.nav.project") })}</option>
            {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Button
            label="Add Bin Collection Event"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
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

      <div className="flex justify-end">
        <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={(e) => {
              setGlobalFilterValue(e.target.value);
              setFilters((f) => ({ ...f, global: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS } }));
            }}
            placeholder={t("common.search")}
            className="border-none text-sm"
          />
        </div>
      </div>
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
        globalFilterFields={["_trip_plan", "_collection_point", "_bin", "_waste_type", "_panchayat", "_ward", "_zone"]}
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
          header="Weight (kg)"
          body={(row: BinCERecord) => row.collected_weight_kg ?? "-"}
          style={{ width: 110 }}
        />
        <Column
          header="Date"
          body={(row: BinCERecord) => formatDate(row.created_at)}
          style={{ width: 120 }}
        />
        <Column
          header={t("common.actions")}
          style={{ width: 90 }}
          body={(row: BinCERecord) => (
            <button
              title="View"
              onClick={() => navigate(VIEW_PATH(row.unique_id), { state: { record: row, companyUniqueId, projectId } })}
              className="text-blue-600 hover:text-blue-800"
            >
              <EyeIcon className="size-5" />
            </button>
          )}
        />
      </DataTable>
    </div>
  );
}
