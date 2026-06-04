/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { dailyTripLogApi } from "@/helpers/admin";
import { api } from "@/api";

type StaffRef = { unique_id?: string; staff_unique_id?: string; employee_name?: string };
type NamedRef = { unique_id?: string; name?: string; [key: string]: unknown };
type StaffTemplateDetail = {
  unique_id?: string;
  display_code?: string;
  driver?: StaffRef | null;
  operator?: StaffRef | null;
};
type StaffTemplateInfo = {
  effective_display_code?: string;
  is_alt?: boolean;
  base?: StaffTemplateDetail | null;
  alt?: StaffTemplateDetail | null;
};

type DailyTripLogRecord = {
  unique_id: string;
  trip_assignment_id?: string;
  trip_assignment?: NamedRef & { display_code?: string };
  staff_template?: StaffTemplateInfo | null;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  collection_points?: { unique_id?: string; cp_name?: string; sequence?: number; is_collected?: boolean }[];
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

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{children}</p>
);

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex gap-2 text-sm">
    <span className="text-gray-500 w-36 shrink-0">{label}</span>
    <span className="font-medium text-gray-800">{value ?? "-"}</span>
  </div>
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

/* ─────────────────────────────────────────────────────
   Trip Log Modal  (mode="view" | "verify")
───────────────────────────────────────────────────── */
function TripLogModal({
  row,
  mode,
  onClose,
  onConfirm,
  isLoading,
}: {
  row: DailyTripLogRecord;
  mode: "view" | "verify";
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  isLoading: boolean;
}) {
  const [remarks, setRemarks] = useState(row.remarks ?? "");
  const cps = row.collection_points ?? [];
  const collectedCount = cps.filter((cp) => cp.is_collected).length;
  const st = row.staff_template;
  const wasteTypeName = (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "-";
  const weight = row.collected_weight_kg != null ? `${Number(row.collected_weight_kg).toFixed(2)} kg` : "-";

  const footer = (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        label={mode === "verify" ? "Cancel" : "Close"}
        className="p-button-text p-button-secondary"
        onClick={onClose}
        disabled={isLoading}
      />
      {mode === "verify" && (
        <Button
          label="Verify"
          icon="pi pi-check"
          className="p-button-success"
          loading={isLoading}
          onClick={() => onConfirm(remarks)}
        />
      )}
    </div>
  );

  const title = mode === "verify" ? "Verify Trip Log" : "Trip Log Details";
  const statusColor: Record<string, string> = {
    Draft: "text-gray-600",
    Submitted: "text-blue-600",
    Verified: "text-green-600",
  };

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div className="flex items-start justify-between gap-4 pr-4">
          <div>
            <p className="text-lg font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 font-normal mt-0.5">{row.unique_id}</p>
          </div>
          <span className={`mt-1 text-xs font-semibold uppercase tracking-wide ${statusColor[row.log_status ?? ""] ?? "text-gray-500"}`}>
            {row.log_status}
          </span>
        </div>
      }
      footer={footer}
      style={{ width: "580px" }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="flex flex-col gap-5 pt-1">

        {/* Trip details */}
        <div>
          <SectionLabel>Trip Details</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <InfoRow label="Trip Assignment" value={(row.trip_assignment as any)?.display_code ?? row.trip_assignment_id} />
            <InfoRow label="Date" value={row.trip_date} />
            <InfoRow label="Waste Type" value={wasteTypeName} />
            <InfoRow label="Total Weight" value={weight} />
            {row.actual_start_time && <InfoRow label="Start Time" value={row.actual_start_time} />}
            {row.actual_end_time && <InfoRow label="End Time" value={row.actual_end_time} />}
            {(row.vehicle as any)?.vehicle_no && (
              <InfoRow label="Vehicle" value={(row.vehicle as any).vehicle_no} />
            )}
          </div>
        </div>

        <Divider className="!my-0" />

        {/* Staff */}
        <div>
          <SectionLabel>Staff</SectionLabel>
          {st?.base ? (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1.5">
                Base Template:{" "}
                <span className="font-semibold text-gray-700">{st.base.display_code}</span>
              </p>
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-gray-200">
                <InfoRow label="Driver" value={st.base.driver?.employee_name} />
                <InfoRow label="Operator" value={st.base.operator?.employee_name} />
              </div>
            </div>
          ) : (
            <div className="mb-3 flex flex-col gap-1">
              <InfoRow label="Driver" value={row.driver?.employee_name} />
              <InfoRow label="Operator" value={row.operator?.employee_name} />
            </div>
          )}
          {st?.alt && (
            <div>
              <p className="text-xs text-orange-500 mb-1.5">
                Alt Template{" "}
                <span className="text-orange-400">(Substitute)</span>:{" "}
                <span className="font-semibold text-orange-700">{st.alt.display_code}</span>
              </p>
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-orange-200">
                <InfoRow label="Driver" value={st.alt.driver?.employee_name} />
                <InfoRow label="Operator" value={st.alt.operator?.employee_name} />
              </div>
            </div>
          )}
        </div>

        <Divider className="!my-0" />

        {/* Collection Points */}
        <div>
          <SectionLabel>
            Collection Points
            {cps.length > 0 && (
              <span className="ml-1 normal-case font-normal text-gray-400">
                — {collectedCount} / {cps.length} collected
              </span>
            )}
          </SectionLabel>
          {cps.length === 0 ? (
            <p className="text-sm text-gray-400">No collection points recorded.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cps.map((cp) => (
                <li key={cp.unique_id} className="flex items-center gap-2 text-sm">
                  {cp.is_collected ? (
                    <i className="pi pi-check-circle text-green-500 text-base" />
                  ) : (
                    <i className="pi pi-times-circle text-red-400 text-base" />
                  )}
                  <span className={cp.is_collected ? "text-gray-800" : "text-gray-400"}>
                    {cp.sequence != null ? `${cp.sequence}. ` : ""}
                    {cp.cp_name ?? cp.unique_id}
                  </span>
                  {!cp.is_collected && (
                    <span className="text-xs text-red-400 ml-1">(Not collected)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Remarks — editable for verify, read-only for view */}
        {(mode === "verify" || row.remarks) && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>
                {mode === "verify" ? "Remarks (optional)" : "Remarks"}
              </SectionLabel>
              {mode === "verify" ? (
                <InputTextarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full text-sm"
                  placeholder="Add verification remarks..."
                  autoResize
                />
              ) : (
                <p className="text-sm text-gray-700">{row.remarks}</p>
              )}
            </div>
          </>
        )}

        {/* Verified by — only in view mode when verified */}
        {mode === "view" && row.log_status === "Verified" && row.verified_by_name && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>Verification</SectionLabel>
              <div className="flex flex-col gap-1.5">
                <InfoRow label="Verified by" value={row.verified_by_name} />
                <InfoRow label="Verified at" value={row.verified_at ?? undefined} />
              </div>
            </div>
          </>
        )}

      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────
   Main list component
───────────────────────────────────────────────────── */
export default function DailyTripLogList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encScheduleMasters, encDailyTripLog } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encScheduleMasters}/${encDailyTripLog}/new`;

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
  const [modalState, setModalState] = useState<{ row: DailyTripLogRecord; mode: "view" | "verify" } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    company_name: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    project_name: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _assignment: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _waste: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _staff_template: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    log_status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  /* shared menu ref — one menu instance, positioned on click */
  const menuRef = useRef<Menu>(null);
  const menuRowRef = useRef<DailyTripLogRecord | null>(null);

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

  /* ── enrich rows ── */
  const rows = allLogs.map((rec) => ({
    ...rec,
    _assignment: rec.trip_assignment?.display_code ?? rec.trip_assignment?.unique_id ?? rec.trip_assignment_id ?? "",
    _waste: (rec.waste_type as any)?.waste_type_name ?? rec.waste_type_id ?? "",
    _staff_template: rec.staff_template?.effective_display_code ?? "",
    _driver: rec.driver?.employee_name ?? "",
    _operator: rec.operator?.employee_name ?? "",
  }));

  /* ── filter by company+project ── */
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

  const handleVerifyConfirm = async (remarks: string) => {
    if (!modalState) return;
    setIsVerifying(true);
    try {
      await api.patch(`/schedule-masters/daily-trip-logs/${modalState.row.unique_id}/verify/`, { remarks });
      setAllLogs((current) =>
        current.map((item) =>
          item.unique_id === modalState.row.unique_id ? { ...item, log_status: "Verified" } : item
        )
      );
      setModalState(null);
      Swal.fire({ icon: "success", title: "Verified", text: "Trip log has been verified.", timer: 2000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to verify trip log", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStatusChange = async (row: DailyTripLogRecord, newStatus: string) => {
    const label = newStatus === "Draft" ? "Draft" : newStatus === "Submitted" ? "Submitted" : "Verified";
    const result = await Swal.fire({
      title: `Change status to ${label}?`,
      text: `This will move the log from "${row.log_status}" to "${label}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, change to ${label}`,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.patch(
        `/schedule-masters/daily-trip-logs/${row.unique_id}/change-status/`,
        { log_status: newStatus }
      );
      const updated = (res as any)?.data ?? res;
      setAllLogs((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id
            ? { ...item, log_status: updated.log_status ?? newStatus, verified_by_name: updated.verified_by_name ?? null, verified_at: updated.verified_at ?? null }
            : item
        )
      );
      Swal.fire({ icon: "success", title: "Done", text: `Status changed to ${label}.`, timer: 2000, showConfirmButton: false });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to change status", "error");
    }
  };

  /* build menu items for the currently-targeted row */
  const buildMenuItems = (row: DailyTripLogRecord): MenuItem[] => {
    const items: MenuItem[] = [
      {
        label: "View",
        icon: "pi pi-eye",
        command: () => setModalState({ row, mode: "view" }),
      },
      { separator: true },
    ];

    if (row.log_status !== "Draft") {
      items.push({
        label: "Change to Draft",
        icon: "pi pi-undo",
        command: () => handleStatusChange(row, "Draft"),
      });
    }

    if (row.log_status !== "Verified") {
      items.push({
        label: "Verify",
        icon: "pi pi-check-circle",
        command: () => setModalState({ row, mode: "verify" }),
      });
    }

    return items;
  };

  const actionTemplate = (row: DailyTripLogRecord) => (
    <div className="flex items-center justify-center">
      <Button
        icon="pi pi-ellipsis-v"
        className="p-button-text p-button-secondary p-button-sm"
        onClick={(e) => {
          menuRowRef.current = row;
          menuRef.current?.show(e);
        }}
        aria-label="Actions"
      />
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
          className="p-inputtext-sm border-0 shadow-none outline-none"
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

      {/* Shared popup menu — single instance, repositioned per row click */}
      <Menu
        ref={menuRef}
        popup
        model={menuRowRef.current ? buildMenuItems(menuRowRef.current) : []}
      />

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
        globalFilterFields={["unique_id", "company_name", "project_name", "_assignment", "_waste", "_staff_template", "_driver", "_operator", "log_status", "trip_date"]}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={(_: any, { rowIndex }: any) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="unique_id" header="ID" sortable filter showFilterMatchModes={false} style={{ minWidth: 150 }} />
        <Column field="company_name" header="Company" sortable filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column field="project_name" header="Project" sortable filter showFilterMatchModes={false} style={{ minWidth: 140 }} />
        <Column field="_assignment" header="Trip Assignment" sortable filter showFilterMatchModes={false} style={{ minWidth: 170 }} />
        <Column
          field="_staff_template"
          header="Staff Template"
          filter
          showFilterMatchModes={false}
          style={{ minWidth: 160 }}
          body={(row: DailyTripLogRecord) => (
            <span>
              {row.staff_template?.effective_display_code ?? "-"}
              {row.staff_template?.is_alt && (
                <span className="ml-1 text-xs text-orange-600 font-medium">(Alt)</span>
              )}
            </span>
          )}
        />
        <Column field="_waste" header="Waste Type" filter showFilterMatchModes={false} />
        <Column
          field="collected_weight_kg"
          header="Total Weight (kg)"
          sortable
          style={{ minWidth: 140 }}
          body={(row: DailyTripLogRecord) =>
            row.collected_weight_kg != null ? Number(row.collected_weight_kg).toFixed(2) : "-"
          }
        />
        <Column
          field="log_status"
          header="Status"
          body={(row: DailyTripLogRecord) => <Badge value={row.log_status} />}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column field="_driver" header="Driver" />
        <Column field="_operator" header="Operator" />
        <Column field="trip_date" header="Trip Date" sortable filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 80 }} />
      </DataTable>

      {modalState && (
        <TripLogModal
          row={modalState.row}
          mode={modalState.mode}
          onClose={() => setModalState(null)}
          onConfirm={handleVerifyConfirm}
          isLoading={isVerifying}
        />
      )}
    </div>
  );
}
