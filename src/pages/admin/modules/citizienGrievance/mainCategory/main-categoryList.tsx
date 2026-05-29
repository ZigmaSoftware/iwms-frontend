import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getCurrentCompanyUniqueId } from "@/utils/projectContext";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import {
  type MainCategoryRecord,
  useMainCategoriesQuery,
  useUpdateMainCategoryMutation,
} from "@/helpers/admin/directQueries";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  main_categoryName: { value: string | null; matchMode: FilterMatchMode };
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } }).response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(", ");
  }

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function MainComplaintCategoryList() {
  const { t } = useTranslation();
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { encCitizenGrivence, encMainComplaintCategory } = getEncryptedRoute();
  const companyUniqueId = getCurrentCompanyUniqueId() ?? "";

  const ENC_NEW_PATH = `/${encCitizenGrivence}/${encMainComplaintCategory}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encCitizenGrivence}/${encMainComplaintCategory}/${id}/edit`;

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    main_categoryName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const mainCategoriesQuery = useMainCategoriesQuery(companyUniqueId);
  const updateMainCategoryMutation = useUpdateMainCategoryMutation(companyUniqueId);
  const records = mainCategoriesQuery.data ?? [];

  useEffect(() => {
    if (!mainCategoriesQuery.isError) {
      return;
    }

    Swal.fire(
      t("common.error"),
      extractErrorMessage(mainCategoriesQuery.error, t("common.fetch_failed")),
      "error"
    );
  }, [mainCategoriesQuery.error, mainCategoriesQuery.isError, t]);

  const updateStatus = async (
    row: MainCategoryRecord,
    value: boolean
  ) => {
    const rowId = String(row.unique_id);
    setPendingStatusId(rowId);

    try {
      await updateMainCategoryMutation.mutateAsync({
        id: row.unique_id,
        payload: {
          main_categoryName: row.main_categoryName,
          is_active: value,
          company_id: companyUniqueId,
        },
      });
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.update_status_failed")),
        "error"
      );
    } finally {
      setPendingStatusId(null);
    }
  };

  const statusTemplate = (row: MainCategoryRecord) => {
    const rowId = String(row.unique_id);
    return (
      <Switch
        checked={row.is_active}
        disabled={
          updateMainCategoryMutation.isPending && pendingStatusId === rowId
        }
        onCheckedChange={(value) => {
          void updateStatus(row, value);
        }}
      />
    );
  };

  const actionTemplate = (row: MainCategoryRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(String(row.unique_id)))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.update")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_row: MainCategoryRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated.global.value = value;
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

      <DataTable
        value={records}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={mainCategoriesQuery.isPending && records.length === 0}
        filters={filters}
        onFilter={onFilter}
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
          filter
          showFilterMatchModes={false}
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
