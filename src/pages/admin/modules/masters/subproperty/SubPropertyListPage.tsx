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
import { subPropertiesApi } from "@/helpers/admin";

type SubProperty = {
  unique_id: string;
  sub_property_name: string;
  property_name?: string;
  is_active: boolean;
  property_id?: string;
};

export default function SubPropertyList() {
  const { t } = useTranslation();
  const [subProperties, setSubProperties] = useState<SubProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    sub_property_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encMasters, encSubProperties } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encMasters}/${encSubProperties}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encMasters}/${encSubProperties}/${id}/edit`;

  /* ================= Fetch ================= */
  const fetchSubProperties = async () => {
    // setLoading(true);
    try {
      const res = await subPropertiesApi.list();
      setSubProperties(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubProperties();
  }, []);

  /* ================= Delete ================= */
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

    await subPropertiesApi.remove(id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchSubProperties();
  };

  /* ================= Search ================= */
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      global: { ...filters.global, value },
    });
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
            item: t("admin.nav.sub_property"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const cap = (s?: string) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

  /* ================= Toggle ================= */
  const statusTemplate = (row: SubProperty) => {
    const updateStatus = async (value: boolean) => {
      await subPropertiesApi.update(row.unique_id, {
        sub_property_name: row.sub_property_name,
        property_id: row.property_id,
        is_active: value,
      });
      fetchSubProperties();
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  /* ================= Actions ================= */
  const actionTemplate = (row: SubProperty) => (
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

  const indexTemplate = (_: SubProperty, { rowIndex }: any) => rowIndex + 1;

  /* ================= UI ================= */
  return (
    <div className="p-3">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.sub_property")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", {
                item: t("admin.nav.sub_property"),
              })}
            </p>
          </div>

          <Button
            label={t("common.add_item", { item: t("admin.nav.sub_property") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={subProperties}
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
            item: t("admin.nav.sub_property"),
          })}
          globalFilterFields={["sub_property_name", "property_name"]}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="property_name"
            header={t("admin.nav.property")}
            sortable
            body={(row) => cap(row.property_name)}
          />

          <Column
            field="sub_property_name"
            header={t("admin.nav.sub_property")}
            sortable
            body={(row) => cap(row.sub_property_name)}
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
