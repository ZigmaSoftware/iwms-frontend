import type { Customer } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import QrPreviewDialog from "@/components/common/QrPreviewDialog";
import { useTranslation } from "react-i18next";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import {
  combineFilters,
  useOptionFilter,
} from "@/components/filters/useOptionFilter";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { customerCreationApi, wasteTypeApi } from "@/helpers/admin";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import { FilterBar } from "@/components/common/FilterBar";
import {
  excelFileToCsvFile,
  exportRecordsToExcel,
  exportTemplateToExcel,
  getAdminScreenExcelFilename,
  readExcelRows,
  type ExcelTemplateColumn,
} from "@/utils/exportExcel";
import BulkUploadResultDialog from "@/components/common/BulkUploadResultDialog";
import BulkRejectedPanel from "@/components/common/BulkRejectedPanel";
import {
  clearBulkResult,
  loadBulkResult,
  normalizeBulkErrors,
  saveBulkResult,
  type BulkUploadResult,
} from "@/utils/bulkUpload";
import { runBulkUpload } from "@/utils/backgroundJobs";
import { Can } from "@/contexts/ScreenPermissionContext";
import { useScreenAccess } from "@/contexts/screenPermission";
import {
  createCustomerQrPdfBlob,
  downloadCustomerQrPdf,
} from "./customerQrPdf";
import { downloadAllCustomersPdf } from "./customerAllDetailsPdf";
import { downloadCustomerQrStickerPdf } from "./customerQrStickerPdf";

// Backend `ordering_fields` are ["customer_name", "is_active"]; only
// customer_name maps to a visible, sortable column here.
const SORTABLE_FIELDS = new Set(["customer_name"]);

const toRecordList = (value: unknown): Customer[] => {
  if (Array.isArray(value)) return value as Customer[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: Customer[] }).results;
  }
  return [];
};

const CUSTOMER_CREATION_COLUMN_FIELDS: Record<string, string[]> = {
  customer_name: ["customer_name", "name"],
  contact_no: ["contact_no", "mobile"],
  apartment_name: ["apartment_name"],
  unit: ["block_no", "flat_no"],
  ward_name: ["ward_id", "ward_name"],
  zone_name: ["zone_id", "zone_name"],
  city_name: ["city_id", "city_name"],
  state_name: ["state_id", "state_name"],
  panchayat_name: ["panchayat_id", "panchayat_name"],
  waste_types: [
    "waste_type_names",
    "waste_type_ids",
    "waste_types",
    "waste_type",
  ],
  qr_code: ["qr_code"],
  is_active: ["is_active"],
};

