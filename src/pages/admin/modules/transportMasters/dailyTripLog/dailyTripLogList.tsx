import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createColumnHelper, getCoreRowModel, getSortedRowModel, useReactTable, type SortingState } from "@tanstack/react-table";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  useDailyTripLogsQuery,
  useVerifyDailyTripLogMutation,
  type DailyTripLogRecord,
} from "@/tanstack/admin";

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

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  unique_id: { value: string | null; matchMode: FilterMatchMode };
  company_name: { value: string | null; matchMode: FilterMatchMode };
  project_name: { value: string | null; matchMode: FilterMatchMode };
  _assignment: { value: string | null; matchMode: FilterMatchMode };
  _waste: { value: string | null; matchMode: FilterMatchMode };
  _cp: { value: string | null; matchMode: FilterMatchMode };
  log_status: { value: string | null; matchMode: FilterMatchMode };
  trip_date: { value: string | null; matchMode: FilterMatchMode };
};

const columnHelper = createColumnHelper<DailyTripLogRecord>();

export default function DailyTripLogList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { encTransportMaster, encDailyTripLog } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encDailyTripLog}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encTransportMaster}/${encDailyTripLog}/${id}/edit`;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    company_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    project_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _assignment: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _waste: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _cp: { value: null, matchMode: FilterMatchMode.CONTAINS },
    log_status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const ordering = sorting[0] ? `${sorting[0].desc ? "-" : ""}${sorting[0].id}` : undefined;
  const logsQuery = useDailyTripLogsQuery(
    companyUniqueId ? {
      company_id: companyUniqueId,
      project_id: projectId || undefined,
      search: globalFilterValue || undefined,
      ordering,
    } : null
  );
  const verifyMutation = useVerifyDailyTripLogMutation();

  const rows = useMemo(() => {
    const list = Array.isArray(logsQuery.data) ? logsQuery.data : [];
    return list.map((rec) => ({
      ...rec,
      _assignment: rec.trip_assignment?.display_code ?? rec.trip_assignment?.unique_id ?? rec.trip_assignment_id ?? "",
      _waste: rec.waste_type?.waste_type_name ?? rec.waste_type_id ?? "",
      _cp: rec.collection_point?.cp_name ?? rec.collection_point_id ?? "",
      _driver: rec.driver?.employee_name ?? rec.driver_id ?? "",
      _operator: rec.operator?.employee_name ?? rec.operator_id ?? "",
    }));
  }, [logsQuery.data]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("unique_id", { header: "ID" }),
      columnHelper.accessor("company_name", { header: "Company" }),
      columnHelper.accessor("project_name", { header: "Project" }),
      columnHelper.accessor("collected_weight_kg", { header: "Weight" }),
      columnHelper.accessor("log_status", { header: "Status" }),
      columnHelper.accessor("trip_date", { header: "Trip Date" }),
    ],
    []
  );

  useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters as TableFilters);
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({ ...prev, global: { value, matchMode: FilterMatchMode.CONTAINS } }));
  };

  const handleVerify = async (row: DailyTripLogRecord) => {
    const result = await Swal.fire({
      title: "Verify this trip log?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, verify",
    });
    if (!result.isConfirmed) return;
    try {
      await verifyMutation.mutateAsync({ id: row.unique_id });
      Swal.fire(t("common.success"), "Trip log verified", "success");
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to verify trip log", "error");
    }
  };

  const actionTemplate = (row: DailyTripLogRecord) => (
    <div className="flex items-center justify-center gap-3">
      <button
        title={row.log_status === "Verified" ? "View" : t("common.edit")}
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: {
              record: row,
              companyUniqueId: row.company_unique_id ?? row.company_id,
              projectId: row.project_unique_id ?? row.project_id,
            },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
      {row.log_status === "Submitted" && (
        <Button
          label="Verify"
          className="p-button-success p-button-sm"
          loading={verifyMutation.isPending}
          onClick={() => handleVerify(row)}
        />
      )}
    </div>
  );

  const header = (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Daily Trip Logs</h1>
          <p className="text-sm text-gray-500">Capture and verify actual collection trip results</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            label="New Log"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1">
          <i className="pi pi-search text-gray-500" />
          <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search trip logs..." className="border-none text-sm" />
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
        loading={logsQuery.isPending || logsQuery.isFetching}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={["unique_id", "company_name", "project_name", "_assignment", "_waste", "_cp", "_driver", "_operator", "log_status", "trip_date"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip logs found. Select a company and project to load data."
      >
        <Column header={t("common.s_no")} body={(_: any, { rowIndex }: any) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="unique_id" header="ID" sortable filter showFilterMatchModes={false} style={{ minWidth: 150 }} />
        <Column field="company_name" header="Company" sortable filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column field="project_name" header="Project" sortable filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column field="_assignment" header="Trip Assignment" sortable filter showFilterMatchModes={false} style={{ minWidth: 170 }} />
        <Column field="_waste" header="Waste Type" filter showFilterMatchModes={false} />
        <Column field="_cp" header="Collection Point" filter showFilterMatchModes={false} style={{ minWidth: 160 }} />
        <Column field="collected_weight_kg" header="Weight (kg)" sortable style={{ minWidth: 120 }} />
        <Column field="log_status" header="Status" body={(row) => <Badge value={row.log_status} />} sortable filter showFilterMatchModes={false} />
        <Column field="_driver" header="Driver" />
        <Column field="_operator" header="Operator" />
        <Column field="trip_date" header="Trip Date" sortable filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ minWidth: 140 }} />
      </DataTable>
    </div>
  );
}
