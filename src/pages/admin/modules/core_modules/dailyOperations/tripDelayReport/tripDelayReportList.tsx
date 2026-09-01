import type { TripDelayReportRecord, TripDelayStatus } from "./types";
import { DELAY_STATUS_LABELS } from "./types";
import { useEffect, useRef, useState } from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { api } from "@/api";
import { tripDelayReportApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";

/**
 * Delays reported by drivers from the app — a puncture, a minor repair, a
 * blocked road. Read-only for the supervisor apart from two state nudges
 * (Acknowledge, Resolve): a delay does not change the trip, so unlike
 * Vehicle Breakdown there is nothing here to reassign, and no create form.
 */

const STATUS_STYLES: Record<TripDelayStatus, string> = {
  REPORTED: "bg-orange-100 text-orange-800",
  ACKNOWLEDGED: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
};

const StatusBadge = ({ value }: { value: TripDelayStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      STATUS_STYLES[value] ?? "bg-gray-100 text-gray-600"
    }`}
  >
    {DELAY_STATUS_LABELS[value] ?? value}
  </span>
);

const extractError = (error: any): string => {
  const data = error?.response?.data;
  if (!data) return "An unexpected error occurred.";
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return "An unexpected error occurred.";
};

const toRecordList = (value: unknown): TripDelayReportRecord[] => {
  if (Array.isArray(value)) return value as TripDelayReportRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: TripDelayReportRecord[] }).results;
  }
  return [];
};

// Must match TripDelayReportViewSet.ordering_fields — anything else is a no-op.
const SORTABLE_FIELDS = new Set(["created_at", "status", "delay_reason"]);

/* ── Acknowledge / Resolve dialog ────────────────────────────────── */
function RemarksDialog({
  row,
  mode,
  isLoading,
  onClose,
  onConfirm,
}: {
  row: TripDelayReportRecord;
  mode: "acknowledge" | "resolve";
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const isAck = mode === "acknowledge";

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div>
          <p className="text-lg font-bold text-gray-800">
            {isAck ? "Acknowledge Delay" : "Mark Delay Resolved"}
          </p>
          <p className="text-xs text-gray-400 font-normal mt-0.5">{row.unique_id}</p>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 pt-2">
          <Button label="Cancel" className="p-button-text p-button-secondary" onClick={onClose} disabled={isLoading} />
          <Button
            label={isAck ? "Acknowledge" : "Resolve"}
            icon={isAck ? "pi pi-check" : "pi pi-flag"}
            className={isAck ? "p-button-info" : "p-button-success"}
            loading={isLoading}
            onClick={() => onConfirm(remarks)}
          />
        </div>
      }
      style={{ width: "460px" }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="rounded bg-gray-50 p-3 text-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Driver reported</p>
          <p className="font-semibold text-gray-800 mt-0.5">{row.delay_reason_display}</p>
          <p className="text-gray-600 mt-1">{row.delay_remarks}</p>
          {row.estimated_delay_minutes != null && (
            <p className="text-xs text-gray-500 mt-1">
              Estimated delay: {row.estimated_delay_minutes} min
            </p>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Remarks (optional)</p>
          <InputTextarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="w-full text-sm"
            placeholder="Anything to note for the record…"
            autoResize
          />
        </div>
      </div>
    </Dialog>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function TripDelayReportList() {
  const { t } = useTranslation();

  const {
    companyUniqueId,
    projectId,
    companies,
    projects,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, defaultToAll: true });

  const [rawRows, setRawRows] = useState<TripDelayReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>(-1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Open delays first — that is what a supervisor is here to act on.
  const [statusFilter, setStatusFilter] = useState<TripDelayStatus | "">("REPORTED");
  const requestIdRef = useRef(0);

  const [target, setTarget] = useState<TripDelayReportRecord | null>(null);
  const [mode, setMode] = useState<"acknowledge" | "resolve">("acknowledge");
  const [isSaving, setIsSaving] = useState(false);

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (ordering) params.ordering = ordering;
      if (statusFilter) params.status = statusFilter;

      const response = await tripDelayReportApi.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;
      const list = toRecordList(response);
      setRawRows(list);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? ((response as { count?: number }).count as number)
          : list.length,
      );
    } catch {
      if (requestId !== requestIdRef.current) return;
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setRawRows([]);
      setTotalRecords(0);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setRawRows([]);
      setTotalRecords(0);
      return;
    }
    void loadRows(first / rowsPerPage + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, companies.length, isSuperAdmin, first, rowsPerPage, searchTerm, ordering, statusFilter, t]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const handleConfirm = async (remarks: string) => {
    if (!target) return;
    setIsSaving(true);
    try {
      const { data } = await api.patch(
        `/schedule-operations/trip-delay-reports/${target.unique_id}/${mode}/`,
        remarks ? { supervisor_remarks: remarks } : {},
      );
      // Patch the row in place rather than dropping it: unlike a Re-Trip
      // approval this record stays relevant (an acknowledged delay is still
      // open), and the active status filter decides whether it stays visible.
      setRawRows((prev) =>
        prev
          .map((r) => (r.unique_id === target.unique_id ? { ...r, ...(data ?? {}) } : r))
          .filter((r) => (statusFilter ? r.status === statusFilter : true)),
      );
      setTarget(null);
      Swal.fire({
        icon: "success",
        title: mode === "acknowledge" ? "Acknowledged" : "Resolved",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const actionTemplate = (row: TripDelayReportRecord) => (
    <div className="flex items-center justify-center gap-3">
      {row.status === "REPORTED" && (
        <button
          title="Acknowledge"
          onClick={() => {
            setMode("acknowledge");
            setTarget(row);
          }}
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          <i className="pi pi-check-circle" />
        </button>
      )}
      {row.status !== "RESOLVED" && (
        <button
          title="Mark resolved"
          onClick={() => {
            setMode("resolve");
            setTarget(row);
          }}
          className="text-green-600 hover:text-green-800 transition-colors"
        >
          <i className="pi pi-flag" />
        </button>
      )}
    </div>
  );

  const header = (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={setGlobalFilterValue}
      searchPlaceholder="Search delays…"
      trailing={
        <div className="flex flex-wrap items-center gap-2">
          {(["REPORTED", "ACKNOWLEDGED", "RESOLVED", ""] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => {
                setFirst(0);
                setStatusFilter(s);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s ? DELAY_STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>
      }
    />
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Trip Delays</h1>
          <p className="text-sm text-gray-500">
            Hold-ups reported by drivers that did not take the vehicle off the road
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSuperAdmin && (
            <select
              value={companyUniqueId || ""}
              onChange={(e) => onCompanyChange(e.target.value)}
              disabled={companies.length === 0}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        value={rawRows as unknown as Record<string, unknown>[]}
        dataKey="unique_id"
        lazy
        paginator
        first={first}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPage={onPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No delays reported."
      >
        <Column header={t("common.s_no")} body={(_: any, { rowIndex }: any) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="unique_id" header="Delay ID" style={{ minWidth: 150 }} />
        <Column
          field="trip_assignment_id"
          header="Trip"
          style={{ minWidth: 160 }}
          body={(r: TripDelayReportRecord) => (
            <div className="text-sm text-gray-800">
              {r.trip_assignment_id}
              {r.trip_date && <div className="text-xs text-gray-400">{r.trip_date}</div>}
            </div>
          )}
        />
        <Column field="vehicle_no" header="Vehicle" style={{ minWidth: 120 }} body={(r) => r.vehicle_no || "—"} />
        <Column field="delay_reason" header="Reason" sortable style={{ minWidth: 150 }} body={(r) => r.delay_reason_display} />
        <Column
          field="delay_remarks"
          header="Remarks"
          style={{ minWidth: 260 }}
          body={(r: TripDelayReportRecord) => <span className="text-sm text-gray-700">{r.delay_remarks}</span>}
        />
        <Column
          field="estimated_delay_minutes"
          header="Est. delay"
          style={{ minWidth: 110 }}
          body={(r: TripDelayReportRecord) =>
            r.estimated_delay_minutes != null ? `${r.estimated_delay_minutes} min` : "—"
          }
        />
        <Column field="reported_by_name" header="Reported by" style={{ minWidth: 150 }} body={(r) => r.reported_by_name || "—"} />
        <Column field="delay_time" header="At" style={{ minWidth: 100 }} body={(r) => r.delay_time?.slice(0, 5) || "—"} />
        <Column
          field="status"
          header="Status"
          sortable
          style={{ minWidth: 130 }}
          body={(r: TripDelayReportRecord) => <StatusBadge value={r.status} />}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 110 }} />
      </DataTable>

      {target && (
        <RemarksDialog
          row={target}
          mode={mode}
          isLoading={isSaving}
          onClose={() => setTarget(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
