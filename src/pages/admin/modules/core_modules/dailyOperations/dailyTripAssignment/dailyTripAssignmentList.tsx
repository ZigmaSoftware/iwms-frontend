import type { DailyTripAssignmentRecord } from "./types";
import type { CollectionTypeKey } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta, DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { PencilIcon } from "@/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { dailyTripAssignmentApi, binApi, customerCreationApi } from "@/helpers/admin";
import { jsPDF } from "jspdf";
import { api } from "@/api";
import { adminEndpoints } from "@/helpers/admin/endpoints";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import { downloadRecordsPdf, drawQrCode } from "@/utils/exportPdf";
import { formatCollectionTime, formatTimeOnly } from "@/utils/formatTime";

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Scheduled: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

const Badge = ({ value, styleMap }: { value?: string; styleMap: Record<string, string> }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styleMap[value ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
    {value ?? "—"}
  </span>
);

const BreakdownCell = ({ row }: { row: DailyTripAssignmentRecord }) => {
  const bd = row.breakdown_info;
  if (!bd) return <span className="text-xs text-gray-300">—</span>;

  const isApproved = bd.approval_status === "APPROVED";
  const isPending  = bd.approval_status === "PENDING";

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isApproved ? "bg-green-100 text-green-700" :
        isPending  ? "bg-orange-100 text-orange-700" :
                     "bg-red-100 text-red-700"
      }`}>
        {isApproved ? "✓ Replaced" : isPending ? "⚠ Pending" : "✕ Rejected"}
      </span>
      {isApproved && bd.replacement_vehicle_no && (
        <div className="text-[10px] text-gray-600 leading-tight">
          <span className="font-medium">Veh:</span> {bd.replacement_vehicle_no}
        </div>
      )}
      {isApproved && (bd.replacement_driver || bd.replacement_operator) && (
        <div className="text-[10px] text-gray-600 leading-tight">
          {bd.replacement_driver && <span><span className="font-medium">Drv:</span> {bd.replacement_driver}</span>}
          {bd.replacement_driver && bd.replacement_operator && <span className="mx-1">·</span>}
          {bd.replacement_operator && <span><span className="font-medium">Opr:</span> {bd.replacement_operator}</span>}
        </div>
      )}
    </div>
  );
};

// Re-Trip is a separate workflow from a vehicle breakdown (closing a trip
// early to carry leftover stops to a continuation trip, vs. swapping the
// vehicle/crew on the same trip) — driven by unrelated events, so this is
// its own cell/column, never merged with BreakdownCell above.
const RetripCell = ({ retrip }: { retrip?: DailyTripAssignmentRecord["retrip_info"] }) => {
  if (!retrip) return <span className="text-xs text-gray-300">—</span>;

  const isApproved = retrip.status === "Approved";
  const isPending = retrip.status === "Pending";

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          isApproved
            ? "bg-green-100 text-green-700"
            : isPending
              ? "bg-orange-100 text-orange-700"
              : "bg-red-100 text-red-700"
        }`}
      >
        {isApproved ? "→ Proceeded" : isPending ? "⚠ Pending" : "✕ Rejected"}
      </span>
      {isApproved && retrip.new_assignment_id && (
        <div className="text-[10px] text-gray-600 leading-tight">
          <span className="font-medium">Next:</span> {retrip.new_assignment_id}
        </div>
      )}
    </div>
  );
};

const COLLECTION_TYPE_STYLES: Record<CollectionTypeKey, string> = {
  bin:       "bg-blue-100 text-blue-800",
  household: "bg-green-100 text-green-800",
  both:      "bg-purple-100 text-purple-800",
  unknown:   "bg-gray-100 text-gray-500",
};

const COLLECTION_TYPE_LABELS: Record<CollectionTypeKey, string> = {
  bin:       "Bin Collection",
  household: "Household",
  both:      "Bin + Household",
  unknown:   "Unknown",
};

const getCollectionTypeKey = (rec: DailyTripAssignmentRecord): CollectionTypeKey => {
  const ct = rec.collection_types ?? {
    has_bin:       rec.trip_plan?.has_bin  ?? false,
    has_household: rec.trip_plan?.has_household ?? false,
  };
  if (ct.has_bin && ct.has_household) return "both";
  if (ct.has_bin)       return "bin";
  if (ct.has_household) return "household";
  return "unknown";
};

