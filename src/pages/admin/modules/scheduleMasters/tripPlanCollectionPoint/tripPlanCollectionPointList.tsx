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
import { PencilIcon } from "@/icons";
import { tripPlanCollectionPointApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";

type TripPlanCPRecord = {
  unique_id: string;
  trip_plan_id?: string;
  trip_plan?: { display_code?: string; unique_id?: string };
  collection_point_id?: string;
  collection_point?: { cp_name?: string; latitude?: number; longitude?: number };
  bin_id?: string;
  bin?: { bin_name?: string; bin_capacity?: number; bin_type?: string };
  sequence?: number;
  is_active?: boolean;
  company_id?: string;
  project_id?: string;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  _trip_plan: { value: string | null; matchMode: FilterMatchMode };
  _collection_point: { value: string | null; matchMode: FilterMatchMode };
  _bin: { value: string | null; matchMode: FilterMatchMode };
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

export default function TripPlanCollectionPointList() {
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
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encScheduleMasters, encTripPlanCollectionPoints } = getEncryptedRoute();
  const NEW_PATH = `/${encScheduleMasters}/${encTripPlanCollectionPoints}/new`;
  const EDIT_PATH = (id: string) => `/${encScheduleMasters}/${encTripPlanCollectionPoints}/${id}/edit`;

  const [records, setRecords] = useState<TripPlanCPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _trip_plan: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _collection_point: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _bin: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const loadRecords = useCallback(() => {
    if (!companyUniqueId && !isSuperAdmin) {
      setRecords([]);
      return;
    }
    setLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    tripPlanCollectionPointApi
      .list({ params })
      .then((data) => setRecords(Array.isArray(data) ? (data as TripPlanCPRecord[]) : []))
      .catch((error) => {
        setRecords([]);
        Swal.fire(t("common.error"), extractError(error) ?? t("common.fetch_failed"), "error");
      })
      .finally(() => setLoading(false));
  }, [companyUniqueId, projectId, t]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const rows = useMemo(
    () =>
      records.map((r) => ({
        ...r,
        _trip_plan: r.trip_plan?.display_code ?? r.trip_plan_id ?? "-",
        _collection_point: r.collection_point?.cp_name ?? r.collection_point_id ?? "-",
        _bin: r.bin?.bin_name ?? r.bin_id ?? "-",
      })),
    [records],
  );

  const header = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Trip Plan Collection Points</h1>
          <p className="text-sm text-gray-500">Manage stop list for each trip plan</p>
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
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <Button
            label="Add Stop"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
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
        globalFilterFields={["_trip_plan", "_collection_point", "_bin"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip plan collection points found"
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="_trip_plan" header="Trip Plan" filter showFilterMatchModes={false} />
        <Column field="_collection_point" header="Collection Point" filter showFilterMatchModes={false} />
        <Column field="_bin" header="Bin" filter showFilterMatchModes={false} />
        <Column field="sequence" header="Sequence" style={{ width: 100 }} />
        <Column
          header="Active"
          body={(row: TripPlanCPRecord) => (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
              {row.is_active ? "Yes" : "No"}
            </span>
          )}
          style={{ width: 90 }}
        />
        <Column
          header={t("common.actions")}
          style={{ width: 100 }}
          body={(row: TripPlanCPRecord) => (
            <button
              title={t("common.edit")}
              onClick={() => navigate(EDIT_PATH(row.unique_id), { state: { record: row, companyUniqueId, projectId } })}
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