const CUSTOMER_BULK_TEMPLATE_COLUMNS: ExcelTemplateColumn[] = [
  {
    field: "customer_name",
    header: "customer_name",
    required: true,
    sample: "John Doe",
  },
  {
    field: "contact_no",
    header: "contact_no",
    required: true,
    sample: "9876543210",
  },
  { field: "id_proof_type", header: "id_proof_type", sample: "Aadhaar" },
  { field: "id_no", header: "id_no", sample: "1234-5678-9012" },
  { field: "building_no", header: "building_no", sample: "12" },
  { field: "street", header: "street", sample: "Main Street" },
  { field: "area", header: "area", sample: "Anna Nagar" },
  { field: "pincode", header: "pincode", sample: "600040" },
  { field: "latitude", header: "latitude", sample: "13.0827" },
  { field: "longitude", header: "longitude", sample: "80.2707" },
  { field: "sqft", header: "sqft", sample: "1200" },
  {
    field: "water_consumption_lpd",
    header: "water_consumption_lpd",
    sample: "200",
  },
  {
    field: "waste_collection_kg_per_day",
    header: "waste_collection_kg_per_day",
    sample: "5",
  },
  {
    field: "ward_name",
    header: "ward_name",
    sample: "Ward 10",
    notes: "Enter the ward name as shown in Ward master (e.g. Ward 10). Leave blank if this customer belongs to a Panchayat instead.",
  },
  {
    field: "zone_name",
    header: "zone_name",
    sample: "North Zone",
    notes: "Enter the zone name as shown in Zone master (e.g. North Zone).",
  },
  {
    field: "city_name",
    header: "city_name",
    required: true,
    sample: "Chennai",
    notes: "Enter the city name as shown in City master (e.g. Chennai).",
  },
  {
    field: "district_name",
    header: "district_name",
    required: true,
    sample: "Chennai",
    notes: "Enter the district name as shown in District master (e.g. Chennai).",
  },
  {
    field: "state_name",
    header: "state_name",
    required: true,
    sample: "Tamil Nadu",
    notes: "Enter the state name as shown in State master (e.g. Tamil Nadu).",
  },
  {
    field: "country_name",
    header: "country_name",
    required: true,
    sample: "India",
    notes: "Enter the country name as shown in Country master (e.g. India).",
  },
  {
    field: "property_name",
    header: "property_name",
    required: true,
    sample: "Residential",
    notes: "Enter the property type name as shown in Property master (e.g. Residential).",
  },
  {
    field: "sub_property_name",
    header: "sub_property_name",
    required: true,
    sample: "Apartment",
    notes: "Enter the sub property type name as shown in Sub Property master (e.g. Apartment).",
  },
  {
    // Waste types are entered by NAME, like every other lookup column here
    // ("Residential", "Ward 10"). The backend resolves names to ids and
    // scopes the match to the selected company/project, so raw WST- ids are
    // still accepted but are no longer what the template asks for.
    field: "waste_type_names",
    header: "waste_type_names",
    sample: "Wet Waste, Dry Waste",
    notes: "Comma-separated waste type names as shown in Waste Type master.",
  },
  { field: "member_count", header: "member_count", sample: "4" },
  { field: "apartment_name", header: "apartment_name", sample: "Sunrise Apt" },
  { field: "block_no", header: "block_no", sample: "A" },
  { field: "flat_no", header: "flat_no", sample: "101" },
  {
    field: "panchayat_name",
    header: "panchayat_name",
    notes: "Enter the panchayat name as shown in Panchayat master. Leave blank if this customer belongs to a Ward/Zone instead.",
  },
];

const BULK_KEY = "customer-creations";

