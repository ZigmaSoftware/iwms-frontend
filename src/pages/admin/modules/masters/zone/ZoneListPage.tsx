import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { zoneApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";
import type { ZoneListRecord } from "./types";

const ZONE_COLUMN_FIELDS: Record<string, string[]> = {
  city_name: ["city_id"],
  zone_name: ["zone_name"],
  is_active: ["is_active"],
};

// ===========================
//   Component
// ===========================
export default function ZoneList() {
  const { t } = useTranslation();
  const { showColumn: showCol } = useFieldVisibility(
    "masters",
    "zones",
    ZONE_COLUMN_FIELDS,
  );

  const [allZones, setAllZones] = useState<ZoneListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
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
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const navigate = useNavigate();

  const { encMasters, encZones } = getEncryptedRoute();

  const { newPath: zoneNewPath, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encMasters, encZones);
  const ENC_NEW_PATH = (
    companyId?: string | null,
    selectedProjectId?: string | null,
  ) =>
    appendRouteQuery(zoneNewPath, {
      company_unique_id: companyId,
      project_id: selectedProjectId,
    });

  const onFilterCompanyChange = (value: string) => {
    localStorage.setItem("selected_company_unique_id", value);
    localStorage.removeItem("selected_project_id");
    onCompanyChange(value);
  };

  const onFilterProjectChange = (value: string) => {
    localStorage.setItem("selected_project_id", value);
    setProjectId(value);
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    let mounted = true;

    const loadZones = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = {};
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;

        const data = await zoneApi.readAll({ params });
        if (mounted) setAllZones(data as ZoneListRecord[]);
      } catch (error) {
        if (mounted) {
          const errorData = (error as { response?: { data?: unknown } })
            ?.response?.data;
          Swal.fire({
            icon: "error",
            title: t("common.error"),
            text: String(errorData ?? error),
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadZones();

    return () => {
      mounted = false;
    };
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length]);

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const zones: ZoneListRecord[] =
    (isSuperAdmin && companies.length === 0) ||
    (!companyUniqueId && !isSuperAdmin)
      ? []
      : Array.isArray(allZones)
        ? (allZones as unknown as ZoneListRecord[])
        : [];

  // ===========================
  //   Export (respects current search/status filters)
  // ===========================

  const getFilteredExportRows = (): ZoneListRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return zones.filter((zone) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(zone.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [
        zone.zone_name,
        zone.city_name,
        zone.district_name,
        zone.state_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  // ===========================
  //   Toggle Status
  // ===========================
  const updateStatus = async (row: ZoneListRecord, checked: boolean) => {
    const id = String(row.unique_id);
    setPendingStatusId(id);
    setIsUpdating(true);

    try {
      await zoneApi.update(row.unique_id, { is_active: checked });

      setAllZones((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id
            ? { ...item, is_active: checked }
            : item,
        ),
      );
    } catch (error) {
      console.error("Status update failed:", error);
    } finally {
      setPendingStatusId(null);
      setIsUpdating(false);
    }
  };

  const statusTemplate = (row: ZoneListRecord) => (
    <Switch
      checked={row.is_active}
      disabled={isUpdating && pendingStatusId === String(row.unique_id)}
      onCheckedChange={(checked) => void updateStatus(row, checked)}
    />
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

  const indexTemplate = (
    _: ZoneListRecord,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

  // ===========================
  //   UI
  // ===========================
  return (
    <div className="p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            {t("admin.nav.zone")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.zone") })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.zone") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() =>
              navigate(ENC_NEW_PATH(companyUniqueId, projectId), {
                state: {
                  companyUniqueId,
                  projectId,
                },
              })
            }
          />
        </div>
      </div>

      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder", {
              item: t("admin.nav.zone"),
            })}
            statusValue={statusValue}
            onStatusChange={onStatusFilterChange}
          >
            <FilterBarSelect
              value={companyUniqueId || ""}
              onChange={onFilterCompanyChange}
              options={companies}
              placeholder="All Companies"
              disabled={!isSuperAdmin || companies.length === 0}
            />
            <FilterBarSelect
              value={projectId || ""}
              onChange={onFilterProjectChange}
              options={projects}
              placeholder={showAllProjectsOption ? "All Projects" : undefined}
              disabled={
                (!companyUniqueId && !isSuperAdmin) || projects.length === 0
              }
            />
          </FilterBar>
        }
        loadExportRows={async () => getFilteredExportRows()}
        value={zones}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && zones.length === 0}
        filters={filters}
        onFilter={onFilter}
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
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        {showCol("city_name") && (
          <Column
            field="city_name"
            header={t("admin.nav.city")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row) => cap(row.city_name)}
          />
        )}

        {showCol("zone_name") && (
          <Column
            field="zone_name"
            header={t("admin.nav.zone")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row) => cap(row.zone_name)}
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
