import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { adminApi } from "@/helpers/admin/registry";
import type { PropertyRecord } from "./types";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";

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

  return fallback;
};

const PROPERTY_COLUMN_FIELDS: Record<string, string[]> = {
  property_name: ["property_name"],
  is_active: ["is_active"],
};

export default function PropertyList() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const {
    filters, onFilter, globalFilterValue, onGlobalFilterChange,
    statusValue, onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      property_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });

  const navigate = useNavigate();
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

  const { encMasters, encProperties } = getEncryptedRoute();

  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encProperties,
  );

  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "properties",
    PROPERTY_COLUMN_FIELDS,
  );

  const loadProperties = async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;

      const response = await adminApi.properties.readAll({ params });
      if (requestId !== requestIdRef.current) return;
      const list = Array.isArray(response)
        ? response
        : ((response as { results?: PropertyRecord[] })?.results ?? []);
      setProperties(list as PropertyRecord[]);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.fetch_failed")),
        "error"
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    void loadProperties();
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const filteredProperties: PropertyRecord[] =
    (isSuperAdmin && companies.length === 0) || (!companyUniqueId && !isSuperAdmin)
      ? []
      : properties;

  const exportRows = filteredProperties.filter((row) => {
    if (statusValue !== "all" && row.is_active !== (statusValue === "active")) return false;
    const search = globalFilterValue.trim().toLowerCase();
    return !search || [row.property_name, row.company_name, row.project_name]
      .some((value) => String(value ?? "").toLowerCase().includes(search));
  });

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const statusTemplate = (row: PropertyRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        setUpdatingStatusId(String(row.unique_id));
        await adminApi.properties.update(
          row.unique_id,
          filterPayload({ is_active: value })
        );
        setProperties((current) =>
          current.map((property) =>
            property.unique_id === row.unique_id
              ? { ...property, is_active: value }
              : property
          )
        );
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: extractErrorMessage(err, t("common.update_status_failed")),
        });
      } finally {
        setUpdatingStatusId(null);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        disabled={updatingStatusId === String(row.unique_id)}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionTemplate = (row: PropertyRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(String(row.unique_id)))}
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

  const indexTemplate = (_: PropertyRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  return (
    <div className="p-3">
    
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.property")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", { item: t("admin.nav.property") })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              label={t("common.add_item", { item: t("admin.nav.property") })}
              icon="pi pi-plus"
              className="p-button-success"
             
              onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
            />
          </div>
        </div>

        <FilterBar searchValue={globalFilterValue} onSearchChange={onGlobalFilterChange}
          searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.property") })}
          statusValue={statusValue} onStatusChange={onStatusFilterChange} className="mb-4">
          <FilterBarSelect value={companyUniqueId || ""} onChange={onCompanyChange} options={companies}
            placeholder="All Companies" disabled={!isSuperAdmin || companies.length === 0} />
          <FilterBarSelect value={projectId || ""} onChange={setProjectId} options={projects}
            placeholder={showAllProjectsOption ? "All Projects" : undefined}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0} />
        </FilterBar>

        <DataTable
          value={filteredProperties}
          exportRows={exportRows}
          exportSheetName="Properties"
          dataKey="unique_id"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={isLoading}
          filters={filters}
          onFilter={onFilter}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.property"),
          })}
          globalFilterFields={["property_name", "company_name", "project_name"]}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          {showCol("property_name") && (
            <Column
              field="property_name"
              header={t("common.item_name", { item: t("admin.nav.property") })}
              sortable
              filter
              showFilterMatchModes={false}
              body={(row: PropertyRecord) => cap(row.property_name)}
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
