import type { CityRecord, CityWithRelations } from "./types";
import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { cityApi } from "@/helpers/admin";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { combineFilters } from "@/components/filters/useOptionFilter";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { Can } from "@/contexts/ScreenPermissionContext";
import { useScreenAccess } from "@/contexts/screenPermission";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const CITY_COLUMN_FIELDS: Record<string, string[]> = {
  country_name: ["country_id"],
  state_name: ["state_id"],
  district_name: ["district_id"],
  name: ["name"],
  is_active: ["is_active"],
};

export default function CityList() {
  const { t } = useTranslation();
  const { canEdit } = useScreenAccess();
  const { showColumn: showCol } = useFieldVisibility(
    "masters",
    "cities",
    CITY_COLUMN_FIELDS,
  );

  const [allCities, setAllCities] = useState<CityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    statusFilter,
  } = useFilterBarFilters({
    initialFilters: {
      country_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      state_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      district_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
  const companyProject = useCompanyProjectFilter(undefined, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { companies, isSuperAdmin } = companyProject.selection;

  const navigate = useNavigate();

  const { encMasters, encCities } = getEncryptedRoute();

  const { newPath: cityNewPath, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encMasters, encCities);
  const ENC_NEW_PATH = (
    companyId?: string | null,
    selectedProjectId?: string | null,
  ) =>
    appendRouteQuery(cityNewPath, {
      company_unique_id: companyId,
      project_id: selectedProjectId,
    });

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    let mounted = true;

    const loadCities = async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const params: Record<string, string> = {};
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;

        const data = await cityApi.readAll({ params });
        if (!mounted || requestId !== requestIdRef.current) return;
        setAllCities(data as CityRecord[]);
      } catch (error) {
        if (!mounted || requestId !== requestIdRef.current) return;
        const errorData = (error as { response?: { data?: unknown } })?.response
          ?.data;
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: String(errorData ?? error),
        });
      } finally {
        if (mounted && requestId === requestIdRef.current) setIsLoading(false);
      }
    };

    void loadCities();

    return () => {
      mounted = false;
    };
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length]);

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const cities = useMemo(() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId && !isSuperAdmin) return [];

    return allCities;
  }, [allCities, companyUniqueId, companies.length, isSuperAdmin]);

  const getFilteredExportRows = (): CityRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return (cities as CityWithRelations[]).filter((city) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(city.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [city.name, city.country_name, city.state_name, city.district_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const updateStatus = async (city: CityRecord, checked: boolean) => {
    const cityId = String(city.unique_id);
    setPendingStatusId(cityId);
    setIsUpdating(true);

    try {
      await cityApi.update(city.unique_id, { is_active: checked });
      setAllCities((current) =>
        current.map((item) =>
          item.unique_id === city.unique_id
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

  const statusTemplate = (city: CityRecord) => (
    <Switch
      checked={city.is_active}
      disabled={
        !canEdit || (isUpdating && pendingStatusId === String(city.unique_id))
      }
      onCheckedChange={(checked) => void updateStatus(city, checked)}
    />
  );

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await cityApi.delete(id, withDeleteReason(reason));
      setAllCities((current) => current.filter((item) => item.unique_id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      const errorData = (error as { response?: { data?: unknown } })?.response
        ?.data;
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: String(errorData ?? t("common.request_failed")),
      });
    }
  };

  const actionTemplate = (city: CityRecord) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(city.unique_id), {
            state: {
              city,
              companyUniqueId: city.company_id ?? city.company_unique_id,
              projectId: city.project_id ?? city.project_unique_id,
            },
          })
        }
        onDelete={() => void handleDelete(String(city.unique_id))}
      />
    </div>
  );

  const indexTemplate = (_: CityRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  return (
    <div className="p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            {t("admin.nav.city")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.city") })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Can action="add">
            <Button
              label={t("common.add_item", { item: t("admin.nav.city") })}
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
          </Can>
        </div>
      </div>

      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder", {
              item: t("admin.nav.city"),
            })}
          />
        }
        filterPanel={combineFilters(companyProject, statusFilter)}
        loadExportRows={async () => getFilteredExportRows()}
        value={cities}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && cities.length === 0}
        filters={filters}
        onFilter={onFilter}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.city"),
        })}
        globalFilterFields={[
          "name",
          "country_name",
          "state_name",
          "district_name",
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
        {locationColumn<CityWithRelations>({
          header: t("common.location"),
          levels: [
            showCol("country_name") && {
              label: t("admin.nav.country"),
              value: (row) => cap(row.country_name ?? undefined),
            },
            showCol("state_name") && {
              label: t("admin.nav.state"),
              value: (row) => cap(row.state_name ?? undefined),
            },
            showCol("district_name") && {
              label: t("admin.nav.district"),
              value: (row) => cap(row.district_name ?? undefined),
            },
          ],
        })}
        {showCol("name") && (
          <Column
            field="name"
            header={t("admin.nav.city")}
            body={(r) => cap(r.name)}
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("is_active") && (
          <Column header={t("common.status")} body={statusTemplate} />
        )}
        <Column header={t("common.actions")} body={actionTemplate} />
      </DataTable>
    </div>
  );
}
