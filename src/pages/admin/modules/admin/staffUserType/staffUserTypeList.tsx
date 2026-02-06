import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "@/api";

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

import type { StaffUserType } from "../types/admin.types"; 
import { staffUserTypeApi } from "@/helpers/admin";


export default function StaffUserTypeList() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<StaffUserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    usertype_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encAdmins, encStaffUserType } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encAdmins}/${encStaffUserType}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encAdmins}/${encStaffUserType}/${id}/edit`;

  /* -----------------------------------------------------------
     FETCH DATA
  ----------------------------------------------------------- */
  const fetchRecords = async () => {
    try {
      const res: any[] | { results: any[] } = await staffUserTypeApi.list();
const list = Array.isArray(res) ? res : (res as any)?.results ?? [];

      const normalized = list.map((item: any) => ({
  ...item,

  // backend might return foreign key as string
  usertype_id:
    item.usertype_id ??
    item.usertype?.unique_id ??
    null,

  // backend might return name nested or flat
  usertype_name:
    item.usertype_name ??
    item.usertype?.name ??
    t("common.unknown"),
}));

      setRecords(normalized);
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
  const handleDelete = async (unique_id: string) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirmDelete.isConfirmed) return;

    await staffUserTypeApi.remove(unique_id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchRecords();
  };

  /* -----------------------------------------------------------
     STATUS SWITCH
  ----------------------------------------------------------- */
  const statusTemplate = (row: StaffUserType) => {
  const updateStatus = async (value: boolean) => {
    console.log("=== STATUS TOGGLE TRIGGERED ===");
    console.log("Row Data:", row);
    console.log("New Status:", value);

    const payload = {
      usertype_id: row.usertype_id,   // required for backend
      name: row.name,
      is_active: value,
    };

    console.log("Payload Sent to API:", payload);

    try {
      // const response = await api.put(
      //   `staffusertypes/${row.unique_id}/`,
      //   payload
      // );
      const response = await staffUserTypeApi.update(row.unique_id
        , payload);


      console.log("API Response:", response.data);

      fetchRecords();
    } catch (error: any) {
      console.error("Update Status Error:", error.response?.data || error);
      Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
    }
  };

  return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
};


  /* -----------------------------------------------------------
     ACTION BUTTONS
  ----------------------------------------------------------- */
  const actionTemplate = (row: StaffUserType) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>
{/* 
      <button
        title="Delete"
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row.unique_id)}
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  /* -----------------------------------------------------------
     INDEX COLUMN
  ----------------------------------------------------------- */
  const indexTemplate = (_: StaffUserType, { rowIndex }: any) =>
    rowIndex + 1;

  /* -----------------------------------------------------------
     GLOBAL FILTER
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

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  return (
    <div className="p-3">
  

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {t("admin.nav.staff_user_type")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", {
                item: t("admin.nav.staff_user_type"),
              })}
            </p>
          </div>

          <Button
            label={t("common.add_item", {
              item: t("admin.nav.staff_user_type"),
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
          globalFilterFields={["name", "usertype_name"]}
          header={header}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.staff_user_type"),
          })}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 80 }} />
          <Column
            field="usertype_name"
            header={t("admin.nav.user_type")}
            sortable
            style={{ minWidth: 150 }}
          />

          <Column
            field="name"
            header={t("admin.nav.staff_user_type")}
            sortable
            style={{ minWidth: 180 }}
          />

          

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
