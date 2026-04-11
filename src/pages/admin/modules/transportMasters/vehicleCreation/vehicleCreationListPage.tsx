import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

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

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  vehicle_no?: { value: string | null; matchMode: FilterMatchMode };
  vehicle_type_name?: { value: string | null; matchMode: FilterMatchMode };
  fuel_type_name?: { value: string | null; matchMode: FilterMatchMode };
  vehicle_condition?: { value: string | null; matchMode: FilterMatchMode };
  insurance_expiry_date?: { value: string | null; matchMode: FilterMatchMode };
  rc_upload?: { value: string | null; matchMode: FilterMatchMode };
  vehicle_insurance_file?: { value: string | null; matchMode: FilterMatchMode };
};

const vehicleCreationApi = adminApi.vehicleCreations;
const FILE_ICON = "/images/pdfimage/download.png";

const normalizeVehicleCreations = (payload: any): VehicleCreationRecord[] => {
  const rawList: VehicleCreationRecord[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const seen = new Set<string>();
  return rawList.filter((item) => {
    const key = (item?.unique_id ?? item?.vehicle_no)?.toString();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return String(value).split("T")[0];
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function VehicleCreationListPage() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<VehicleCreationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const { encTransportMaster, encVehicleCreation } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleCreation}/new`;
  const ENC_EDIT_PATH = (id: string | number) =>
    `/${encTransportMaster}/${encVehicleCreation}/${id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  //   vehicle_no: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    vehicle_no: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_type_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    fuel_type_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_condition: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    insurance_expiry_date: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    rc_upload: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_insurance_file: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });


  const resolveId = (row: VehicleCreationRecord) => row.unique_id;

  const fetchVehicles = async () => {
    if (isSuperAdmin && companies.length === 0) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await vehicleCreationApi.list({ params });
      const rows = normalizeVehicleCreations(res);

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setVehicles(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setVehicles(filtered);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: t("common.fetch_failed"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

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
      await vehicleCreationApi.remove(id);
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
      fetchVehicles();
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: t("common.request_failed"),
      });
    }
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated.global.value = value;
    setFilters(updated);
    setGlobalFilterValue(value);
  };

  const conditionLabel = (value?: string | null) => {
    if (value === "SECOND_HAND") return t("admin.vehicle_creation.condition_second_hand");
    if (value === "NEW") return t("admin.vehicle_creation.condition_new");
    return value || "-";
  };

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

  const statusTemplate = (row: VehicleCreationRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await vehicleCreationApi.update(resolveId(row), {
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
        });
        fetchVehicles();
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

  const actionTemplate = (row: VehicleCreationRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(resolveId(row)))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
      <button
        onClick={() => handleDelete(resolveId(row))}
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
        title={t("common.delete")}
      >
        <TrashBinIcon className="size-5" />
      </button>
    </div>
  );

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.vehicle_creation.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
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
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            </option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("admin.vehicle_creation.add")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={vehicles}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "vehicle_no",
          "vehicle_type_name",
          "fuel_type_name",
          "company_name",
          "project_name",
        ]}
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("admin.vehicle_creation.empty_message")}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: "80px" }}
        />

        <Column field="vehicle_no" header={t("admin.vehicle_creation.vehicle_no")} sortable filter showFilterMatchModes={false} />
        <Column field="vehicle_type_name" header={t("admin.vehicle_creation.vehicle_type")} sortable filter showFilterMatchModes={false} />
        <Column field="fuel_type_name" header={t("admin.vehicle_creation.fuel_type")} sortable filter showFilterMatchModes={false} />
        <Column field="capacity" header={t("admin.vehicle_creation.capacity")} sortable />
        <Column field="mileage_per_liter" header={t("admin.vehicle_creation.mileage_per_liter")} sortable />
        <Column field="fuel_tank_capacity" header={t("admin.vehicle_creation.fuel_tank_capacity")} sortable />
        <Column
          field="vehicle_condition"
          header={t("admin.vehicle_creation.vehicle_condition")}
          body={(row: VehicleCreationRecord) => conditionLabel(row.vehicle_condition)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="insurance_expiry_date"
          header={t("admin.vehicle_creation.insurance_expiry_date")}
          body={(row: VehicleCreationRecord) => formatDate(row.insurance_expiry_date)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="rc_upload"
          header={t("admin.vehicle_creation.rc_upload")}
          body={(row: VehicleCreationRecord) => renderFilePreview(row.rc_upload)}
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="vehicle_insurance_file"
          header={t("admin.vehicle_creation.vehicle_insurance_file")}
          body={(row: VehicleCreationRecord) => renderFilePreview(row.vehicle_insurance_file)}
          
        />

        <Column
          field="is_active"
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "150px" }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px" }}
        />
      </DataTable>

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
