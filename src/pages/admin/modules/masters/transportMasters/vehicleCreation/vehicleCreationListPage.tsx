import type { VehicleCreationRecord, VehicleDocumentHistoryRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { FilterBar } from "@/components/common/FilterBar";
import { StackCell } from "@/components/common/TableCells";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import {
  combineFilters,
  useOptionFilter,
} from "@/components/filters/useOptionFilter";

import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { vehicleCreationApi } from "@/helpers/admin";
import { fileNameFromUrl, resolveMediaUrl } from "@/utils/mediaUrl";
import { adminApi } from "@/helpers/admin/registry";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import {
  excelFileToCsvFile,
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

// ─── Types ────────────────────────────────────────────────────────────────────


const VEHICLE_CREATION_COLUMN_FIELDS: Record<string, string[]> = {
  vehicle_no: ["vehicle_no", "vehicle"],
  vehicle_type_name: ["vehicle_type_id", "vehicle_type_name", "vehicle_type"],
  fuel_type_name: ["fuel_type_id", "fuel_type_name", "fuel_type"],
  capacity: ["capacity"],
  mileage_per_liter: ["mileage_per_liter", "mileage"],
  fuel_tank_capacity: ["fuel_tank_capacity"],
  vehicle_condition: ["vehicle_condition"],
  insurance_expiry_date: ["insurance_expiry_date"],
  rc_upload: ["rc_upload"],
  vehicle_insurance_file: ["vehicle_insurance_file"],
  is_active: ["is_active", "status", "active_status"],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_BULK_TEMPLATE_COLUMNS: ExcelTemplateColumn[] = [
  { field: "vehicle_no", header: "vehicle_no", required: true, sample: "KA01AB1234" },
  {
    field: "vehicle_type",
    header: "vehicle_type",
    sample: "Compactor",
    notes: "Enter the vehicle type name as shown in Vehicle Type master (e.g. Compactor). The unique ID also still works.",
  },
  {
    field: "fuel_type",
    header: "fuel_type",
    sample: "Diesel",
    notes: "Enter the fuel type name as shown in Fuel master (e.g. Diesel). The unique ID also still works.",
  },
  { field: "capacity", header: "capacity", sample: "7500" },
  { field: "mileage_per_liter", header: "mileage_per_liter", sample: "5.4" },
  { field: "service_record", header: "service_record", sample: "Service at 2024-11-30" },
  { field: "vehicle_insurance", header: "vehicle_insurance", sample: "ICICI Lombard" },
  { field: "insurance_expiry_date", header: "insurance_expiry_date", sample: "2026-05-31" },
  { field: "vehicle_condition", header: "vehicle_condition", sample: "NEW" },
  { field: "fuel_tank_capacity", header: "fuel_tank_capacity", sample: "400" },
  { field: "is_active", header: "is_active", sample: "true" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (value?: string | null) =>
  value ? String(value).split("T")[0] : "-";

const isImageUrl = (url?: string | null) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  );
};

const toHistoryList = (value: unknown): VehicleDocumentHistoryRecord[] => {
  if (Array.isArray(value)) return value as VehicleDocumentHistoryRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: VehicleDocumentHistoryRecord[] }).results;
  }
  return [];
};

/** View + download buttons for one stored document. */
function FileActions({
  value,
  onOpenFile,
}: {
  value?: string | null;
  onOpenFile: (fileUrl?: string | null) => void;
}) {
  const url = resolveMediaUrl(value);
  if (!url) return <span className="text-gray-400">-</span>;
  const name = fileNameFromUrl(value);
  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label={`View ${name}`}
        title="View"
        onClick={() => onOpenFile(url)}
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-blue-100 text-blue-700 hover:bg-blue-50 hover:text-blue-900"
      >
        <span className={isImageUrl(url) ? "pi pi-image" : "pi pi-file-pdf"} aria-hidden="true" />
      </button>
      <a
        href={url}
        download={name}
        aria-label={`Download ${name}`}
        title="Download"
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-green-100 text-green-700 hover:bg-green-50 hover:text-green-900"
      >
        <span className="pi pi-download" aria-hidden="true" />
      </a>
    </div>
  );
}

