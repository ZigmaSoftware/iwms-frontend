import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { wasteTypeApi } from "@/helpers/admin";
import type { WasteTypeListRecord } from "./types";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";

const WASTE_TYPE_COLUMN_FIELDS: Record<string, string[]> = {
  waste_type_name: ["waste_type_name", "name"],
  company_name: ["company_id", "company_name"],
  project_name: ["project_id", "project_name"],
  is_active: ["is_active"],
};

export default function WasteTypeListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [allWasteTypes, setAllWasteTypes] = useState<WasteTypeListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const {
    filters, onFilter, globalFilterValue, onGlobalFilterChange,
    statusValue, onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      waste_type_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      company_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      project_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  const { encMasters, encWasteTypes } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encWasteTypes,
  );

  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "waste-types",
    WASTE_TYPE_COLUMN_FIELDS,
  );

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    let mounted = true;

    const loadWasteTypes = async () => {
      setIsLoading(true);
      try {
        const data = await wasteTypeApi.readAll({
          params: { company_id: companyUniqueId, project_id: projectId || undefined },
        });
        if (mounted) setAllWasteTypes(data as WasteTypeListRecord[]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadWasteTypes();

    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length]);

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const rows: WasteTypeListRecord[] =
    (isSuperAdmin && companies.length === 0) || (!companyUniqueId && !isSuperAdmin)
      ? []
      : Array.isArray(allWasteTypes)
        ? allWasteTypes
        : [];

  const exportRows = rows.filter((row) => {
    if (statusValue !== "all" && Boolean(row.is_active) !== (statusValue === "active")) return false;
    const search = globalFilterValue.trim().toLowerCase();
    return !search || Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(search));
  });

  const indexTemplate = (
    _: WasteTypeListRecord,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

  const actionTemplate = (row: WasteTypeListRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: { companyUniqueId, projectId },
          })
        }
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
        setPendingStatusId(String(row.unique_id));
        setIsUpdating(true);
        await wasteTypeApi.update(
          row.unique_id,
          filterPayload({ is_active: value }) as { is_active: boolean }
        );
        setAllWasteTypes((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch (error) {
        console.error("Failed to update waste type status", error);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={isUpdating && pendingStatusId === String(row.unique_id)}
        onCheckedChange={updateStatus}
      />
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
          <Button
            label={t("common.add_item", { item: t("common.waste_type") })}
            icon="pi pi-plus"
            className="p-button-success"
           
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar searchValue={globalFilterValue} onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("common.waste_type") })}
        statusValue={statusValue} onStatusChange={onStatusFilterChange} className="mb-4">
        <FilterBarSelect value={companyUniqueId || ""} onChange={onCompanyChange} options={companies}
          placeholder="All Companies" disabled={!isSuperAdmin || companies.length === 0} />
        <FilterBarSelect value={projectId || ""} onChange={setProjectId} options={projects}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0} />
      </FilterBar>

      <DataTable
        value={rows}
        exportRows={exportRows}
        exportSheetName="WasteTypes"
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading}
        filters={filters}
        onFilter={onFilter}
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
        {showCol("waste_type_name") && (
          <Column
            field="waste_type_name"
            header={t("common.item_name", { item: t("common.waste_type") })}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: WasteTypeListRecord) => cap(row.waste_type_name)}
          />
        )}
        {showCol("company_name") && (
          <Column
            field="company_name"
            header={t("admin.nav.company")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: WasteTypeListRecord) => cap(row.company_name)}
          />
        )}
        {showCol("project_name") && (
          <Column
            field="project_name"
            header={t("admin.nav.project")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: WasteTypeListRecord) => cap(row.project_name)}
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
