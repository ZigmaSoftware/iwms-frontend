import {
  DataTable as PrimeDataTable,
  type DataTableProps,
} from "primereact/datatable";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import Swal from "@/lib/notify";
import {
  getCurrentAdminBulkImportApi,
  getCurrentAdminServerListApi,
} from "@/helpers/admin/bulkImportRoutes";
import {
  getLatestServerListMetadata,
  registerServerListApi,
} from "@/helpers/admin/serverListMode";
import { getListCompanyProjectContext } from "@/utils/listQueryContext";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import type { CrudHelpers } from "@/helpers/admin/crudHelpers";
import {
  exportRecordsToExcel,
  exportTemplateToExcel,
  getAdminScreenExcelFilename,
  readExcelRows,
  type ExcelTemplateColumn,
} from "@/utils/exportExcel";

type SafeTableRow = Record<string, unknown>;
type SafeTableRows = SafeTableRow[];
type SafeDataTableProps<TValue extends SafeTableRows> =
  DataTableProps<TValue> & {
    bulkImportable?: boolean;
    exportable?: boolean;
    exportFilename?: string;
    exportRows?: SafeTableRows;
    exportSheetName?: string;
    importApi?: CrudHelpers;
    importColumns?: ExcelTemplateColumn[];
    importDefaults?: SafeTableRow;
    importSheetName?: string;
    importTemplateFilename?: string;
    onImportComplete?: () => void | Promise<void>;
    onImportRows?: (rows: SafeTableRows) => Promise<void>;
    transformServerRows?: (rows: SafeTableRows) => SafeTableRows;
  };

const toSafeRows = <TValue extends SafeTableRows>(
  value: DataTableProps<TValue>["value"],
): TValue => (Array.isArray(value) ? value : ([] as unknown as TValue));

const toExportFilename = (filename?: string) => {
  if (filename)
    return filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

  return getAdminScreenExcelFilename("all");
};

const toTemplateFilename = (filename?: string) =>
  filename ?? getAdminScreenExcelFilename("template");

const toTitle = (key: string) =>
  key
    .replace(/^_+/, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeColumnKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const readText = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(readText).join(" ").trim();
  return "";
};

const readImportColumns = (children: ReactNode): ExcelTemplateColumn[] => {
  const columns: ExcelTemplateColumn[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as {
      field?: unknown;
      header?: ReactNode;
      exportable?: boolean;
    };
    const field = typeof props.field === "string" ? props.field : "";

    if (
      !field ||
      props.exportable === false ||
      field.startsWith("_") ||
      ["id", "unique_id", "created_at", "updated_at"].includes(field)
    ) {
      return;
    }

    columns.push({
      field,
      header: readText(props.header) || toTitle(field),
    });
  });

  return columns;
};

const METADATA_EXCLUDED_FIELDS = new Set([
  "id",
  "unique_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "is_deleted",
]);

const readMetadataImportColumns = async (
  importApi: CrudHelpers,
): Promise<ExcelTemplateColumn[] | null> => {
  const metadata = await importApi.metadata();
  const fields = metadata.actions?.POST;
  if (!fields) return null;

  return Object.entries(fields)
    .filter(
      ([field, details]) =>
        details.read_only !== true &&
        !METADATA_EXCLUDED_FIELDS.has(field) &&
        !field.startsWith("_"),
    )
    .map(([field, details]) => ({
      field,
      header: field,
      required: details.required === true,
    }));
};

const mapExcelRowsToPayloads = (
  rows: SafeTableRows,
  columns: ExcelTemplateColumn[],
  defaults?: SafeTableRow,
) => {
  const columnByHeader = columns.reduce<Record<string, ExcelTemplateColumn>>(
    (acc, column) => {
      acc[normalizeColumnKey(column.header)] = column;
      acc[normalizeColumnKey(column.field)] = column;
      return acc;
    },
    {},
  );

  return rows.map((row) => {
    const payload: SafeTableRow = { ...(defaults ?? {}) };

    Object.entries(row).forEach(([key, value]) => {
      const column = columnByHeader[normalizeColumnKey(key)];
      if (!column) return;
      if (value === "") return;
      payload[column.field] = value;
    });

    return payload;
  });
};

type DataTableHeaderActionsProps = {
  header: ReactNode;
  rows: SafeTableRows;
  importColumns: ExcelTemplateColumn[];
  discoverImportColumns: boolean;
  bulkImportable: boolean;
  importApi: CrudHelpers | null;
  importDefaults?: SafeTableRow;
  importTemplateFilename?: string;
  importSheetName?: string;
  onImportRows?: (rows: SafeTableRows) => Promise<void>;
  onImportComplete?: () => void | Promise<void>;
  filename?: string;
  sheetName?: string;
  loadExportRows?: () => Promise<SafeTableRows>;
};

