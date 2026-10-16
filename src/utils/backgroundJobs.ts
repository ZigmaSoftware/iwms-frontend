import { saveAs } from "file-saver";
import { api } from "@/api";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import type { CrudHelpers } from "@/helpers/admin/crudHelpers";

/**
 * Bulk uploads and server-side Excel exports. In IWMS both are synchronous:
 * the backend answers the request with the finished result (no job id, no
 * polling). Kept under the TN name so shared code ports unchanged.
 */

type ActionApi = Pick<CrudHelpers, "action">;

/** Body of a 200 from `POST <resource>/bulk-upload/`. */
export type BulkUploadResponse = {
  message?: string;
  success_count?: number;
  error_count?: number;
  total_count?: number;
  errors?: Array<{ row: number; error: unknown; data?: Record<string, unknown> }>;
  file_name?: string;
  [key: string]: unknown;
};

/**
 * POST <resource>/bulk-upload/ (multipart field `file`, a CSV). Resolves with
 * the upload result; rejects with the axios error (404/405 → the resource has
 * no bulk-upload endpoint — callers fall back to per-row create).
 */
export const runBulkUpload = async <R = BulkUploadResponse>(
  resourceApi: ActionApi,
  formData: FormData,
): Promise<R> =>
  resourceApi.action<R>("bulk-upload", formData, {
    // Let axios emit "multipart/form-data; boundary=..." itself.
    headers: { "Content-Type": undefined },
  });

export type ExportColumn = { header: string; field: string };

/**
 * Message thrown by runServerExport when the filters match no rows. Other
 * failures throw an Error carrying the HTTP `status` (404/405 → no
 * /exports/excel/ endpoint).
 */
export const NO_EXPORT_DATA_MESSAGE = "There is no data to export.";

const readBlobError = async (error: unknown): Promise<string> => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text()) as Record<string, unknown>;
      const message = body.detail ?? body.error ?? Object.values(body)[0];
      if (message) return String(message);
    } catch {
      /* not JSON */
    }
  }
  return error instanceof Error ? error.message : "Export failed.";
};

/**
 * Export every row of a list endpoint to Excel in ONE request: the backend
 * reads all rows (same filters, permissions and scoping as the list) and
 * returns the .xlsx (`X-Row-Count` header). `resourcePath` is the list
 * endpoint relative to the API root, e.g. "/masters/fuels/" — the same
 * `resource` createCrudHelpers requests.
 *
 * Throws NO_EXPORT_DATA_MESSAGE when the export has no rows; records one
 * "download_all_excel" audit entry on success.
 */
export const runServerExport = async ({
  resourcePath,
  params,
  columns,
  filename,
  sheetName = "Export",
}: {
  resourcePath: string;
  params?: Record<string, unknown>;
  /** Pick and name columns (dotted fields); default: every field. */
  columns?: ExportColumn[];
  filename: string;
  sheetName?: string;
}) => {
  const fileName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  let response;
  try {
    response = await api.post<Blob>(
      "/exports/excel/",
      {
        path: resourcePath,
        params: params ?? {},
        columns: columns ?? null,
        file_name: fileName,
        sheet_name: sheetName,
      },
      { responseType: "blob" },
    );
  } catch (error) {
    // Keep the HTTP status: 404/405 means this backend has no export endpoint.
    const failure: Error & { status?: number } = new Error(
      await readBlobError(error),
    );
    failure.status = (error as { response?: { status?: number } })?.response?.status;
    throw failure;
  }

  // Cross-origin, the header is only readable when the backend lists it in
  // Access-Control-Expose-Headers; a missing header is "unknown", not 0.
  const rawCount = response.headers["x-row-count"];
  const rowCount =
    rawCount === undefined || rawCount === null || rawCount === ""
      ? null
      : Number(rawCount);
  if (rowCount === 0) throw new Error(NO_EXPORT_DATA_MESSAGE);

  recordExcelAudit("download_all_excel", {
    file_name: fileName,
    ...(rowCount !== null ? { row_count: rowCount } : {}),
    scope: "all",
    server_side: true,
  });
  saveAs(response.data, fileName);
};
