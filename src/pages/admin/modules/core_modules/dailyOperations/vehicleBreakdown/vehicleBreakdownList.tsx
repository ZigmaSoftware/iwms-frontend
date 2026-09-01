import type {
  VehicleBreakdownRecord,
  BreakdownStatus,
  ApprovalStatus,
} from "./types";
import { BREAKDOWN_REASON_LABELS } from "./types";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { api } from "@/api";
import { vehicleBreakdownApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const toRecordList = (value: unknown): VehicleBreakdownRecord[] => {
  if (Array.isArray(value)) return value as VehicleBreakdownRecord[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: VehicleBreakdownRecord[] }).results;
  }
  return [];
};

// Only fields the backend's `ordering_fields` (see vehicle_breakdown_viewset.py)
// actually accepts — sorting any other column would be silently ignored by DRF.
const SORTABLE_FIELDS = new Set(["status", "approval_status"]);

/* ── Badge helpers ─────────────────────────────────────────────── */

const STATUS_STYLES: Record<BreakdownStatus, string> = {
  REPORTED: "bg-amber-100 text-amber-800",
  REPLACEMENT_ARRANGED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
};
const STATUS_LABELS: Record<BreakdownStatus, string> = {
  REPORTED: "Reported",
  REPLACEMENT_ARRANGED: "Replacement Arranged",
  REJECTED: "Rejected",
};
const APPROVAL_STYLES: Record<ApprovalStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const StatusBadge = ({ value }: { value: BreakdownStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[value] ?? "bg-gray-100 text-gray-600"}`}
  >
    {STATUS_LABELS[value] ?? value}
  </span>
);

const ApprovalBadge = ({ value }: { value: ApprovalStatus }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[value] ?? "bg-gray-100 text-gray-600"}`}
  >
    {value}
  </span>
);

const extractError = (error: any): string => {
  const data = error?.response?.data;
  if (!data) return "An unexpected error occurred.";
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return "An unexpected error occurred.";
};

const displayValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

function DetailRow({
  label,
  before,
  after,
  highlight,
}: {
  label: string;
  before: string | null | undefined;
  after: string | null | undefined;
  highlight?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-gray-100 py-3 text-sm last:border-b-0 lg:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)]">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="min-w-0 break-words rounded-md bg-red-50 px-3 py-2 text-gray-800">
        {displayValue(before)}
      </span>
      <span
        className={`min-w-0 break-words rounded-md px-3 py-2 font-medium ${highlight ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-800"}`}
      >
        {displayValue(after)}
      </span>
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-gray-100 py-2.5 text-sm last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)]">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="min-w-0 break-words text-gray-800">
        {displayValue(value)}
      </span>
    </div>
  );
}

