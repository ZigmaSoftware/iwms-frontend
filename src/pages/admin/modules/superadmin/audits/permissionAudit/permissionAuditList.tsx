import type {
  PermissionAuditFilterOptions,
  PermissionAuditRecord,
} from "./types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Column } from "primereact/column";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";

import { permissionAuditApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";

const SORTABLE_FIELDS = new Set(["timestamp", "action_type"]);

// Sentinel for "company-wide, belongs to no project" — mirrors the backend,
// since an empty string can't be distinguished from "no filter" in a query.
const NO_PROJECT = "none";

const ACTION_TYPES = ["CREATED", "UPDATED", "DELETED"] as const;

const toRecordList = (value: unknown): PermissionAuditRecord[] => {
  if (Array.isArray(value)) return value as PermissionAuditRecord[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: PermissionAuditRecord[] }).results;
  }
  return [];
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const LabeledFilter = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex w-full flex-col gap-1 sm:w-[240px]">
    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
      {label}
    </label>
    {children}
  </div>
);

const StatTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-semibold text-gray-800">{value}</div>
  </div>
);

export default function PermissionAuditList() {
  const { t } = useTranslation();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [mainscreenFilter, setMainscreenFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [filterOptions, setFilterOptions] =
    useState<PermissionAuditFilterOptions | null>(null);

  const [selectedRecord, setSelectedRecord] =
    useState<PermissionAuditRecord | null>(null);
  const [records, setRecords] = useState<PermissionAuditRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);

  const loading = isLoading && records.length === 0;

  const stateLabel = useCallback(
    (active?: boolean | null) => {
      if (active === true) return t("admin.permission_audit.active");
      if (active === false) return t("admin.permission_audit.inactive");
      return "-";
    },
    [t],
  );

  const companyOptions = useMemo(
    () =>
      (filterOptions?.companies ?? []).map((c) => ({
        label: c.name,
        value: c.unique_id,
      })),
    [filterOptions],
  );

  const projectOptions = useMemo(
    () => [
      { label: t("admin.permission_audit.no_project"), value: NO_PROJECT },
      ...(filterOptions?.projects ?? []).map((p) => ({
        label: p.name,
        value: p.unique_id,
      })),
    ],
    [filterOptions, t],
  );

  const mainscreenOptions = useMemo(
    () =>
      (filterOptions?.mainscreens ?? []).map((m) => ({
        label: m.name,
        value: m.unique_id,
      })),
    [filterOptions],
  );

  const sourceOptions = useMemo(
    () =>
      (filterOptions?.sources ?? []).map((s) => ({
        label: s.name,
        value: s.unique_id,
      })),
    [filterOptions],
  );

  const actionTypeOptions = useMemo(
    () => ACTION_TYPES.map((value) => ({ label: value, value })),
    [],
  );

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const queryParams = useMemo(
    () => ({
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(companyFilter ? { company_id: companyFilter } : {}),
      ...(projectFilter ? { project_id: projectFilter } : {}),
      ...(mainscreenFilter ? { mainscreen_id: mainscreenFilter } : {}),
      ...(sourceFilter ? { source: sourceFilter } : {}),
      ...(actionTypeFilter ? { action_type: actionTypeFilter } : {}),
    }),
    [searchTerm, companyFilter, projectFilter, mainscreenFilter, actionTypeFilter, sourceFilter],
  );

  const loadRows = useCallback(
    async (page: number, limit: number, params: Record<string, string>) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const response = await permissionAuditApi.readAllwithPaginated(
          page,
          limit,
          { params },
        );
        if (requestId !== requestIdRef.current) return;

        const rows = toRecordList(response);
        setRecords(rows);
        setTotalRecords(
          typeof response?.count === "number" ? response.count : rows.length,
        );
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

  // Dropdown choices come from the backend's scoped `filter-options` action,
  // refetched on company change so projects only list that company's.
  useEffect(() => {
    let mounted = true;

    const loadFilterOptions = async () => {
      try {
        const data = (await permissionAuditApi.read("filter-options", {
          params: companyFilter ? { company_id: companyFilter } : {},
        })) as unknown as PermissionAuditFilterOptions;
        if (mounted && data) setFilterOptions(data);
      } catch {
        // Non-fatal: dropdowns simply won't have options if this fails.
      }
    };

    void loadFilterOptions();
    return () => {
      mounted = false;
    };
  }, [companyFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const loadAllExportRows = async () => {
    const data = await permissionAuditApi.readAllForExport({
      params: queryParams,
    });
    return toRecordList(data) as unknown as Record<string, unknown>[];
  };

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const actionTypeTemplate = useCallback((row: PermissionAuditRecord) => {
    const color =
      row.action_type === "DELETED"
        ? "bg-red-50 text-red-700"
        : row.action_type === "CREATED"
          ? "bg-green-50 text-green-700"
          : "bg-amber-50 text-amber-700";
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>
        {row.action_type ?? "-"}
      </span>
    );
  }, []);

  const grantedOnPage = records.filter((r) => r.is_active === true).length;
  const revokedOnPage = records.length - grantedOnPage;

  return (
    <div className="p-3">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
              <i className="pi pi-shield" />
            </span>
            Access history
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.permission_audit.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.permission_audit.list_subtitle")}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label={t("admin.permission_audit.stat_total")}
          value={totalRecords.toLocaleString()}
        />
        <StatTile
          label={`${t("admin.permission_audit.granted")} (${t("admin.permission_audit.this_page")})`}
          value={grantedOnPage}
        />
        <StatTile
          label={`${t("admin.permission_audit.revoked")} (${t("admin.permission_audit.this_page")})`}
          value={revokedOnPage}
        />
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={setGlobalFilterValue}
          searchPlaceholder={t("admin.permission_audit.search_placeholder")}
        >
          <LabeledFilter label={t("admin.permission_audit.source_filter_label")}>
            <FilterBarSelect
              value={sourceFilter}
              onChange={(value) => {
                setFirst(0);
                setSourceFilter(value);
              }}
              options={sourceOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>

          <LabeledFilter label={t("admin.permission_audit.company_filter_label")}>
            <FilterBarSelect
              value={companyFilter}
              onChange={(value) => {
                setFirst(0);
                setCompanyFilter(value);
                // A project belongs to one company, so a stale project filter
                // would silently return nothing after switching company.
                setProjectFilter("");
              }}
              options={companyOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>

          <LabeledFilter label={t("admin.permission_audit.project_filter_label")}>
            <FilterBarSelect
              value={projectFilter}
              onChange={(value) => {
                setFirst(0);
                setProjectFilter(value);
              }}
              options={projectOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>

          <LabeledFilter label={t("admin.permission_audit.main_screen_filter_label")}>
            <FilterBarSelect
              value={mainscreenFilter}
              onChange={(value) => {
                setFirst(0);
                setMainscreenFilter(value);
              }}
              options={mainscreenOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>

          <LabeledFilter label={t("admin.permission_audit.change_type_filter_label")}>
            <FilterBarSelect
              value={actionTypeFilter}
              onChange={(value) => {
                setFirst(0);
                setActionTypeFilter(value);
              }}
              options={actionTypeOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
        </FilterBar>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          loadExportRows={loadAllExportRows}
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
          className="p-datatable-sm"
          emptyMessage={t("admin.permission_audit.empty_message")}
        >
          <Column
            header={t("common.s_no")}
            body={(_, { rowIndex }) => rowIndex + 1}
            style={{ width: 70 }}
          />
          <Column
            field="source_label"
            header={t("admin.permission_audit.source")}
            body={(r: PermissionAuditRecord) => r.source_label ?? "-"}
          />
          <Column
            field="target_name"
            header={t("admin.permission_audit.granted_to")}
            body={(r: PermissionAuditRecord) => r.target_name ?? "-"}
          />
          <Column
            field="company_name"
            header={t("admin.permission_audit.company")}
            body={(r: PermissionAuditRecord) => r.company_name ?? "-"}
          />
          <Column
            field="project_name"
            header={t("admin.permission_audit.project")}
            body={(r: PermissionAuditRecord) => r.project_name ?? "-"}
          />
          <Column
            field="mainscreen_name"
            header={t("admin.permission_audit.main_screen")}
            body={(r: PermissionAuditRecord) => r.mainscreen_name ?? "-"}
          />
          <Column
            field="userscreen_name"
            header={t("admin.permission_audit.sub_screen")}
            body={(r: PermissionAuditRecord) => r.userscreen_name ?? "-"}
          />
          <Column
            field="userscreenaction_name"
            header={t("admin.permission_audit.action")}
            body={(r: PermissionAuditRecord) => r.userscreenaction_name ?? "-"}
          />
          <Column
            header={t("admin.permission_audit.app_or_column")}
            body={(r: PermissionAuditRecord) =>
              r.app_module_name ?? r.column_name ?? "-"
            }
          />
          <Column
            field="action_type"
            header={t("admin.permission_audit.action_type")}
            body={actionTypeTemplate}
            sortable
          />
          <Column
            header={t("admin.permission_audit.previous_state")}
            body={(r: PermissionAuditRecord) => stateLabel(r.previous_is_active)}
          />
          <Column
            header={t("admin.permission_audit.new_state")}
            body={(r: PermissionAuditRecord) => stateLabel(r.is_active)}
          />
          <Column
            field="updated_by_name"
            header={t("admin.permission_audit.updated_by")}
            body={(r: PermissionAuditRecord) => r.updated_by_name ?? "-"}
          />
          <Column
            field="timestamp"
            header={t("admin.permission_audit.timestamp")}
            body={(r: PermissionAuditRecord) => formatDateTime(r.timestamp)}
            sortable
          />
          <Column
            header={t("common.actions")}
            body={(row: PermissionAuditRecord) => (
              <div className="flex justify-center">
                <button
                  title={t("common.view")}
                  onClick={() => setSelectedRecord(row)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {t("common.view")}
                </button>
              </div>
            )}
            style={{ width: 120 }}
          />
        </DataTable>
      </div>

      <Dialog
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.permission_audit.detail_title")}</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["source", selectedRecord.source_label],
                    ["granted_to", selectedRecord.target_name],
                    ["company", selectedRecord.company_name],
                    ["project", selectedRecord.project_name],
                    ["main_screen", selectedRecord.mainscreen_name],
                    ["sub_screen", selectedRecord.userscreen_name],
                    ["action", selectedRecord.userscreenaction_name],
                    [
                      "app_or_column",
                      selectedRecord.app_module_name ?? selectedRecord.column_name,
                    ],
                    ["action_type", selectedRecord.action_type],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-xs text-gray-500">
                      {t(`admin.permission_audit.${key}`)}
                    </div>
                    <div>{value ?? "-"}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left font-medium">
                        {t("admin.permission_audit.field")}
                      </th>
                      <th className="p-2 text-left font-medium">
                        {t("admin.permission_audit.old_value")}
                      </th>
                      <th className="p-2 text-left font-medium">
                        {t("admin.permission_audit.new_value")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-2">{t("admin.permission_audit.active")}</td>
                      <td className="p-2">{stateLabel(selectedRecord.previous_is_active)}</td>
                      <td className="p-2">{stateLabel(selectedRecord.is_active)}</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-2">{t("admin.permission_audit.deleted")}</td>
                      <td className="p-2">
                        {selectedRecord.previous_is_deleted == null
                          ? "-"
                          : String(selectedRecord.previous_is_deleted)}
                      </td>
                      <td className="p-2">
                        {selectedRecord.is_deleted == null
                          ? "-"
                          : String(selectedRecord.is_deleted)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500">
                    {t("admin.permission_audit.updated_by")}
                  </div>
                  <div>{selectedRecord.updated_by_name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">
                    {t("admin.permission_audit.timestamp")}
                  </div>
                  <div>{formatDateTime(selectedRecord.timestamp)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
