import { useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  type FuelPayload,
  useFuelsQuery,
  useUpdateFuelMutation,
} from "@/helpers/admin/directQueries";

// ─── Types ────────────────────────────────────────────────────────────────────

type Fuel = {
  unique_id: string;
  fuel_type: string;
  description: string;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

const FUEL_COLUMN_FIELDS: Record<string, string[]> = {
  fuel_type: ["fuel_type", "fuel"],
  is_active: ["is_active", "active_status", "status"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const cap = (str?: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuelList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "transport-master",
    "fuel",
    FUEL_COLUMN_FIELDS
  );

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    fuel_type: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  // ── Company / project selection ───────────────────────────────────────────
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  // ── Routes ────────────────────────────────────────────────────────────────
  const { encTransportMaster, encFuel } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encFuel}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encTransportMaster}/${encFuel}/${id}/edit`;

  // ── TanStack ──────────────────────────────────────────────────────────────
  const fuelsQuery = useFuelsQuery(
    companyUniqueId
      ? { company_id: companyUniqueId, project_id: projectId || undefined }
      : null
  );
  const updateMutation = useUpdateFuelMutation();

  // ── Derived rows with client-side company/project filter ──────────────────
  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as Fuel[];
    if (!companyUniqueId) return [] as Fuel[];

    const list = Array.isArray(fuelsQuery.data)
      ? (fuelsQuery.data as Fuel[])
      : [];

    const hasContextFields = list.some((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      return Boolean(rowCompanyId || rowProjectId);
    });

    if (!hasContextFields) return list;

    return list.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;
      return companyMatches && projectMatches;
    });
  })();

  // ── Filter handlers ───────────────────────────────────────────────────────
  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  // ── Status toggle — TanStack mutation, no manual refetch ──────────────────
  const statusTemplate = (row: Fuel) => {
    const updateStatus = async (value: boolean) => {
      try {
        await updateMutation.mutateAsync({
          id: row.unique_id,
          payload: filterPayload({
            fuel_type: row.fuel_type,
            description: row.description,
            is_active: value,
          }) as unknown as FuelPayload,
        });
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionTemplate = (row: Fuel) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Fuel, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  // ── Table header ──────────────────────────────────────────────────────────
  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.fuel.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.fuel.title")}
          </h1>
          <p className="text-gray-500 text-sm">{t("admin.fuel.subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Company filter */}
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

          {/* Project filter */}
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

          {/* Add button */}
          <Button
            label={t("admin.fuel.add")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={fuelsQuery.isPending || fuelsQuery.isFetching}
        filters={filters}
        onFilter={onFilter}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={[
          ...(showCol("fuel_type") ? ["fuel_type"] : []),
          "company_name",
          "project_name",
        ]}
        header={header}
        emptyMessage={t("admin.fuel.empty_message")}
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        {showCol("fuel_type") && (
          <Column
            field="fuel_type"
            header={t("admin.fuel.fuel_type")}
            sortable
            body={(row: Fuel) => cap(row.fuel_type)}
            style={{ minWidth: "200px" }}
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "150px" }}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px" }}
        />
      </DataTable>
    </div>
  );
}