export default function CustomerCreationListPage() {
  const { t } = useTranslation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "customer-master",
    "customer-creation",
    CUSTOMER_CREATION_COLUMN_FIELDS,
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [selectedQrCustomer, setSelectedQrCustomer] = useState<Customer | null>(
    null,
  );
  const [isPrintingQr, setIsPrintingQr] = useState(false);
  const [isPreviewingQr, setIsPreviewingQr] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingQrStickers, setIsExportingQrStickers] = useState(false);
  const requestIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { canAdd, canEdit, canImport } = useScreenAccess();
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(() =>
    loadBulkResult(BULK_KEY),
  );
  const [resultOpen, setResultOpen] = useState(false);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  const navigate = useNavigate();
  const { encCustomerMaster, encCustomerCreation } = getEncryptedRoute();

  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
  const resetPage = () => setFirst(0);
  const companyProject = useCompanyProjectFilter(resetPage, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { companies, isSuperAdmin } = companyProject.selection;

  // Active / Inactive → `?active_status=1|0`.
  const statusFilter = useOptionFilter({
    param: "active_status",
    label: "Status",
    options: [
      { label: "Active", value: "1" },
      { label: "Inactive", value: "0" },
    ],
    onAppliedChange: resetPage,
  });

  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encCustomerMaster, encCustomerCreation);

  const mappedSortField =
    sortField && SORTABLE_FIELDS.has(sortField) ? sortField : undefined;
  const ordering = mappedSortField
    ? `${sortOrder === -1 ? "-" : ""}${mappedSortField}`
    : undefined;

  const activeStatusParam = statusFilter.value;

  // ── Load data (server-side pagination) ──────────────────────────────────
  const loadRows = async (
    page: number,
    limit: number,
    search: string,
    activeStatus: string,
    orderingParam?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (search) params.search = search;
      if (activeStatus) params.active_status = activeStatus;
      if (orderingParam) params.ordering = orderingParam;

      const response = await customerCreationApi.readAllwithPaginated(
        page,
        limit,
        { params },
      );
      if (requestId !== requestIdRef.current) return;

      const rows = toRecordList(response);
      setCustomers(rows);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count: number }).count
          : rows.length,
      );
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: String(
          (error as { response?: { data?: unknown } })?.response?.data ?? error,
        ),
      });
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setCustomers([]);
      setTotalRecords(0);
      setIsLoading(false);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setCustomers([]);
      setTotalRecords(0);
      setIsLoading(false);
      return;
    }

    void loadRows(
      first / rowsPerPage + 1,
      rowsPerPage,
      globalSearchTerm,
      activeStatusParam,
      ordering,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    t,
    refetchTrigger,
    companyUniqueId,
    projectId,
    isSuperAdmin,
    companies.length,
    first,
    rowsPerPage,
    globalSearchTerm,
    activeStatusParam,
    ordering,
  ]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setGlobalSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const onSearchValueChange = (value: string) => setGlobalFilterValue(value);

  // ── Download template ─────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    // List the project's real waste type names in the template's "Column
    // Help" sheet, so the uploader types a name that actually resolves
    // instead of guessing the spelling. Falls back to the plain template if
    // the lookup fails — a template with no hint still uploads fine.
    let columns = CUSTOMER_BULK_TEMPLATE_COLUMNS;
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;

      const names = toRecordList(
        await wasteTypeApi.readAllForExport({ params }),
      )
        .flatMap((row) =>
          row.waste_types?.map((wasteType) => wasteType.waste_type_name) ?? [],
        )
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);

      const allowed = Array.from(new Set(names)).sort();
      if (allowed.length) {
        columns = CUSTOMER_BULK_TEMPLATE_COLUMNS.map((column) =>
          column.field === "waste_type_names"
            ? {
                ...column,
                notes: `Comma-separated names. Allowed: ${allowed.join(", ")}`,
              }
            : column,
        );
      }
    } catch {
      // non-fatal — ship the template without the allowed-values hint
    }

    await exportTemplateToExcel(
      columns,
      getAdminScreenExcelFilename("template"),
      "Customers",
    );
  };

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const originalRows = (await readExcelRows(file)) as Record<string, unknown>[];
      const csvFile = await excelFileToCsvFile(
        file,
        "customer_bulk_upload.csv",
      );
      const formDataObj = new FormData();
      formDataObj.append("file", csvFile);
      formDataObj.append("company_id", companyUniqueId || "");
      formDataObj.append("project_id", projectId || "");

      const result = await runBulkUpload(customerCreationApi, formDataObj);
      const successCount = Number(result?.success_count ?? 0);
      const errors = normalizeBulkErrors(result?.errors, originalRows);
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "completed",
        success_count: successCount,
        error_count: errors.length,
      });

      const uploadSummary: BulkUploadResult = {
        fileName: file.name,
        successCount,
        errors,
        originalRows,
      };
      if (errors.length > 0) saveBulkResult(BULK_KEY, uploadSummary);
      else clearBulkResult(BULK_KEY);
      setUploadResult(uploadSummary);
      setResultOpen(true);

      Swal.fire({
        icon: errors.length > 0 ? "warning" : "success",
        title: String(result?.message ?? "Upload Completed"),
        text: `Success: ${successCount} · Rejected: ${errors.length}. ${
          errors.length > 0 ? "See rejected list below." : ""
        }`,
      });

      setRefetchTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "failed",
      });
      Swal.fire("Error", "Upload failed", "error");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const fetchExportRows = async (): Promise<Customer[]> => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (globalSearchTerm) params.search = globalSearchTerm;
    if (activeStatusParam) params.active_status = activeStatusParam;

    const response = await customerCreationApi.readAllForExport({ params });
    // waste_types comes back as an array of objects, which the Excel writer
    // would JSON.stringify into an unusable blob. Emit the same
    // comma-separated names the bulk-upload template asks for, so an
    // exported file can be edited and re-uploaded as-is.
    return toRecordList(response).map((row) => ({
      ...row,
      waste_type_names:
        row.waste_types
          ?.map((wasteType) => wasteType.waste_type_name)
          .join(", ") ?? "",
      waste_types: undefined,
    }));
  };

  // Feeds the table's single "Download Excel" button: the "All data" option
  // fetches every row matching the current filters, while "Current page"
  // uses the rows already on screen.
  const loadAllExportRows = async () => fetchExportRows();

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const rows = await fetchExportRows();
      if (rows.length === 0) {
        Swal.fire(
          t("common.warning") || "Warning",
          "No customers to export",
          "warning",
        );
        return;
      }
      await downloadAllCustomersPdf(rows);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text:
          error instanceof Error
            ? error.message
            : "Failed to generate the customers PDF.",
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ── QR sticker sheet (A4, 6 stickers per page) ───────────────────────────
  const handleDownloadQrStickers = async () => {
    setIsExportingQrStickers(true);
    try {
      const rows = (await fetchExportRows()).filter((row) => row.qr_code);
      if (rows.length === 0) {
        Swal.fire(
          t("common.warning") || "Warning",
          "No customer QR codes are available for the current selection.",
          "warning",
        );
        return;
      }
      // Stamp the sheet with whichever company / project is selected above;
      // an empty value means "All", which the sheet resolves on its own.
      const appliedLabel = (key: string) =>
        companyProject.chips.find((chip) => chip.key === key)?.value;
      await downloadCustomerQrStickerPdf(rows, {
        companyName: appliedLabel("company_id"),
        projectName: appliedLabel("project_id"),
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text:
          error instanceof Error
            ? error.message
            : "Failed to generate the QR sticker sheet.",
      });
    } finally {
      setIsExportingQrStickers(false);
    }
  };

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <Can action="add">
        <Button
          label={t("admin.customer_creation.add")}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() =>
            navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
          }
        />
      </Can>
      <div className="min-w-0 flex-1">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={onSearchValueChange}
          searchPlaceholder={t("admin.customer_creation.search_placeholder")}
        />
        <input
          ref={fileInputRef}
          id="excelUpload"
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );

  const filterPanel = showCol("is_active")
    ? combineFilters(companyProject, statusFilter)
    : combineFilters(companyProject);

  const qrTemplate = (customer: Customer) => {
    if (!customer.qr_code) {
      return <span className="text-gray-400 text-xs">No QR</span>;
    }
    return (
      <button
        type="button"
        className="p-1 border rounded bg-white shadow-sm hover:bg-gray-50"
        onClick={() => setSelectedQrCustomer(customer)}
      >
        <img
          src={customer.qr_code}
          alt="QR"
          className="w-12 h-12 object-contain"
        />
      </button>
    );
  };

  const handlePreviewQr = async () => {
    if (!selectedQrCustomer) return;

    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      Swal.fire({
        icon: "warning",
        title: "Preview blocked",
        text: "Please allow pop-ups for this site to preview the PDF.",
      });
      return;
    }

    previewWindow.document.title = "Preparing customer QR PDF";
    previewWindow.document.body.innerHTML =
      '<p style="font-family:Arial,sans-serif;padding:24px;color:#475569">Preparing PDF preview…</p>';
    setIsPreviewingQr(true);
    try {
      const pdfBlob = await createCustomerQrPdfBlob(selectedQrCustomer);
      const previewUrl = URL.createObjectURL(pdfBlob);
      previewWindow.location.replace(previewUrl);
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 300_000);
    } catch (error) {
      previewWindow.close();
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text:
          error instanceof Error
            ? error.message
            : "Failed to preview the customer QR PDF.",
      });
    } finally {
      setIsPreviewingQr(false);
    }
  };

  const handlePrintQr = async () => {
    if (!selectedQrCustomer) return;
    setIsPrintingQr(true);
    try {
      await downloadCustomerQrPdf(selectedQrCustomer);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text:
          error instanceof Error
            ? error.message
            : "Failed to generate the customer QR PDF.",
      });
    } finally {
      setIsPrintingQr(false);
    }
  };

  const statusTemplate = (row: Customer) => {
    const updateStatus = async (value: boolean) => {
      setPendingStatusId(row.unique_id);
      setIsUpdating(true);
      try {
        const rawPayload = { ...row, is_active: value };
        await customerCreationApi.update(
          row.unique_id,
          filterPayload(rawPayload, ["company_id", "project_id"]) as Record<
            string,
            unknown
          >,
        );
        setCustomers((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, is_active: value }
              : item,
          ),
        );
      } catch (err) {
        console.error("Status update failed:", err);
        Swal.fire("Error", "Failed to update status", "error");
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        onCheckedChange={updateStatus}
        disabled={!canEdit || (isUpdating && pendingStatusId === row.unique_id)}
      />
    );
  };

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await customerCreationApi.delete(id, withDeleteReason(reason));
      setCustomers((current) => current.filter((item) => item.unique_id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: String(error ?? t("common.request_failed")),
      });
    }
  };

  const actionTemplate = (customer: Customer) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(customer.unique_id), {
            state: {
              companyUniqueId:
                customer.company_unique_id ?? customer.company_id,
              projectId: customer.project_unique_id ?? customer.project_id,
            },
          })
        }
        onDelete={() => void handleDelete(customer.unique_id)}
      />
    </div>
  );

  const indexTemplate = (_: Customer, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  return (
    <>
      <div className="p-3 ">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              {t("admin.customer_creation.title")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("admin.customer_creation.subtitle")}
            </p>
          </div>
        </div>

        {uploadResult && uploadResult.errors.length > 0 && (
          <BulkRejectedPanel
            result={uploadResult}
            onClear={() => {
              clearBulkResult(BULK_KEY);
              setUploadResult(null);
            }}
            onReupload={
              canAdd && canImport && companyUniqueId && projectId
                ? () => fileInputRef.current?.click()
                : undefined
            }
            onViewAll={() => setResultOpen(true)}
            downloadFilename="customer_rejected.xlsx"
          />
        )}

        <DataTable
          loadExportRows={loadAllExportRows}
          value={customers}
          bulkImportable={false}
          exportable={false}
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
          loading={isLoading && customers.length === 0}
          globalFilterFields={[
            "unique_id",
            "customer_id",
            "customer_name",
            "contact_no",
            "apartment_name",
            "block_no",
            "flat_no",
            "ward_name",
            "zone_name",
            "city_name",
            "company_name",
            "project_name",
            "waste_types",
          ]}
          header={header}
          filterPanel={filterPanel}
          documentActions={{
            downloadTemplate: { onClick: () => void downloadTemplate() },
            uploadExcel: {
              onClick: () => fileInputRef.current?.click(),
              busy: isUploading,
              disabled: !companyUniqueId || !projectId,
            },
            downloadPdf: {
              onClick: () => void handleDownloadPdf(),
              busy: isExportingPdf,
            },
            downloadQr: {
              onClick: () => void handleDownloadQrStickers(),
              busy: isExportingQrStickers,
            },
          }}
          emptyMessage={t("admin.customer_creation.empty_message")}
          stripedRows
          showGridlines
          className="p-datatable-sm"
        >
          <Column
            header={t("common.s_no")}
            body={indexTemplate}
            style={{ width: "80px" }}
          />
          <Column field="unique_id" header="Unique ID" sortable />
          <Column
            field="customer_id"
            header="Customer ID"
            sortable
            body={(row: Customer) => row.customer_id || "-"}
          />
          {showCol("customer_name") && (
            <Column
              field="customer_name"
              header={t("admin.customer_creation.customer")}
              sortable={SORTABLE_FIELDS.has("customer_name")}
            />
          )}
          {showCol("contact_no") && (
            <Column field="contact_no" header={t("common.mobile")} />
          )}
          {showCol("apartment_name") && (
            <Column
              field="apartment_name"
              header="Apartment"
              body={(row: Customer) =>
                row.apartment_name && row.apartment_name.trim() !== ""
                  ? cap(row.apartment_name)
                  : "-"
              }
            />
          )}
          {showCol("unit") && (
            <Column
              header="Unit"
              body={(row: Customer) =>
                row.block_no && row.flat_no
                  ? `${row.block_no}-${row.flat_no}`
                  : "-"
              }
            />
          )}
          {showCol("ward_name") && (
            <Column
              field="ward_name"
              header={t("common.ward")}
              body={(row: Customer) => row.ward_name || "-"}
            />
          )}
          {showCol("zone_name") && (
            <Column
              field="zone_name"
              header={t("common.zone")}
              body={(row: Customer) => row.zone_name || "-"}
            />
          )}
          {showCol("city_name") && (
            <Column field="city_name" header={t("common.city")} />
          )}
          {showCol("state_name") && (
            <Column field="state_name" header={t("common.state")} />
          )}
          {showCol("panchayat_name") && (
            <Column
              field="panchayat_name"
              header={t("admin.nav.panchayat")}
              body={(row: Customer) => row.panchayat_name || "-"}
            />
          )}
          {showCol("waste_types") && (
            <Column
              field="waste_types"
              header={t("common.waste_type")}
              body={(row: Customer) =>
                row.waste_types?.length
                  ? row.waste_types
                      .map((wasteType) => wasteType.waste_type_name)
                      .join(", ")
                  : "-"
              }
            />
          )}
          {showCol("qr_code") && (
            <Column
              header={t("admin.customer_creation.qr_label")}
              body={qrTemplate}
              style={{ width: "100px" }}
            />
          )}
          {showCol("is_active") && (
            <Column
              field="is_active"
              header={t("common.status")}
              body={statusTemplate}
            />
          )}
          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ textAlign: "center" }}
          />
        </DataTable>
      </div>
      <BulkUploadResultDialog
        visible={resultOpen}
        onClose={() => setResultOpen(false)}
        title="Customer bulk upload — rejected records"
        result={uploadResult}
        downloadFilename="customer_rejected.xlsx"
      />
      <QrPreviewDialog
        open={Boolean(selectedQrCustomer)}
        onOpenChange={(open) => !open && setSelectedQrCustomer(null)}
        title={t("admin.customer_creation.qr_title")}
        qrImageUrl={selectedQrCustomer?.qr_code}
        fileName={`${selectedQrCustomer?.customer_id || selectedQrCustomer?.unique_id || selectedQrCustomer?.customer_name || "customer"}_qr`}
        description={
          selectedQrCustomer && (
            <>
              <p className="font-semibold text-gray-800">
                {selectedQrCustomer.customer_name}
              </p>
              <p className="text-sm text-gray-500">
                {selectedQrCustomer.customer_id || "-"}
              </p>
            </>
          )
        }
        extraActions={
          <>
            <Button
              label={isPreviewingQr ? "Preparing..." : "Preview"}
              icon="pi pi-eye"
              loading={isPreviewingQr}
              disabled={isPreviewingQr || isPrintingQr}
              onClick={handlePreviewQr}
              className="flex-1 p-button-outlined"
            />
            <Button
              label={isPrintingQr ? "Preparing..." : "Print"}
              icon="pi pi-print"
              loading={isPrintingQr}
              disabled={isPrintingQr || isPreviewingQr}
              onClick={handlePrintQr}
              className="flex-1"
            />
          </>
        }
      />
    </>
  );
}