const CollectionTypeBadge = ({ rec }: { rec: DailyTripAssignmentRecord }) => {
  const key = getCollectionTypeKey(rec);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLLECTION_TYPE_STYLES[key]}`}>
      {COLLECTION_TYPE_LABELS[key]}
    </span>
  );
};

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

const toDateInputValue = (date = new Date()): string => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const wasteTypeText = (record: DailyTripAssignmentRecord): string =>
  Array.isArray(record.waste_types) && record.waste_types.length
    ? record.waste_types
        .map((item) => item.waste_type_name ?? item.unique_id)
        .filter(Boolean)
        .join(", ")
    : "—";

const zoneText = (record: DailyTripAssignmentRecord): string =>
  record.zone?.zone_name ??
  record.trip_plan?.zone?.zone_name ??
  record.wards?.[0]?.zone_name ??
  record.trip_plan?.wards?.[0]?.zone_name ??
  "—";

const wardText = (record: DailyTripAssignmentRecord): string =>
  record.wards?.[0]?.ward_name ?? record.trip_plan?.wards?.[0]?.ward_name ?? "—";

const locationText = (record: DailyTripAssignmentRecord): string =>
  record.panchayat?.panchayat_name ??
  record.trip_plan?.panchayat?.panchayat_name ??
  wardText(record);

type SchedulerStatus = {
  enabled?: boolean;
  is_enabled?: boolean;
  run_time?: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_run_mode?: string | null;
  last_auto_run_at?: string | null;
  last_error?: string | null;
};

/* ── backend's DRF `ordering_fields` allowlist (see daily_trip_assignment_viewset.py) ── */
const SORTABLE_FIELDS = new Set(["trip_date", "scheduled_time", "status", "approval_status"]);

const toRecordList = (value: unknown): DailyTripAssignmentRecord[] => {
  if (Array.isArray(value)) return value as DailyTripAssignmentRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: DailyTripAssignmentRecord[] }).results;
  }
  return [];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyTripAssignmentList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encScheduleMasters, encDailyTripAssignment } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleMasters,
    encDailyTripAssignment,
  );

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, showAllProjectsOption, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [rawAssignments, setRawAssignments] = useState<DailyTripAssignmentRecord[]>([]);
  const [filteredRows, setFilteredRows] = useState<DailyTripAssignmentRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const [isSavingSchedulerConfig, setIsSavingSchedulerConfig] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingDetailed, setIsExportingDetailed] = useState(false);
  const [retripRow, setRetripRow] = useState<DailyTripAssignmentRecord | null>(null);
  const [retripRemarks, setRetripRemarks] = useState("");
  const [retripSelectedCps, setRetripSelectedCps] = useState<Set<string>>(new Set());
  const [isRetripSubmitting, setIsRetripSubmitting] = useState(false);
  const requestIdRef = useRef(0);
  const [schedulerDate, setSchedulerDate] = useState(toDateInputValue());
  const [schedulerRunTime, setSchedulerRunTime] = useState("04:00");
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | CollectionTypeKey>("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _trip_plan: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _staff: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _zone: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _ward: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _location: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _waste: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _collection_type_label: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _collection_point_count: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    approval_status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    scheduled_time: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  /* ── ordering param, from the sortField/sortOrder state, mapped through the
     backend's `ordering_fields` allowlist ── */
  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  /* ── load ONE page of assignments (server-side pagination + search + ordering)
     instead of fetching the entire table client-side ── */
  const loadRows = useCallback(
    async (page: number, limit: number, search: string, orderingParam?: string) => {
      if (!companyUniqueId && !isSuperAdmin) return;
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setRawAssignments([]);
      try {
        const params: Record<string, string> = {};
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;
        if (schedulerDate) params.date = schedulerDate;
        if (search) params.search = search;
        if (orderingParam) params.ordering = orderingParam;
        const response = await dailyTripAssignmentApi.readAllwithPaginated(page, limit, { params });
        if (requestId !== requestIdRef.current) return;
        const list = toRecordList(response);
        setRawAssignments(list);
        setTotalRecords(
          typeof (response as { count?: number })?.count === "number"
            ? (response as { count?: number }).count as number
            : list.length,
        );
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? String(err) });
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [companyUniqueId, projectId, schedulerDate, isSuperAdmin, t],
  );

  const loadSchedulerStatus = useCallback(() => {
    dailyTripAssignmentApi
      .action<SchedulerStatus>("scheduler-status")
      .then((status) => {
        setSchedulerStatus(status);
        if (status.run_time) setSchedulerRunTime(status.run_time.slice(0, 5));
        if (typeof status.enabled === "boolean") setSchedulerEnabled(status.enabled);
        else if (typeof status.is_enabled === "boolean") setSchedulerEnabled(status.is_enabled);
      })
      .catch(() => setSchedulerStatus(null));
  }, []);

  /* ── reset to first page whenever company/project/date filters change ── */
  useEffect(() => {
    setFirst(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, schedulerDate]);

  /* ── debounce the global search box into the server-side `?search=` param ── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  /* ── load rows (re-runs whenever pagination/sort/search/company/project/date change) ── */
  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, rowsPerPage, searchTerm, ordering, companyUniqueId, projectId, schedulerDate, isSuperAdmin]);

  useEffect(() => loadSchedulerStatus(), [loadSchedulerStatus]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const runSchedulerNow = async () => {
    setIsSchedulerRunning(true);
    try {
      const result = await dailyTripAssignmentApi.action<Record<string, unknown>, { date: string }>(
        "run-scheduler",
        { date: schedulerDate },
      );
      Swal.fire({
        icon: "success",
        title: "Scheduler completed",
        text: `Created: ${result.assignments_created ?? 0}, existing: ${result.assignments_existing ?? 0}, collection points: ${result.collection_points_created ?? 0}`,
      });
      loadSchedulerStatus();
      void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    } catch (err) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? "Scheduler failed" });
    } finally {
      setIsSchedulerRunning(false);
    }
  };

  // Manual "Generate Daily" run — POST /daily-trip-assignments/generate-daily/
  // (A4 contract). Unlike Run Scheduler (force=true, ignores approval/weekday
  // gating), this respects approval_status + repeat_days like the nightly
  // job and requires an approval role (403 otherwise).
  const runGenerateDailyNow = async () => {
    setIsGeneratingDaily(true);
    try {
      const result = await dailyTripAssignmentApi.action<Record<string, unknown>, { date?: string }>(
        "generate-daily",
        schedulerDate ? { date: schedulerDate } : {},
      );
      Swal.fire({
        icon: "success",
        title: "Generate Daily completed",
        text: String(result.message ?? `Created: ${result.created ?? 0}, skipped: ${result.skipped ?? 0}`),
      });
      void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    } catch (err) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? "Generate Daily failed" });
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  const saveSchedulerConfig = async () => {
    if (!schedulerRunTime) {
      Swal.fire({ icon: "warning", title: "Select auto-generation time" });
      return;
    }
    setIsSavingSchedulerConfig(true);
    try {
      const { data } = await api.patch(adminEndpoints.schedulerConfig, {
        run_time: schedulerRunTime,
        is_enabled: schedulerEnabled,
      });
      setSchedulerRunTime(String(data.run_time ?? schedulerRunTime).slice(0, 5));
      setSchedulerEnabled(Boolean(data.is_enabled ?? schedulerEnabled));
      loadSchedulerStatus();
      Swal.fire({
        icon: "success",
        title: "Scheduler updated",
        text: `Daily trip plans will auto-generate at ${String(data.run_time ?? schedulerRunTime).slice(0, 5)}.`,
      });
    } catch (err) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? "Failed to update scheduler time" });
    } finally {
      setIsSavingSchedulerConfig(false);
    }
  };

  /* ── enrich + filter rows ── */
  // Company/project/date scoping is applied server-side via params in
  // loadRows — only the client-only `collectionTypeFilter` (derived from
  // nested trip_plan flags, not a plain backend field) still narrows here,
  // and it now only ever sees ONE PAGE of rows at a time.
  const rows = (() => {
    if (!companyUniqueId && !isSuperAdmin) return [];
    return rawAssignments
      .filter((row) => {
        if (schedulerDate && row.trip_date !== schedulerDate) return false;
        if (collectionTypeFilter !== "all" && getCollectionTypeKey(row) !== collectionTypeFilter) return false;
        return true;
      })
      .map((rec) => ({
        ...rec,
        _trip_plan: rec.trip_plan?.display_code ?? rec.trip_plan_id ?? "",
        _staff: rec.effective_staff?.display_code ?? rec.staff_template?.display_code ?? rec.staff_template_id ?? "",
        _zone: zoneText(rec),
        _ward: wardText(rec),
        _location: locationText(rec),
        _waste: wasteTypeText(rec),
        _collection_type: getCollectionTypeKey(rec),
        _collection_type_label: COLLECTION_TYPE_LABELS[getCollectionTypeKey(rec)],
        _collection_point_count: String(
          (Array.isArray(rec.collection_points) ? rec.collection_points.length : 0) +
          (Array.isArray(rec.household_collection_points) ? rec.household_collection_points.length : 0)
        ),
      }));
  })();

  // Keeps the exported Excel rows in sync with whatever the table is
  // currently displaying (current page + column filters), not the full
  // unfiltered `rows` array — SafeDataTable's own export otherwise exports
  // the raw `value` prop as-is.
  useEffect(() => {
    setFilteredRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawAssignments, companyUniqueId, isSuperAdmin, schedulerDate, collectionTypeFilter]);

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

  /* ── Re-Trip: close an In Progress trip early, carrying leftover stops to
     a continuation trip (app.services.retrip_service.proceed_to_next_trip
     on the backend). Bin trips require picking which stops carry over;
     household trips always carry everything. ── */
  const retripPendingCps = (retripRow?.collection_points ?? []).filter(
    (cp) => cp.status !== "Collected" && cp.status !== "Missed",
  );
  const retripIsBinTrip = (retripRow?.collection_points?.length ?? 0) > 0;

  const openRetripModal = (row: DailyTripAssignmentRecord) => {
    const pending = (row.collection_points ?? []).filter(
      (cp) => cp.status !== "Collected" && cp.status !== "Missed",
    );
    setRetripRow(row);
    setRetripRemarks("");
    setRetripSelectedCps(new Set(pending.map((cp) => cp.unique_id).filter(Boolean) as string[]));
  };

  const closeRetripModal = () => {
    if (isRetripSubmitting) return;
    setRetripRow(null);
  };

  const toggleRetripCp = (cpId: string, checked: boolean) => {
    setRetripSelectedCps((prev) => {
      const next = new Set(prev);
      if (checked) next.add(cpId);
      else next.delete(cpId);
      return next;
    });
  };

  const submitRetrip = async () => {
    if (!retripRow) return;
    const rowId = retripRow.unique_id ?? String((retripRow as any).id ?? "");
    if (!rowId) return;

    const remarks = retripRemarks.trim();
    if (!remarks) {
      Swal.fire({ icon: "warning", title: t("common.warning"), text: "Please enter a reason." });
      return;
    }
    if (retripIsBinTrip && retripSelectedCps.size === 0) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: "Select at least one collection point to carry over.",
      });
      return;
    }

    setIsRetripSubmitting(true);
    try {
      await dailyTripAssignmentApi.action(`${rowId}/proceed-next-trip`, {
        remarks,
        collection_point_ids: retripIsBinTrip ? Array.from(retripSelectedCps) : undefined,
      });
      Swal.fire({
        icon: "success",
        title: "Trip closed",
        text: "A continuation trip has been created with the carried-over stops.",
        timer: 2000,
        showConfirmButton: false,
      });
      setRetripRow(null);
      void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: extractError(err) ?? "Failed to close this trip.",
      });
    } finally {
      setIsRetripSubmitting(false);
    }
  };

  const actionTemplate = (row: DailyTripAssignmentRecord) => {
    const rowId = row.unique_id ?? String((row as any).id ?? "");
    return (
      <div className="flex justify-center">
        <button
          title={t("common.edit")}
          onClick={() =>
            navigate(ENC_EDIT_PATH(rowId), {
              state: {
                companyUniqueId: (row.company_unique_id ?? row.company_id) as string | undefined,
                projectId: (row.project_unique_id ?? row.project_id) as string | undefined,
              },
            })
          }
          disabled={!rowId}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-30"
        >
          <PencilIcon className="size-5" />
        </button>
        {row.status === "In Progress" && (
          <button
            title="Close & Start Next Trip"
            onClick={() => openRetripModal(row)}
            className="ml-2 text-orange-600 hover:text-orange-800"
          >
            ⏭
          </button>
        )}
      </div>
    );
  };

  /* ── build one detailed export row per collection point / household
     collection point, falling back to a single plan-level row when a trip
     plan has no line items ── */
  const buildExportRows = (source: DailyTripAssignmentRecord[]): Record<string, unknown>[] => {
    const out: Record<string, unknown>[] = [];
    source.forEach((row) => {
      const base = {
        "Trip ID": row.unique_id,
        "Trip Plan": row.trip_plan?.display_code ?? row.trip_plan_id ?? "-",
        "Trip Date": row.trip_date ?? "-",
        Location: locationText(row),
        Zone: zoneText(row),
        Ward: wardText(row),
        Staff:
          row.effective_staff?.display_code ??
          row.staff_template?.display_code ??
          row.staff_template_id ??
          "-",
        "Waste Type": wasteTypeText(row),
        "Collection Type": COLLECTION_TYPE_LABELS[getCollectionTypeKey(row)],
        "Start Time": formatTimeOnly(row.scheduled_time),
        Status: row.status ?? "-",
        "Approval Status": row.approval_status ?? "-",
      };
      const defaultCollectionTime = formatTimeOnly(row.scheduled_time);

      const cps = row.collection_points ?? [];
      const hhs = row.household_collection_points ?? [];

      cps.forEach((cp) => {
        out.push({
          ...base,
          "Point Type": "Collection Point",
          "Collection Point / Customer": cp.collection_point?.cp_name ?? cp.collection_point_id ?? "-",
          Bin: cp.bin?.bin_name ?? cp.bin_id ?? "-",
          "Collected Weight (kg)": cp.collected_weight_kg ?? "-",
          "Collection Time": cp.collected_at ? formatCollectionTime(cp.collected_at) : defaultCollectionTime,
          "Is Collected": cp.is_collected ? "Yes" : "No",
        });
      });

      hhs.forEach((hh) => {
        out.push({
          ...base,
          "Point Type": "Household",
          "Collection Point / Customer": hh.customer?.customer_name ?? hh.customer_id ?? "-",
          Bin: "-",
          "Collected Weight (kg)": hh.collected_weight_kg ?? "-",
          "Collection Time": hh.collected_at ? formatCollectionTime(hh.collected_at) : defaultCollectionTime,
          "Is Collected": hh.is_collected ? "Yes" : "No",
        });
      });

      if (cps.length === 0 && hhs.length === 0) {
        out.push({
          ...base,
          "Point Type": "-",
          "Collection Point / Customer": "-",
          Bin: "-",
          "Collected Weight (kg)": "-",
          "Collection Time": defaultCollectionTime,
          "Is Collected": "-",
        });
      }
    });
    return out;
  };

  const handleDownload = (format: "excel" | "pdf") => {
    setIsExporting(true);
    try {
      const exportRows = buildExportRows(filteredRows.length > 0 ? filteredRows : rows);
      if (exportRows.length === 0) {
        Swal.fire({ icon: "warning", title: "No records", text: "There are no daily trip plans to export." });
        return;
      }
      if (format === "excel") {
        exportRecordsToExcel(exportRows, getAdminScreenExcelFilename("all"), "Daily Trip Plans");
      } else {
        downloadRecordsPdf({
          title: "Daily Trip Plans",
          filename: "daily_trip_plans.pdf",
          rows: exportRows,
          columns: Object.keys(exportRows[0]).map((key) => ({ key, label: key })),
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: t("common.error"), text: err?.message ?? String(err) });
    } finally {
      setIsExporting(false);
    }
  };

  /* ── detailed per-stop report with a QR code per collection point /
     customer — one PDF page per stop, mirrors the reference tniwms report.
     Re-fetches the full bin/customer record per stop for richer detail than
     the inline assignment payload carries. ── */
  const handleDetailedPdfDownload = async () => {
    setIsExportingDetailed(true);
    try {
      const source = filteredRows.length > 0 ? filteredRows : rows;
      if (source.length === 0) {
        Swal.fire({ icon: "warning", title: "No records", text: "There are no daily trip plans to export." });
        return;
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let hasPage = false;
      const addPage = () => {
        if (hasPage) pdf.addPage();
        hasPage = true;
      };

      // Company/project names for the current assignment — resolved from the
      // already-loaded dropdown option lists (assignments only carry IDs).
      const resolveCompanyProject = (row: DailyTripAssignmentRecord) => {
        const rowCompanyId = row.company_unique_id ?? row.company_id ?? companyUniqueId;
        const rowProjectId = row.project_unique_id ?? row.project_id ?? projectId;
        const companyLabel = companies.find((c) => c.value === rowCompanyId)?.label ?? "-";
        const projectLabel = projects.find((p) => p.value === rowProjectId)?.label ?? "-";
        return { companyLabel, projectLabel };
      };

      const drawDetails = (
        title: string,
        subtitle: string,
        details: Array<[string, unknown]>,
        qrValue?: string,
      ) => {
        addPage();
        const qrBottom = 18 + 34;
        const qrLeft = 158;
        const labelX = 18;
        const valueX = 62;
        const fullValueWidth = 125;
        const narrowValueWidth = qrLeft - valueX - 4;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text(title, 18, 20);
        pdf.setFontSize(10);
        pdf.text(subtitle || "-", 18, 29, { maxWidth: qrValue ? 130 : 175 });
        if (qrValue) drawQrCode(pdf, qrValue, qrLeft, 18, 34);
        let y = Math.max(52, qrValue ? qrBottom + 6 : 52);
        pdf.setFontSize(9.5);
        const lineHeight = 4.2;
        const labelWidth = valueX - labelX - 4;
        details.forEach(([label, rawValue]) => {
          const value =
            rawValue === null || rawValue === undefined || rawValue === ""
              ? "-"
              : String(rawValue);
          const wrapWidth = qrValue && y < qrBottom ? narrowValueWidth : fullValueWidth;
          pdf.setFont("helvetica", "bold");
          const labelLines = pdf.splitTextToSize(`${label}:`, labelWidth) as string[];
          pdf.setFont("helvetica", "normal");
          const valueLines = pdf.splitTextToSize(value, wrapWidth) as string[];
          const rowHeight = Math.max(8, Math.max(labelLines.length, valueLines.length) * lineHeight + 3);
          if (y + rowHeight > 282) {
            pdf.addPage();
            y = 20;
          }
          pdf.setFont("helvetica", "bold");
          pdf.text(labelLines, labelX, y);
          pdf.setFont("helvetica", "normal");
          pdf.text(valueLines, valueX, y);
          y += rowHeight;
        });
      };

      for (const row of source) {
        const { companyLabel, projectLabel } = resolveCompanyProject(row);
        drawDetails(
          "Daily Trip Plan — Route Summary",
          row.unique_id,
          [
            ["Trip Plan", row.trip_plan?.display_code ?? row.trip_plan_id ?? "-"],
            ["Company", companyLabel],
            ["Project", projectLabel],
            ["Panchayat / Local Body", locationText(row)],
            ["Zone", zoneText(row)],
            ["Ward", wardText(row)],
            ["Collection Type", COLLECTION_TYPE_LABELS[getCollectionTypeKey(row)]],
            ["Waste Types", wasteTypeText(row)],
            [
              "Effective Staff",
              row.effective_staff?.display_code ??
                row.staff_template?.display_code ??
                row.staff_template_id ??
                "-",
            ],
            ["Total Route Stops", (row.collection_points?.length ?? 0) + (row.household_collection_points?.length ?? 0)],
            ["Bin Stops", row.collection_points?.length ?? 0],
            ["Household / Bulk Stops", row.household_collection_points?.length ?? 0],
            ["Trip Date", row.trip_date ?? "-"],
            ["Scheduled Time", formatTimeOnly(row.scheduled_time)],
            ["Actual Start", formatTimeOnly(row.actual_start_time)],
            ["Actual End", formatTimeOnly(row.actual_end_time)],
            ["Status", row.status ?? "-"],
            ["Approval", (row as any).approval_status ?? "-"],
            ["Remarks", row.remarks ?? "-"],
          ],
          JSON.stringify({ daily_trip_assignment_id: row.unique_id }),
        );

        for (const stop of row.household_collection_points ?? []) {
          let customer: Record<string, any> = stop.customer ?? {};
          const customerId = stop.customer_id ?? stop.customer?.unique_id;
          if (customerId) {
            try {
              customer = (await customerCreationApi.read(customerId)) as Record<string, any>;
            } catch {
              // The inline assignment payload still provides the essential fallback details.
            }
          }
          const address = [customer.building_no, customer.street, customer.area, customer.pincode]
            .filter(Boolean)
            .join(", ");
          const localBody = customer.panchayat_name ?? locationText(row);
          const familyMembers = Array.isArray(customer.family_members)
            ? customer.family_members
                .map((member: Record<string, unknown>) => member.member_name ?? member.name)
                .filter(Boolean)
                .join(", ")
            : "-";
          const customerWasteTypes = Array.isArray(customer.waste_types)
            ? customer.waste_types
                .map((wasteType: Record<string, unknown>) => wasteType.waste_type_name ?? wasteType.name)
                .filter(Boolean)
                .join(", ")
            : "-";

          drawDetails(
            (stop as any).collection_type === "bulk_waste_collection"
              ? "Bulk-Waste Customer Stop"
              : "Household Customer Stop",
            `${stop.sequence ?? "-"}. ${customer.customer_name ?? customerId ?? "Customer"}`,
            [
              ["Customer ID", customer.unique_id ?? customerId],
              ["Customer Name", customer.customer_name],
              ["Contact Number", customer.contact_no],
              ["Company", customer.company_name ?? companyLabel],
              ["Project", customer.project_name ?? projectLabel],
              ["State", customer.state_name],
              ["District", customer.district_name],
              ["City", customer.city_name],
              ["Zone", customer.zone_name ?? zoneText(row)],
              ["Panchayat", customer.panchayat_name ?? locationText(row)],
              ["Ward", customer.ward_name ?? wardText(row)],
              ["Property", customer.property_name],
              ["Sub Property", customer.sub_property_name],
              ["Address", address],
              [
                "Apartment / Block / Flat",
                [customer.apartment_name, customer.block_no, customer.flat_no].filter(Boolean).join(" / "),
              ],
              ["Local Body", localBody],
              ["Latitude / Longitude", [customer.latitude, customer.longitude].filter(Boolean).join(", ")],
              ["ID Proof Type", customer.id_proof_type],
              ["ID Number", customer.id_no],
              ["Property Area (sq. ft.)", customer.sqft],
              ["Water Consumption (LPD)", customer.water_consumption_lpd],
              ["Expected Waste (kg/day)", customer.waste_collection_kg_per_day],
              ["Waste Types", customerWasteTypes],
              ["Member Count", customer.member_count],
              ["Family Members", familyMembers],
              ["Bulk-Waste Generator", customer.is_bulkwaste_generator ? "Yes" : "No"],
              ["Sequence", stop.sequence],
              ["Collection Status", stop.status],
              ["Collected", stop.is_collected ? "Yes" : "No"],
              ["Collected Weight (kg)", stop.collected_weight_kg],
            ],
            JSON.stringify({ id: customer.unique_id ?? customerId }),
          );
        }

        for (const stop of row.collection_points ?? []) {
          let bin: Record<string, any> = stop.bin ?? {};
          const binId = stop.bin_id ?? stop.bin?.unique_id;
          if (binId) {
            try {
              bin = (await binApi.read(binId)) as Record<string, any>;
            } catch {
              // Fall back to the assignment's inline bin and collection-point details.
            }
          }
          const collectionPoint: Record<string, any> = stop.collection_point ?? {};
          drawDetails(
            "Secondary Bin Collection Stop",
            `${stop.sequence ?? "-"}. ${collectionPoint.cp_name ?? "Collection Point"}`,
            [
              ["Collection Point ID", collectionPoint.unique_id ?? stop.collection_point_id],
              ["Collection Point", collectionPoint.cp_name],
              ["Bin ID", bin.unique_id ?? binId],
              ["Bin Name", bin.bin_name ?? stop.bin?.bin_name],
              ["Bin Type", bin.bin_type],
              ["Bin Capacity", bin.bin_capacity],
              ["Waste Type", bin.wastetype_name ?? bin.waste_type_name],
              ["Company", bin.company_name ?? companyLabel],
              ["Project", bin.project_name ?? projectLabel],
              ["District", bin.district_name],
              ["City", bin.city_name],
              ["Zone", bin.zone_name ?? zoneText(row)],
              ["Panchayat", bin.panchayat_name ?? locationText(row)],
              ["Ward", bin.ward_name ?? wardText(row)],
              [
                "Latitude / Longitude",
                [bin.latitude, bin.longitude].filter(Boolean).join(", "),
              ],
              ["Sequence", stop.sequence],
              ["Collection Status", stop.status],
              ["Collected", stop.is_collected ? "Yes" : "No"],
              ["Collected Weight (kg)", stop.collected_weight_kg],
              ["Collected At", stop.collected_at ? formatCollectionTime(stop.collected_at) : "-"],
              ["Status Reason", (stop as any).status_reason],
            ],
            String(bin.unique_id ?? binId ?? collectionPoint.unique_id ?? stop.collection_point_id ?? ""),
          );
        }
      }

      pdf.save("daily_trip_plans_detailed.pdf");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: err?.message ?? "Failed to generate the detailed trip-plan PDF.",
      });
    } finally {
      setIsExportingDetailed(false);
    }
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-3">
      <FilterBar hideSearch searchValue="" onSearchChange={() => {}}>
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          placeholder="All Companies"
          options={companies}
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          options={projects}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
        <FilterBarSelect
          value={collectionTypeFilter}
          onChange={(value) => setCollectionTypeFilter(value as "all" | CollectionTypeKey)}
          options={[
            { value: "all", label: "All Types" },
            { value: "bin", label: "Bin Collection" },
            { value: "household", label: "Household" },
            { value: "both", label: "Bin + Household" },
          ]}
        />
      </FilterBar>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={(value) =>
          onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
        }
        searchPlaceholder="Search assignments..."
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              label={isExporting ? "Exporting..." : "Download Excel"}
              icon="pi pi-file-excel"
              className="p-button-outlined p-button-sm"
              disabled={isExporting}
              onClick={() => handleDownload("excel")}
            />
            <Button
              label={isExporting ? "Exporting..." : "Download PDF"}
              icon="pi pi-file-pdf"
              className="p-button-outlined p-button-sm"
              disabled={isExporting}
              onClick={() => handleDownload("pdf")}
            />
            <Button
              label={isExportingDetailed ? "Generating..." : "Detailed Report (QR)"}
              icon="pi pi-qrcode"
              className="p-button-outlined p-button-sm"
              disabled={isExportingDetailed}
              onClick={handleDetailedPdfDownload}
              title="One page per collection point / customer stop, with a QR code"
            />
          </div>
        }
      />
    </div>
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Daily Trip Plans</h1>
          <p className="text-sm text-gray-500">Manage daily trip plans with assigned collection points</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            Trip Date
            <input
              type="date"
              value={schedulerDate}
              onChange={(event) => setSchedulerDate(event.target.value)}
              className="rounded border px-3 py-2 text-sm"
              title="Trip date filter and manual scheduler date"
            />
          </label>

          <Button
            label={isSchedulerRunning ? "Running..." : "Run Scheduler"}
            icon="pi pi-clock"
            className="p-button-outlined"
            disabled={isSchedulerRunning}
            onClick={runSchedulerNow}
          />

          <Button
            label="New Daily Trip Plan"
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-gray-800">Auto Generate Daily Trips</span>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={schedulerEnabled}
              onChange={(event) => setSchedulerEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Enabled
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            Auto generate at
            <input
              type="time"
              value={schedulerRunTime}
              onChange={(event) => setSchedulerRunTime(event.target.value)}
              className="rounded border px-2 py-1 text-sm"
            />
          </label>
          <Button
            label={isSavingSchedulerConfig ? "Saving..." : "Save Schedule"}
            icon="pi pi-save"
            className="p-button-sm p-button-outlined"
            disabled={isSavingSchedulerConfig}
            onClick={saveSchedulerConfig}
          />
          <Button
            label={isGeneratingDaily ? "Generating..." : "Generate Daily"}
            icon="pi pi-calendar-plus"
            className="p-button-sm p-button-success"
            disabled={isGeneratingDaily}
            onClick={runGenerateDailyNow}
            title="Manually run the approved, repeat-day-matched auto-assign plans for the selected date (generate-daily action)"
          />
          <span className="text-gray-400">|</span>
          <span>Job: {schedulerStatus?.enabled ? "Enabled" : "Disabled"} at {schedulerStatus?.run_time ?? schedulerRunTime}</span>
          {schedulerStatus?.next_run_at && (
            <span>Next run: {new Date(schedulerStatus.next_run_at).toLocaleString()}</span>
          )}
          {schedulerStatus?.last_run_at && (
            <span>
              Last run: {new Date(schedulerStatus.last_run_at).toLocaleString()}
              {schedulerStatus.last_run_mode ? ` (${schedulerStatus.last_run_mode})` : ""}
            </span>
          )}
          {schedulerStatus?.last_auto_run_at && (
            <span>Last auto: {new Date(schedulerStatus.last_auto_run_at).toLocaleString()}</span>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          This is the cron-like generation time. Trip start time is managed separately on the Trip Plan or Daily Trip record.
        </p>
        {schedulerStatus?.last_error && (
          <p className="mt-2 font-medium text-red-600">{schedulerStatus.last_error}</p>
        )}
      </div>

      <DataTable
        value={rows}
        exportRows={filteredRows}
        onValueChange={(value) => setFilteredRows(value as DailyTripAssignmentRecord[])}
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
        loading={isLoading}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        exportable={false}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip assignments found. Select a company and project to load data."
        globalFilterFields={[
          "unique_id",
          "_trip_plan",
          "_staff",
          "_zone",
          "_ward",
          "_location",
          "_waste",
          "_collection_type_label",
          "_collection_point_count",
          "status",
          "approval_status",
          "trip_date",
          "scheduled_time",
        ]}
        transformServerRows={(serverRows) => {
          const records = serverRows as DailyTripAssignmentRecord[];
          return records.map((rec) => ({
            ...rec,
            _trip_plan: rec.trip_plan?.display_code ?? rec.trip_plan_id ?? "",
            _staff:
              rec.effective_staff?.display_code ??
              rec.staff_template?.display_code ??
              rec.staff_template_id ??
              "",
            _zone: zoneText(rec),
            _ward: wardText(rec),
            _location: locationText(rec),
            _waste: wasteTypeText(rec),
            _collection_type: getCollectionTypeKey(rec),
            _collection_type_label: COLLECTION_TYPE_LABELS[getCollectionTypeKey(rec)],
            _collection_point_count: String(
              (Array.isArray(rec.collection_points) ? rec.collection_points.length : 0) +
              (Array.isArray(rec.household_collection_points) ? rec.household_collection_points.length : 0),
            ),
          }));
        }}
      >
        <Column header={t("common.s_no")} body={(_: any, { rowIndex }: any) => rowIndex + 1} style={{ width: 60 }} />
        <Column field="unique_id" header="ID" filter showFilterMatchModes={false} style={{ minWidth: 160 }} />
        <Column
          field="_trip_plan"
          header="Trip Plan"
          body={(row: DailyTripAssignmentRecord) => row.trip_plan?.display_code ?? row.trip_plan_id ?? "—"}
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
          field="_zone"
          header="Zone"
          body={(row: any) => row._zone || "—"}
          filter showFilterMatchModes={false}
        />
        <Column
          field="_ward"
          header="Ward"
          body={(row: any) => row._ward || "—"}
          filter showFilterMatchModes={false}
        />
        <Column
          field="_location"
          header="Location"
          filter
          showFilterMatchModes={false}
          style={{ minWidth: 170 }}
          body={(row: DailyTripAssignmentRecord) => {
            if (row.panchayat?.panchayat_name) {
              return (
                <span className="text-sm text-gray-800">
                  {row.panchayat.panchayat_name}
                  <span className="ml-1 text-xs text-indigo-500 font-medium">(PLB)</span>
                </span>
              );
            }
            if ((row.ward as any)?.ward_name) {
              return (
                <span className="text-sm text-gray-800">
                  {(row.ward as any).ward_name}
                  <span className="ml-1 text-xs text-teal-500 font-medium">(Ward)</span>
                </span>
              );
            }
            return <span className="text-sm text-gray-400">—</span>;
          }}
        />
 
        <Column
          field="_collection_type_label"
          header="Collection Type"
          body={(row: DailyTripAssignmentRecord) => <CollectionTypeBadge rec={row} />}
          filter
          showFilterMatchModes={false}
          style={{ minWidth: 150 }}
        />
        <Column
          field="_collection_point_count"
          header="Collection Points"
          body={(row: DailyTripAssignmentRecord) =>
            (Array.isArray(row.collection_points) ? row.collection_points.length : 0) +
            (Array.isArray(row.household_collection_points) ? row.household_collection_points.length : 0)
          }
          filter
          showFilterMatchModes={false}
          style={{ width: 150 }}
        />
        <Column
          field="trip_date"
          header="Trip Date"
          filter showFilterMatchModes={false}
          sortable={SORTABLE_FIELDS.has("trip_date")}
          style={{ minWidth: 110 }}
        />
        <Column
          field="scheduled_time"
          header="Start Time"
          filter showFilterMatchModes={false}
          sortable={SORTABLE_FIELDS.has("scheduled_time")}
          style={{ minWidth: 110 }}
        />
        <Column
          field="status"
          header="Status"
          body={statusTemplate}
          filter showFilterMatchModes={false}
          sortable={SORTABLE_FIELDS.has("status")}
          style={{ minWidth: 160 }}
        />
        <Column
          field="actual_start_time"
          header="Actual Start"
          body={(row: DailyTripAssignmentRecord) => formatTimeOnly(row.actual_start_time)}
          style={{ minWidth: 110 }}
        />
        <Column
          field="actual_end_time"
          header="Actual End"
          body={(row: DailyTripAssignmentRecord) => formatTimeOnly(row.actual_end_time)}
          style={{ minWidth: 110 }}
        />
        <Column
          header="Breakdown"
          body={(row: DailyTripAssignmentRecord) => <BreakdownCell row={row} />}
          style={{ minWidth: 180 }}
        />
        <Column
          header="Re-Trip"
          body={(row: DailyTripAssignmentRecord) => <RetripCell retrip={row.retrip_info} />}
          style={{ minWidth: 150 }}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 80 }} />
      </DataTable>

      <Dialog open={Boolean(retripRow)} onOpenChange={(open) => !open && closeRetripModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Close &amp; Start Next Trip</DialogTitle>
          </DialogHeader>
          {retripRow && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This ends <span className="font-medium">{retripRow.unique_id}</span> now and opens
                a new trip carrying the remaining stops.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="retrip-remarks">Reason *</Label>
                <Textarea
                  id="retrip-remarks"
                  value={retripRemarks}
                  onChange={(e) => setRetripRemarks(e.target.value)}
                  placeholder="Why is this trip being closed early?"
                  rows={3}
                  disabled={isRetripSubmitting}
                />
              </div>
              {retripIsBinTrip && (
                <div className="space-y-1.5">
                  <Label>Stops to carry over to the next trip</Label>
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
                    {retripPendingCps.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No pending stops left.</p>
                    ) : (
                      retripPendingCps.map((cp) => (
                        <label
                          key={cp.unique_id}
                          className="flex items-center gap-2 py-1 text-sm"
                        >
                          <Checkbox
                            checked={cp.unique_id ? retripSelectedCps.has(cp.unique_id) : false}
                            onCheckedChange={(checked) =>
                              cp.unique_id && toggleRetripCp(cp.unique_id, checked === true)
                            }
                            disabled={isRetripSubmitting}
                          />
                          {cp.collection_point?.cp_name ?? cp.collection_point_id ?? cp.unique_id}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              label={t("common.cancel")}
              severity="secondary"
              onClick={closeRetripModal}
              disabled={isRetripSubmitting}
            />
            <Button
              label={isRetripSubmitting ? t("common.saving") : "Close & Start Next Trip"}
              onClick={submitRetrip}
              disabled={isRetripSubmitting}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
