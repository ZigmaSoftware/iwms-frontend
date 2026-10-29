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
  ActiveFilterChips,
  DocumentsMenu,
  FilterPanel,
  type ActiveFilterChip,
  type DocumentActions,
} from "@/components/common/ListToolbar";

/** Which rows an Excel export covers. */
type ExportScope = "page" | "all";

/**
 * The table toolbar's "Filters" button + panel. `content` is the panel's
 * fields (e.g. `useCompanyProjectFilter().field` plus page-specific ones);
 * the page owns draft/applied state and commits on `onApply`. Usually built
 * with `combineFilters(...)` from components/filters/useOptionFilter.
 */
export type TableFilters = {
  content: ReactNode;
  activeCount: number;
  onApply: () => void;
  onReset: () => void;
  /** "Company: Acme ✕" chips shown under the toolbar */
  chips?: ActiveFilterChip[];
  width?: number;
};
import {
  getCurrentAdminBulkImportApi,
  getCurrentAdminServerListApi,
} from "@/helpers/admin/bulkImportRoutes";
import {
  getLatestServerListMetadata,
  registerServerListApi,
  unregisterServerListApi,
} from "@/helpers/admin/serverListMode";
import { getListCompanyProjectContext } from "@/utils/listQueryContext";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import type { CrudFieldMetadata, CrudHelpers } from "@/helpers/admin/crudHelpers";
import {
  exportRecordsToExcel,
  exportTemplateToExcel,
  getAdminScreenExcelFilename,
  readExcelRows,
  recordsToCsvFile,
  type ExcelTemplateColumn,
} from "@/utils/exportExcel";
import {
  NO_EXPORT_DATA_MESSAGE,
  runBulkUpload,
  type BulkUploadResponse,
} from "@/utils/backgroundJobs";
import {
  clearBulkResult,
  loadBulkResult,
  normalizeBulkErrors,
  saveBulkResult,
  type BulkUploadResult,
} from "@/utils/bulkUpload";
import { decryptSegment } from "@/utils/routeCrypto";
import { useScreenAccess } from "@/contexts/screenPermission";
import BulkUploadResultDialog from "@/components/common/BulkUploadResultDialog";
import BulkRejectedPanel from "@/components/common/BulkRejectedPanel";
import { cn } from "@/lib/utils";

