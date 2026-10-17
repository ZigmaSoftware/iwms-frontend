import type { VehicleCreationRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { FilterBar } from "@/components/common/FilterBar";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import {
  combineFilters,
  useOptionFilter,
} from "@/components/filters/useOptionFilter";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { vehicleCreationApi } from "@/helpers/admin";
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

const FILE_ICON = "/images/pdfimage/download.png";

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

  const renderFilePreview = (value?: string | null) =>
    value ? (
      <button onClick={() => openFile(value)}>
        <img
          src={isImageUrl(value) ? value : FILE_ICON}
          className="w-28 h-16 object-cover rounded border"
        />
      </button>
    ) : (
      "-"
    );

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
          style={{ width: "80px" }}
        />
        {showCol("vehicle_no") && (
          <Column
            field="vehicle_no"
            header={t("admin.vehicle_creation.vehicle_no")}
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("vehicle_type_name") && (
          <Column
            field="vehicle_type_name"
            header={t("admin.vehicle_creation.vehicle_type")}
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("fuel_type_name") && (
          <Column
            field="fuel_type_name"
            header={t("admin.vehicle_creation.fuel_type")}
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("capacity") && (
          <Column
            field="capacity"
            header={t("admin.vehicle_creation.capacity")}
            sortable
          />
        )}
        {showCol("mileage_per_liter") && (
          <Column
            field="mileage_per_liter"
            header={t("admin.vehicle_creation.mileage_per_liter")}
            sortable
          />
        )}
        {showCol("fuel_tank_capacity") && (
          <Column
            field="fuel_tank_capacity"
            header={t("admin.vehicle_creation.fuel_tank_capacity")}
            sortable
          />
        )}
        {showCol("vehicle_condition") && (
          <Column
            field="vehicle_condition"
            header={t("admin.vehicle_creation.vehicle_condition")}
            body={(row: VehicleCreationRecord) =>
              conditionLabel(row.vehicle_condition)
            }
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("insurance_expiry_date") && (
          <Column
            field="insurance_expiry_date"
            header={t("admin.vehicle_creation.insurance_expiry_date")}
            body={(row: VehicleCreationRecord) =>
              formatDate(row.insurance_expiry_date)
            }
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("rc_upload") && (
          <Column
            field="rc_upload"
            header={t("admin.vehicle_creation.rc_upload")}
            body={(row: VehicleCreationRecord) =>
              renderFilePreview(row.rc_upload)
            }
          />
        )}
        {showCol("vehicle_insurance_file") && (
          <Column
            field="vehicle_insurance_file"
            header={t("admin.vehicle_creation.vehicle_insurance_file")}
            body={(row: VehicleCreationRecord) =>
              renderFilePreview(row.vehicle_insurance_file)
            }
          />
        )}
        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "150px" }}
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px" }}
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
    </div>
  );
}
