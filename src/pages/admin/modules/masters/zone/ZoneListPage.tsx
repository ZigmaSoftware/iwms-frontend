import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useZonesQuery, useUpdateZoneMutation } from "@/tanstack/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import type { ZoneListRecord } from "./types";

type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};

const extractErrorMessage = (error: unknown) => {
  if (!error) return "Something went wrong while processing the request.";
  if (typeof error === "string") return error;

  const data = (error as ErrorWithResponse)?.response?.data;

  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) =>
        Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) return error.message;

  return "Something went wrong while processing the request.";
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

// ===========================
//   Component
// ===========================
export default function ZoneList() {
  const { t } = useTranslation();
  const zonesQuery = useZonesQuery();
  const updateZoneMutation = useUpdateZoneMutation();
  const allZones = zonesQuery.data ?? [];
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
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

  const navigate = useNavigate();

  const { encMasters, encZones } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encMasters}/${encZones}/new`;
  const ENC_EDIT_PATH = (id: string | number) =>
    `/${encMasters}/${encZones}/${id}/edit`;

  useEffect(() => {
    if (!zonesQuery.isError) return;
    Swal.fire({ icon: "error", title: t("common.error"), text: String((zonesQuery.error as any)?.response?.data ?? zonesQuery.error) });
  }, [zonesQuery.error, zonesQuery.isError, t]);

  const zones = ((): ZoneListRecord[] => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId) return [];

    const rows = Array.isArray(allZones) ? (allZones as any[]) : [];
    const filtered = rows.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;
      return companyMatches && projectMatches;
    });

    return filtered as ZoneListRecord[];
  })();

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters);
  };

  // ===========================
  //   Delete
  // ===========================
  // ===========================
  //   Search
  // ===========================
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
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
            item: t("admin.nav.zone"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  // ===========================
  //   Toggle Status
  // ===========================
  const updateStatus = async (row: ZoneListRecord, checked: boolean) => {
    const id = String(row.unique_id);
    setPendingStatusId(id);

    try {
      await updateZoneMutation.mutateAsync({ id: row.unique_id, payload: { name: row.zone_name, is_active: checked } });
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setPendingStatusId(null);
    }
  };

  const statusTemplate = (row: ZoneListRecord) => (
    <Switch checked={row.is_active} disabled={updateZoneMutation.isPending && pendingStatusId === String(row.unique_id)} onCheckedChange={(checked) => void updateStatus(row, checked)} />
  );

  // ===========================
  //   Actions
  // ===========================
  const actionTemplate = (row: ZoneListRecord) => (
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

  const indexTemplate = (_: ZoneListRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  // ===========================
  //   UI
  // ===========================
  return (
    <div className="p-3">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.zone")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", { item: t("admin.nav.zone") })}
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
              label={t("common.add_item", { item: t("admin.nav.zone") })}
              icon="pi pi-plus"
              className="p-button-success"
              disabled={!companyUniqueId || !projectId}
              onClick={() => navigate(ENC_NEW_PATH)}
            />
          </div>
        </div>

        <DataTable
          value={zones}
          dataKey="unique_id"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={zonesQuery.isPending && zones.length === 0}
          filters={filters}
          onFilter={onFilter}
          header={renderHeader()}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.zone"),
          })}
          globalFilterFields={[
            "zone_name",
            "city_name",
            "district_name",
            "state_name",
            "company_name",
            "project_name",
          ]}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="city_name"
            header={t("admin.nav.city")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row) => cap(row.city_name)}
          />

          <Column
            field="zone_name"
            header={t("admin.nav.zone")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row) => cap(row.zone_name)}
          />

          <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "150px", textAlign: "center" }}
          />
        </DataTable>
    </div>
  );
}
