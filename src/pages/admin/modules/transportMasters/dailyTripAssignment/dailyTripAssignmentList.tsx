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
import { dailyTripAssignmentApi } from "@/helpers/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type NamedRef = { unique_id?: string; name?: string; [key: string]: unknown };

type DailyTripAssignmentRecord = {
  unique_id: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  trip_definition_id?: string;
  staff_template_id?: string;
  panchayat_id?: string;
  collection_point_id?: string;
  waste_type_id?: string;
  trip_definition?: { unique_id?: string; display_code?: string };
  staff_template?: { unique_id?: string; display_code?: string };
  effective_staff?: { unique_id?: string; display_code?: string } | null;
  panchayat?: NamedRef & { panchayat_name?: string };
  collection_point?: NamedRef & { cp_name?: string };
  waste_type?: NamedRef & { waste_type_name?: string };
  trip_date?: string;
  scheduled_time?: string;
  status?: string;
  approval_status?: string;
  remarks?: string | null;
  [key: string]: unknown;
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

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyTripAssignmentList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encTransportMaster, encDailyTripAssignment } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encDailyTripAssignment}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encTransportMaster}/${encDailyTripAssignment}/${id}/edit`;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [allAssignments, setAllAssignments] = useState<DailyTripAssignmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _trip_def: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _staff: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _panchayat: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    approval_status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  /* ── load assignments ── */
  useEffect(() => {
    if (!companyUniqueId) { setAllAssignments([]); return; }
    let mounted = true;
    setIsLoading(true);
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    (dailyTripAssignmentApi.list({ params }) as Promise<DailyTripAssignmentRecord[]>)
      .then((data) => { if (mounted) setAllAssignments(Array.isArray(data) ? data : []); })
      .catch((err) => { if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? String(err) }); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, t]);

  /* ── enrich + filter rows ── */
  const rows = (() => {
    if (!companyUniqueId) return [];
    return allAssignments
      .filter((row) => {
        const rc = normalizeId(row.company_id ?? row.company_unique_id);
        const rp = normalizeId(row.project_id ?? row.project_unique_id);
        return (!companyUniqueId || rc === companyUniqueId) && (!projectId || rp === projectId);
      })
      .map((rec) => ({
        ...rec,
        _trip_def: rec.trip_definition?.display_code ?? rec.trip_definition_id ?? "",
        _staff: rec.effective_staff?.display_code ?? rec.staff_template?.display_code ?? rec.staff_template_id ?? "",
        _panchayat: rec.panchayat?.panchayat_name ?? rec.panchayat?.name ?? rec.panchayat_id ?? "",
        _cp: rec.collection_point?.cp_name ?? rec.collection_point_id ?? "",
        _waste: (rec.waste_type as any)?.waste_type_name ?? rec.waste_type_id ?? "",
      }));
  })();

  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters as DataTableFilterMeta);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, global: { ...prev.global, value } }));
    setGlobalFilterValue(value);
  };

  /* ── column templates ── */
  const statusTemplate = (row: DailyTripAssignmentRecord) => (
    <Badge value={row.status} styleMap={STATUS_STYLES} />
  );

  const approvalTemplate = (row: DailyTripAssignmentRecord) => (
    <Badge value={row.approval_status} styleMap={APPROVAL_STYLES} />
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

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder="Search assignments..."
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Daily Trip Assignments</h1>
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
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && rows.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip assignments found. Select a company and project to load data."
        globalFilterFields={["unique_id", "_trip_def", "_staff", "_panchayat", "_cp", "_waste", "status", "approval_status", "trip_date"]}
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
          body={(row: DailyTripAssignmentRecord) => (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "—"}
        />
        <Column field="trip_date" header="Trip Date" filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column field="scheduled_time" header="Scheduled Time" style={{ minWidth: 110 }} />
        <Column
          field="status"
          header="Status"
          body={statusTemplate}
          filter showFilterMatchModes={false}
          style={{ minWidth: 160 }}
        />
        <Column
          field="approval_status"
          header="Approval"
          body={approvalTemplate}
          filter showFilterMatchModes={false}
          style={{ minWidth: 140 }}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 80 }} />
      </DataTable>
    </div>
  );
}
