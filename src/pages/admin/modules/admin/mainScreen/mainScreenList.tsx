import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
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
  useDeleteMainScreenMutation,
  useMainScreensQuery,
  useUpdateMainScreenMutation,
} from "@/tanstack/admin";

import type { MainScreen } from "../types/admin.types"; // Correct import

export default function MainScreenList() {
  const { t } = useTranslation();
  const mainScreensQuery = useMainScreensQuery();
  const updateMutation = useUpdateMainScreenMutation();
  const deleteMutation = useDeleteMainScreenMutation();
  const records = (mainScreensQuery.data ?? []) as MainScreen[];

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const navigate = useNavigate();
  const { encAdmins, encMainScreen } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encAdmins}/${encMainScreen}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encAdmins}/${encMainScreen}/${id}/edit`;

  /* ------------------------------
      Extract data uniformly
  ------------------------------ */
  useEffect(() => {
    if (!mainScreensQuery.isError) return;
    Swal.fire(t("common.error"), t("common.load_failed"), "error");
  }, [mainScreensQuery.isError, t]);

  /* ------------------------------
      DELETE
  ------------------------------ */
  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("common.confirm_delete_button"),
    });

    if (!confirm.isConfirmed) return;

    await deleteMutation.mutateAsync(id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      showConfirmButton: false,
      timer: 1200,
    });

  };

  /* ------------------------------
      STATUS SWITCH
  ------------------------------ */
  const statusTemplate = (row: MainScreen) => {
    const updateStatus = async (value: boolean) => {
      await updateMutation.mutateAsync({ id: row.unique_id, payload: {
        mainscreen_name: row.mainscreen_name,
        mainscreentype_id: row.mainscreentype_id,
        company_id: row.company_id,
        project_id: row.project_id,
        icon_name: row.icon_name,
        order_no: row.order_no,
        description: row.description,
        is_active: value,
      }});
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  /* ------------------------------
      ACTION BUTTONS
  ------------------------------ */
  const actionTemplate = (row: MainScreen) => (
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

  /* ------------------------------
      Search
  ------------------------------ */
  const onGlobalFilterChange = (e: any) => {
    const val = e.target.value;
    const _filters = { ...filters };
    _filters["global"].value = val;

    setFilters(_filters);
    setGlobalFilterValue(val);
  };

  /* ------------------------------
      Table Header
  ------------------------------ */
  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="px-3 py-3 w-full "> 
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.main_screen")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", {
                item: t("admin.nav.main_screen"),
              })}
            </p>
          </div>

          <Button
            label={t("common.add_item", { item: t("admin.nav.main_screen") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={records}
          paginator
          rows={10}
          loading={mainScreensQuery.isPending}
          filters={filters}
          rowsPerPageOptions={[5, 10, 25, 50]}
          globalFilterFields={[
            "mainscreen_name",
            "mainscreentype_name",
            "icon_name",
            "description",
          ]}
          header={header}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.main_screen"),
          })}
          className="p-datatable-sm"
        >
          <Column
            header={t("common.s_no")}
            body={(_, { rowIndex }) => rowIndex + 1}
            style={{ width: 80 }}
          />

          <Column
            field="mainscreen_name"
            header={t("common.item_name", { item: t("admin.nav.main_screen") })}
            sortable
          />
          <Column
            field="mainscreentype_name"
            header={t("admin.nav.main_screen_type")}
            sortable
          />
          <Column field="icon_name" header={t("common.icon_name")} sortable />
          <Column field="order_no" header={t("common.order_no")} sortable />
          <Column field="description" header={t("common.description")} sortable />

          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: 120 }}
          />

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: 150 }}
          />
        </DataTable>
    </div>
  );
}