/* ── View Dialog ─────────────────────────────────────────────── */
function ViewDialog({
  row,
  onClose,
}: {
  row: VehicleBreakdownRecord;
  onClose: () => void;
}) {
  const originalVehicle =
    row.breakdown_vehicle_detail?.vehicle_no ?? row.breakdown_vehicle_id;
  const replacementVehicle =
    row.replacement_vehicle_detail?.vehicle_no ?? row.replacement_vehicle_id;
  const originalDriver =
    row.original_driver_detail?.name ?? row.original_driver_detail?.unique_id;
  const replacementDriver =
    row.replacement_driver_detail?.name ?? row.replacement_driver_id;
  const originalOperator =
    row.original_operator_detail?.name ??
    row.original_operator_detail?.unique_id;
  const replacementOperator =
    row.replacement_operator_detail?.name ?? row.replacement_operator_id;
  const altTemplate = row.alt_staff_template_detail;
  const altTemplateLabel = altTemplate
    ? `${altTemplate.display_code ?? altTemplate.unique_id} (${altTemplate.unique_id})`
    : row.alt_staff_template_id;
  const altTemplateCrew = altTemplate
    ? `${altTemplate.driver?.name ?? altTemplate.driver?.unique_id ?? "Driver"} / ${altTemplate.operator?.name ?? altTemplate.operator?.unique_id ?? "Operator"}`
    : null;
  const hasPendingStops = !!row.pending_stops;

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div>
          <p className="text-lg font-bold text-gray-800">
            Vehicle Breakdown Details
          </p>
          <p className="mt-0.5 text-xs font-normal text-gray-400">
            {row.unique_id}
          </p>
        </div>
      }
      style={{ width: "1120px", maxWidth: "96vw" }}
      contentStyle={{ maxHeight: "calc(100vh - 10rem)", overflowY: "auto" }}
      modal
      draggable={false}
      resizable={false}
      footer={
        <div className="flex justify-end">
          <Button
            label="Close"
            className="p-button-text p-button-secondary"
            onClick={onClose}
          />
        </div>
      }
    >
      <div className="space-y-5 pt-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Status</p>
            <div className="mt-2">
              <StatusBadge value={row.status} />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Approval</p>
            <div className="mt-2">
              <ApprovalBadge value={row.approval_status} />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">New Trip</p>
            <p className="mt-2 break-words font-mono text-sm text-green-700">
              {displayValue(row.new_assignment_id)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)]">
            <span>Field</span>
            <span>Original</span>
            <span>Replacement / Changed To</span>
          </div>
          <div className="px-4">
            <DetailRow
              label="Vehicle"
              before={originalVehicle}
              after={replacementVehicle}
              highlight
            />
            <DetailRow
              label="Driver"
              before={originalDriver}
              after={replacementDriver}
              highlight
            />
            <DetailRow
              label="Operator"
              before={originalOperator}
              after={replacementOperator}
              highlight
            />
            <DetailRow
              label="Trip"
              before={row.trip_assignment_id}
              after={row.new_assignment_id}
              highlight={!!row.new_assignment_id}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-gray-800">
              Breakdown
            </p>
            <ReadOnlyRow
              label="Trip Date"
              value={row.trip_assignment_detail?.trip_date}
            />
            <ReadOnlyRow
              label="Panchayat"
              value={row.trip_assignment_detail?.panchayat_name}
            />
            <ReadOnlyRow
              label="Reason"
              value={
                BREAKDOWN_REASON_LABELS[row.breakdown_reason] ??
                row.breakdown_reason
              }
            />
            <ReadOnlyRow label="Time" value={row.breakdown_time} />
            <ReadOnlyRow label="Location" value={row.breakdown_location} />
            <ReadOnlyRow
              label="Coordinates"
              value={
                row.breakdown_lat && row.breakdown_lng
                  ? `${row.breakdown_lat}, ${row.breakdown_lng}`
                  : null
              }
            />
            <ReadOnlyRow
              label="Weight Before"
              value={
                row.collected_weight_before_breakdown_kg
                  ? `${row.collected_weight_before_breakdown_kg} kg`
                  : null
              }
            />
          </div>

          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-gray-800">Approval</p>
            <ReadOnlyRow
              label="Approved By"
              value={row.approved_by_detail?.name ?? row.approved_by}
            />
            <ReadOnlyRow label="Approved At" value={row.approved_at} />
            <ReadOnlyRow
              label="Alternative Template"
              value={altTemplateLabel}
            />
            <ReadOnlyRow label="Alternative Crew" value={altTemplateCrew} />
            <ReadOnlyRow
              label="Change Reason"
              value={altTemplate?.change_reason}
            />
            <ReadOnlyRow
              label="Change Remarks"
              value={altTemplate?.change_remarks}
            />
            <ReadOnlyRow
              label="Rejected Reason"
              value={row.rejection_remarks}
            />
            <ReadOnlyRow label="Created At" value={row.created_at} />
            <ReadOnlyRow label="Updated At" value={row.updated_at} />
          </div>
        </div>

        {hasPendingStops && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Pending work at view time:{" "}
            {row.pending_stops!.collection_points.length} collection point(s),{" "}
            {row.pending_stops!.households.length} household(s).
          </div>
        )}

        {row.breakdown_remarks && (
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <p className="mb-2 text-sm font-semibold text-gray-800">Remarks</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {row.breakdown_remarks}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/* ── Verify Dialog ─────────────────────────────────────────────── */
function VerifyDialog({
  row,
  onClose,
  onConfirm,
  isLoading,
}: {
  row: VehicleBreakdownRecord;
  onClose: () => void;
  onConfirm: (remarks: string, collectionPointIds?: string[]) => void;
  isLoading: boolean;
}) {
  const [remarks, setRemarks] = useState("");
  const pending = row.pending_stops;
  const isBinTrip = !!pending && pending.collection_points.length > 0;
  const isHouseholdTrip = !!pending && pending.households.length > 0;
  const [selectedCps, setSelectedCps] = useState<string[]>(
    () => pending?.collection_points.map((cp) => cp.unique_id) ?? [],
  );

  const toggleCp = (id: string) => {
    setSelectedCps((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const canConfirm = !isBinTrip || selectedCps.length > 0;

  const footer = (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        label="Cancel"
        className="p-button-text p-button-secondary"
        onClick={onClose}
        disabled={isLoading}
      />
      <Button
        label="Approve & Start Replacement Trip"
        icon="pi pi-check"
        className="p-button-success"
        loading={isLoading}
        disabled={!canConfirm}
        onClick={() => onConfirm(remarks, isBinTrip ? selectedCps : undefined)}
      />
    </div>
  );
  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div>
          <p className="text-lg font-bold text-gray-800">
            Verify & Approve Breakdown
          </p>
          <p className="text-xs text-gray-400 font-normal mt-0.5">
            {row.unique_id}
          </p>
        </div>
      }
      footer={footer}
      style={{ width: "560px" }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm space-y-2">
          {[
            ["Trip ID", row.trip_assignment_id],
            ["Trip Date", row.trip_assignment_detail?.trip_date ?? "-"],
            [
              "Broken Vehicle",
              row.breakdown_vehicle_detail?.vehicle_no ??
                row.breakdown_vehicle_id,
            ],
            [
              "Replacement Vehicle",
              row.replacement_vehicle_detail?.vehicle_no ??
                row.replacement_vehicle_id,
            ],
            ["Replacement Driver", row.replacement_driver_detail?.name ?? "-"],
            [
              "Replacement Operator",
              row.replacement_operator_detail?.name ?? "-",
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-gray-500 w-40 shrink-0">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>

        {isBinTrip && (
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Remaining collection points ({pending!.collection_points.length})
              — select which move to the replacement trip
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {pending!.collection_points.map((cp) => (
                <label
                  key={cp.unique_id}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedCps.includes(cp.unique_id)}
                    onChange={() => toggleCp(cp.unique_id)}
                  />
                  <span>
                    {cp.name ?? cp.collection_point_id ?? cp.unique_id}
                  </span>
                  <span className="text-xs text-gray-400">({cp.status})</span>
                </label>
              ))}
            </div>
            {!canConfirm && (
              <p className="text-xs text-red-500 mt-2">
                Select at least one collection point to carry over.
              </p>
            )}
          </div>
        )}

        {isHouseholdTrip && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
            <strong>{pending!.households.length}</strong> un-collected house(s)
            will automatically carry over to the replacement trip.
          </div>
        )}

        <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-xs text-green-800">
          <strong>On approval:</strong> Trip{" "}
          <span className="font-mono">{row.trip_assignment_id}</span> will be
          closed and a new replacement trip will be created with the new
          vehicle/driver/operator, carrying over the remaining stops. The new
          trip ID will be shown on the Daily Trip Plan.
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">
            Remarks (optional)
          </p>
          <InputTextarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="w-full text-sm"
            placeholder="Add approval remarks…"
            autoResize
          />
        </div>
      </div>
    </Dialog>
  );
}

/* ── Reject Dialog ─────────────────────────────────────────────── */
function RejectDialog({
  row,
  onClose,
  onConfirm,
  isLoading,
}: {
  row: VehicleBreakdownRecord;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  isLoading: boolean;
}) {
  const [remarks, setRemarks] = useState("");
  const footer = (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        label="Cancel"
        className="p-button-text p-button-secondary"
        onClick={onClose}
        disabled={isLoading}
      />
      <Button
        label="Reject"
        icon="pi pi-times"
        className="p-button-danger"
        loading={isLoading}
        disabled={!remarks.trim()}
        onClick={() => onConfirm(remarks)}
      />
    </div>
  );
  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div>
          <p className="text-lg font-bold text-gray-800">
            Reject Breakdown Request
          </p>
          <p className="text-xs text-gray-400 font-normal mt-0.5">
            {row.unique_id}
          </p>
        </div>
      }
      footer={footer}
      style={{ width: "460px" }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-sm text-gray-600">
          The original vehicle{" "}
          <strong className="text-red-600">
            {row.breakdown_vehicle_detail?.vehicle_no ??
              row.breakdown_vehicle_id}
          </strong>{" "}
          will remain assigned to trip{" "}
          <strong className="font-mono text-blue-700">
            {row.trip_assignment_id}
          </strong>
          .
        </p>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">
            Rejection Reason <span className="text-red-500">*</span>
          </p>
          <InputTextarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="w-full text-sm"
            placeholder="Provide a reason for rejection…"
            autoResize
          />
        </div>
      </div>
    </Dialog>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function VehicleBreakdownList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;

  const {
    companyUniqueId,
    projectId,
    companies,
    projects,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encScheduleOperations, encVehicleBreakdown } = getEncryptedRoute();
  const { newPath, editPath } = createCrudRoutePaths(
    encScheduleOperations,
    encVehicleBreakdown,
  );
  const selectedContext = { companyUniqueId, projectId };

  const [rawRows, setRawRows] = useState<VehicleBreakdownRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const requestIdRef = useRef(0);

  const [verifyTarget, setVerifyTarget] =
    useState<VehicleBreakdownRecord | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectTarget, setRejectTarget] =
    useState<VehicleBreakdownRecord | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [viewTarget, setViewTarget] = useState<VehicleBreakdownRecord | null>(
    null,
  );

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setRawRows([]);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      // Backend has NO DRF SearchFilter — it manually ORs across 6 fields
      // via `?search=` (see get_queryset() in vehicle_breakdown_viewset.py).
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (ordering) params.ordering = ordering;

      const response = await vehicleBreakdownApi.readAllwithPaginated(
        page,
        limit,
        { params },
      );
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
  }, [
    companyUniqueId,
    projectId,
    companies.length,
    isSuperAdmin,
    first,
    rowsPerPage,
    searchTerm,
    ordering,
    t,
  ]);

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

  /* ── Enrich rows for display ──────────────────────────────── */
  const rows = rawRows.map((r) => ({
    ...r,
    _trip_date: r.trip_assignment_detail?.trip_date ?? "",
    _panchayat: r.trip_assignment_detail?.panchayat_name ?? "",
    _breakdown_vehicle:
      r.breakdown_vehicle_detail?.vehicle_no ?? r.breakdown_vehicle_id,
    _replacement_vehicle:
      r.replacement_vehicle_detail?.vehicle_no ?? r.replacement_vehicle_id,
    _repl_driver: r.replacement_driver_detail?.name ?? "",
    _repl_operator: r.replacement_operator_detail?.name ?? "",
    _breakdown_reason:
      BREAKDOWN_REASON_LABELS[r.breakdown_reason] ?? r.breakdown_reason,
  }));

  /* ── Delete ─────────────────────────────────────────────────────── */
  const handleDelete = async (row: VehicleBreakdownRecord) => {
    const result = await Swal.fire({
      title: t("common.are_you_sure"),
      text: `Delete breakdown record ${row.unique_id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: t("common.delete"),
      cancelButtonText: t("common.cancel"),
    });
    if (!result.isConfirmed) return;
    try {
      await vehicleBreakdownApi.delete(row.unique_id);
      setRawRows((prev) => prev.filter((r) => r.unique_id !== row.unique_id));
      Swal.fire(t("common.success"), t("common.deleted_success"), "success");
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err), "error");
    }
  };

  /* ── Verify ─────────────────────────────────────────────────────── */
  const handleVerifyConfirm = async (
    remarks: string,
    collectionPointIds?: string[],
  ) => {
    if (!verifyTarget) return;
    setIsVerifying(true);
    try {
      const { data } = await api.patch(
        `/schedule-operations/vehicle-breakdowns/${verifyTarget.unique_id}/verify/`,
        {
          remarks,
          ...(collectionPointIds
            ? { collection_point_ids: collectionPointIds }
            : {}),
        },
      );
      setRawRows((prev) =>
        prev.map((r) =>
          r.unique_id === verifyTarget.unique_id
            ? {
                ...r,
                status: "REPLACEMENT_ARRANGED",
                approval_status: "APPROVED",
                new_assignment_id: data?.new_assignment_id ?? null,
              }
            : r,
        ),
      );
      setVerifyTarget(null);
      Swal.fire({
        icon: "success",
        title: "Approved",
        text: data?.new_assignment_id
          ? `Replacement trip ${data.new_assignment_id} created.`
          : "Replacement vehicle assigned to the trip.",
        timer: 2500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err), "error");
    } finally {
      setIsVerifying(false);
    }
  };

  /* ── Reject ─────────────────────────────────────────────────────── */
  const handleRejectConfirm = async (remarks: string) => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await api.patch(
        `/schedule-operations/vehicle-breakdowns/${rejectTarget.unique_id}/reject/`,
        { rejection_remarks: remarks },
      );
      setRawRows((prev) =>
        prev.map((r) =>
          r.unique_id === rejectTarget.unique_id
            ? { ...r, status: "REJECTED", approval_status: "REJECTED" }
            : r,
        ),
      );
      setRejectTarget(null);
      Swal.fire({
        icon: "info",
        title: "Rejected",
        text: "Breakdown request has been rejected.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err), "error");
    } finally {
      setIsRejecting(false);
    }
  };

  /* ── Search ─────────────────────────────────────────────────────── */
  const onGlobalFilterChange = (value: string) => {
    setGlobalFilterValue(value);
  };

  /* ── Export ─────────────────────────────────────────────────────── */
  // Exports the full matching dataset (respecting company/project scope and
  // the current search term) via the dedicated export endpoint, rather than
  // just the current page of `rows` — pagination should not shrink exports.

  // Feeds the table's single "Download Excel" button: "All data" re-fetches
  // every breakdown matching the current company/project/search filters.
  const loadAllExportRows = async () => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (searchTerm.trim()) params.search = searchTerm.trim();

    const response = await vehicleBreakdownApi.readAllForExport({ params });
    return toRecordList(response).map((r) => ({
      "Trip Date": r.trip_assignment_detail?.trip_date ?? "",
      Panchayat: r.trip_assignment_detail?.panchayat_name ?? "",
      "Broken Vehicle":
        r.breakdown_vehicle_detail?.vehicle_no ?? r.breakdown_vehicle_id,
      "Replacement Vehicle":
        r.replacement_vehicle_detail?.vehicle_no ?? r.replacement_vehicle_id,
      "Repl. Driver": r.replacement_driver_detail?.name ?? "",
      "Repl. Operator": r.replacement_operator_detail?.name ?? "",
      Reason: BREAKDOWN_REASON_LABELS[r.breakdown_reason] ?? r.breakdown_reason,
      Status: r.status,
      Approval: r.approval_status,
    }));
  };

  /* ── Action column ──────────────────────────────────────────────── */
  const actionTemplate = (row: VehicleBreakdownRecord) => (
    <div className="flex items-center justify-center gap-3">
      <button
        title="View Changes"
        onClick={() => setViewTarget(row)}
        className="text-slate-600 hover:text-slate-900 transition-colors"
      >
        <i className="pi pi-eye" />
      </button>

      {/* Edit — only pending records */}
      {row.approval_status === "PENDING" && (
        <button
          title={t("common.edit")}
          onClick={() =>
            navigate(editPath(row.unique_id), {
              state: { record: row, ...selectedContext },
            })
          }
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          <i className="pi pi-pencil" />
        </button>
      )}

      {/* Verify — only pending records */}
      {row.approval_status === "PENDING" && (
        <button
          title="Verify & Approve"
          onClick={() => setVerifyTarget(row)}
          className="text-green-600 hover:text-green-800 transition-colors"
        >
          <i className="pi pi-check-circle" />
        </button>
      )}

      {/* Reject — only pending records */}
      {row.approval_status === "PENDING" && (
        <button
          title="Reject"
          onClick={() => setRejectTarget(row)}
          className="text-orange-500 hover:text-orange-700 transition-colors"
        >
          <i className="pi pi-times-circle" />
        </button>
      )}

      {/* Delete — not allowed on approved records */}
      {row.approval_status !== "APPROVED" && (
        <button
          title={t("common.delete")}
          onClick={() => handleDelete(row)}
          className="text-red-600 hover:text-red-800 transition-colors"
        >
          <i className="pi pi-trash" />
        </button>
      )}
    </div>
  );

  /* ── Header ─────────────────────────────────────────────────────── */
  const header = (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={onGlobalFilterChange}
      searchPlaceholder="Search breakdowns…"
    >
      {isSuperAdmin && (
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={(value) => onCompanyChange(value)}
          options={companies}
          placeholder="All Companies"
          disabled={companies.length === 0}
        />
      )}
      <FilterBarSelect
        value={projectId || ""}
        onChange={(value) => setProjectId(value)}
        options={projects}
        placeholder="All Projects"
        disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
      />
    </FilterBar>
  );

  /* ════════════════════════════════════════════════════════════════
      RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-3">
      {/* Title row */}
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">
            Vehicle Breakdown
          </h1>
          <p className="text-sm text-gray-500">
            Report breakdowns and arrange replacement vehicles for trips
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <Button
            label="Report Breakdown"
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            onClick={() => navigate(newPath, { state: selectedContext })}
          />
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        loadExportRows={loadAllExportRows}
        value={rows}
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
        emptyMessage="No breakdown records found."
      >
        <Column
          header={t("common.s_no")}
          body={(_: any, { rowIndex }: any) => rowIndex + 1}
          style={{ width: 60 }}
        />
        <Column
          field="unique_id"
          header="Breakdown ID"
          style={{ minWidth: 150 }}
        />
        <Column
          field="trip_assignment_id"
          header="Trip ID"
          style={{ minWidth: 150 }}
        />
        <Column
          field="_trip_date"
          header="Trip Date"
          style={{ minWidth: 110 }}
          body={(r: any) => r._trip_date || "-"}
        />
        <Column
          field="_panchayat"
          header="Panchayat"
          style={{ minWidth: 140 }}
          body={(r: any) => r._panchayat || "-"}
        />
        <Column
          field="_breakdown_vehicle"
          header="Broken Vehicle"
          style={{ minWidth: 140 }}
          body={(r: any) => (
            <span className="font-semibold text-red-700">
              {r._breakdown_vehicle}
            </span>
          )}
        />
        <Column
          field="_replacement_vehicle"
          header="Replacement Vehicle"
          style={{ minWidth: 160 }}
          body={(r: any) => (
            <span className="font-semibold text-green-700">
              {r._replacement_vehicle}
            </span>
          )}
        />
        <Column
          field="_repl_driver"
          header="Repl. Driver"
          style={{ minWidth: 130 }}
          body={(r: any) => r._repl_driver || "-"}
        />
        <Column
          field="_repl_operator"
          header="Repl. Operator"
          style={{ minWidth: 130 }}
          body={(r: any) => r._repl_operator || "-"}
        />
        <Column
          field="_breakdown_reason"
          header="Reason"
          style={{ minWidth: 140 }}
          body={(r: any) => r._breakdown_reason}
        />
        <Column
          field="status"
          header="Status"
          sortable
          style={{ minWidth: 170 }}
          body={(r: VehicleBreakdownRecord) => <StatusBadge value={r.status} />}
        />
        <Column
          field="approval_status"
          header="Approval"
          sortable
          style={{ minWidth: 110 }}
          body={(r: VehicleBreakdownRecord) => (
            <ApprovalBadge value={r.approval_status} />
          )}
        />
        <Column
          header="New Trip"
          style={{ minWidth: 130 }}
          body={(r: VehicleBreakdownRecord) =>
            r.new_assignment_id ? (
              <span className="font-mono text-xs text-green-700">
                {r.new_assignment_id}
              </span>
            ) : (
              <span className="text-xs text-gray-300">—</span>
            )
          }
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ minWidth: 220 }}
        />
      </DataTable>

      {/* View Dialog */}
      {viewTarget && (
        <ViewDialog row={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {/* Verify Dialog */}
      {verifyTarget && (
        <VerifyDialog
          row={verifyTarget}
          onClose={() => setVerifyTarget(null)}
          onConfirm={handleVerifyConfirm}
          isLoading={isVerifying}
        />
      )}

      {/* Reject Dialog */}
      {rejectTarget && (
        <RejectDialog
          row={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          isLoading={isRejecting}
        />
      )}
    </div>
  );
}
