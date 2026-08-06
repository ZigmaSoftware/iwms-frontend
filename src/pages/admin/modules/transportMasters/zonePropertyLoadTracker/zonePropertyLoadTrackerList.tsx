import type { TableFilters, ZonePropertyLoadTrackerApiRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";

import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";


export default function ZonePropertyLoadTrackerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [records, setRecords] = useState<ZonePropertyLoadTrackerApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filteredRows, setFilteredRows] =
    useState<ZonePropertyLoadTrackerApiRecord[]>([]);
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    "zone_details.name": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "vehicle_details.vehicle_no": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "property_details.property_name": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "sub_property_details.sub_property_name": { value: null, matchMode: FilterMatchMode.CONTAINS },
    current_weight_kg: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encZonePropertyLoadTracker } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encTransportMaster,
    encZonePropertyLoadTracker,
  );

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      setRecords([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const params = { company_id: companyUniqueId, project_id: projectId ?? undefined };
    setLoading(true);
    adminApi.zonePropertyLoadTrackers.readAll({ params })
      .then((res) => {
        if (mounted) setRecords(normalizeList(res ?? []));
      })
      .catch(() => {
        if (mounted) Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, t]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.zone_property_load_tracker.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.zone_property_load_tracker.list_subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label={t("admin.zone_property_load_tracker.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
           
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={(value) =>
          onGlobalFilterChange({
            target: { value },
          } as React.ChangeEvent<HTMLInputElement>)
        }
        searchPlaceholder={t("admin.zone_property_load_tracker.search_placeholder")}
      >
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          placeholder="All Companies"
          options={companies}
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          options={projects}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
      </FilterBar>
    </div>
  );

  const actionTemplate = (row: ZonePropertyLoadTrackerApiRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id), { state: { record: row } })}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={records}
        exportRows={filteredRows}
        onValueChange={(value) =>
          setFilteredRows(value as ZonePropertyLoadTrackerApiRecord[])
        }
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={[
          "zone_details.name",
          "vehicle_details.vehicle_no",
          "property_details.property_name",
          "sub_property_details.sub_property_name",
          "company_name",
          "project_name",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.zone_property_load_tracker.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />

        <Column
          field="zone_details.name"
          header={t("admin.zone_property_load_tracker.zone")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.zone_details.name}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="vehicle_details.vehicle_no"
          header={t("admin.zone_property_load_tracker.vehicle")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.vehicle_details.vehicle_no}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="property_details.property_name"
          header={t("admin.zone_property_load_tracker.property")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.property_details.property_name}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="sub_property_details.sub_property_name"
          header={t("admin.zone_property_load_tracker.sub_property")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.sub_property_details.sub_property_name}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="current_weight_kg"
          header={t("admin.zone_property_load_tracker.current_weight")}
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>
    </div>
  );
}
