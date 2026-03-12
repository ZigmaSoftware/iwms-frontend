import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "@/api";

import { DataTable } from "@/components/common/SafeDataTable";
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

type MainCategory = {
  unique_id: string;
  main_categoryName: string;
  is_active: boolean;
};

export default function MainComplaintCategoryList() {
  const { t } = useTranslation();
  const [records, setRecords] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const navigate = useNavigate();
  const { encCitizenGrivence, encMainComplaintCategory } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encCitizenGrivence}/${encMainComplaintCategory}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encCitizenGrivence}/${encMainComplaintCategory}/${id}/edit`;

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    main_categoryName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const fetchData = async () => {
    try {
      const res = await api.get("main-category/");
      setRecords(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("admin.citizen_grievance.main_category.confirm_title"),
      text: t("admin.citizen_grievance.main_category.confirm_message"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("admin.citizen_grievance.main_category.confirm_button"),
    });

    if (!confirm.isConfirmed) return;

    await api.delete(`main-category/${id}/`);
    Swal.fire({
      icon: "success",
      title: t("admin.citizen_grievance.main_category.deleted"),
      timer: 1500,
      showConfirmButton: false,
    });
    fetchData();
  };

  const statusTemplate = (row: MainCategory) => {
    const updateStatus = async (value: boolean) => {
      await api.patch(`main-category/${row.unique_id}/`, {
        is_active: value,
      });
      fetchData();
    };
    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: MainCategory) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.update")}
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        onClick={() => handleDelete(row.unique_id)}
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
        title="Delete"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_row: any, { rowIndex }: any) => rowIndex + 1;

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
          placeholder={t("admin.citizen_grievance.main_category.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-6">

        {/* TITLE ROW */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.citizen_grievance.main_category.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("admin.citizen_grievance.main_category.subtitle")}
            </p>
          </div>

          <Button
            label={t("common.add_new")}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        {/* TABLE */}
        <DataTable
          value={records}
          dataKey="unique_id"
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          globalFilterFields={["main_categoryName"]}
          rowsPerPageOptions={[5, 10, 25, 50]}
          header={header}
          stripedRows
          showGridlines
          emptyMessage={t("admin.citizen_grievance.main_category.empty_message")}
          className="p-datatable-sm"
        >
          <Column
            header={t("admin.citizen_grievance.main_category.columns.s_no")}
            body={indexTemplate}
            style={{ width: "80px" }}
          />

          <Column
            field="main_categoryName"
            header={t("admin.citizen_grievance.main_category.columns.main_category")}
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
