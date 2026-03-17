import { useEffect, useState } from "react";
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
import {
  userScreenApi
} from "@/helpers/admin";

import type { UserScreen } from "../types/admin.types"; 

export default function UserScreenList() {
  const { t } = useTranslation();
  const [screens, setScreens] = useState<UserScreen[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    userscreen_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encAdmins, encUserScreen } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encAdmins}/${encUserScreen}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encAdmins}/${encUserScreen}/${id}/edit`;

  const extractData = (response: any) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    return response?.data?.results ?? [];
  };

  const fetchScreens = async () => {
    try {
      const res = await userScreenApi.list();
      console.log(res);
      setScreens(extractData(res));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("common.confirm_delete_button"),
    });

    if (!confirmDelete.isConfirmed) return;

    await userScreenApi.remove(id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchScreens();
  };

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters.global.value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const indexTemplate = (_: UserScreen, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const statusTemplate = (row: UserScreen) => {
    const updateStatus = async (value: boolean) => {
      await userScreenApi.update(row.unique_id, {
        userscreen_name: row.userscreen_name,
        folder_name: row.folder_name,
        icon_name: row.icon_name,
        order_no: row.order_no,
        mainscreen_id: row.mainscreen_id,
        company_id: row.company_id,
        project_id: row.project_id,
        is_active: value,
      });

      fetchScreens();
    };

    return (
      <Switch checked={row.is_active} onCheckedChange={updateStatus} />
    );
  };

  const actionTemplate = (row: UserScreen) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        title="Delete"
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row.unique_id)}
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.user_screen"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="px-3 py-3 w-full">
      
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.user_screen")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", {
                item: t("admin.nav.user_screen"),
              })}
            </p>
          </div>

          <Button
            label={t("common.add_item", {
              item: t("admin.nav.user_screen"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={screens}
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          globalFilterFields={[
            "userscreen_name",
            "mainscreen_name",
            "folder_name",
          ]}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          showGridlines
          className="p-datatable-sm"
          header={header}
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.user_screen"),
          })}
        >
          <Column
            header={t("common.s_no")}
            body={indexTemplate}
            style={{ width: "70px" }}
          />
          <Column
            field="mainscreen_name"
            header={t("admin.nav.main_screen")}
            sortable
            style={{ minWidth: "150px" }}
          />
          <Column
            field="userscreen_name"
            header={t("admin.nav.user_screen")}
            sortable
            style={{ minWidth: "150px" }}
          />
          <Column
            field="folder_name"
            header={t("common.folder")}
            sortable
            style={{ minWidth: "120px" }}
          />
          <Column
            field="icon_name"
            header={t("common.icon")}
            sortable
            style={{ minWidth: "100px" }}
          />
          <Column
            field="order_no"
            header={t("common.order")}
            sortable
            style={{ width: "100px" }}
          />
          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "120px" }}
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
