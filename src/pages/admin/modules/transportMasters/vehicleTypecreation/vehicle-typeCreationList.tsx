import { useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  type VehicleTypePayload,
  useVehicleTypesQuery,
  useUpdateVehicleTypeMutation,
} from "@/tanstack/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleTypeRecord = {
  unique_id: string;
  vehicleType: string;
  description?: string | null;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

const VEHICLE_TYPE_COLUMN_FIELDS: Record<string, string[]> = {
  vehicleType: ["vehicleType", "vehicle_type"],
  company_name: ["company_id", "company_name", "company"],
  project_name: ["project_id", "project_name", "project"],
  is_active: ["is_active", "status", "active_status"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const cap = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

// ─── Component ────────────────────────────────────────────────────────────────

export default function VehicleTypeCreationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "transport-master",
    "vehicle-type",
    VEHICLE_TYPE_COLUMN_FIELDS
  );

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    vehicleType: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    company_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    project_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
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
  const { encTransportMaster, encVehicleType } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleType}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encTransportMaster}/${encVehicleType}/${id}/edit`;

  // ── TanStack ──────────────────────────────────────────────────────────────
  const vehicleTypesQuery = useVehicleTypesQuery(
    companyUniqueId
      ? { company_id: companyUniqueId, project_id: projectId || undefined }
      : null
  );
  const updateMutation = useUpdateVehicleTypeMutation();

  // ── Derived rows with client-side company/project filter ──────────────────
  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as VehicleTypeRecord[];
    if (!companyUniqueId) return [] as VehicleTypeRecord[];

    const list = Array.isArray(vehicleTypesQuery.data)
      ? (vehicleTypesQuery.data as VehicleTypeRecord[])
      : [];

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

  // ── Status toggle ─────────────────────────────────────────────────────────
  const statusTemplate = (row: VehicleTypeRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await updateMutation.mutateAsync({
          id: row.unique_id,
          payload: filterPayload({
            vehicleType: row.vehicleType,
            description: row.description,
            is_active: value,
            company_id_input: row.company_id || row.company_unique_id,
            project_id_input: row.project_id || row.project_unique_id,
          }, ["company_id_input", "project_id_input"]) as unknown as VehicleTypePayload,
        });
      } catch (error) {
        console.error("Failed to update vehicle type status:", error);
      }
    };

    return <Switch checked={Boolean(row.is_active)} onCheckedChange={updateStatus} />;
  };

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionTemplate = (row: VehicleTypeRecord) => (
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

  const indexTemplate = (
    _: VehicleTypeRecord,
    { rowIndex }: { rowIndex: number }
  ) => rowIndex + 1;

  // ── Table header ──────────────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.vehicle_type.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.vehicle_type.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.vehicle_type.subtitle")}
          </p>
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
            label={t("admin.vehicle_type.add")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={vehicleTypesQuery.isPending || vehicleTypesQuery.isFetching}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        globalFilterFields={[
          ...(showCol("vehicleType") ? ["vehicleType"] : []),
          ...(showCol("company_name") ? ["company_name"] : []),
          ...(showCol("project_name") ? ["project_name"] : []),
        ]}
        emptyMessage={t("admin.vehicle_type.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        {showCol("vehicleType") && (
          <Column
            field="vehicleType"
            header={t("admin.vehicle_type.label")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: VehicleTypeRecord) => cap(row.vehicleType)}
            style={{ minWidth: "200px" }}
          />
        )}

        {showCol("company_name") && (
          <Column
            field="company_name"
            header={t("admin.nav.company")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: VehicleTypeRecord) => cap(row.company_name)}
          />
        )}

        {showCol("project_name") && (
          <Column
            field="project_name"
            header={t("admin.nav.project")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: VehicleTypeRecord) => cap(row.project_name)}
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
