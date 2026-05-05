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
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";

import {
  useDeleteUserScreenActionMutation,
  useUpdateUserScreenActionMutation,
  useUserScreenActionsQuery,
} from "@/tanstack/admin";

import type { UserScreenAction } from "../types/admin.types"; 

export default function UserScreenActionList() {
  const { t } = useTranslation();
  const userScreenActionsQuery = useUserScreenActionsQuery();
  const updateMutation = useUpdateUserScreenActionMutation();
  const deleteMutation = useDeleteUserScreenActionMutation();
  const records = (userScreenActionsQuery.data ?? []) as UserScreenAction[];

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    action_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encAdmins, encUserScreenAction } = getEncryptedRoute();


  const ENC_NEW_PATH = `/${encAdmins}/${encUserScreenAction}/new`;
  const ENC_EDIT_PATH = (unique_id: string) =>
    `/${encAdmins}/${encUserScreenAction}/${unique_id}/edit`;

  useEffect(() => {
    if (!userScreenActionsQuery.isError) return;
    Swal.fire(t("common.error"), t("common.load_failed"), "error");
  }, [userScreenActionsQuery.isError, t]);

  const handleDelete = async (unique_id: string) => {
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

    await deleteMutation.mutateAsync(unique_id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

  };

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters["global"].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const indexTemplate = (
    _: UserScreenAction,
    { rowIndex }: { rowIndex: number }
  ) => rowIndex + 1;

  const actionButtonsTemplate = (row: UserScreenAction) => (
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

  const statusTemplate = (row: UserScreenAction) => {
    const updateStatus = async (value: boolean) => {
      await updateMutation.mutateAsync({ id: row.unique_id, payload: {
        company_id: row.company_id,
        project_id: row.project_id,
        action_name: row.action_name,
        variable_name: row.variable_name,
        is_active: value,
      }});
    };

    return (
      <Switch checked={row.is_active} onCheckedChange={updateStatus} />
    );
  };

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.user_screen_action.action_label"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="px-3 py-3 w-full">
      
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.user_screen_action")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", {
                item: t("admin.nav.user_screen_action"),
              })}
            </p>
          </div>

          <Button
            label={t("common.add_item", {
              item: t("admin.user_screen_action.action_label"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        {/* Table */}
        <DataTable
          value={records}
          paginator
          rows={10}
          loading={userScreenActionsQuery.isPending}
          filters={filters}
          rowsPerPageOptions={[5, 10, 25, 50]}
          globalFilterFields={["action_name", "variable_name"]}
          header={header}
          emptyMessage={t("common.no_items_found", {
            item: t("admin.user_screen_action.action_label"),
          })}
          stripedRows
          showGridlines
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
          <Column
            field="action_name"
            header={t("common.action_name")}
            sortable
            style={{ minWidth: "200px" }}
          />
          <Column
            field="variable_name"
            header={t("common.variable_name")}
            sortable
            style={{ minWidth: "200px" }}
          />
          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "150px" }}
          />
          <Column
            header={t("common.actions")}
            body={actionButtonsTemplate}
            style={{ width: "150px" }}
          />
        </DataTable>
 
    </div>
  );
}
