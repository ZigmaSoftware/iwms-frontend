import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { wardApi } from "@/helpers/admin";

type WardRecord = {
  unique_id: string;
  ward_name: string;
  is_active: boolean;
  zone_name: string;
  city_name: string;
  district_name: string;
  state_name: string;
  country_name: string;
};

type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};

export default function WardList() {
  const { t } = useTranslation();
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();

  const { encMasters, encWards } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encMasters}/${encWards}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encMasters}/${encWards}/${id}/edit`;

  const extractErrorMessage = (error: unknown) => {
    if (!error) return t("common.request_failed");
    if (typeof error === "string") return error;

    const data = (error as ErrorWithResponse)?.response?.data;

    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.join(", ");

    if (data && typeof data === "object") {
      return Object.entries(data as Record<string, unknown>)
        .map(([k, v]) =>
          Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
        )
        .join("\n");
    }

    if (error instanceof Error && error.message) return error.message;

    return t("common.request_failed");
  };

  // ===========================
  //   Load Data
  // ===========================
  const fetchWards = useCallback(async () => {
    // setLoading(true);
    try {
      const data = (await wardApi.list()) as WardRecord[];
      setWards(data);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: extractErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  // ===========================
  //   Delete
  // ===========================
  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.confirm_delete_button"),
    });

    if (!confirm.isConfirmed) return;

    await wardApi.remove(id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchWards();
  };

  // ===========================
  //   Search
  // ===========================
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters.global.value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.ward"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  // ===========================
  //   Toggle Status
  // ===========================
  const statusTemplate = (row: WardRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await wardApi.update(row.unique_id, { is_active: value });
        fetchWards();
      } catch (err) {
        console.error("Status update failed:", err);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  // ===========================
  //   Actions
  // ===========================
  const actionTemplate = (row: WardRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: WardRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  // ===========================
  //   UI
  // ===========================
  return (
    <div className="p-3">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.ward")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", { item: t("admin.nav.ward") })}
            </p>
          </div>

          <Button
            label={t("common.add_item", { item: t("admin.nav.ward") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={wards}
          dataKey="unique_id"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={loading}
          filters={filters}
          header={renderHeader()}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.ward"),
          })}
          globalFilterFields={[
            "name",
            "zone_name",
            "city_name",
            "district_name",
            "state_name",
            "country_name",
          ]}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="zone_name"
            header={t("admin.nav.zone")}
            sortable
            body={(row) => cap(row.zone_name)}
          />

          <Column
            field="city_name"
            header={t("admin.nav.city")}
            sortable
            body={(row) => cap(row.city_name)}
          />

          <Column
            field="name"
            header={t("admin.nav.ward")}
            sortable
            body={(row) => cap(row.ward_name)}
          />

          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "140px" }}
          />

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "150px", textAlign: "center" }}
          />
        </DataTable>

    </div>
  );
}
