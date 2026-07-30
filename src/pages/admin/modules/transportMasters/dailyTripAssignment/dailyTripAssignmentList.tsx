import type { DailyTripAssignmentRecord } from "./types";
import type { CollectionTypeKey } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
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
import { api } from "@/api";
import { adminEndpoints } from "@/helpers/admin/endpoints";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";

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

  const [allAssignments, setAllAssignments] = useState<DailyTripAssignmentRecord[]>([]);
  const [filteredRows, setFilteredRows] = useState<DailyTripAssignmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [isSavingSchedulerConfig, setIsSavingSchedulerConfig] = useState(false);
  const [schedulerDate, setSchedulerDate] = useState(toDateInputValue());
  const [schedulerRunTime, setSchedulerRunTime] = useState("04:00");
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | CollectionTypeKey>("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
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

  const loadAssignments = useCallback(() => {
    if (!companyUniqueId && !isSuperAdmin) return;
    let mounted = true;
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (schedulerDate) params.date = schedulerDate;
    dailyTripAssignmentApi.readAll({ params })
      .then((assignmentData) => {
        if (!mounted) return;
        setAllAssignments(Array.isArray(assignmentData) ? assignmentData as DailyTripAssignmentRecord[] : []);
      })
      .catch((err) => { if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? String(err) }); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, schedulerDate, isSuperAdmin, t]);

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
  // Company/project scoping is now applied server-side via params in
  // loadAssignments — no client-side narrowing needed here.
  const rows = (() => {
    if (!companyUniqueId && !isSuperAdmin) return [];
    return allAssignments
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
        _collection_point_count: String(Array.isArray(rec.collection_points) ? rec.collection_points.length : 0),
      }));
  })();

  // Keeps the exported Excel rows in sync with whatever the table is
  // currently displaying (global search + column filters), not the full
  // unfiltered `rows` array — SafeDataTable's own export otherwise exports
  // the raw `value` prop as-is.
  useEffect(() => {
    setFilteredRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAssignments, companyUniqueId, isSuperAdmin, schedulerDate, collectionTypeFilter]);

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

  const renderHeader = () => (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={(value) =>
        onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
      }
      searchPlaceholder="Search assignments..."
    >
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
          body={(row: DailyTripAssignmentRecord) => Array.isArray(row.collection_points) ? row.collection_points.length : 0}
          sortable
          filter
          showFilterMatchModes={false}
          style={{ width: 150 }}
        />
        <Column field="trip_date" header="Trip Date" filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column field="scheduled_time" header="Start Time" filter showFilterMatchModes={false} style={{ minWidth: 110 }} />
        <Column
          field="status"
          header="Status"
          body={statusTemplate}
          filter showFilterMatchModes={false}
          style={{ minWidth: 160 }}
        />
        <Column
          header="Breakdown"
          body={(row: DailyTripAssignmentRecord) => <BreakdownCell row={row} />}
          style={{ minWidth: 180 }}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 80 }} />
      </DataTable>
    </div>
  );
}