function DocumentHistoryDialog({
  vehicle,
  rows,
  loading,
  error,
  onClose,
  onOpenFile,
}: {
  vehicle: VehicleCreationRecord;
  rows: VehicleDocumentHistoryRecord[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onOpenFile: (fileUrl?: string | null) => void;
}) {
  const documentLabel = (value?: string | null) => {
    if (value === "INSURANCE") return "Insurance";
    if (value === "RC") return "RC";
    return value || "-";
  };

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div>
          <p className="text-lg font-semibold text-gray-800">Document History</p>
          <p className="mt-0.5 text-xs font-normal text-gray-500">{vehicle.vehicle_no}</p>
        </div>
      }
      style={{ width: "min(980px, 94vw)" }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="pt-2">
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading document history">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 rounded-md bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-700">No document history yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Renewed insurance or RC changes will appear here after the vehicle is updated.
            </p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="max-h-[60vh] overflow-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2">Old No.</th>
                  <th className="px-3 py-2">New No.</th>
                  <th className="px-3 py-2">Old Expiry</th>
                  <th className="px-3 py-2">New Expiry</th>
                  <th className="px-3 py-2">Old File</th>
                  <th className="px-3 py-2">New File</th>
                  <th className="px-3 py-2">Updated By</th>
                  <th className="px-3 py-2">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map((item) => (
                  <tr key={item.unique_id} className="align-top">
                    <td className="px-3 py-3 font-medium text-gray-800">{documentLabel(item.document_type)}</td>
                    <td className="px-3 py-3 text-gray-600">{item.previous_document_number || "-"}</td>
                    <td className="px-3 py-3 text-gray-800">{item.new_document_number || "-"}</td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(item.previous_expiry_date)}</td>
                    <td className="px-3 py-3 text-gray-800">{formatDate(item.new_expiry_date)}</td>
                    <td className="px-3 py-3"><FileActions value={item.previous_file} onOpenFile={onOpenFile} /></td>
                    <td className="px-3 py-3"><FileActions value={item.new_file} onOpenFile={onOpenFile} /></td>
                    <td className="px-3 py-3 text-gray-600">{item.changed_by_name || item.changed_by_id || "-"}</td>
                    <td className="px-3 py-3 text-gray-600">{formatDate(item.changed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleCreationListPage() {
  const { t } = useTranslation();
  const { canEdit, canAdd, canImport } = useScreenAccess();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "transport-master",
    "vehicle-creation",
    VEHICLE_CREATION_COLUMN_FIELDS,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<VehicleCreationRecord | null>(null);
  const [historyRows, setHistoryRows] = useState<VehicleDocumentHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filteredRows, setFilteredRows] = useState<VehicleCreationRecord[]>([]);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: {
      value: null as string | null,
      matchMode: FilterMatchMode.CONTAINS,
    },
    vehicle_no: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    vehicle_type_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    fuel_type_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    vehicle_condition: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    insurance_expiry_date: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    is_active: {
      value: null as boolean | null,
      matchMode: FilterMatchMode.EQUALS,
    },
  });

  const [allVehicles, setAllVehicles] = useState<VehicleCreationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const requestIdRef = useRef(0);
  const BULK_KEY = "vehicle-creation";
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(
    () => loadBulkResult(BULK_KEY),
  );
  const [resultOpen, setResultOpen] = useState(false);

  // ── Company / Project ─────────────────────────────────────────────────────
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
  const companyProject = useCompanyProjectFilter(undefined, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { companies, isSuperAdmin } = companyProject.selection;

  // ── Routes ────────────────────────────────────────────────────────────────
  const { encTransportMaster, encVehicleCreation } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encTransportMaster,
    encVehicleCreation,
  );

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setAllVehicles([]);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setAllVehicles([]);
      return;
    }

    let mounted = true;
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;

    vehicleCreationApi
      .readAll({ params })
      .then((data: unknown) => {
        if (!mounted || requestId !== requestIdRef.current) return;
        const list = Array.isArray(data)
          ? (data as VehicleCreationRecord[])
          : [];
        const seen = new Set<string>();
        setAllVehicles(
          list.filter((row) => {
            const key = row.unique_id?.toString();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
        );
      })
      .catch((error: unknown) => {
        if (!mounted || requestId !== requestIdRef.current) return;
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: String(error),
        });
      })
      .finally(() => {
        if (mounted && requestId === requestIdRef.current) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [t, refetchTrigger, companyUniqueId, projectId, isSuperAdmin, companies.length]);

  // Company/project scoping is now applied server-side via params above —
  // no client-side narrowing needed.
  const rows: VehicleCreationRecord[] =
    (isSuperAdmin && companies.length === 0) || (!companyUniqueId && !isSuperAdmin)
      ? []
      : allVehicles;

  // Keeps exported Excel rows in sync with the currently displayed
  // (filtered/searched) rows rather than the full unfiltered set.
  useEffect(() => {
    setFilteredRows(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVehicles, companyUniqueId, isSuperAdmin, companies.length]);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  // Active / Inactive in the Filters panel; applied to the table's
  // `is_active` column filter.
  const statusFilter = useOptionFilter({
    param: "is_active",
    label: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
    onAppliedChange: (value) =>
      setFilters((prev) => ({
        ...prev,
        is_active: {
          value: value ? value === "active" : null,
          matchMode: FilterMatchMode.EQUALS,
        },
      })),
  });

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const downloadVehicleTemplate = async () => {
    await exportTemplateToExcel(
      VEHICLE_BULK_TEMPLATE_COLUMNS,
      getAdminScreenExcelFilename("template"),
      "Vehicles",
    );
  };

  const handleVehicleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const originalRows = (await readExcelRows(file)) as Record<
        string,
        unknown
      >[];
      const csvFile = await excelFileToCsvFile(file, "vehicle_bulk_upload.csv");
      const formData = new FormData();
      formData.append("file", csvFile);
      if (companyUniqueId) formData.append("company_id_input", companyUniqueId);
      if (projectId) formData.append("project_id_input", projectId);

      const res = await runBulkUpload(adminApi.vehicleCreations, formData);

      const errors = normalizeBulkErrors(res.errors, originalRows);
      const successCount = Number(res.success_count ?? 0);
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "completed",
        success_count: successCount,
        error_count: errors.length,
      });
      const result: BulkUploadResult = {
        fileName: file.name,
        successCount,
        errors,
        originalRows,
      };
      // Persist rejected rows so they stay visible across refetch / reload.
      if (errors.length > 0) saveBulkResult(BULK_KEY, result);
      else clearBulkResult(BULK_KEY);
      setUploadResult(result);
      setResultOpen(true);

      Swal.fire({
        icon: errors.length > 0 ? "warning" : "success",
        title: "Upload Completed",
        text: `Success: ${successCount} · Rejected: ${errors.length}. ${errors.length > 0 ? "See rejected list below." : ""}`,
      });

      setRefetchTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Vehicle bulk upload failed:", err);
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "failed",
      });
      Swal.fire("Error", "Upload failed", "error");
    } finally {
      event.target.value = "";
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await vehicleCreationApi.delete(id, withDeleteReason(reason));
      setAllVehicles((current) =>
        current.filter((item) => item.unique_id !== id),
      );
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: t("common.request_failed"),
      });
    }
  };

  // ── File preview ──────────────────────────────────────────────────────────
  const openFile = (fileUrl?: string | null) => {
    if (!fileUrl) return;
    if (isImageUrl(fileUrl)) {
      setModalImage(fileUrl);
    } else {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const renderFilePreview = (value?: string | null) => (
    <FileActions value={value} onOpenFile={openFile} />
  );

  const openDocumentHistory = async (row: VehicleCreationRecord) => {
    setHistoryVehicle(row);
    setHistoryRows([]);
    setHistoryError(null);
    setHistoryLoading(true);

    try {
      const response = await vehicleCreationApi.read(`${row.unique_id}/document-history/`);
      setHistoryRows(toHistoryList(response));
    } catch (error) {
      console.error("Failed to load vehicle document history:", error);
      setHistoryError(t("common.request_failed"));
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Status toggle ─────────────────────────────────────────────────────────
  const statusTemplate = (row: VehicleCreationRecord) => {
    const updateStatus = async (value: boolean) => {
      setPendingStatusId(row.unique_id);
      setIsUpdating(true);
      try {
        await vehicleCreationApi.update(
          row.unique_id,
          filterPayload({
            vehicle_no: row.vehicle_no,
            vehicle_type_id: row.vehicle_type_id ?? null,
            fuel_type_id: row.fuel_type_id ?? null,
            capacity: row.capacity ?? null,
            mileage_per_liter: row.mileage_per_liter ?? null,
            service_record: row.service_record ?? null,
            vehicle_insurance: row.vehicle_insurance ?? null,
            insurance_expiry_date: row.insurance_expiry_date ?? null,
            vehicle_condition: row.vehicle_condition ?? "NEW",
            fuel_tank_capacity: row.fuel_tank_capacity ?? null,
            is_active: value,
          }) as Record<string, unknown>,
        );
        setAllVehicles((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, is_active: value }
              : item,
          ),
        );
      } catch (error) {
        console.error("Status update failed:", error);
        Swal.fire({
          icon: "error",
          title: t("common.update_status_failed"),
          text: t("common.request_failed"),
        });
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        disabled={!canEdit || (isUpdating && pendingStatusId === row.unique_id)}
        onCheckedChange={updateStatus}
      />
    );
  };

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionTemplate = (row: VehicleCreationRecord) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        onDelete={() => void handleDelete(row.unique_id)}
        actions={[
          {
            key: "document-history",
            label: "Document History",
            icon: <span className="pi pi-history text-sm" aria-hidden="true" />,
            onClick: () => void openDocumentHistory(row),
          },
        ]}
      />
    </div>
  );

  const conditionLabel = (value?: string | null) => {
    if (value === "SECOND_HAND")
      return t("admin.vehicle_creation.condition_second_hand");
    if (value === "NEW") return t("admin.vehicle_creation.condition_new");
    return value || "-";
  };

  // ── Table header ──────────────────────────────────────────────────────────
  const renderHeader = () => (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={(value) =>
        onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
      }
      searchPlaceholder={t("admin.vehicle_creation.search_placeholder")}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      {/* Page header */}
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            {t("admin.vehicle_creation.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.vehicle_creation.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add button */}
          <Can action="add">
            <Button
              label={t("admin.vehicle_creation.add")}
              icon="pi pi-plus"
              className="p-button-success"
           
              onClick={() =>
                navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
              }
            />
          </Can>
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
            canAdd && canImport ? () => fileInputRef.current?.click() : undefined
          }
          onViewAll={() => setResultOpen(true)}
          downloadFilename="vehicle_rejected.xlsx"
        />
      )}

      {/* Table */}
      <DataTable
        value={rows}
        exportRows={filteredRows}
        onValueChange={(value) => setFilteredRows(value as VehicleCreationRecord[])}
        bulkImportable={false}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && rows.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        filterPanel={combineFilters(companyProject, statusFilter)}
        documentActions={{
          // the vehicle bulk upload (CSV conversion + company/project inputs)
          downloadTemplate: { onClick: () => void downloadVehicleTemplate() },
          uploadExcel: { onClick: () => fileInputRef.current?.click() },
        }}
        stripedRows
        showGridlines
        fitWidth
        className="p-datatable-sm"
        globalFilterFields={[
          ...(showCol("vehicle_no") ? ["vehicle_no"] : []),
          ...(showCol("vehicle_type_name") ? ["vehicle_type_name"] : []),
          ...(showCol("fuel_type_name") ? ["fuel_type_name"] : []),
          "company_name",
          "project_name",
        ]}
        emptyMessage={t("admin.vehicle_creation.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(
            _: VehicleCreationRecord,
            { rowIndex }: { rowIndex: number },
          ) => rowIndex + 1}
          style={{ width: "5%" }}
        />
        {showCol("vehicle_no") && (
          <Column
            field="vehicle_no"
            header={t("admin.vehicle_creation.vehicle_no")}
            sortable
            style={{ width: "20%" }}
            body={(row: VehicleCreationRecord) => (
              <StackCell
                primary={row.vehicle_no}
                lines={[
                  showCol("vehicle_type_name") && {
                    icon: "pi-truck",
                    value: row.vehicle_type_name,
                  },
                  showCol("vehicle_condition") && {
                    label: t("admin.vehicle_creation.vehicle_condition"),
                    value: conditionLabel(row.vehicle_condition),
                  },
                ]}
              />
            )}
          />
        )}
        <Column
          field="fuel_type_name"
          header="Specifications"
          style={{ width: "22%" }}
          body={(row: VehicleCreationRecord) => (
            <StackCell
              lines={[
                showCol("fuel_type_name") && {
                  label: t("admin.vehicle_creation.fuel_type"),
                  value: row.fuel_type_name,
                },
                showCol("capacity") && {
                  label: t("admin.vehicle_creation.capacity"),
                  value: row.capacity,
                },
                showCol("mileage_per_liter") && {
                  label: t("admin.vehicle_creation.mileage_per_liter"),
                  value: row.mileage_per_liter,
                },
                showCol("fuel_tank_capacity") && {
                  label: t("admin.vehicle_creation.fuel_tank_capacity"),
                  value: row.fuel_tank_capacity,
                },
              ]}
            />
          )}
        />
        <Column
          field="operational_status"
          header={t("admin.vehicle_creation.operational_status")}
          style={{ width: "12%" }}
          body={(row: VehicleCreationRecord) =>
            row.operational_status === "BREAKDOWN" ? (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                {t("admin.vehicle_creation.operational_status_breakdown")}
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {t("admin.vehicle_creation.operational_status_active")}
              </span>
            )
          }
          sortable
        />
        {showCol("insurance_expiry_date") && (
          <Column
            field="insurance_expiry_date"
            header={t("admin.vehicle_creation.insurance_expiry_date")}
            style={{ width: "12%" }}
            body={(row: VehicleCreationRecord) =>
              formatDate(row.insurance_expiry_date)
            }
            sortable
          />
        )}
        {(showCol("rc_upload") || showCol("vehicle_insurance_file")) && (
          <Column
            header="Documents"
            style={{ width: "14%" }}
            body={(row: VehicleCreationRecord) => (
              <StackCell
                lines={[
                  showCol("rc_upload") && {
                    label: t("admin.vehicle_creation.rc_upload"),
                    value: row.rc_upload ? renderFilePreview(row.rc_upload) : null,
                  },
                  showCol("vehicle_insurance_file") && {
                    label: t("admin.vehicle_creation.vehicle_insurance_file"),
                    value: row.vehicle_insurance_file
                      ? renderFilePreview(row.vehicle_insurance_file)
                      : null,
                  },
                ]}
              />
            )}
          />
        )}
        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "8%" }}
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "7%" }}
        />
      </DataTable>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        onChange={handleVehicleFileUpload}
      />

      <BulkUploadResultDialog
        visible={resultOpen}
        onClose={() => setResultOpen(false)}
        title="Vehicle bulk upload — rejected records"
        result={uploadResult}
        downloadFilename="vehicle_rejected.xlsx"
      />

      {/* Image modal */}
      {modalImage && (
        <div className="fixed inset-0 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow relative">
            <button
              className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded"
              onClick={() => setModalImage(null)}
            >
              X
            </button>
            <img src={modalImage} className="w-[400px] h-[400px] rounded" />
          </div>
        </div>
      )}

      {historyVehicle && (
        <DocumentHistoryDialog
          vehicle={historyVehicle}
          rows={historyRows}
          loading={historyLoading}
          error={historyError}
          onClose={() => setHistoryVehicle(null)}
          onOpenFile={openFile}
        />
      )}
    </div>
  );
}