type SafeTableRow = Record<string, unknown>;
type SafeTableRows = SafeTableRow[];
type SafeDataTableProps<TValue extends SafeTableRows> =
  DataTableProps<TValue> & {
    bulkImportable?: boolean;
    exportable?: boolean;
    /**
     * Set on a table whose rows are already in memory (a nested detail table,
     * a summary panel) rather than paginated from a list endpoint.
     *
     * Without it, `getCurrentAdminServerListApi()` resolves an API from the
     * *URL* — so a nested table on, say, `/daily-trip-log/:id/report` is
     * silently switched into server mode against the trip-log list endpoint
     * and paginates the wrong data. `localData` opts out of that, keeping
     * PrimeReact's own client-side paginator over `value`.
     */
    localData?: boolean;
    exportFilename?: string;
    exportRows?: SafeTableRows;
    exportSheetName?: string;
    /**
     * Fetches every row an "All data" export should cover, beyond what's
     * currently loaded client-side (e.g. paged/filtered server data). Without
     * this, "All data" falls back to whatever's already in `value`/`exportRows`.
     */
    loadExportRows?: () => Promise<SafeTableRows>;
    /**
     * Server-side "all data" export (e.g. `api.exportToExcel({ params },
     * filename, sheetName)`): preferred over `loadExportRows`. Without either,
     * a route-driven server list exports through its own API automatically.
     */
    onServerExport?: (filename: string, sheetName: string) => Promise<void>;
    onPdfRequest?: () => void | Promise<void>;
    /**
     * localStorage key for the persisted rejected-rows panel; defaults to the
     * (decrypted) page path. Set it when one page has two importable tables.
     */
    importResultKey?: string;
    importApi?: CrudHelpers;
    importColumns?: ExcelTemplateColumn[];
    importDefaults?: SafeTableRow;
    importSheetName?: string;
    importTemplateFilename?: string;
    onImportComplete?: () => void | Promise<void>;
    onImportRows?: (rows: SafeTableRows) => Promise<void>;
    transformServerRows?: (rows: SafeTableRows) => SafeTableRows;
    /**
     * Place the Filters button and Documents menu inside the page's own
     * header instead of beside it: receives them and returns the whole header.
     */
    renderHeaderWithActions?: (actions: ReactNode) => ReactNode;
    /** Filters button + panel in the toolbar (see TableFilters). Named
     *  filterPanel: `filters` is PrimeReact's own column-filter prop. */
    filterPanel?: TableFilters;
    /**
     * Page-specific Documents menu actions; each one given replaces the
     * built-in one (e.g. a server-side Excel export), and `downloadQr`
     * adds a "Download QR" item for lists with QR codes.
     */
    documentActions?: DocumentActions;
    /**
     * Fit the table to the page width instead of scrolling sideways: fixed
     * layout, so give each Column a percentage `style.width` and let cells
     * wrap (group related fields into one stacked cell — see TableCells).
     */
    fitWidth?: boolean;
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

// System/audit columns (mostly from BaseMaster) the server stamps itself —
// never something an uploader fills in. Tenancy fields (company_id /
// project_id) are deliberately NOT listed: they stay in the template.
const METADATA_EXCLUDED_FIELDS = new Set([
  "id",
  "unique_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "created_by_id",
  "updated_by_id",
  "deleted_at",
  "deleted_by",
  "deleted_by_id",
  "delete_reason",
  "is_deleted",
  "is_active",
]);

// Fields ending in `_id`/`_ids` that reference a master/lookup table accept
// the row's human-readable name as an alternative to its opaque unique_id on
// Excel bulk upload (backend resolution lives in
// app/utils/name_or_id_field.py). The upload TEMPLATE goes further: it
// doesn't show the raw `country_id` column at all — the column is literally
// named `country_name`, so the uploader only ever sees/fills in a name. The
// unique_id is still accepted if someone types it into that same column
// (NameOrUniqueIdField checks for an exact unique_id match first), but the
// template no longer advertises the id-shaped column. Normal form
// dropdowns/API responses/exports are unaffected — this only changes the
// upload template's column naming.
const isLookupField = (field: string, details: CrudFieldMetadata) =>
  details.type === "field" &&
  (/_ids?$/.test(field) || field === "mainCategory");

const toLookupNameColumn = (field: string) =>
  field === "mainCategory"
    ? "mainCategory_name"
    : field.replace(/_ids$/, "_names").replace(/_id$/, "_name");

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
    .map(([field, details]) => {
      const lookup = isLookupField(field, details);
      return {
        field,
        header: lookup ? toLookupNameColumn(field) : field,
        required: details.required === true,
        notes: lookup
          ? "Enter the name as shown in its master list (e.g. India, Tamil Nadu)."
          : undefined,
      };
    });
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

const errorStatus = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;

/** The backend's validation body when there is one, else the error message. */
const describeRowError = (error: unknown): unknown => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object" && !(data instanceof Blob)) return data;
  if (typeof data === "string" && data.trim() && data.length < 500) return data;
  return error instanceof Error ? error.message : JSON.stringify(error);
};

/** Per-page localStorage key for the rejected-rows panel. */
const defaultImportResultKey = (importSheetName?: string) => {
  if (typeof window === "undefined") return importSheetName ?? "bulk-upload";
  const path = window.location.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decryptSegment(segment) ?? segment)
    .join("/");
  return importSheetName ? `${path}#${importSheetName}` : path;
};

