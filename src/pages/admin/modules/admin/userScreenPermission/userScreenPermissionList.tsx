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
import {
  userScreenPermissionApi
} from "@/helpers/admin";

import type { StaffUserType, GroupedMap } from "../types/admin.types"; 


/* -----------------------------------------------------------
   COMPONENT
----------------------------------------------------------- */
export default function UserScreenPermissionList() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<StaffUserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    staffusertype_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
  });

  const navigate = useNavigate();
  const { encAdmins, encUserScreenPermission } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encAdmins}/${encUserScreenPermission}/new`;

  const ENC_EDIT_PATH = (staffTypeId: string) =>
    `/${encAdmins}/${encUserScreenPermission}/${staffTypeId}/edit`;

  /* -----------------------------------------------------------
     FETCH DATA
  ----------------------------------------------------------- */
  const fetchRecords = async () => {
    try {
      const res: unknown = await userScreenPermissionApi.list();

      let data: any[] = [];

      if (Array.isArray(res)) {
        data = res;
      } else if (res && typeof res === "object" && Array.isArray((res as any).data)) {
        data = (res as any).data;
      }

      console.log("Normalized API Data:", data);

      // Group by staffusertype_id
      const groupedObj: GroupedMap = data.reduce((acc, item) => {
        const uid = item.staffusertype_id;

        if (!acc[uid]) {
          acc[uid] = {
            unique_id: uid,
            name: item.userscreen_name,
            staffusertype_name: item.staffusertype_name ?? t("common.unknown"),
            mainscreen_id: item.mainscreen_id,
            is_active: item.is_active,
            screens: [],
          };
        }

        acc[uid].screens!.push({
          screen: item.userscreen_name,
          action: item.userscreenaction_name,
          order: item.order_no,
        });

        return acc;
      }, {} as GroupedMap);

      const groupedList = Object.values(groupedObj);

      setRecords(groupedList);
    } catch (err) {
      console.error("Fetch failed:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  /* -----------------------------------------------------------
     DELETE RECORD
  ----------------------------------------------------------- */

  const handleDelete = async (staffTypeId: string) => {
  const confirmDelete = await Swal.fire({
    title: t("common.confirm_title"),
    text: t("admin.user_screen_permission.confirm_delete"),
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
  });

  if (!confirmDelete.isConfirmed) return;

  try {
    //  Direct delete using backend new endpoint
    await userScreenPermissionApi.remove(
      `delete-by-staffusertype/${staffTypeId}`
    );

    Swal.fire(
      t("common.deleted_success"),
      t("admin.user_screen_permission.delete_success"),
      "success"
    );

    fetchRecords();

  } catch (error) {
    console.error("DELETE ERROR:", error);
    Swal.fire(t("common.error"), t("admin.user_screen_permission.delete_failed"), "error");
  }
};


  // /* -----------------------------------------------------------
  //    STATUS SWITCH
  // ----------------------------------------------------------- */
  // const statusTemplate = (row: StaffUserType) => {
  //   const updateStatus = async (value: boolean) => {
  //     try {
  //       await api.put(`staffusertypes/${row.unique_id}/`, {
  //         is_active: value,
  //         name: row.name,
  //         usertype_id: row.usertype_id,
  //       });
  //       fetchRecords();
  //     } catch {
  //       Swal.fire("Error", "Failed to update status", "error");
  //     }
  //   };

  //   return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  // };

  /* -----------------------------------------------------------
     ACTION BUTTONS
  ----------------------------------------------------------- */
  const actionTemplate = (row: StaffUserType) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id))
        }
      >
        <PencilIcon className="size-5" />
      </button>

      <button
        title={t("common.delete")}
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row.unique_id)}
      >
        <TrashBinIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: StaffUserType, { rowIndex }: any) => rowIndex + 1;

  /* -----------------------------------------------------------
     GLOBAL SEARCH
  ----------------------------------------------------------- */
  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated["global"].value = value;
    setFilters(updated);
    setGlobalFilterValue(value);
  };

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border shadow-sm">
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

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  return (
    <div className="p-3">
    
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {t("admin.user_screen_permission.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("admin.user_screen_permission.subtitle")}
            </p>
          </div>

          <Button
            label={t("common.add_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={records}
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          rowsPerPageOptions={[5, 10, 25, 50]}
          globalFilterFields={["staffusertype_name"]}
          header={header}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.user_screen_permission.permission_label"),
          })}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 80 }} />
          <Column
            field="staffusertype_name"
            header={t("admin.nav.staff_user_type")}
            sortable
          />
          {/* <Column header="Status" body={statusTemplate} style={{ width: 120 }} /> */}
          <Column header={t("common.actions")} body={actionTemplate} style={{ width: 150 }} />
        </DataTable>

    </div>
  );
}
