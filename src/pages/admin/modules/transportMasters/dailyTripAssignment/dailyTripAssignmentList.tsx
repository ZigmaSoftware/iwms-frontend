import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  useDailyTripAssignmentsQuery,
  useUpdateDailyTripStatusMutation,
  useUpdateDailyTripApprovalMutation,
  type DailyTripAssignmentRecord,
} from "@/tanstack/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractError = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const APPROVAL_STYLES: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-700",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const Badge = ({ value, styleMap }: { value?: string; styleMap: Record<string, string> }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styleMap[value ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
    {value ?? "—"}
  </span>
);

// ─── Allowed next states ──────────────────────────────────────────────────────

const NEXT_STATUS: Record<string, string[]> = {
  Scheduled: ["In Progress", "Cancelled"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

// ─── Types ────────────────────────────────────────────────────────────────────

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  unique_id: { value: string | null; matchMode: FilterMatchMode };
  _trip_def: { value: string | null; matchMode: FilterMatchMode };
  _staff: { value: string | null; matchMode: FilterMatchMode };
  _panchayat: { value: string | null; matchMode: FilterMatchMode };
  status: { value: string | null; matchMode: FilterMatchMode };
  approval_status: { value: string | null; matchMode: FilterMatchMode };
  trip_date: { value: string | null; matchMode: FilterMatchMode };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyTripAssignmentList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { encTransportMaster, encDailyTripAssignment } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encDailyTripAssignment}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encTransportMaster}/${encDailyTripAssignment}/${id}/edit`;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  // ── TanStack ──────────────────────────────────────────────────────────────
  const assignmentsQuery = useDailyTripAssignmentsQuery(
    companyUniqueId ? { company_id: companyUniqueId, project_id: projectId || undefined } : null
  );
  const statusMutation = useUpdateDailyTripStatusMutation();
  const approvalMutation = useUpdateDailyTripApprovalMutation();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _trip_def: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _staff: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _panchayat: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    approval_status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  // ── Derived rows ──────────────────────────────────────────────────────────
  const rows = (() => {
    if (!companyUniqueId) return [] as DailyTripAssignmentRecord[];

    const list = Array.isArray(assignmentsQuery.data)
      ? (assignmentsQuery.data as DailyTripAssignmentRecord[])
      : [];

    return list
      .filter((row) => {
        const rc = String(row.company_id ?? row.company_unique_id ?? "");
        const rp = String(row.project_id ?? row.project_unique_id ?? "");
        return (!companyUniqueId || rc === companyUniqueId) && (!projectId || rp === projectId);
      })
      .map((rec) => ({
        ...rec,
        _trip_def: rec.trip_definition?.display_code ?? rec.trip_definition_id ?? "",
        _staff: rec.effective_staff?.display_code ?? rec.staff_template?.display_code ?? rec.staff_template_id ?? "",
        _panchayat: rec.panchayat?.panchayat_name ?? rec.panchayat?.name ?? rec.panchayat_id ?? "",
        _cp: rec.collection_point?.cp_name ?? rec.collection_point_id ?? "",
        _waste: rec.waste_type?.waste_type_name ?? rec.waste_type_id ?? "",
      }));
  })();

  // ── Filter handlers ───────────────────────────────────────────────────────
  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters as TableFilters);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({ ...prev, global: { value, matchMode: FilterMatchMode.CONTAINS } }));
  };

  // ── Status action ─────────────────────────────────────────────────────────
  const handleStatusChange = async (row: DailyTripAssignmentRecord, newStatus: string) => {
    const result = await Swal.fire({
      title: `Change status to "${newStatus}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, update",
    });
    if (!result.isConfirmed) return;
    try {
      await statusMutation.mutateAsync({ id: row.unique_id, status: newStatus });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to update status", "error");
    }
  };

  // ── Approval action ───────────────────────────────────────────────────────
  const handleApproval = async (row: DailyTripAssignmentRecord, approval: string) => {
    if (row.approval_status !== "Pending") {
      Swal.fire("Not allowed", "Only Pending trips can be approved or rejected.", "warning");
      return;
    }
    const result = await Swal.fire({
      title: `${approval} this trip?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Yes, ${approval.toLowerCase()}`,
    });
    if (!result.isConfirmed) return;
    try {
      await approvalMutation.mutateAsync({ id: row.unique_id, approval_status: approval });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to update approval", "error");
    }
  };

  // ── Column templates ──────────────────────────────────────────────────────
  const statusTemplate = (row: DailyTripAssignmentRecord) => (
    <Badge value={row.status} styleMap={STATUS_STYLES} />
  );

  const approvalTemplate = (row: DailyTripAssignmentRecord) => (
    <div className="flex flex-col gap-1">
      <Badge value={row.approval_status} styleMap={APPROVAL_STYLES} />
    </div>
  );

  const actionTemplate = (row: DailyTripAssignmentRecord) => {
    const rowId = row.unique_id ?? String((row as any).id ?? "");

    return (
      <div className="flex justify-center">
        <button
          title={t("common.edit")}
          onClick={() =>
            navigate(ENC_EDIT_PATH(rowId), {
              state: {
                record: row,
                companyUniqueId: row.company_unique_id ?? row.company_id,
                projectId: row.project_unique_id ?? row.project_id,
              },
            })
          }
          disabled={!rowId || row.status === "Completed" || row.status === "Cancelled"}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-30"
        >
          <PencilIcon className="size-5" />
        </button>
      </div>
    );
  };

  // ── Table header ──────────────────────────────────────────────────────────
  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Daily Trip Assignments</h1>
          <p className="text-sm text-gray-500">Manage scheduled trip assignments by date and panchayat</p>
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
            label="New Assignment"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Search assignments..."
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={assignmentsQuery.isPending || assignmentsQuery.isFetching}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={["unique_id", "_trip_def", "_staff", "_panchayat", "_cp", "_waste", "status", "approval_status", "trip_date"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip assignments found. Select a company and project to load data."
      >
        <Column header={t("common.s_no")} body={(_: any, { rowIndex }: any) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="unique_id" header="ID" filter showFilterMatchModes={false} style={{ minWidth: 160 }} />
        <Column
          field="_trip_def"
          header="Trip Definition"
          body={(row: DailyTripAssignmentRecord) => row.trip_definition?.display_code ?? row.trip_definition_id ?? "—"}
          filter showFilterMatchModes={false}
        />
        <Column
          field="_staff"
          header="Effective Staff"
          body={(row: DailyTripAssignmentRecord) =>
            row.effective_staff?.display_code
              ? <span className="font-medium text-amber-700">{row.effective_staff.display_code}</span>
              : (row.staff_template?.display_code ?? row.staff_template_id ?? "—")
          }
          filter showFilterMatchModes={false}
        />
        <Column
          field="_panchayat"
          header="Panchayat"
          body={(row: DailyTripAssignmentRecord) => row.panchayat?.panchayat_name ?? row.panchayat?.name ?? row.panchayat_id ?? "—"}
          filter showFilterMatchModes={false}
        />
        <Column
          field="_cp"
          header="Collection Point"
          body={(row: DailyTripAssignmentRecord) => row.collection_point?.cp_name ?? row.collection_point_id ?? "—"}
        />
        <Column
          field="_waste"
          header="Waste Type"
          body={(row: DailyTripAssignmentRecord) => row.waste_type?.waste_type_name ?? row.waste_type_id ?? "—"}
        />
        <Column field="trip_date" header="Trip Date" filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column field="scheduled_time" header="Scheduled Time" style={{ minWidth: 110 }} />
        <Column field="status" header="Status" body={statusTemplate} filter showFilterMatchModes={false} style={{ minWidth: 160 }} />
        <Column field="approval_status" header="Approval" body={approvalTemplate} filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 80 }} />
      </DataTable>
    </div>
  );
}