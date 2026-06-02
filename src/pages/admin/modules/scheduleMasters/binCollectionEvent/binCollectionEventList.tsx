/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
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
  collection_point?: any;
  bin?: { bin_name?: string };
  waste_type?: { waste_type_name?: string };
  vehicle?: { vehicle_no?: string };
  panchayat_id?: string;
  ward_id?: string;
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

export default function BinCollectionEventList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encScheduleMasters, encBinCollectionEvent } = getEncryptedRoute();
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
        _collection_point: (r.collection_point as any)?.cp_name ?? r.collection_point_id ?? "-",
        _bin: r.bin?.bin_name ?? "-",
        _waste_type: r.waste_type?.waste_type_name ?? "-",
        _vehicle: r.vehicle?.vehicle_no ?? "-",
      })),
    [records],
  );

  const header = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Bin Collection Events</h1>
          <p className="text-sm text-gray-500">Immutable scan audit log — one record per operator bin scan</p>
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
        </div>
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
        globalFilterFields={["_trip_plan", "_collection_point", "_bin", "_waste_type"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No bin collection events found"
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="_trip_plan" header="Trip Plan" filter showFilterMatchModes={false} />
        <Column field="_collection_point" header="Collection Point" filter showFilterMatchModes={false} />
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
