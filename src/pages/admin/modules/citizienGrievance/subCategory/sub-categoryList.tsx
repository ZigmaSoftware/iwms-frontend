import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { api } from "@/api";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

export default function SubComplaintCategoryList() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
  });

  const navigate = useNavigate();
  const { encCitizenGrivence, encSubComplaintCategory } = getEncryptedRoute();

  const NEW_PATH = `/${encCitizenGrivence}/${encSubComplaintCategory}/new`;
  const EDIT_PATH = (id: string) =>
    `/${encCitizenGrivence}/${encSubComplaintCategory}/${id}/edit`;

  const fetchData = async () => {
    try {
      const res = await api.get("sub-category/");
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRecords(list);
    } catch (err) {
      console.error("Error loading sub categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmation = await Swal.fire({
      title: t("admin.citizen_grievance.sub_category.confirm_title"),
      text: t("admin.citizen_grievance.sub_category.confirm_message"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("admin.citizen_grievance.sub_category.confirm_button"),
      confirmButtonColor: "#d33"
    });

    if (!confirmation.isConfirmed) return;

    await api.delete(`sub-category/${id}/`);

    Swal.fire({
      icon: "success",
      title: t("admin.citizen_grievance.sub_category.deleted"),
      timer: 1500,
      showConfirmButton: false
    });

    fetchData();
  };

  const statusTemplate = (row: any) => {
    const updateStatus = async (value: boolean) => {
      await api.patch(`sub-category/${row.unique_id}/`, {
        is_active: value,
      });
      fetchData();
    };
    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: any) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
{/* 
      <button
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: any, { rowIndex }: any) => rowIndex + 1;

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS }
    });
  };

  const header = (
    <div className="flex justify-between items-center">
      <div className="flex justify-end w-full">
        <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.citizen_grievance.sub_category.search_placeholder")}
            className="p-inputtext-sm !border-0 !shadow-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3">


        {/* PAGE TITLE */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {t("admin.citizen_grievance.sub_category.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("admin.citizen_grievance.sub_category.subtitle")}
            </p>
          </div>

          <Button
            label={t("common.add_new")}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(NEW_PATH)}
          />
        </div>

        {/* DATA TABLE */}
        <DataTable
          value={records}
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          globalFilterFields={["name", "mainCategory_name"]}
          header={header}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          showGridlines
          emptyMessage={t("admin.citizen_grievance.sub_category.empty_message")}
          className="p-datatable-sm"
        >
          <Column
            header={t("admin.citizen_grievance.sub_category.columns.s_no")}
            body={indexTemplate}
            style={{ width: "80px" }}
          />
          <Column
            field="name"
            header={t("admin.citizen_grievance.sub_category.columns.sub_category")}
            sortable
          />
          <Column
            field="mainCategory_name"
            header={t("admin.citizen_grievance.sub_category.columns.main_category")}
            sortable
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
  
    </div>
  );
}
