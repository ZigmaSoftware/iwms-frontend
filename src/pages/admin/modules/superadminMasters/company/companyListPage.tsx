import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { Switch } from "@/components/ui/switch";
import { encryptSegment } from "@/utils/routeCrypto";

import { companyApi } from "@/helpers/admin";
import { PencilIcon } from "@/icons";

type Company = {
  unique_id: string;
  name: string;
  description: string;
  is_active: boolean;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  name: { value: string | null; matchMode: FilterMatchMode };
};

const encSuperAdminMasters = encryptSegment("superadmin-masters");
const encCompanyCreation = encryptSegment("company-creation");
const encProjectCreation = encryptSegment("project-creation");

const ENC_NEW_PATH = `/${encSuperAdminMasters}/${encCompanyCreation}/new`;
const ENC_EDIT_PATH = (id: string) =>
  `/${encSuperAdminMasters}/${encCompanyCreation}/${id}/edit`;
const ENC_PROJECT_LIST_PATH = (companyUniqueId: string) =>
  `/${encSuperAdminMasters}/${encProjectCreation}?company_unique_id=${encodeURIComponent(companyUniqueId)}`;

export default function CompanyList() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await companyApi.list();
      setCompanies(data);
    } catch (error) {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...filters };
    updated.global.value = e.target.value;
    setFilters(updated);
    setGlobalFilterValue(e.target.value);
  };

  /**
   * Toggle switch replacing Tag
   * Uses FormData PATCH => No 415 Unsupported Media Type
   */
  const statusBodyTemplate = (row: Company) => {
    const updateStatus = async (checked: boolean) => {
      try {
        const formData = new FormData();
        formData.append("is_active", String(checked));

        try {
          await companyApi.update(row.unique_id, {
            name: row.name,
            is_active: checked,
          });
        } catch (error) {
          console.log(error);
        }

        fetchCompanies();
      } catch (err) {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionBodyTemplate = (row: Company) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
      <button
        onClick={() => navigate(ENC_PROJECT_LIST_PATH(row.unique_id))}
        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        title={t("admin.nav.project")}
      >
        {t("admin.nav.project")}
      </button>

      {/* <button
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
        title="Delete"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: any, options: any) => options.rowIndex + 1;

  const header = (
    <div className="flex justify-end">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.company"),
          })}
          className="p-inputtext-sm border-0 shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {t("admin.nav.company")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", {
              item: t("admin.nav.company"),
            })}
          </p>
        </div>

        <Button
          label={t("common.add_item", { item: t("admin.nav.company") })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <DataTable
        value={companies}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        globalFilterFields={["name"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        <Column
          field="name"
          header={t("common.item_name", { item: t("admin.nav.company") })}
          sortable
          style={{ minWidth: "200px" }}
        />

        {/*  Toggle Switch Column */}
        <Column
          header={t("common.status")}
          body={statusBodyTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />

        <Column
          header={t("common.actions")}
          body={actionBodyTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
