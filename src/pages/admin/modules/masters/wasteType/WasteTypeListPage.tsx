import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  useWasteTypesQuery,
  useUpdateWasteTypeMutation,
} from "@/tanstack/admin";
import type { WasteTypeListRecord } from "./types";

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function WasteTypeListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: {
      value: null as string | null,
      matchMode: FilterMatchMode.CONTAINS,
    },
    waste_type_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    company_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    project_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
  });
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const { encMasters, encWasteTypes } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encMasters}/${encWasteTypes}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encMasters}/${encWasteTypes}/${id}/edit`;

  const wasteTypesQuery = useWasteTypesQuery(
    companyUniqueId
      ? { company_id: companyUniqueId, project_id: projectId || undefined }
      : null,
  );
  const updateWasteTypeMutation = useUpdateWasteTypeMutation();

  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as WasteTypeListRecord[];
    if (!companyUniqueId) return [] as WasteTypeListRecord[];

    const list = Array.isArray(wasteTypesQuery.data)
      ? (wasteTypesQuery.data as WasteTypeListRecord[])
      : [];
    return list.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

      const companyMatches =
        !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;

      return companyMatches && projectMatches;
    });
  })();

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("common.waste_type"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const indexTemplate = (
    _: WasteTypeListRecord,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

  const actionTemplate = (row: WasteTypeListRecord) => (
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

  const statusTemplate = (row: WasteTypeListRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await updateWasteTypeMutation.mutateAsync({
          id: row.unique_id,
          payload: { is_active: value },
        });
      } catch (error) {
        console.error("Failed to update waste type status", error);
      }
    };

    return (
      <Switch checked={Boolean(row.is_active)} onCheckedChange={updateStatus} />
    );
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("common.waste_type")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("common.waste_type") })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", {
                item: t("admin.nav.company"),
              })}
            </option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", {
                item: t("admin.nav.project"),
              })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("common.add_item", { item: t("common.waste_type") })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={wasteTypesQuery.isPending || wasteTypesQuery.isFetching}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        globalFilterFields={[
          "unique_id",
          "waste_type_name",
          "company_id",
          "company_name",
          "project_id",
          "project_name",
        ]}
        emptyMessage={t("common.no_items_found", {
          item: t("common.waste_type"),
        })}
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        {/* <Column
          field="unique_id"
          header="Unique ID"
          sortable
          body={(row: WasteTypeListRecord) => toDisplay(row.unique_id)}
        /> */}
        <Column
          field="waste_type_name"
          header={t("common.item_name", { item: t("common.waste_type") })}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: WasteTypeListRecord) => cap(row.waste_type_name)}
        />
        <Column
          field="company_name"
          header={t("admin.nav.company")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: WasteTypeListRecord) => cap(row.company_name)}
        />
        <Column
          field="project_name"
          header={t("admin.nav.project")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: WasteTypeListRecord) => cap(row.project_name)}
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
