import { useRef, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { adminApi } from "@/helpers/admin/registry";
import {
  type VehicleCreationPayload,
  useVehicleCreationsQuery,
  useUpdateVehicleCreationMutation,
  useDeleteVehicleCreationMutation,
} from "@/tanstack/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleCreationRecord = {
  unique_id: string;
  vehicle_no: string;
  vehicle_type_id?: string | null;
  fuel_type_id?: string | null;
  vehicle_type_name?: string | null;
  fuel_type_name?: string | null;
  capacity?: string | null;
  mileage_per_liter?: string | null;
  service_record?: string | null;
  vehicle_insurance?: string | null;
  insurance_expiry_date?: string | null;
  vehicle_condition?: "NEW" | "SECOND_HAND" | string | null;
  fuel_tank_capacity?: string | null;
  rc_upload?: string | null;
  vehicle_insurance_file?: string | null;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

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

const vehicleCreationApi = adminApi.vehicleCreations;
const FILE_ICON = "/images/pdfimage/download.png";

const VEHICLE_BULK_TEMPLATE_HEADERS = [
  "vehicle_no",
  "vehicle_type",
  "fuel_type",
  "capacity",
  "mileage_per_liter",
  "service_record",
  "vehicle_insurance",
  "insurance_expiry_date",
  "vehicle_condition",
  "fuel_tank_capacity",
  "is_active",
];

const VEHICLE_BULK_EXAMPLE_ROW = [
  "KA01AB1234",
  "Compactor",
  "Diesel",
  "7500",
  "5.4",
  "Service at 2024-11-30",
  "ICICI Lombard",
  "2026-05-31",
  "NEW",
  "400",
  "true",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

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
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "transport-master",
    "vehicle-creation",
    VEHICLE_CREATION_COLUMN_FIELDS
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    vehicle_no: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_type_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    fuel_type_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_condition: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    insurance_expiry_date: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  // ── Company / Project ─────────────────────────────────────────────────────
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  // ── Routes ────────────────────────────────────────────────────────────────
  const { encTransportMaster, encVehicleCreation } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleCreation}/new`;
  const ENC_EDIT_PATH = (id: string | number) =>
    `/${encTransportMaster}/${encVehicleCreation}/${id}/edit`;

  // ── TanStack ──────────────────────────────────────────────────────────────
  const vehicleCreationsQuery = useVehicleCreationsQuery(
    companyUniqueId
      ? { company_id: companyUniqueId, project_id: projectId || undefined }
      : null
  );
  const updateMutation = useUpdateVehicleCreationMutation();
  const deleteMutation = useDeleteVehicleCreationMutation();

  // ── Derived rows with client-side filter ──────────────────────────────────
  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as VehicleCreationRecord[];
    if (!companyUniqueId) return [] as VehicleCreationRecord[];

    const list = Array.isArray(vehicleCreationsQuery.data)
      ? (vehicleCreationsQuery.data as VehicleCreationRecord[])
      : [];

    // Deduplicate by unique_id
    const seen = new Set<string>();
    return list.filter((row) => {
      const key = row.unique_id?.toString();
      if (!key || seen.has(key)) return false;
      seen.add(key);

      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;
      return companyMatches && projectMatches;
    });
  })();

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

  // ── Bulk upload ───────────────────────────────────────────────────────────
  const downloadVehicleTemplate = () => {
    const csvContent = [VEHICLE_BULK_TEMPLATE_HEADERS, VEHICLE_BULK_EXAMPLE_ROW]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "vehicle_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVehicleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (companyUniqueId) formData.append("company_id_input", companyUniqueId);
    if (projectId) formData.append("project_id_input", projectId);

    try {
      const res = await vehicleCreationApi.action("bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const errors = Array.isArray(res.errors) ? res.errors : [];
      const errorPreview =
        errors.length > 0
          ? `<hr/><div class="text-left text-xs mt-2">${errors
              .slice(0, 3)
              .map((entry: { row: number; error: unknown }) => {
                const detail =
                  typeof entry.error === "string"
                    ? entry.error
                    : JSON.stringify(entry.error);
                return `Row ${entry.row}: ${detail}`;
              })
              .join("<br/>")}</div>`
          : "";

      Swal.fire({
        icon: "success",
        title: "Upload Completed",
        html: `<b>Success:</b> ${res.success_count}<br/><b>Errors:</b> ${errors.length}${errorPreview}`,
      });

      // Invalidate so TanStack refetches the list
      await vehicleCreationsQuery.refetch();
    } catch (err) {
      console.error("Vehicle bulk upload failed:", err);
      Swal.fire("Error", "Upload failed", "error");
    } finally {
      event.target.value = "";
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });
    if (!confirmDelete.isConfirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
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
      try {
        await updateMutation.mutateAsync({
          id: row.unique_id,
          payload: filterPayload({
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
          }) as unknown as VehicleCreationPayload,
        });
      } catch (error) {
        console.error("Status update failed:", error);
        Swal.fire({
          icon: "error",
          title: t("common.update_status_failed"),
          text: t("common.request_failed"),
        });
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionTemplate = (row: VehicleCreationRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
      <button
        onClick={() => handleDelete(row.unique_id)}
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
        title={t("common.delete")}
      >
        <TrashBinIcon className="size-5" />
      </button>
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
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.vehicle_creation.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          label={t("admin.vehicle_creation.download_template", {
            defaultValue: "Download Template",
          })}
          icon="pi pi-download"
          severity="secondary"
          className="p-button-sm"
          onClick={downloadVehicleTemplate}
        />
        <Button
          label={t("admin.vehicle_creation.upload_csv", {
            defaultValue: "Upload CSV",
          })}
          icon="pi pi-upload"
          className="p-button-sm"
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={handleVehicleFileUpload}
        />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.vehicle_creation.title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("admin.vehicle_creation.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Company filter */}
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", {
                item: t("admin.nav.company"),
              })}
            </option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          {/* Project filter */}
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", {
                item: t("admin.nav.project"),
              })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          {/* Add button */}
          <Button
            label={t("admin.vehicle_creation.add")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={
          vehicleCreationsQuery.isPending || vehicleCreationsQuery.isFetching
        }
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
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
          body={(_: VehicleCreationRecord, { rowIndex }: { rowIndex: number }) =>
            rowIndex + 1
          }
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
            body={(row: VehicleCreationRecord) => renderFilePreview(row.rc_upload)}
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
