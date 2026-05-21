import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { Switch } from "@/components/ui/switch";
import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  type HierarchyPayload,
  type HierarchyRecord,
  useHierarchiesQuery,
  useUpdateHierarchyMutation,
} from "@/tanstack/admin";
import Swal from "sweetalert2";

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const HIERARCHY_COLUMN_FIELDS: Record<string, string[]> = {
  level_name: ["level_name", "name"],
  is_active: ["is_active"],
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

export default function HierarchyListPage() {
  const { t } = useTranslation();
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    level_name: {
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
  const hierarchiesQuery = useHierarchiesQuery();
  const updateHierarchyMutation = useUpdateHierarchyMutation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "hierarchies",
    HIERARCHY_COLUMN_FIELDS,
  );
  const navigate = useNavigate();
  const { encMasters, encHierarchies } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encMasters}/${encHierarchies}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encHierarchies}/${id}/edit`;

  const records = (hierarchiesQuery.data ?? []).filter((row) => {
    const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
    const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

    const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
    const projectMatches = !projectId || rowProjectId === projectId;

    return companyMatches && projectMatches;
  });

  useEffect(() => {
    if (!hierarchiesQuery.isError) {
      return;
    }

    Swal.fire(
      t("common.error"),
      extractErrorMessage(hierarchiesQuery.error, t("common.fetch_failed")),
      "error"
    );
  }, [hierarchiesQuery.error, hierarchiesQuery.isError, t]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
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
            item: t("admin.nav.hierarchy"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const statusTemplate = (row: HierarchyRecord) => {
    const updateStatus = async (value: boolean) => {
      const hierarchyId = String(row.unique_id);
      setPendingStatusId(hierarchyId);

      try {
        const rawPayload = {
          level_name: row.level_name ?? "",
          area_type: String(row.area_type ?? row.area_type_id ?? ""),
          is_active: value,
          company_id: String(
            row.company_id ?? row.company_unique_id ?? companyUniqueId ?? ""
          ),
          project_id: String(
            row.project_id ?? row.project_unique_id ?? projectId ?? ""
          ),
        };
        const payload = filterPayload(rawPayload, [
          "company_id",
          "project_id",
        ]) as HierarchyPayload;

        await updateHierarchyMutation.mutateAsync({
          id: row.unique_id,
          payload,
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

    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={
          updateHierarchyMutation.isPending &&
          pendingStatusId === String(row.unique_id)
        }
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionTemplate = (row: HierarchyRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(String(row.unique_id)))}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (
    _: HierarchyRecord,
    { rowIndex }: { rowIndex: number }
  ) => rowIndex + 1;

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.hierarchy")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.hierarchy"),
            })}
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
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
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
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("common.add_item", { item: t("admin.nav.hierarchy") })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={records}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={hierarchiesQuery.isPending && records.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.hierarchy"),
        })}
        globalFilterFields={["level_name", "company_name", "project_name"]}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        {showCol("level_name") && (
          <Column
            field="level_name"
            header={t("common.item_name", { item: t("admin.nav.hierarchy") })}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: HierarchyRecord) => cap(row.level_name)}
          />
        )}
        {showCol("is_active") && (
          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "140px" }}
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
