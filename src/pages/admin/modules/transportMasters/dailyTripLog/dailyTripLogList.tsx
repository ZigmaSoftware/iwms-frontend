/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { dailyTripLogApi } from "@/helpers/admin";
import { api } from "@/api";

type StaffRef = { unique_id?: string; staff_unique_id?: string; employee_name?: string };
type NamedRef = { unique_id?: string; name?: string; [key: string]: unknown };

type DailyTripLogRecord = {
  unique_id: string;
  trip_assignment_id?: string;
  trip_assignment?: NamedRef & { display_code?: string };
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  collection_point?: NamedRef & { cp_name?: string };
  collection_point_id?: string;
  waste_type?: NamedRef & { waste_type_name?: string };
  waste_type_id?: string;
  trip_date?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  driver?: StaffRef;
  operator?: StaffRef;
  extra_operators?: StaffRef[];
  collected_weight_kg?: string | number;
  vehicle?: NamedRef & { vehicle_no?: string };
  bin_ids?: string[];
  bins?: (NamedRef & { bin_name?: string })[];
  remarks?: string | null;
  log_status?: string;
  verified_by_name?: string | null;
  verified_at?: string | null;
  [key: string]: unknown;
};

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Submitted: "bg-blue-100 text-blue-800",
  Verified: "bg-green-100 text-green-800",
};

const Badge = ({ value }: { value?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[value ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
    {value ?? "-"}
  </span>
);

const extractError = (error: any): string | null => {
  const data = error?.response?.data;
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

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function DailyTripLogList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encScheduleMasters, encDailyTripLog } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encScheduleMasters}/${encDailyTripLog}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encScheduleMasters}/${encDailyTripLog}/${id}/edit`;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [allLogs, setAllLogs] = useState<DailyTripLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    company_name: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    project_name: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _assignment: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _waste: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _cp: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    log_status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  /* ── load logs ── */
  useEffect(() => {
    if (!companyUniqueId) { setAllLogs([]); return; }
    let mounted = true;
    setIsLoading(true);
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    (dailyTripLogApi.list({ params }) as Promise<DailyTripLogRecord[]>)
      .then((data) => { if (mounted) setAllLogs(Array.isArray(data) ? data : []); })
      .catch((err) => { if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? String(err) }); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, t]);

  /* ── enrich rows with computed fields for filtering ── */
  const rows = allLogs.map((rec) => ({
    ...rec,
    _assignment: rec.trip_assignment?.display_code ?? rec.trip_assignment?.unique_id ?? rec.trip_assignment_id ?? "",
    _waste: (rec.waste_type as any)?.waste_type_name ?? rec.waste_type_id ?? "",
    _cp: rec.collection_point?.cp_name ?? rec.collection_point_id ?? "",
    _driver: rec.driver?.employee_name ?? "",
    _operator: rec.operator?.employee_name ?? "",
  }));

  /* ── filter by company+project client-side ── */
  const data = (() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId) return [];
    return rows.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      return (!companyUniqueId || rowCompanyId === companyUniqueId) &&
             (!projectId || rowProjectId === projectId);
    });
  })();

  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters as DataTableFilterMeta);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, global: { ...prev.global, value } }));
    setGlobalFilterValue(value);
  };

  const handleVerify = async (row: DailyTripLogRecord) => {
    const result = await Swal.fire({
      title: "Verify this trip log?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, verify",
    });
    if (!result.isConfirmed) return;
    setIsVerifying(true);
    try {
      await api.patch(`/schedule-masters/daily-trip-logs/${row.unique_id}/verify/`, {});
      setAllLogs((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id ? { ...item, log_status: "Verified" } : item
        )
      );
      Swal.fire(t("common.success"), "Trip log verified", "success");
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to verify trip log", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const actionTemplate = (row: DailyTripLogRecord) => (
    <div className="flex items-center justify-center gap-3">
      <button
        title={row.log_status === "Verified" ? "View" : t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id), {
          state: { companyUniqueId: row.company_unique_id ?? row.company_id, projectId: row.project_unique_id ?? row.project_id },
        })}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
      {row.log_status === "Submitted" && (
        <Button
          label="Verify"
          className="p-button-success p-button-sm"
          loading={isVerifying}
          onClick={() => handleVerify(row)}
        />
      )}
    </div>
  );

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder="Search trip logs..."
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Daily Trip Logs</h1>
          <p className="text-sm text-gray-500">Capture and verify actual collection trip results</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            </option>
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <Button
            label="New Log"
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={data}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && data.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        emptyMessage="No trip logs found. Select a company and project to load data."
        globalFilterFields={["unique_id", "company_name", "project_name", "_assignment", "_waste", "_cp", "_driver", "_operator", "log_status", "trip_date"]}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={(_: any, { rowIndex }: any) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="unique_id" header="ID" sortable filter showFilterMatchModes={false} style={{ minWidth: 150 }} />
        <Column field="company_name" header="Company" sortable filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column field="project_name" header="Project" sortable filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column field="_assignment" header="Trip Assignment" sortable filter showFilterMatchModes={false} style={{ minWidth: 170 }} />
        <Column field="_waste" header="Waste Type" filter showFilterMatchModes={false} />
        <Column field="_cp" header="Collection Point" filter showFilterMatchModes={false} style={{ minWidth: 160 }} />
        <Column field="collected_weight_kg" header="Weight (kg)" sortable style={{ minWidth: 120 }} />
        <Column field="log_status" header="Status" body={(row: DailyTripLogRecord) => <Badge value={row.log_status} />} sortable filter showFilterMatchModes={false} />
        <Column field="_driver" header="Driver" />
        <Column field="_operator" header="Operator" />
        <Column field="trip_date" header="Trip Date" sortable filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ minWidth: 140 }} />
      </DataTable>
    </div>
  );
}
