import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import { Switch } from "@/components/ui/switch"; // Toggle
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";

const vehicleTypeApi = adminApi.vehicleTypes;

type VehicleType = {
  unique_id: string;
  vehicleType: string;
  description: string;
  is_active: boolean;
};

const normalizeVehicleTypes = (payload: any): VehicleType[] => {
  const rawList: VehicleType[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const seen = new Set<string>();
  return rawList.filter((item) => {
    const key = (item?.unique_id ?? item?.vehicleType)?.toString();
    if (!key) {
      return false;
    }
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export default function VehicleTypeCreation() {
  const { t } = useTranslation();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { encTransportMaster, encVehicleType } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleType}/new`;
  const ENC_EDIT_PATH = (unique_id: string | number) =>
    `/${encTransportMaster}/${encVehicleType}/${unique_id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    vehicleType: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const resolveId = (row: VehicleType) => row.unique_id;

  const fetchVehicleTypes = async () => {
    try {
      const res = await vehicleTypeApi.list();
      setVehicleTypes(normalizeVehicleTypes(res));
    } catch (error) {
      console.error("Failed to fetch vehicle types:", error);
      Swal.fire({
        icon: "error",
        title: t("admin.vehicle_type.load_failed_title"),
        text: t("admin.vehicle_type.load_failed_desc"),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const handleDelete = async (unique_id: string) => {
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
      await vehicleTypeApi.remove(unique_id);
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
      fetchVehicleTypes();
    } catch (err) {
      console.error("Failed to delete vehicle type:", err);
    }
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated["global"].value = value;
    setFilters(updated);
    setGlobalFilterValue(value);
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  /* --------------------  Status Toggle (PATCH API) -------------------- */
  const statusTemplate = (row: VehicleType) => {
    const updateStatus = async (value: boolean) => {
      try {
        await vehicleTypeApi.update(resolveId(row), {
          vehicleType: row.vehicleType,
          description: row.description,
          is_active: value,
        });
        fetchVehicleTypes();
      } catch (error) {
        console.error("Status update failed:", error);
      }
    };

    return (
      <Switch checked={row.is_active} onCheckedChange={updateStatus} />
    );
  };

  /* --------------------- ACTION BUTTONS --------------------- */
  const actionTemplate = (row: VehicleType) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(resolveId(row)))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        onClick={() => handleDelete(resolveId(row))}
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
        title="Delete"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  // Index column
  const indexTemplate = (_: VehicleType, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.vehicle_type.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
    
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.vehicle_type.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("admin.vehicle_type.subtitle")}
            </p>
          </div>

          <Button
            label={t("admin.vehicle_type.add")}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        {/* Table */}
        <DataTable
          value={vehicleTypes}
          dataKey="unique_id"
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          globalFilterFields={["vehicleType"]}
          rowsPerPageOptions={[5, 10, 25, 50]}
          header={header}
          stripedRows
          showGridlines
          emptyMessage={t("admin.vehicle_type.empty_message")}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="vehicleType"
            header={t("admin.vehicle_type.label")}
            sortable
            body={(row: VehicleType) => cap(row.vehicleType)}
            style={{ minWidth: "200px" }}
          />

          {/* Toggle Status */}
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
   
    </div>
  );
}