type DataTableHeaderActionsProps = {
  header: ReactNode;
  /** Every row the export can cover (all pages / server-side full set). */
  rows: SafeTableRows;
  /** Just the rows currently rendered, for the "Current page" scope. */
  pageRows?: SafeTableRows;
  importColumns: ExcelTemplateColumn[];
  discoverImportColumns: boolean;
  bulkImportable: boolean;
  importApi: CrudHelpers | null;
  importDefaults?: SafeTableRow;
  importTemplateFilename?: string;
  importSheetName?: string;
  importResultKey?: string;
  onImportRows?: (rows: SafeTableRows) => Promise<void>;
  onImportComplete?: () => void | Promise<void>;
  /** Soft refresh of a route-driven server list (instead of a page reload). */
  refreshRows?: () => Promise<void>;
  filename?: string;
  sheetName?: string;
  loadExportRows?: () => Promise<SafeTableRows>;
  onServerExport?: (filename: string, sheetName: string) => Promise<void>;
  onPdfRequest?: () => void | Promise<void>;
  renderHeaderWithActions?: (actions: ReactNode) => ReactNode;
  /** false when the table opted out of the built-in import/export actions */
  builtIns: boolean;
  filters?: TableFilters;
  documentActions?: DocumentActions;
};

const DataTableHeaderActions = ({
  header,
  renderHeaderWithActions,
  rows,
  pageRows,
  importColumns,
  discoverImportColumns,
  bulkImportable,
  importApi,
  importDefaults,
  importTemplateFilename,
  importSheetName,
  importResultKey,
  onImportRows,
  onImportComplete,
  refreshRows,
  filename,
  sheetName,
  loadExportRows,
  onServerExport,
  onPdfRequest,
  builtIns,
  filters,
  documentActions,
}: DataTableHeaderActionsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [resolvedColumns, setResolvedColumns] = useState(
    discoverImportColumns ? [] : importColumns,
  );

  // Persisted per page so rejected rows survive table refetch / full reload.
  const [moduleKey] = useState(
    () => importResultKey ?? defaultImportResultKey(importSheetName),
  );
  const [importResult, setImportResult] = useState<BulkUploadResult | null>(
    () => loadBulkResult(moduleKey),
  );
  const [resultOpen, setResultOpen] = useState(false);

  // `importColumns` is rebuilt on every parent render (it is derived from the
  // column children), so depending on the array *identity* re-ran this effect
  // on every re-render — including the one a status toggle causes — which
  // blanked the Excel buttons and re-issued the metadata request each time.
  // Keying on the field signature instead keeps it to one fetch per real
  // column change.
  const importColumnsKey = useMemo(
    () => (importColumns ?? []).map((column) => column.field).join("|"),
    [importColumns],
  );
  const importColumnsRef = useRef(importColumns);
  importColumnsRef.current = importColumns;

  useEffect(() => {
    const fallback = importColumnsRef.current ?? [];
    // No metadata request when the user cannot import here anyway.
    if (!discoverImportColumns || !importApi || !bulkImportable) {
      setResolvedColumns(fallback);
      return;
    }

    let cancelled = false;
    readMetadataImportColumns(importApi)
      .then((columns) => {
        if (!cancelled) {
          setResolvedColumns(columns ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedColumns(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [discoverImportColumns, importApi, importColumnsKey, bulkImportable]);

  const [exporting, setExporting] = useState<ExportScope | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleExport = async (scope: ExportScope) => {
    setExporting(scope);
    try {
      // "all" prefers a server-side export, then an explicit fetcher, else
      // the full row set already held by the table; "page" uses only what
      // is on screen. Each path records exactly one download audit.
      if (scope === "all" && onServerExport) {
        await onServerExport(toExportFilename(filename), sheetName || "Data");
        return;
      }

      const visibleRows = pageRows ?? rows;
      const exportRows =
        scope === "all"
          ? loadExportRows
            ? await loadExportRows()
            : rows
          : visibleRows;

      if (exportRows.length === 0) {
        Swal.fire("Nothing to export", "There are no rows to export.", "info");
        return;
      }

      await exportRecordsToExcel(
        exportRows,
        toExportFilename(filename),
        sheetName || "Data",
        { scope },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed.";
      if (message === NO_EXPORT_DATA_MESSAGE) {
        Swal.fire("Nothing to export", message, "info");
      } else {
        Swal.fire("Export failed", message, "error");
      }
    } finally {
      setExporting(null);
    }
  };

  const handlePdf = async () => {
    if (!onPdfRequest) return;
    setGeneratingPdf(true);
    try {
      await onPdfRequest();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PDF generation failed.";
      Swal.fire("PDF generation failed", message, "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleTemplate = async () => {
    try {
      await exportTemplateToExcel(
        resolvedColumns,
        toTemplateFilename(importTemplateFilename),
        importSheetName || "Template",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Template download failed.";
      Swal.fire("Template download failed", message, "error");
    }
  };

  const showImportResult = (result: BulkUploadResult | null) => {
    saveBulkResult(moduleKey, result);
    setImportResult(result);
    setResultOpen(Boolean(result && result.errors.length > 0));
  };

  /**
   * After an upload: the page's own hook, else a soft refresh of a server
   * list, else — only when nothing was rejected — a full reload. Never
   * hard-reload while rejected rows are on screen.
   */
  const refreshAfterImport = async (hasRejected: boolean) => {
    if (onImportComplete) {
      await onImportComplete();
      return;
    }
    if (refreshRows) {
      await refreshRows();
      return;
    }
    if (!hasRejected) window.location.reload();
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

      // A page-owned import (custom endpoint / payload shaping).
      if (onImportRows) {
        await onImportRows(payloads);
        recordExcelAudit("upload_excel", {
          file_name: file.name,
          row_count: payloads.length,
          status: "completed",
        });
        if (onImportComplete) await onImportComplete();
        return;
      }

      if (!importApi) return;

      // ── Server-side bulk upload ────────────────────────────────────────
      // Excel -> CSV -> POST <resource>/bulk-upload/ -> one result with
      // per-row errors (and the rejected row data). Falls back to the
      // per-row create loop only when the resource has no bulk-upload
      // endpoint (404/405).
      let bulkResponse: BulkUploadResponse | null = null;
      try {
        const formData = new FormData();
        formData.append("file", recordsToCsvFile(payloads, "bulk_upload.csv"));
        bulkResponse = await runBulkUpload(importApi, formData);
      } catch (bulkError) {
        const status = errorStatus(bulkError);
        if (status !== 404 && status !== 405) throw bulkError;
      }

      let result: BulkUploadResult;
      if (bulkResponse) {
        const errors = normalizeBulkErrors(bulkResponse.errors, excelRows);
        result = {
          fileName: file.name,
          successCount: Number(bulkResponse.success_count ?? 0),
          errors,
          originalRows: excelRows,
        };
      } else {
        const errors: BulkUploadResult["errors"] = [];
        for (const [index, payload] of payloads.entries()) {
          try {
            await importApi.create(payload);
          } catch (error) {
            errors.push({
              row: index + 1,
              error: describeRowError(error),
              data: excelRows[index] ?? {},
            });
          }
        }
        result = {
          fileName: file.name,
          successCount: payloads.length - errors.length,
          errors,
          originalRows: excelRows,
        };
      }

      const rejected = result.errors.length;
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        row_count: payloads.length,
        status: "completed",
        mode: bulkResponse ? "bulk_upload" : "per_row",
        success_count: result.successCount,
        error_count: rejected,
      });

      showImportResult(rejected > 0 ? result : null);
      if (rejected > 0) {
        Swal.fire({
          icon: "warning",
          title: "Upload completed with errors",
          text: `Success: ${result.successCount} · Rejected: ${rejected}. See the rejected list on the page.`,
        });
      } else {
        await Swal.fire(
          "Upload completed",
          `${result.successCount} rows uploaded successfully.`,
          "success",
        );
      }

      await refreshAfterImport(rejected > 0);
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

  // Uploads need "add" AND "import"; downloads need "view" AND "export".
  // Outside a permissioned page everything is allowed (the backend decides).
  const {
    canAdd: allowAdd,
    canView: allowView,
    canImport: allowImportGrant,
    canExport: allowExportGrant,
  } = useScreenAccess();
  const allowImport = allowAdd && allowImportGrant;
  const allowExport = allowView && allowExportGrant;

  // "All data" is offered when it can yield more than the visible page —
  // via a server-side export, an explicit fetcher, or because `rows`
  // already holds every record while only one page is rendered.
  const visibleCount = (pageRows ?? rows).length;
  const canExportAll =
    Boolean(onServerExport) ||
    Boolean(loadExportRows) ||
    rows.length > visibleCount;
  const canImport =
    builtIns &&
    bulkImportable &&
    allowImport &&
    resolvedColumns.length > 0 &&
    (Boolean(onImportRows) || Boolean(importApi));

  // built-in actions first; the page's own `documentActions` replace them
  const documentMenuActions: DocumentActions = {
    ...(canImport
      ? {
          uploadExcel: {
            onClick: () => fileInputRef.current?.click(),
            busy: importing,
          },
          downloadTemplate: { onClick: () => void handleTemplate() },
        }
      : {}),
    ...(builtIns
      ? {
          downloadExcel: {
            onClick: () => void handleExport("page"),
            busy: exporting === "page",
            disabled: exporting !== null || visibleCount === 0,
          },
          ...(canExportAll
            ? {
                downloadExcelAll: {
                  onClick: () => void handleExport("all"),
                  busy: exporting === "all",
                  disabled: exporting !== null,
                },
              }
            : {}),
        }
      : {}),
    ...(builtIns && onPdfRequest
      ? {
          downloadPdf: {
            onClick: () => void handlePdf(),
            busy: generatingPdf,
          },
        }
      : {}),
    ...(documentActions ?? {}),
  };

  // Enforce the grants on the merged menu (page-provided actions included):
  // without "add"+"import" no upload, without "view"+"export" no downloads.
  // The template serves both flows, so it stays when either grant is present.
  if (documentMenuActions.uploadExcel && !allowImport) {
    documentMenuActions.uploadExcel = {
      ...documentMenuActions.uploadExcel,
      hidden: true,
    };
  }
  if (!allowExport) {
    for (const key of [
      "downloadExcel",
      "downloadExcelAll",
      "downloadPdf",
      "downloadQr",
    ] as const) {
      const action = documentMenuActions[key];
      if (action) documentMenuActions[key] = { ...action, hidden: true };
    }
    if (documentMenuActions.downloadTemplate && !allowImport) {
      documentMenuActions.downloadTemplate = {
        ...documentMenuActions.downloadTemplate,
        hidden: true,
      };
    }
  }

  const actions = (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {filters && (
        <FilterPanel
          activeCount={filters.activeCount}
          onApply={filters.onApply}
          onReset={filters.onReset}
          width={filters.width}
        >
          {filters.content}
        </FilterPanel>
      )}
      <DocumentsMenu {...documentMenuActions} />
      {canImport && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={handleImport}
        />
      )}
    </div>
  );

  const chips =
    filters?.chips && filters.chips.length > 0 ? (
      <ActiveFilterChips chips={filters.chips} onClearAll={filters.onReset} />
    ) : null;

  // Rejected rows of the last upload, persisted until dismissed or replaced
  // by a clean upload; shown above the toolbar.
  const rejectedPanel =
    importResult && importResult.errors.length > 0 ? (
      <BulkRejectedPanel
        result={importResult}
        onClear={() => {
          clearBulkResult(moduleKey);
          setImportResult(null);
        }}
        onReupload={
          canImport ? () => fileInputRef.current?.click() : undefined
        }
        onViewAll={() => setResultOpen(true)}
      />
    ) : null;

  const resultDialog = (
    <BulkUploadResultDialog
      visible={resultOpen}
      onClose={() => setResultOpen(false)}
      title="Bulk upload — rejected records"
      result={importResult}
    />
  );

  if (renderHeaderWithActions) {
    return (
      <div className="iwms-list-header flex min-w-0 flex-col gap-2.5">
        {rejectedPanel}
        {renderHeaderWithActions(actions)}
        {chips}
        {resultDialog}
      </div>
    );
  }

  // Search (the page's header) on the left, then the Filters button, the
  // Documents menu pushed right, and the active-filter chips underneath.
  return (
    <div className="iwms-list-header flex min-w-0 flex-col gap-2.5">
      {rejectedPanel}
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">{header}</div>
        <div className="ml-auto shrink-0">{actions}</div>
      </div>
      {chips}
      {resultDialog}
    </div>
  );
};

export const DataTable = <TValue extends SafeTableRows>(
  props: SafeDataTableProps<TValue>,
) => {
  const {
    exportable = true,
    bulkImportable = true,
    localData = false,
    exportFilename,
    exportRows,
    exportSheetName,
    loadExportRows: loadExportRowsProp,
    onServerExport: onServerExportProp,
    onPdfRequest,
    importResultKey,
    importApi,
    importColumns,
    importDefaults,
    importSheetName,
    importTemplateFilename,
    onImportComplete,
    onImportRows,
    transformServerRows,
    renderHeaderWithActions,
    filterPanel,
    documentActions,
    fitWidth = false,
    ...tableProps
  } = props;
  // Uploading a file needs "add" AND "import" together.
  const { canAdd: canAddRecord, canImport: canImportFile } = useScreenAccess();
  const safeRows = toSafeRows(tableProps.value);
  const resolvedImportApi = importApi ?? getCurrentAdminBulkImportApi();
  // Pages that already own server-side pagination (readAllwithPaginated +
  // lazy/onPage/totalRecords wired at the page level) must not also be
  // driven by this component's route-based auto-pagination — both would
  // fetch independently and race, with whichever resolves last silently
  // overwriting the other's rows (symptom: table shows "no records found"
  // even though the page's own fetch returned data).
  const serverApi =
    tableProps.lazy || localData ? null : getCurrentAdminServerListApi();
  const initialPageSize =
    typeof tableProps.rows === "number" && tableProps.rows > 0
      ? tableProps.rows
      : 10;
  if (serverApi) {
    registerServerListApi(serverApi, initialPageSize);
  }

  // Registration above is scoped to this instance being mounted on this
  // route. Unregister on unmount/route-away so a later readAll() call from
  // an unrelated page (e.g. a dropdown reusing the same entity's API) isn't
  // silently truncated to whatever page size this list happened to use.
  useEffect(() => {
    if (!serverApi) return;
    return () => unregisterServerListApi(serverApi);
  }, [serverApi]);

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
  // Only the newest page request may write rows: an older one resolving late
  // (filters changed mid-flight) would otherwise overwrite fresher data.
  const latestServerRequest = useRef(0);

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

      const requestId = ++latestServerRequest.current;
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
        if (requestId !== latestServerRequest.current) return;
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
        if (requestId === latestServerRequest.current) setServerLoading(false);
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

  // The list's own query (company/project context, search, column filters,
  // sort) without pagination — what an "all data" export must cover.
  const buildExportParams = () => {
    const companyProject = getListCompanyProjectContext();
    const baseParams: Record<string, unknown> = { ...serverConfig?.params };
    delete baseParams.page;
    delete baseParams.limit;
    delete baseParams.page_size;
    return {
      ...baseParams,
      ...(companyProject.companyId
        ? { company_id: companyProject.companyId }
        : {}),
      ...(companyProject.projectId
        ? { project_id: companyProject.projectId }
        : {}),
      ...(globalSearch ? { search: globalSearch } : {}),
      ...columnFilterParams,
      ...(tableProps.sortField
        ? {
            ordering: `${tableProps.sortOrder === -1 ? "-" : ""}${tableProps.sortField}`,
          }
        : {}),
    };
  };

  // Route-driven server list without a page-provided exporter: "Excel (all
  // data)" is built on the server (POST /exports/excel/). Only when that
  // endpoint is missing (404/405) are the rows fetched into the browser.
  const serverExport = async (filename: string, sheetName: string) => {
    if (!serverApi) return;
    const params = buildExportParams();
    try {
      await serverApi.exportToExcel({ params }, filename, sheetName);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status !== 404 && status !== 405) throw error;
      const rows = (await serverApi.readAllForExport({
        ...serverConfig,
        params,
      })) as SafeTableRows;
      if (rows.length === 0) throw new Error(NO_EXPORT_DATA_MESSAGE);
      await exportRecordsToExcel(rows, filename, sheetName, { scope: "all" });
    }
  };

  const refreshServerRows = () =>
    loadServerPage(
      serverFirst,
      serverPageSize,
      tableProps.sortField,
      tableProps.sortOrder,
    );

  const rowsForExport = exportRows ?? (serverApi ? serverRows : safeRows);
  // Derived from the column children, so memoise it: a fresh array each render
  // would re-trigger the header's metadata fetch (see DataTableHeaderActions).
  const importColumnsFromChildren = useMemo(
    () => readImportColumns(tableProps.children),
    [tableProps.children],
  );
  const resolvedImportColumns = importColumns ?? importColumnsFromChildren;
  const header =
    (exportable || filterPanel || documentActions) &&
    typeof tableProps.header !== "function" ? (
      <DataTableHeaderActions
        header={tableProps.header as ReactNode}
        rows={rowsForExport}
        pageRows={safeRows}
        importColumns={resolvedImportColumns}
        discoverImportColumns={!importColumns}
        bulkImportable={bulkImportable && canAddRecord && canImportFile}
        importApi={resolvedImportApi}
        importDefaults={importDefaults}
        importTemplateFilename={importTemplateFilename}
        importSheetName={importSheetName}
        importResultKey={importResultKey}
        onImportRows={onImportRows}
        onImportComplete={onImportComplete}
        filename={exportFilename}
        sheetName={exportSheetName}
        loadExportRows={loadExportRowsProp}
        onServerExport={
          onServerExportProp ??
          (serverApi && !loadExportRowsProp ? serverExport : undefined)
        }
        refreshRows={serverApi ? refreshServerRows : undefined}
        onPdfRequest={onPdfRequest}
        renderHeaderWithActions={renderHeaderWithActions}
        builtIns={exportable}
        filters={filterPanel}
        documentActions={documentActions}
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
        // Every paginated list shows its overall count ("1–10 of 115
        // records"); a table can still pass its own template to override.
        paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        currentPageReportTemplate="{first}–{last} of {totalRecords} records"
        {...serverTableProps}
        {...(fitWidth && {
          tableStyle: {
            tableLayout: "fixed",
            width: "100%",
            maxWidth: "100%",
            ...serverTableProps.tableStyle,
          },
          // Gridline borders poke a few px past a full-width fixed table,
          // which is enough to show a pointless horizontal scrollbar.
          className: cn(
            serverTableProps.className,
            "[&_.p-datatable-wrapper]:overflow-x-hidden!",
          ),
        })}
        header={header}
        value={(serverApi ? serverRows : safeRows) as TValue}
      />
    </div>
  );
};

export type { DataTableFilterEvent } from "primereact/datatable";
