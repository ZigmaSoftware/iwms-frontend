import type { Company } from "./types";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { Switch } from "@/components/ui/switch";

import { companyApi } from "@/helpers/admin";
import { PencilIcon } from "@/icons";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const { encSuperAdminMaster: encSuperAdminMasters, encCompanyCreation } =
  getEncryptedRoute();

const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
  encSuperAdminMasters,
  encCompanyCreation,
);

export default function CompanyList() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });

  const navigate = useNavigate();

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyApi.readAll();
      setCompanies(data);
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const getFilteredExportRows = (): Company[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return companies.filter((company) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(company.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return String(company.name ?? "")
        .toLowerCase()
        .includes(search);
    });
  };

  const statusBodyTemplate = (row: Company) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await companyApi.update(row.unique_id, {
          name: row.name,
          is_active: checked,
        });

        fetchCompanies();
      } catch {
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
    </div>
  );

  const indexTemplate = (_row: Company, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  return (
    <div className="p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.nav.company")}
          </h1>
          <p className="text-sm text-gray-500">
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
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder", {
              item: t("admin.nav.company"),
            })}
            statusValue={statusValue}
            onStatusChange={onStatusFilterChange}
          />
        }
        loadExportRows={async () => getFilteredExportRows()}
        value={companies}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={["name"]}
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
          filter
          showFilterMatchModes={false}
          style={{ minWidth: "200px" }}
        />

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
