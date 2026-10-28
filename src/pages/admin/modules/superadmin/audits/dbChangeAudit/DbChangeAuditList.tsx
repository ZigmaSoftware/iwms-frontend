import type {
  DbChangeAuditDetail as DetailRecord,
  DbChangeAuditFilterOptions,
  DbChangeAuditRecord,
} from "./types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import type { DataTablePageEvent } from "primereact/datatable";

import { dbChangeAuditApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { FormSelect } from "@/components/common/FormSelect";
import { FilterSection } from "@/components/common/ListToolbar";
import { useDateRangeFilter } from "@/components/filters/useDateRangeFilter";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import { combineFilters, useOptionFilter } from "@/components/filters/useOptionFilter";
import DbChangeAuditDetail from "./DbChangeAuditDetail";
import { formatDateTime, OPERATION_COLORS } from "./format";

const toRecordList = (value: unknown): DbChangeAuditRecord[] => {
  if (Array.isArray(value)) return value as DbChangeAuditRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: DbChangeAuditRecord[] }).results;
  }
  return [];
};

const nameOf = (options: { label: string; value: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const OPERATION_OPTIONS = [
  { label: "Created", value: "INSERT" },
  { label: "Updated", value: "UPDATE" },
  { label: "Deleted", value: "DELETE" },
];

export default function DbChangeAuditList() {
  const { t } = useTranslation();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptions, setFilterOptions] = useState<DbChangeAuditFilterOptions | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<DetailRecord | null>(null);
  const [records, setRecords] = useState<DbChangeAuditRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const loading = isLoading && records.length === 0;

  const toOptions = (items?: { unique_id: string; name: string }[]) =>
    (items ?? []).map((item) => ({ label: item.name, value: item.unique_id }));
  const companyOptions = useMemo(() => toOptions(filterOptions?.companies), [filterOptions]);
  const projectOptions = useMemo(() => toOptions(filterOptions?.projects), [filterOptions]);
  const tableOptions = useMemo(() => toOptions(filterOptions?.tables), [filterOptions]);

  const resetPage = () => setFirst(0);

  // Company → Project and Table, edited in the Filters panel as a draft and
  // sent once applied.
  const scope = useDraftFilter({
    empty: { company: "", project: "", table: "" },
    chips: {
      company: { label: "Company", format: (v) => nameOf(companyOptions, v), clears: ["project"] },
      project: { label: "Project", format: (v) => nameOf(projectOptions, v) },
      table: { label: "Table", format: (v) => v },
    },
    onAppliedChange: resetPage,
  });
  const { company: companyFilter, project: projectFilter, table: tableFilter } = scope.applied;
  const draft = scope.draft;

  const operation = useOptionFilter({
    param: "operation",
    label: "Change",
    options: OPERATION_OPTIONS,
    allLabel: t("common.all"),
    onAppliedChange: resetPage,
  });
  const operationFilter = operation.value;

  const changedOn = useDateRangeFilter({
    section: "Changed on",
    fromLabel: "Changed from",
    toLabel: "Changed to",
    fromParam: "date_from",
    toParam: "date_to",
    onAppliedChange: resetPage,
  });
  const dateFrom = changedOn.from;
  const dateTo = changedOn.to;

  const queryParams = useMemo(
    () => ({
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(companyFilter ? { company_id: companyFilter } : {}),
      ...(projectFilter ? { project_id: projectFilter } : {}),
      ...(tableFilter ? { table_name: tableFilter } : {}),
      ...(operationFilter ? { operation: operationFilter } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    [searchTerm, companyFilter, projectFilter, tableFilter, operationFilter, dateFrom, dateTo],
  );

  const loadRows = useCallback(
    async (page: number, limit: number, params: Record<string, string>) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const response = await dbChangeAuditApi.readAllwithPaginated(page, limit, { params });
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
    void loadRows(first / rowsPerPage + 1, rowsPerPage, queryParams);
  }, [first, rowsPerPage, queryParams, loadRows]);

  useEffect(() => {
    let mounted = true;
    const loadFilterOptions = async () => {
      try {
        const data = (await dbChangeAuditApi.read("filter-options", {
          params: draft.company ? { company_id: draft.company } : {},
        })) as unknown as DbChangeAuditFilterOptions;
        if (mounted && data) setFilterOptions(data);
      } catch {
        // Non-fatal: the list still works without dropdown options.
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

  const loadAllExportRows = async () => {
    const data = await dbChangeAuditApi.readAllForExport({ params: queryParams });
    return toRecordList(data).map((row) => ({
      "Changed At": formatDateTime(row.changed_at),
      Table: row.table_name,
      Change: row.operation_label,
      "Record Id": row.object_id ?? "",
      "Changed Columns": (row.changed_columns ?? []).join(", "),
      "DB User": row.db_user ?? "",
      Company: row.company_name ?? "",
      Project: row.project_name ?? "",
    })) as unknown as Record<string, unknown>[];
  };

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const openDetail = useCallback(
    async (row: DbChangeAuditRecord) => {
      try {
        const detail = (await dbChangeAuditApi.read(String(row.id))) as unknown as DetailRecord;
        setSelectedDetail(detail);
      } catch {
        Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      }
    },
    [t],
  );

  const scopeField = (
    <>
      <FilterSection label="Company & project">
        <div className="grid grid-cols-2 gap-2">
          <FormSelect
            label="Company"
            value={draft.company}
            onChange={(value) => scope.setDraft((d) => ({ ...d, company: value, project: "" }))}
            options={companyOptions}
            placeholder={t("common.all")}
          />
          <FormSelect
            label="Project"
            value={draft.project}
            onChange={(value) => scope.setField("project", value)}
            options={projectOptions}
            placeholder={t("common.all")}
          />
        </div>
      </FilterSection>
      <FilterSection label="Table">
        <FormSelect
          label="Table"
          value={draft.table}
          onChange={(value) => scope.setField("table", value)}
          options={tableOptions}
          placeholder={t("common.all")}
        />
      </FilterSection>
    </>
  );

  return (
    <div className="p-3">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-50">
              <i className="pi pi-database" />
            </span>
            Outside the app
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">DB Change Audit</h1>
          <p className="text-sm text-gray-500">
            Records created, updated or deleted directly in the database (SQL client, scripts) instead of
            through the application. Changes made in the app are in Common Audit. Open a row to see the
            data before and after.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          header={
            <FilterBar
              searchValue={globalFilterValue}
              onSearchChange={setGlobalFilterValue}
              searchPlaceholder="Search table, record id, DB user…"
            />
          }
          filterPanel={combineFilters({ ...scope, field: scopeField }, operation, changedOn)}
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
          loading={loading}
          stripedRows
          showGridlines
          fitWidth
          className="p-datatable-sm"
          emptyMessage="No direct database changes found"
        >
          <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "4%" }} />
          <Column
            header="Changed at"
            body={(r: DbChangeAuditRecord) => <span className="text-xs">{formatDateTime(r.changed_at)}</span>}
            style={{ width: "14%" }}
          />
          <Column
            header="Table / record"
            body={(r: DbChangeAuditRecord) => (
              <div className="leading-tight">
                <div className="font-medium">{r.table_name}</div>
                <div className="text-xs text-gray-500">{r.object_id || "-"}</div>
              </div>
            )}
            style={{ width: "22%" }}
          />
          <Column
            header="Change"
            body={(r: DbChangeAuditRecord) => (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${OPERATION_COLORS[r.operation]}`}>
                {r.operation_label}
              </span>
            )}
            style={{ width: "8%" }}
          />
          <Column
            header="Changed columns"
            body={(r: DbChangeAuditRecord) => (
              <span className="text-xs" title={(r.changed_columns ?? []).join(", ")}>
                {r.changed_columns?.length ? r.changed_columns.join(", ") : "-"}
              </span>
            )}
            style={{ width: "20%" }}
          />
          <Column
            header="DB user"
            body={(r: DbChangeAuditRecord) => <span className="text-xs">{r.db_user || "-"}</span>}
            style={{ width: "13%" }}
          />
          <Column
            header="Company / project"
            body={(r: DbChangeAuditRecord) => (
              <div className="leading-tight">
                <div className="text-xs">{r.company_name || "-"}</div>
                <div className="text-xs text-gray-500">{r.project_name || ""}</div>
              </div>
            )}
            style={{ width: "13%" }}
          />
          <Column
            header={t("common.actions")}
            body={(row: DbChangeAuditRecord) => (
              <div className="flex justify-center">
                <Button
                  icon="pi pi-eye"
                  className="p-button-sm p-button-text p-button-info"
                  tooltip="Before / after"
                  tooltipOptions={{ position: "top" }}
                  aria-label="Before / after"
                  onClick={() => void openDetail(row)}
                />
              </div>
            )}
            style={{ width: "6%" }}
          />
        </DataTable>
      </div>

      <DbChangeAuditDetail record={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
}
