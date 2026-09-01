import type {
  AuditFilterOptions,
  CommonAuditJsonValue,
  CommonAuditRecord,
  DiffLine,
  ModuleFilterOption,
} from "./types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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

import { commonAuditApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";

const ALL_MODULES = "__all__";

const SORTABLE_FIELDS = new Set([
  "module_name",
  "createdAt",
  "company_name",
  "project_name",
]);

// Sentinel for "company-wide, belongs to no project" — mirrors the backend,
// since an empty string can't be distinguished from "no filter" in a query.
const NO_PROJECT = "none";

const toRecordList = (value: unknown): CommonAuditRecord[] => {
  if (Array.isArray(value)) return value as CommonAuditRecord[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: CommonAuditRecord[] }).results;
  }
  return [];
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const formatJson = (value?: CommonAuditJsonValue) => {
  if (value === undefined || value === null) return "-";
  return JSON.stringify(value, null, 2);
};

/**
 * A filter dropdown with a visible caption above it and a short hint below,
 * so each control states what it narrows the audit trail by. Without this
 * the bar is a row of interchangeable "All" selects.
 */
const LabeledFilter = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex w-full flex-col gap-1 sm:w-[320px]">
    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
      {label}
    </label>
    {children}
    {hint ? (
      <span className="text-[11px] leading-tight text-gray-400">{hint}</span>
    ) : null}
  </div>
);

const JsonViewer = ({
  title,
  value,
}: {
  title: string;
  value?: CommonAuditJsonValue;
}) => (
  <div className="min-w-0">
    <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
    <pre className="max-h-[420px] overflow-auto rounded-md border bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
      {formatJson(value)}
    </pre>
  </div>
);

function getChangedPaths(
  prev: CommonAuditJsonValue,
  next: CommonAuditJsonValue,
  prefix = "",
): Set<string> {
  const changed = new Set<string>();
  const isLeaf = (v: CommonAuditJsonValue) =>
    v === null || typeof v !== "object" || Array.isArray(v);

  if (isLeaf(prev) || isLeaf(next)) {
    if (JSON.stringify(prev) !== JSON.stringify(next)) changed.add(prefix);
    return changed;
  }

  const p = prev as Record<string, CommonAuditJsonValue>;
  const n = next as Record<string, CommonAuditJsonValue>;
  for (const key of Object.keys(n)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in p)) {
      changed.add(path);
    } else {
      getChangedPaths(p[key], n[key], path).forEach((cp) => changed.add(cp));
    }
  }
  return changed;
}

function buildDiffLines(
  value: CommonAuditJsonValue,
  changedPaths: Set<string>,
  currentPath: string,
  indent: number,
  isLast: boolean,
): DiffLine[] {
  const pad = "  ".repeat(indent);
  const childPad = "  ".repeat(indent + 1);
  const suffix = isLast ? "" : ",";

  if (value === null || typeof value !== "object") {
    return [
      {
        content: pad + JSON.stringify(value) + suffix,
        changed: changedPaths.has(currentPath),
      },
    ];
  }

  if (Array.isArray(value)) {
    const isChanged = changedPaths.has(currentPath);
    const formatted = JSON.stringify(value, null, 2).split("\n");
    const result: DiffLine[] = formatted.map((line) => ({
      content: pad + line,
      changed: isChanged,
    }));
    if (result.length > 0) {
      result[result.length - 1] = {
        ...result[result.length - 1],
        content: result[result.length - 1].content + suffix,
      };
    }
    return result;
  }

  const obj = value as Record<string, CommonAuditJsonValue>;
  const entries = Object.entries(obj);
  const lines: DiffLine[] = [{ content: pad + "{", changed: false }];

  entries.forEach(([key, val], i) => {
    const childPath = currentPath ? `${currentPath}.${key}` : key;
    const isChildLast = i === entries.length - 1;

    if (val === null || typeof val !== "object") {
      lines.push({
        content: `${childPad}"${key}": ${JSON.stringify(val)}${isChildLast ? "" : ","}`,
        changed: changedPaths.has(childPath),
      });
    } else if (Array.isArray(val)) {
      const isChanged = changedPaths.has(childPath);
      const formatted = JSON.stringify(val, null, 2).split("\n");
      if (formatted.length === 1) {
        lines.push({
          content: `${childPad}"${key}": ${formatted[0]}${isChildLast ? "" : ","}`,
          changed: isChanged,
        });
      } else {
        lines.push({
          content: `${childPad}"${key}": ${formatted[0]}`,
          changed: isChanged,
        });
        for (let j = 1; j < formatted.length - 1; j++) {
          lines.push({ content: childPad + formatted[j], changed: isChanged });
        }
        lines.push({
          content: `${childPad}${formatted[formatted.length - 1]}${isChildLast ? "" : ","}`,
          changed: isChanged,
        });
      }
    } else {
      const childLines = buildDiffLines(
        val,
        changedPaths,
        childPath,
        indent + 1,
        isChildLast,
      );
      if (childLines.length > 0) {
        childLines[0] = {
          ...childLines[0],
          content: `${childPad}"${key}": ${childLines[0].content.trimStart()}`,
        };
      }
      lines.push(...childLines);
    }
  });

  lines.push({ content: pad + "}" + suffix, changed: false });
  return lines;
}