const DataTableHeaderActions = ({
  header,
  rows,
  importColumns,
  discoverImportColumns,
  bulkImportable,
  importApi,
  importDefaults,
  importTemplateFilename,
  importSheetName,
  onImportRows,
  onImportComplete,
  filename,
  sheetName,
  loadExportRows,
}: DataTableHeaderActionsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [resolvedColumns, setResolvedColumns] = useState(
    discoverImportColumns ? [] : importColumns,
  );

  useEffect(() => {
    if (!discoverImportColumns || !importApi) {
      setResolvedColumns(importColumns);
      return;
    }

    let cancelled = false;
    setResolvedColumns([]);
    readMetadataImportColumns(importApi)
      .then((columns) => {
        if (!cancelled) {
          setResolvedColumns(columns ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedColumns(importColumns);
      });

    return () => {
      cancelled = true;
    };
  }, [discoverImportColumns, importApi, importColumns]);

  const handleExport = async () => {
    const exportRows = loadExportRows ? await loadExportRows() : rows;
    exportRecordsToExcel(
      exportRows,
      toExportFilename(filename),
      sheetName || "Data",
    );
  };

  const handleTemplate = () => {
    exportTemplateToExcel(
      resolvedColumns,
      toTemplateFilename(importTemplateFilename),
      importSheetName || "Template",
    );
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const excelRows = await readExcelRows(file);
      const payloads = mapExcelRowsToPayloads(
        excelRows,
        resolvedColumns,
        importDefaults,
      ).filter((payload) => Object.keys(payload).length > 0);

      if (payloads.length === 0) {
        recordExcelAudit("upload_excel", {
          file_name: file.name,
          status: "rejected",
          reason: "no_rows",
        });
        Swal.fire(
          "No rows found",
          "Upload a filled Excel template.",
          "warning",
        );
        return;
      }

      if (onImportRows) {
        await onImportRows(payloads);
      } else if (importApi) {
        const failures: string[] = [];
        for (const [index, payload] of payloads.entries()) {
          try {
            await importApi.create(payload);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : JSON.stringify(error);
            failures.push(`Row ${index + 2}: ${message}`);
          }
        }

        if (failures.length > 0) {
          Swal.fire({
            icon: "warning",
            title: "Upload completed with errors",
            html: `<b>Success:</b> ${payloads.length - failures.length}<br/><b>Failed:</b> ${failures.length}<hr/><div style="text-align:left;font-size:12px">${failures
              .slice(0, 5)
              .join("<br/>")}</div>`,
          });
        } else {
          await Swal.fire(
            "Upload completed",
            `${payloads.length} rows uploaded successfully.`,
            "success",
          );
        }
      }

      if (onImportComplete) {
        await onImportComplete();
      } else if (!onImportRows) {
        await recordExcelAudit("upload_excel", {
          file_name: file.name,
          row_count: payloads.length,
          status: "completed",
        });
        window.location.reload();
        return;
      }

      recordExcelAudit("upload_excel", {
        file_name: file.name,
        row_count: payloads.length,
        status: "completed",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "failed",
        error: message,
      });
      Swal.fire("Upload failed", message, "error");
    } finally {
      event.target.value = "";
      setImporting(false);
    }
  };

  const exportButton = (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={rows.length === 0}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-green-200 bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      <i className="pi pi-download" />
      Download All Excel
    </button>
  );
  const canImport =
    bulkImportable &&
    resolvedColumns.length > 0 &&
    (Boolean(onImportRows) || Boolean(importApi));

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">{header}</div>
      <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none sm:items-center">
        {canImport && (
          <>
            <button
              type="button"
              onClick={handleTemplate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
            >
              <i className="pi pi-file-excel" />
              Download Template
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <i className="pi pi-upload" />
              {importing ? "Uploading..." : "Upload Excel"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleImport}
            />
          </>
        )}
        {exportButton}
      </div>
    </div>
  );
};

export const DataTable = <TValue extends SafeTableRows>(
  props: SafeDataTableProps<TValue>,
) => {
  const {
    exportable = true,
    bulkImportable = true,
    exportFilename,
    exportRows,
    exportSheetName,
    importApi,
    importColumns,
    importDefaults,
    importSheetName,
    importTemplateFilename,
    onImportComplete,
    onImportRows,
    transformServerRows,
    ...tableProps
  } = props;
  const safeRows = toSafeRows(tableProps.value);
  const resolvedImportApi = importApi ?? getCurrentAdminBulkImportApi();
  // Pages that already own server-side pagination (readAllwithPaginated +
  // lazy/onPage/totalRecords wired at the page level) must not also be
  // driven by this component's route-based auto-pagination — both would
  // fetch independently and race, with whichever resolves last silently
  // overwriting the other's rows (symptom: table shows "no records found"
  // even though the page's own fetch returned data).
  const serverApi = tableProps.lazy ? null : getCurrentAdminServerListApi();
  const initialPageSize =
    typeof tableProps.rows === "number" && tableProps.rows > 0
      ? tableProps.rows
      : 10;
  if (serverApi) {
    registerServerListApi(serverApi, initialPageSize);
  }

  const [serverRows, setServerRows] = useState<SafeTableRows>(safeRows);
  const [serverTotal, setServerTotal] = useState(safeRows.length);
  const [serverFirst, setServerFirst] = useState(0);
  const [serverPageSize, setServerPageSize] = useState(initialPageSize);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverConfig, setServerConfig] = useState(
    serverApi ? getLatestServerListMetadata(serverApi)?.config : undefined,
  );
  const rowShape = useRef<string[]>([]);
  const appliedMetadataVersion = useRef(0);

  const mapServerRows = useCallback((rows: SafeTableRows) => {
    const targetKeys = rowShape.current;
    if (targetKeys.length === 0) return rows;

    return rows.map((row) => {
      const mapped: SafeTableRow = {};
      const rawKeys = Object.keys(row);

      targetKeys.forEach((targetKey) => {
        if (targetKey in row) {
          mapped[targetKey] = row[targetKey];
          return;
        }

        const normalizedTarget = targetKey.replace(/[^a-z0-9]/gi, "").toLowerCase();
        const sourceKey = rawKeys.find(
          (key) =>
            key.replace(/[^a-z0-9]/gi, "").toLowerCase() === normalizedTarget,
        );
        if (sourceKey) mapped[targetKey] = row[sourceKey];
      });

      return { ...row, ...mapped };
    });
  }, []);

  const globalSearch = useMemo(() => {
    const filters = tableProps.filters as
      | Record<string, { value?: unknown }>
      | undefined;
    const value = filters?.global?.value;
    return typeof value === "string" ? value.trim() : "";
  }, [tableProps.filters]);

  const columnFilterParams = useMemo(() => {
    const filters = tableProps.filters as
      | Record<
          string,
          { value?: unknown; constraints?: Array<{ value?: unknown }> }
        >
      | undefined;

    return Object.entries(filters ?? {}).reduce<Record<string, string | number | boolean>>(
      (params, [field, filter]) => {
        if (field === "global") return params;
        const value = filter?.value ?? filter?.constraints?.[0]?.value;
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          if (value !== "") params[field] = value;
        }
        return params;
      },
      {},
    );
  }, [tableProps.filters]);
  const columnFilterKey = useMemo(
    () => JSON.stringify(columnFilterParams),
    [columnFilterParams],
  );

  // Read fresh on every render (cheap, plain getter) so the effect below sees
  // the current company/project selection without needing its own state.
  const activeCompanyProject = getListCompanyProjectContext();
  const companyProjectKey = `${activeCompanyProject.companyId}::${activeCompanyProject.projectId}`;

  const loadServerPage = useCallback(
    async (
      first: number,
      rows: number,
      sortField?: string,
      sortOrder?: number | null,
    ) => {
      if (!serverApi) return;

      setServerLoading(true);
      try {
        const companyProject = getListCompanyProjectContext();
        const response = await serverApi.readAllwithPaginated(
          Math.floor(first / rows) + 1,
          rows,
          {
            ...serverConfig,
            params: {
              ...serverConfig?.params,
              ...(companyProject.companyId
                ? { company_id: companyProject.companyId }
                : {}),
              ...(companyProject.projectId
                ? { project_id: companyProject.projectId }
                : {}),
              ...(globalSearch ? { search: globalSearch } : {}),
              ...columnFilterParams,
              ...(sortField
                ? { ordering: `${sortOrder === -1 ? "-" : ""}${sortField}` }
                : {}),
            },
          },
        );
        const nextRows = Array.isArray(response) ? response : response.results ?? [];
        const count = Array.isArray(response)
          ? nextRows.length
          : (response.count ?? nextRows.length);

        if (nextRows.length === 0 && first > 0 && count > 0) {
          setServerFirst(Math.max(0, first - rows));
          return;
        }

        const mappedRows = mapServerRows(nextRows as SafeTableRows);
        const transformedRows = transformServerRows ? transformServerRows(mappedRows) : mappedRows;
        setServerRows(transformedRows);
        setServerTotal(count);
      } finally {
        setServerLoading(false);
      }
    },
    [
      columnFilterParams,
      globalSearch,
      mapServerRows,
      serverApi,
      serverConfig,
    ],
  );

  useEffect(() => {
    if (!serverApi) {
      setServerRows(safeRows);
      return;
    }

    const metadata = getLatestServerListMetadata(serverApi);
    if (!metadata) return;

    if (safeRows[0]) {
      rowShape.current = Object.keys(safeRows[0]);
    }

    if (metadata.version !== appliedMetadataVersion.current) {
      appliedMetadataVersion.current = metadata.version;
      setServerRows(safeRows);
      setServerTotal(metadata.count);
      setServerConfig(metadata.config);
      setServerFirst(0);
      return;
    }

    if (serverFirst === 0) {
      setServerRows(safeRows);
    } else {
      void loadServerPage(
        serverFirst,
        serverPageSize,
        tableProps.sortField,
        tableProps.sortOrder,
      );
    }
    // Pagination changes are loaded by onPage/onSort. This effect only reacts
    // to parent-owned row changes (initial loads, tenant changes, mutations).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRows, serverApi]);

  useEffect(() => {
    if (!serverApi || !getLatestServerListMetadata(serverApi)) return;
    setServerFirst(0);
    void loadServerPage(0, serverPageSize);
    // Reset to page 1 and refetch whenever the search term, a column filter,
    // or the active company/project selection changes.
  }, [columnFilterKey, globalSearch, companyProjectKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowsForExport = exportRows ?? (serverApi ? serverRows : safeRows);
  const resolvedImportColumns =
    importColumns ?? readImportColumns(tableProps.children);
  const header =
    exportable && typeof tableProps.header !== "function" ? (
      <DataTableHeaderActions
        header={tableProps.header as ReactNode}
        rows={rowsForExport}
        importColumns={resolvedImportColumns}
        discoverImportColumns={!importColumns}
        bulkImportable={bulkImportable}
        importApi={resolvedImportApi}
        importDefaults={importDefaults}
        importTemplateFilename={importTemplateFilename}
        importSheetName={importSheetName}
        onImportRows={onImportRows}
        onImportComplete={onImportComplete}
        filename={exportFilename}
        sheetName={exportSheetName}
        loadExportRows={
          serverApi
            ? async () => {
                const companyProject = getListCompanyProjectContext();
                return (await serverApi.readAllForExport({
                  ...serverConfig,
                  params: {
                    ...serverConfig?.params,
                    ...(companyProject.companyId
                      ? { company_id: companyProject.companyId }
                      : {}),
                    ...(companyProject.projectId
                      ? { project_id: companyProject.projectId }
                      : {}),
                    ...(globalSearch ? { search: globalSearch } : {}),
                    ...columnFilterParams,
                  },
                })) as SafeTableRows;
              }
            : undefined
        }
      />
    ) : (
      tableProps.header
    );

  const serverTableProps = serverApi
    ? {
        ...tableProps,
        lazy: true,
        paginator: true,
        first: serverFirst,
        rows: serverPageSize,
        totalRecords: serverTotal,
        loading: serverLoading || tableProps.loading,
        onPage: (event: Parameters<NonNullable<typeof tableProps.onPage>>[0]) => {
          setServerFirst(event.first);
          setServerPageSize(event.rows);
          tableProps.onPage?.(event);
          void loadServerPage(
            event.first,
            event.rows,
            tableProps.sortField,
            tableProps.sortOrder,
          );
        },
        onSort: (event: Parameters<NonNullable<typeof tableProps.onSort>>[0]) => {
          setServerFirst(0);
          tableProps.onSort?.(event);
          void loadServerPage(0, serverPageSize, event.sortField, event.sortOrder);
        },
      }
    : tableProps;

  return (
    <div className="min-w-0 overflow-x-auto">
      <PrimeDataTable
        responsiveLayout="stack"
        breakpoint="768px"
        {...serverTableProps}
        header={header}
        value={(serverApi ? serverRows : safeRows) as TValue}
      />
    </div>
  );
};

export type { DataTableFilterEvent } from "primereact/datatable";
