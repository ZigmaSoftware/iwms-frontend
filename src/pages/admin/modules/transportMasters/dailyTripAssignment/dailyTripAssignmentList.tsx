import type { DailyTripAssignmentRecord } from "./types";
import type { CollectionTypeKey } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { renderListSearchHeader } from "@/utils/listSearchHeader";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { dailyTripAssignmentApi } from "@/helpers/admin";

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

const normalizeId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeId(record.unique_id ?? record.id ?? record.value);
  }
  return String(value).trim();
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

type SchedulerStatus = {
  enabled?: boolean;
  run_time?: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_error?: string | null;
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
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [allAssignments, setAllAssignments] = useState<DailyTripAssignmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [schedulerDate, setSchedulerDate] = useState(toDateInputValue());
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | CollectionTypeKey>("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _trip_plan: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _staff: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    _location: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    trip_date: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  const loadAssignments = useCallback(() => {
    if (!companyUniqueId && !isSuperAdmin) return;
    let mounted = true;
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    dailyTripAssignmentApi.readAll({ params })
      .then((assignmentData) => {
        if (!mounted) return;
        setAllAssignments(Array.isArray(assignmentData) ? assignmentData as DailyTripAssignmentRecord[] : []);
      })
      .catch((err) => { if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? String(err) }); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, isSuperAdmin, t]);

  const loadSchedulerStatus = useCallback(() => {
    dailyTripAssignmentApi
      .action<SchedulerStatus>("scheduler-status")
      .then(setSchedulerStatus)
      .catch(() => setSchedulerStatus(null));
  }, []);

  useEffect(() => loadAssignments(), [loadAssignments]);
  useEffect(() => loadSchedulerStatus(), [loadSchedulerStatus]);

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
      loadAssignments();
    } catch (err) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? "Scheduler failed" });
    } finally {
      setIsSchedulerRunning(false);
    }
  };

  /* ── enrich + filter rows ── */
  const rows = (() => {
    if (!companyUniqueId && !isSuperAdmin) return [];
    return allAssignments
      .filter((row) => {
        const rc = normalizeId(row.company_id ?? row.company_unique_id);
        const rp = normalizeId(row.project_id ?? row.project_unique_id);
        if (!(!companyUniqueId || rc === companyUniqueId)) return false;
        if (!(!projectId || rp === projectId)) return false;
        if (collectionTypeFilter !== "all" && getCollectionTypeKey(row) !== collectionTypeFilter) return false;
        return true;
      })
      .map((rec) => ({
        ...rec,
        _trip_plan: rec.trip_plan?.display_code ?? rec.trip_plan_id ?? "",
        _staff: rec.effective_staff?.display_code ?? rec.staff_template?.display_code ?? rec.staff_template_id ?? "",
        _location: rec.panchayat?.panchayat_name ?? (rec.ward as any)?.ward_name ?? rec.panchayat_id ?? rec.ward_id ?? "",
        _waste: wasteTypeText(rec),
        _collection_type: getCollectionTypeKey(rec),
        _collection_point_count: String(Array.isArray(rec.collection_points) ? rec.collection_points.length : 0),
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
      </div>
    );
  };

  const renderHeader = () =>
    renderListSearchHeader({
      value: globalFilterValue,
      onChange: onGlobalFilterChange,
      placeholder: "Search assignments...",
    });

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Daily Trip Plans</h1>
          <p className="text-sm text-gray-500">Manage daily trip plans with assigned collection points</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            value={collectionTypeFilter}
            onChange={(e) => setCollectionTypeFilter(e.target.value as "all" | CollectionTypeKey)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="bin">Bin Collection</option>
            <option value="household">Household</option>
            <option value="both">Bin + Household</option>
          </select>

          <input
            type="date"
            value={schedulerDate}
            onChange={(event) => setSchedulerDate(event.target.value)}
            className="rounded border px-3 py-2 text-sm"
            title="Scheduler date"
          />

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

      <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
        Scheduler: {schedulerStatus?.enabled ? "Enabled" : "Disabled"}
        <span className="mx-2 text-gray-400">|</span>
        Runs daily at {schedulerStatus?.run_time ?? "04:00"}
        {schedulerStatus?.next_run_at && (
          <>
            <span className="mx-2 text-gray-400">|</span>
            Next run: {new Date(schedulerStatus.next_run_at).toLocaleString()}
          </>
        )}
        {schedulerStatus?.last_run_at && (
          <>
            <span className="mx-2 text-gray-400">|</span>
            Last run: {new Date(schedulerStatus.last_run_at).toLocaleString()}
          </>
        )}
        {schedulerStatus?.last_error && (
          <span className="ml-2 font-medium text-red-600">{schedulerStatus.last_error}</span>
        )}
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
        globalFilterFields={["unique_id", "_trip_plan", "_staff", "_location", "_waste", "_collection_point_count", "status", "approval_status", "trip_date"]}
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
        {/* <Column
          field="_waste"
          header="Waste Type"
          body={(row: DailyTripAssignmentRecord) => wasteTypeText(row)}
        /> */}
        <Column
          field="_collection_type"
          header="Collection Type"
          body={(row: DailyTripAssignmentRecord) => <CollectionTypeBadge rec={row} />}
          style={{ minWidth: 150 }}
        />
        <Column
          field="_collection_point_count"
          header="Collection Points"
          body={(row: DailyTripAssignmentRecord) => Array.isArray(row.collection_points) ? row.collection_points.length : 0}
          sortable
          style={{ width: 150 }}
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
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 80 }} />
      </DataTable>
    </div>
  );
}
