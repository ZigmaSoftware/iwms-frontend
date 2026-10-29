import type {
  StaticRouteAuditDetail as DetailRecord,
  StaticRouteAuditFilterOptions,
  StaticRouteAuditRecord,
} from "./types";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { staticRouteAuditApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { StackCell } from "@/components/common/TableCells";
import { FormSelect } from "@/components/common/FormSelect";
import { FilterSection } from "@/components/common/ListToolbar";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import { combineFilters } from "@/components/filters/useOptionFilter";
import StaticRouteAuditDetail from "./StaticRouteAuditDetail";

const SORTABLE_FIELDS = new Set(["timestamp", "change_type", "distance_change_meters", "new_version"]);

const toRecordList = (value: unknown): StaticRouteAuditRecord[] => {
  if (Array.isArray(value)) return value as StaticRouteAuditRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: StaticRouteAuditRecord[] }).results;
  }
  return [];
};

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : "-");

const formatKm = (meters?: number | null) =>
  meters == null ? "-" : `${(meters / 1000).toFixed(2)} km`;

const nameOf = (options: { label: string; value: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const StatTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-semibold text-gray-800">{value}</div>
  </div>
);

const CHANGE_COLORS: Record<string, string> = {
  CREATED: "bg-green-50 text-green-700",
  DETOUR_ADDED: "bg-blue-50 text-blue-700",
  DETOUR_MOVED: "bg-amber-50 text-amber-700",
  DETOUR_REMOVED: "bg-red-50 text-red-700",
  STOPS_CHANGED: "bg-purple-50 text-purple-700",
  ROUTE_CHANGED: "bg-orange-50 text-orange-700",
  RESAVED: "bg-gray-100 text-gray-600",
};

export default function StaticRouteAuditList() {
  const { t } = useTranslation();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptions, setFilterOptions] = useState<StaticRouteAuditFilterOptions | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<DetailRecord | null>(null);
  const [records, setRecords] = useState<StaticRouteAuditRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);

  const loading = isLoading && records.length === 0;

  const companyOptions = useMemo(
    () => (filterOptions?.companies ?? []).map((c) => ({ label: c.name, value: c.unique_id })),
    [filterOptions],
  );
  const projectOptions = useMemo(
    () => (filterOptions?.projects ?? []).map((p) => ({ label: p.name, value: p.unique_id })),
    [filterOptions],
  );
  const planOptions = useMemo(
    () => (filterOptions?.trip_plans ?? []).map((p) => ({ label: p.name, value: p.unique_id })),
    [filterOptions],
  );
  const changeTypeOptions = useMemo(
    () => (filterOptions?.change_types ?? []).map((c) => ({ label: c.name, value: c.unique_id })),
    [filterOptions],
  );
  const triggerOptions = useMemo(
    () => (filterOptions?.triggers ?? []).map((c) => ({ label: c.name, value: c.unique_id })),
    [filterOptions],
  );

  // Company → Project → Trip plan, Deviation type and Trigger, edited in the
  // Filters panel as a draft and sent once applied.
  const scope = useDraftFilter({
    empty: { company: "", project: "", plan: "", changeType: "", trigger: "" },
    chips: {
      company: { label: "Company", format: (v) => nameOf(companyOptions, v), clears: ["project", "plan"] },
      project: { label: "Project", format: (v) => nameOf(projectOptions, v), clears: ["plan"] },
      plan: { label: "Trip plan", format: (v) => nameOf(planOptions, v) },
      changeType: { label: "Deviation type", format: (v) => nameOf(changeTypeOptions, v) },
      trigger: { label: "Trigger", format: (v) => nameOf(triggerOptions, v) },
    },
    onAppliedChange: () => setFirst(0),
  });
  const {
    company: companyFilter,
    project: projectFilter,
    plan: planFilter,
    changeType: changeTypeFilter,
    trigger: triggerFilter,
  } = scope.applied;
  const draft = scope.draft;

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField) ? `${sortOrder === -1 ? "-" : ""}${sortField}` : undefined;

  const queryParams = useMemo(
    () => ({
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(companyFilter ? { company_id: companyFilter } : {}),
      ...(projectFilter ? { project_id: projectFilter } : {}),
      ...(planFilter ? { trip_plan_id: planFilter } : {}),
      ...(changeTypeFilter ? { change_type: changeTypeFilter } : {}),
      ...(triggerFilter ? { trigger: triggerFilter } : {}),
    }),
    [searchTerm, companyFilter, projectFilter, planFilter, changeTypeFilter, triggerFilter],
  );

  const loadRows = useCallback(
    async (page: number, limit: number, params: Record<string, string>) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const response = await staticRouteAuditApi.readAllwithPaginated(page, limit, { params });
        if (requestId !== requestIdRef.current) return;
        const rows = toRecordList(response);
        setRecords(rows);
        setTotalRecords(typeof response?.count === "number" ? response.count : rows.length);
      } catch {
        if (requestId !== requestIdRef.current) return;
        Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, {
      ...queryParams,
      ...(ordering ? { ordering } : {}),
    });
  }, [first, rowsPerPage, queryParams, ordering, loadRows]);

  useEffect(() => {
    let mounted = true;
    const loadFilterOptions = async () => {
      try {
        const data = (await staticRouteAuditApi.read("filter-options", {
          params: draft.company ? { company_id: draft.company } : {},
        })) as unknown as StaticRouteAuditFilterOptions;
        if (mounted && data) setFilterOptions(data);
      } catch {
        // Non-fatal
      }
    };
    void loadFilterOptions();
    return () => {
      mounted = false;
    };
  }, [draft.company]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const serverExport = (filename: string, sheetName: string) =>
    staticRouteAuditApi.exportToExcel({ params: queryParams }, filename, sheetName);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const openDetail = useCallback(
    async (row: StaticRouteAuditRecord) => {
      try {
        const detail = (await staticRouteAuditApi.read(String(row.id))) as unknown as DetailRecord;
        setSelectedDetail(detail);
      } catch {
        Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      }
    },
    [t],
  );

  const changeTypeTemplate = useCallback(
    (row: StaticRouteAuditRecord) => (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${CHANGE_COLORS[row.change_type] ?? "bg-gray-100 text-gray-700"}`}>
        {row.change_type_label || row.change_type}
      </span>
    ),
    [],
  );

  const versionTemplate = useCallback(
    (row: StaticRouteAuditRecord) => (
      <span className="font-mono text-xs">
        v{row.previous_version ?? "–"} → <span className="font-semibold">v{row.new_version}</span>
      </span>
    ),
    [],
  );

  const deviationTemplate = useCallback((row: StaticRouteAuditRecord) => {
    const s = row.summary;
    if (!s) return "-";
    const stopDelta = (s.stops_added ?? 0) - (s.stops_removed ?? 0) + (s.stops_moved ?? 0);
    const detourDelta = (s.detours_added ?? 0) - (s.detours_removed ?? 0) + (s.detours_moved ?? 0);
    return (
      <div className="flex flex-col text-xs">
        <span>
          stops <span className="text-green-700">+{s.stops_added ?? 0}</span>/
          <span className="text-red-700">−{s.stops_removed ?? 0}</span>
          {s.stops_moved ? <span className="text-amber-700"> ~{s.stops_moved}</span> : null}
          {s.stops_reordered ? <span className="text-blue-700"> ↕</span> : null}
          {stopDelta !== 0 ? <span className="text-gray-500"> ({stopDelta > 0 ? "+" : ""}{stopDelta})</span> : null}
        </span>
        <span>
          detours <span className="text-green-700">+{s.detours_added ?? 0}</span>/
          <span className="text-red-700">−{s.detours_removed ?? 0}</span>
          {s.detours_moved ? <span className="text-amber-700"> ~{s.detours_moved}</span> : null}
          {detourDelta !== 0 ? <span className="text-gray-500"> ({detourDelta > 0 ? "+" : ""}{detourDelta})</span> : null}
        </span>
      </div>
    );
  }, []);

  const distanceTemplate = useCallback(
    (row: StaticRouteAuditRecord) => (
      <div className="flex flex-col text-xs">
        <span>
          {formatKm(row.previous_distance_meters)} → {formatKm(row.new_distance_meters)}
        </span>
        <span className="text-gray-500">
          {row.distance_change_meters == null
            ? ""
            : `${row.distance_change_meters > 0 ? "+" : ""}${Math.round(row.distance_change_meters)} m`}
        </span>
      </div>
    ),
    [],
  );

  const changedOnPage = records.filter((r) => r.change_type !== "RESAVED").length;

  const scopeField = (
    <>
      <FilterSection label="Company & project">
        <div className="grid grid-cols-2 gap-2">
          <FormSelect
            label="Company"
            value={draft.company}
            onChange={(value) => scope.setDraft((d) => ({ ...d, company: value, project: "", plan: "" }))}
            options={companyOptions}
            placeholder={t("common.all")}
          />
          <FormSelect
            label="Project"
            value={draft.project}
            onChange={(value) => scope.setDraft((d) => ({ ...d, project: value, plan: "" }))}
            options={projectOptions}
            placeholder={t("common.all")}
          />
        </div>
      </FilterSection>
      <FilterSection label="Trip plan">
        <FormSelect
          value={draft.plan}
          onChange={(value) => scope.setField("plan", value)}
          options={planOptions}
          placeholder={t("common.all")}
        />
      </FilterSection>
      <FilterSection label="Deviation">
        <div className="grid grid-cols-2 gap-2">
          <FormSelect
            label="Deviation type"
            value={draft.changeType}
            onChange={(value) => scope.setField("changeType", value)}
            options={changeTypeOptions}
            placeholder={t("common.all")}
          />
          <FormSelect
            label="Trigger"
            value={draft.trigger}
            onChange={(value) => scope.setField("trigger", value)}
            options={triggerOptions}
            placeholder={t("common.all")}
          />
        </div>
      </FilterSection>
    </>
  );

  return (
    <div className="p-3">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
              <i className="pi pi-map" />
            </span>
            Route deviations
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Static Route Audit</h1>
          <p className="text-sm text-gray-500">
            Every saved deviation of a trip plan&apos;s static route — previous route vs new route,
            what moved, and which daily trips followed.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total deviations" value={totalRecords.toLocaleString()} />
        <StatTile label="Changed (this page)" value={changedOnPage} />
        <StatTile
          label="Trips moved (this page)"
          value={records.reduce((s, r) => s + (r.affected_trip_count ?? 0), 0)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          header={
            <FilterBar
              searchValue={globalFilterValue}
              onSearchChange={setGlobalFilterValue}
              searchPlaceholder="Search plan code, plan id, user…"
            />
          }
          filterPanel={combineFilters({ ...scope, field: scopeField })}
          onServerExport={serverExport}
          value={records}
          dataKey="id"
          lazy
          paginator
          first={first}
          rows={rowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          totalRecords={totalRecords}
          onPage={onPage}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={onSort}
          loading={loading}
          stripedRows
          showGridlines
          fitWidth
          className="p-datatable-sm"
          emptyMessage="No static route deviations found"
        >
          <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "4%" }} />
          <Column
            field="trip_plan_code"
            header="Trip plan"
            body={(r: StaticRouteAuditRecord) => (
              <StackCell
                primary={r.trip_plan_code || r.trip_plan_id}
                lines={[r.project_name || r.project_id]}
              />
            )}
            style={{ width: "17%" }}
          />
          <Column field="new_version" header="Version" body={versionTemplate} sortable style={{ width: "9%" }} />
          <Column
            field="change_type"
            header="Deviation"
            body={(r: StaticRouteAuditRecord) => (
              <StackCell
                primary={changeTypeTemplate(r)}
                lines={[{ label: "Source", value: r.trigger_label || r.trigger }]}
              />
            )}
            sortable
            style={{ width: "14%" }}
          />
          <Column header="Route deviation" body={deviationTemplate} style={{ width: "19%" }} />
          <Column
            field="distance_change_meters"
            header="Distance"
            body={(r: StaticRouteAuditRecord) => (
              <StackCell
                primary={distanceTemplate(r)}
                lines={[{ label: "Trips", value: String(r.affected_trip_count ?? 0) }]}
              />
            )}
            sortable
            style={{ width: "13%" }}
          />
          <Column
            field="timestamp"
            header="When"
            body={(r: StaticRouteAuditRecord) => (
              <StackCell
                primary={formatDateTime(r.timestamp)}
                lines={[
                  { icon: "pi-user", title: "Updated by", value: r.updated_by_name || r.updated_by },
                ]}
              />
            )}
            sortable
            style={{ width: "16%" }}
          />
          <Column
            header={t("common.actions")}
            body={(row: StaticRouteAuditRecord) => (
              <div className="flex justify-center gap-2">
                <button onClick={() => void openDetail(row)} className="text-blue-600 hover:text-blue-800">
                  Compare
                </button>
              </div>
            )}
            style={{ width: "8%" }}
          />
        </DataTable>
      </div>

      <StaticRouteAuditDetail record={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
}