const DiffJsonViewer = ({
  title,
  newData,
  previousData,
}: {
  title: string;
  newData?: CommonAuditJsonValue;
  previousData?: CommonAuditJsonValue;
}) => {
  const lines = useMemo(() => {
    if (newData === undefined || newData === null) return null;
    const changedPaths =
      previousData !== undefined && previousData !== null
        ? getChangedPaths(previousData, newData)
        : new Set<string>();
    return buildDiffLines(newData, changedPaths, "", 0, true);
  }, [newData, previousData]);

  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      {lines === null ? (
        <pre className="max-h-[420px] overflow-auto rounded-md border bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
          -
        </pre>
      ) : (
        <div className="max-h-[420px] overflow-auto rounded-md border bg-gray-50 p-3 text-xs leading-relaxed text-gray-800 font-mono whitespace-pre">
          {lines.map((line, i) => (
            <div key={i} className={line.changed ? "bg-green-200 rounded" : ""}>
              {line.content || " "}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function CommonAuditList() {
  const { t } = useTranslation();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [moduleFilter, setModuleFilter] = useState(ALL_MODULES);
  const [selectedRecord, setSelectedRecord] =
    useState<CommonAuditRecord | null>(null);
  const [records, setRecords] = useState<CommonAuditRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [moduleNameOptions, setModuleNameOptions] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState(ALL_MODULES);
  const [projectFilter, setProjectFilter] = useState(ALL_MODULES);
  const [filterOptions, setFilterOptions] = useState<AuditFilterOptions | null>(
    null,
  );

  const moduleOptions = useMemo<ModuleFilterOption[]>(() => {
    return [
      { label: t("common.all"), value: ALL_MODULES },
      ...moduleNameOptions.map((moduleName) => ({
        label: moduleName,
        value: moduleName,
      })),
    ];
  }, [moduleNameOptions, t]);

  const companyOptions = useMemo<ModuleFilterOption[]>(
    () => [
      { label: t("common.all"), value: ALL_MODULES },
      ...(filterOptions?.companies ?? []).map((c) => ({
        label: c.name,
        value: c.unique_id,
      })),
    ],
    [filterOptions, t],
  );

  const projectOptions = useMemo<ModuleFilterOption[]>(
    () => [
      { label: t("common.all"), value: ALL_MODULES },
      // Lets a user isolate company-wide activity that belongs to no project.
      { label: t("admin.common_audit.no_project"), value: NO_PROJECT },
      ...(filterOptions?.projects ?? []).map((p) => ({
        label: p.name,
        value: p.unique_id,
      })),
    ],
    [filterOptions, t],
  );

  const loading = isLoading && records.length === 0;

  const onGlobalFilterChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setGlobalFilterValue(e.target.value);
    },
    [],
  );

  const openDetails = useCallback((record: CommonAuditRecord) => {
    setSelectedRecord(record);
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  const actionTemplate = useCallback(
    (row: CommonAuditRecord) => (
      <div className="flex justify-center">
        <button
          title={t("common.view")}
          onClick={() => openDetails(row)}
          className="text-blue-600 hover:text-blue-800"
        >
          {t("common.view")}
        </button>
      </div>
    ),
    [openDetails, t],
  );

  const methodTemplate = useCallback(
    (row: CommonAuditRecord) => row.method ?? "-",
    [],
  );

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const loadRows = useCallback(
    async (
      page: number,
      limit: number,
      search: string,
      orderingParam?: string,
      moduleFilterValue?: string,
      companyValue?: string,
      projectValue?: string,
    ) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setRecords([]);
      try {
        const response = await commonAuditApi.readAllwithPaginated(
          page,
          limit,
          {
            params: {
              ...(search ? { search } : {}),
              ...(orderingParam ? { ordering: orderingParam } : {}),
              ...(moduleFilterValue && moduleFilterValue !== ALL_MODULES
                ? { module_name: moduleFilterValue }
                : {}),
              ...(companyValue && companyValue !== ALL_MODULES
                ? { company_unique_id: companyValue }
                : {}),
              ...(projectValue && projectValue !== ALL_MODULES
                ? { project_unique_id: projectValue }
                : {}),
            },
          },
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
    void loadRows(
      first / rowsPerPage + 1,
      rowsPerPage,
      searchTerm,
      ordering,
      moduleFilter,
      companyFilter,
      projectFilter,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    first,
    rowsPerPage,
    searchTerm,
    ordering,
    moduleFilter,
    companyFilter,
    projectFilter,
  ]);

  // Distinct company/project/module/user values for the dropdowns, served by
  // the backend's `filter-options` action rather than derived from the
  // current page, so the lists stay complete — and stay scoped: a company
  // user is never offered another company here.
  //
  // Refetched when the company changes so the project list only ever offers
  // projects belonging to the selected company.
  useEffect(() => {
    let mounted = true;

    const loadFilterOptions = async () => {
      try {
        const data = (await commonAuditApi.read("filter-options", {
          params:
            companyFilter && companyFilter !== ALL_MODULES
              ? { company_unique_id: companyFilter }
              : {},
        })) as unknown as AuditFilterOptions;
        if (!mounted || !data) return;
        setFilterOptions(data);
        setModuleNameOptions(Array.isArray(data.modules) ? data.modules : []);
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

  // Feeds the table's "Download Excel" button: "All data" re-fetches every
  // audit row matching the current filters, since the table is lazily
  // paginated and only holds one page.
  const loadAllExportRows = async () => {
    const data = await commonAuditApi.readAllForExport({
      params: {
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(moduleFilter && moduleFilter !== ALL_MODULES
          ? { module_name: moduleFilter }
          : {}),
        ...(companyFilter && companyFilter !== ALL_MODULES
          ? { company_unique_id: companyFilter }
          : {}),
        ...(projectFilter && projectFilter !== ALL_MODULES
          ? { project_unique_id: projectFilter }
          : {}),
      },
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

  return (
    <div className="p-3">
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.common_audit.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.common_audit.list_subtitle")}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={(value) =>
            onGlobalFilterChange({
              target: { value },
            } as ChangeEvent<HTMLInputElement>)
          }
          searchPlaceholder={t("admin.common_audit.search_placeholder")}
        >
          {/* Each dropdown is labelled so its purpose is clear on sight —
              three unlabelled "All" selects are indistinguishable. */}
          <LabeledFilter
            label={t("admin.common_audit.module_filter_label")}
            hint={t("admin.common_audit.module_filter_hint")}
          >
            <FilterBarSelect
              value={moduleFilter === ALL_MODULES ? "" : moduleFilter}
              onChange={(value) => {
                setFirst(0);
                setModuleFilter(value || ALL_MODULES);
              }}
              options={moduleOptions.filter((o) => o.value !== ALL_MODULES)}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>

          <LabeledFilter
            label={t("admin.common_audit.company_filter_label")}
            hint={t("admin.common_audit.company_filter_hint")}
          >
            <FilterBarSelect
              value={companyFilter === ALL_MODULES ? "" : companyFilter}
              onChange={(value) => {
                setFirst(0);
                setCompanyFilter(value || ALL_MODULES);
                // A project belongs to one company, so a stale project filter
                // would silently return nothing after switching company.
                setProjectFilter(ALL_MODULES);
              }}
              options={companyOptions.filter((o) => o.value !== ALL_MODULES)}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>

          <LabeledFilter
            label={t("admin.common_audit.project_filter_label")}
            hint={t("admin.common_audit.project_filter_hint")}
          >
            <FilterBarSelect
              value={projectFilter === ALL_MODULES ? "" : projectFilter}
              onChange={(value) => {
                setFirst(0);
                setProjectFilter(value || ALL_MODULES);
              }}
              options={projectOptions.filter((o) => o.value !== ALL_MODULES)}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
        </FilterBar>
      </div>

      <DataTable
        loadExportRows={loadAllExportRows}
        value={records}
        dataKey="uuid"
        lazy
        paginator
        first={first}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPage={onPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        loading={loading}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.common_audit.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />
        <Column
          field="module_name"
          header={t("admin.common_audit.module_name")}
          sortable={SORTABLE_FIELDS.has("module_name")}
        />
        <Column
          field="endpoint_name"
          header={t("admin.common_audit.endpoint_name")}
        />
        <Column
          field="method"
          header={t("admin.common_audit.method")}
          body={methodTemplate}
        />
        <Column
          field="object_id"
          header={t("admin.common_audit.object_id")}
          body={(r: CommonAuditRecord) => r.object_id ?? "-"}
        />
        <Column
          field="company_name"
          header={t("admin.common_audit.company")}
          sortable={SORTABLE_FIELDS.has("company_name")}
          body={(r: CommonAuditRecord) => r.company_name ?? "-"}
        />
        <Column
          field="project_name"
          header={t("admin.common_audit.project")}
          sortable={SORTABLE_FIELDS.has("project_name")}
          body={(r: CommonAuditRecord) => r.project_name ?? "-"}
        />
        <Column
          field="createdBy"
          header={t("admin.common_audit.created_by")}
          body={(r: CommonAuditRecord) => {
            const name = r.created_by_name ?? r.createdBy;
            if (!name) return "-";
            return (
              <div className="leading-tight">
                <div className="font-medium text-gray-800">{name}</div>
                {r.created_by_id ? (
                  <div className="text-xs text-gray-500">{r.created_by_id}</div>
                ) : null}
              </div>
            );
          }}
        />
        <Column
          field="createdAt"
          header={t("admin.common_audit.created_at")}
          body={(r: CommonAuditRecord) => formatDateTime(r.createdAt)}
          sortable={SORTABLE_FIELDS.has("createdAt")}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>

      <Dialog
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => !open && closeDetails()}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.common_audit.detail_title")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <JsonViewer
              title={t("admin.common_audit.previous_data")}
              value={selectedRecord?.previous_data}
            />
            <DiffJsonViewer
              title={t("admin.common_audit.new_data")}
              newData={selectedRecord?.new_data}
              previousData={selectedRecord?.previous_data}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
