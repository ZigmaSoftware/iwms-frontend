import type { TableFilters, TripPlanRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Switch } from "@/components/ui/switch";
import { PencilIcon } from "@/icons";
import { tripPlanApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";


const extractErrorMessage = (error: unknown): string | null => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof (data as Record<string, unknown>)?.detail === "string") return (data as Record<string, unknown>).detail as string;
  if (typeof data === "object") {
    const firstValue = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return null;
};

export default function TripPlanList() {
  const { t } = useTranslation();
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
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encScheduleMasters, encTripPlans } = getEncryptedRoute();
  const { newPath: newPath } = createCrudRoutePaths(encScheduleMasters, encTripPlans);
  const { editPath } = createCrudRoutePaths(encScheduleMasters, encTripPlans);

  const [records, setRecords] = useState<TripPlanRecord[]>([]);
  const [filteredRows, setFilteredRows] = useState<TripPlanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | "bin_collection" | "household_collection">("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    display_code: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _location: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _staff: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _vehicle: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _waste_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _stop_count: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  useEffect(() => {
    if (!companyUniqueId && !isSuperAdmin) {
      setRecords([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    tripPlanApi.readAll({ params })
      .then((data) => {
        if (mounted) setRecords(normalizeList(data) as TripPlanRecord[]);
      })
      .catch((error) => Swal.fire(t("common.error"), extractErrorMessage(error) ?? t("common.fetch_failed"), "error"))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, isSuperAdmin, t]);

  const rows = useMemo(() => records
    .filter((record) => {
      if (collectionTypeFilter === "all") return true;
      const stops = Array.isArray(record.plan_collection_points) ? record.plan_collection_points : [];
      return stops.some((s: any) => (s.collection_type ?? "bin_collection") === collectionTypeFilter);
    })
    .map((record) => ({
      ...record,
      _location: record.panchayat?.panchayat_name ?? (record.ward as any)?.ward_name ?? "",
      _staff: record.staff_template?.display_code ?? "",
      _vehicle: record.vehicle?.vehicle_no ?? "",
      _waste_type: Array.isArray(record.waste_types) && record.waste_types.length
        ? record.waste_types.map((wasteType) => wasteType?.waste_type_name).filter(Boolean).join(", ")
        : record.waste_type?.waste_type_name ?? "",
      _stop_count: String(Array.isArray(record.plan_collection_points) ? record.plan_collection_points.length : 0),
    })), [records, collectionTypeFilter]);

  // Keeps exported Excel rows in sync with the currently displayed
  // (filtered/searched) rows rather than the full unfiltered set.
  useEffect(() => {
    setFilteredRows(rows);
  }, [rows]);

  const statusBody = (row: TripPlanRecord) => {
    const updateStatus = async (checked: boolean) => {
      setUpdating(true);
      try {
        await tripPlanApi.update(row.unique_id, { status: checked ? "ACTIVE" : "INACTIVE" });
        setRecords((current) => current.map((item) => item.unique_id === row.unique_id ? { ...item, status: checked ? "ACTIVE" : "INACTIVE" } : item));
      } catch (error) {
        Swal.fire(t("common.error"), extractErrorMessage(error) ?? t("common.update_status_failed"), "error");
      } finally {
        setUpdating(false);
      }
    };
    return <Switch checked={row.status === "ACTIVE"} disabled={updating} onCheckedChange={updateStatus} />;
  };

  const breakdownBody = (row: TripPlanRecord) => {
    const bd = row.active_breakdown;
    if (!bd) return <span className="text-xs text-gray-300">—</span>;
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
          ⚠ Replacement Active
        </span>
        {bd.replacement_vehicle_no && (
          <div className="text-[10px] text-gray-600 leading-tight">
            <span className="font-medium">Veh:</span> {bd.replacement_vehicle_no}
          </div>
        )}
      </div>
    );
  };

  const header = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Trip Plans</h1>
          <p className="text-sm text-gray-500">Manage trip route, staff, vehicle, schedule, and stop list</p>
        </div>
        <div className="flex items-center gap-3">
          <Button label="Add Trip Plan" icon="pi pi-plus" className="p-button-success p-button-sm" onClick={() => navigate(newPath, { state: { companyUniqueId, projectId } })} />
        </div>
      </div>
      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={(value) => {
          setGlobalFilterValue(value);
          setFilters((current) => ({ ...current, global: { value, matchMode: FilterMatchMode.CONTAINS } }));
        }}
        searchPlaceholder={t("common.search_placeholder")}
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
        <FilterBarSelect
          value={collectionTypeFilter}
          onChange={(value) =>
            setCollectionTypeFilter(value as "all" | "bin_collection" | "household_collection")
          }
          options={[
            { value: "all", label: "All Types" },
            { value: "bin_collection", label: "Bin Collection" },
            { value: "household_collection", label: "Household Collection" },
          ]}
        />
      </FilterBar>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={rows}
        exportRows={filteredRows}
        onValueChange={(value) => setFilteredRows(value as typeof rows)}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        onFilter={(event: DataTableFilterEvent) => setFilters(event.filters as TableFilters)}
        globalFilterFields={["display_code", "_location", "_staff", "_vehicle", "_waste_type", "_stop_count", "approval_status", "status"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip plans found"
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column field="display_code" header="Plan Code" filter showFilterMatchModes={false} />
        <Column field="_location" header="Location" filter showFilterMatchModes={false} />
        <Column field="_staff" header="Staff Template" filter showFilterMatchModes={false} />
        <Column field="_vehicle" header="Vehicle" filter showFilterMatchModes={false} />
        <Column header="Vehicle Breakdown" body={breakdownBody} style={{ minWidth: 140 }} />
        <Column field="_waste_type" header="Waste Type" filter showFilterMatchModes={false} />
        <Column field="_stop_count" header="Stops" filter showFilterMatchModes={false} style={{ width: 100 }} />
        <Column field="scheduled_time" header="Start Time" />
        <Column field="approval_status" header="Approval" />
        <Column header="Status" body={statusBody} style={{ width: 120 }} />
        <Column header={t("common.actions")} style={{ width: 120 }} body={(row: TripPlanRecord) => (
          <button title={t("common.edit")} onClick={() => navigate(editPath(row.unique_id), { state: { record: row, companyUniqueId, projectId } })} className="text-blue-600 hover:text-blue-800">
            <PencilIcon className="size-5" />
          </button>
        )} />
      </DataTable>
    </div>
  );
}
