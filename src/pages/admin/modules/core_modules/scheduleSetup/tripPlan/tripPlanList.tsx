import type { TripPlanRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { DataTable } from "@/components/common/SafeDataTable";
import { Switch } from "@/components/ui/switch";
import { PencilIcon } from "@/icons";
import { tripPlanApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import { downloadRecordsPdf } from "@/utils/exportPdf";
import { wasteTypeColorClass } from "@/utils/wasteTypeColors";


// The `rows` memo below always derives _location/_staff/_vehicle/etc. from
// the raw nested objects on every fetched page. These accessors read the
// precomputed string when present and otherwise fall back to deriving it
// directly from the raw record, so Column `body` renderers never hand a raw
// object straight to React.
const asDisplayText = (value: unknown): string => (typeof value === "string" ? value : "");

const singleWardName = (row: TripPlanRecord): string => {
  const ward = (row as { ward?: { ward_name?: string } }).ward;
  return ward?.ward_name ?? "";
};

const wardNamesText = (row: TripPlanRecord): string =>
  Array.isArray(row.wards) && row.wards.length
    ? row.wards.map((ward) => ward?.ward_name).filter(Boolean).join(", ")
    : singleWardName(row);

/** Ward name(s) plus which zone/panchayat they belong to, e.g. "Ward 4 (Panchayat: North PLB)". */
const locationText = (row: TripPlanRecord): string => {
  const wardNames = wardNamesText(row);
  const panchayat = row.panchayat?.panchayat_name || "";
  const zone = row.zone?.name || "";
  const parent = panchayat ? `Panchayat: ${panchayat}` : zone ? `Zone: ${zone}` : "";

  if (wardNames && parent) return `${wardNames} (${parent})`;
  if (wardNames) return wardNames;
  if (panchayat) return panchayat;
  if (zone) return zone;
  return asDisplayText(row._location) || "";
};

// e.g. "13:00:00" -> "1:00 PM"
const time12h = (value?: string): string => {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

const staffText = (row: TripPlanRecord): string =>
  asDisplayText(row._staff) || row.staff_template?.display_code || "";

const vehicleText = (row: TripPlanRecord): string =>
  asDisplayText(row._vehicle) || row.vehicle?.vehicle_no || "";

const WasteTypeChips = (row: TripPlanRecord) => {
  const text = wasteTypeText(row);
  if (!text) return <span className="text-sm text-gray-400">-</span>;
  const names = text.split(",").map((n) => n.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name, index) => (
        <span
          key={`${name}-${index}`}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${wasteTypeColorClass(name)}`}
        >
          {name}
        </span>
      ))}
    </div>
  );
};

const wasteTypeText = (row: TripPlanRecord): string => {
  const existing = asDisplayText(row._waste_type);
  if (existing) return existing;
  if (Array.isArray(row.waste_types) && row.waste_types.length) {
    return row.waste_types.map((wasteType) => wasteType?.waste_type_name).filter(Boolean).join(", ");
  }
  return row.waste_type?.waste_type_name ?? "";
};

const rawStopCountText = (row: TripPlanRecord): string =>
  row.stop_count !== undefined && row.stop_count !== null && row.stop_count !== ""
    ? String(row.stop_count)
    : String(Array.isArray(row.plan_collection_points) ? row.plan_collection_points.length : 0);

const stopCountText = (row: TripPlanRecord): string =>
  asDisplayText(row._stop_count) || rawStopCountText(row);

const driverText = (row: TripPlanRecord): string =>
  asDisplayText(row._driver) || row.staff_template?.driver || "";

const operatorText = (row: TripPlanRecord): string =>
  asDisplayText(row._operator) || row.staff_template?.operator || "";

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  bin_collection: "Secondary Bin Collection",
  household_collection: "Household Collection",
  bulk_waste_collection: "Bulk Waste Collection",
};

// Same color language as Daily Trip Plan's CollectionTypeBadge, keyed to
// Trip Plan's own collection_type literals.
const COLLECTION_TYPE_STYLES: Record<string, string> = {
  bin_collection: "bg-blue-100 text-blue-800",
  household_collection: "bg-green-100 text-green-800",
  bulk_waste_collection: "bg-purple-100 text-purple-800",
};

const collectionTypeDisplay = (row: TripPlanRecord): string =>
  asDisplayText(row._collection_type) || COLLECTION_TYPE_LABELS[row.collection_type ?? ""] || row.collection_type || "";

const CollectionTypeBadge = (row: TripPlanRecord) => {
  const label = collectionTypeDisplay(row) || "Unknown";
  const colorClass = COLLECTION_TYPE_STYLES[row.collection_type ?? ""] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
};

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

  const [rawRows, setRawRows] = useState<TripPlanRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | "bin_collection" | "household_collection">("all");
  const [autoAssignFilter, setAutoAssignFilter] = useState<"all" | "auto" | "manual">("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const ordering = sortField ? `${sortOrder === -1 ? "-" : ""}${sortField}` : undefined;

  const loadRows = (page: number, limit: number, search: string, orderingParam?: string) => {
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setRawRows([]);
      setTotalRecords(0);
      return () => {};
    }
    const requestId = ++requestIdRef.current;
    let mounted = true;
    setLoading(true);
    setRawRows([]);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (search) params.search = search;
    if (orderingParam) params.ordering = orderingParam;
    tripPlanApi.readAllwithPaginated(page, limit, { params })
      .then((response) => {
        if (!mounted || requestId !== requestIdRef.current) return;
        setRawRows(normalizeList(response) as TripPlanRecord[]);
        setTotalRecords(typeof response?.count === "number" ? response.count : normalizeList(response).length);
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return;
        Swal.fire(t("common.error"), extractErrorMessage(error) ?? t("common.fetch_failed"), "error");
      })
      .finally(() => {
        if (mounted && requestId === requestIdRef.current) setLoading(false);
      });
    return () => { mounted = false; };
  };

  useEffect(() => {
    const cleanup = loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, isSuperAdmin, first, rowsPerPage, searchTerm, ordering]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const rows = useMemo(() => rawRows
    .filter((record) => {
      if (collectionTypeFilter !== "all") {
        const stops = Array.isArray(record.plan_collection_points) ? record.plan_collection_points : [];
        if (!stops.some((s: any) => (s.collection_type ?? "bin_collection") === collectionTypeFilter)) return false;
      }
      if (autoAssignFilter === "auto" && !record.is_auto_assign) return false;
      if (autoAssignFilter === "manual" && record.is_auto_assign) return false;
      return true;
    })
    .map((record) => ({
      ...record,
      _location: locationText(record),
      _staff: record.staff_template?.display_code ?? "",
      _vehicle: record.vehicle?.vehicle_no ?? "",
      _waste_type: Array.isArray(record.waste_types) && record.waste_types.length
        ? record.waste_types.map((wasteType) => wasteType?.waste_type_name).filter(Boolean).join(", ")
        : record.waste_type?.waste_type_name ?? "",
      _stop_count: rawStopCountText(record),
      _driver: record.staff_template?.driver ?? "",
      _operator: record.staff_template?.operator ?? "",
      _collection_type: COLLECTION_TYPE_LABELS[record.collection_type ?? ""] ?? record.collection_type ?? "",
    })), [rawRows, collectionTypeFilter, autoAssignFilter]);

  // Keeps exported Excel rows in sync with the currently displayed
  // (filtered/searched) page of rows rather than the full table.
  const [filteredRows, setFilteredRows] = useState<TripPlanRecord[]>([]);
  useEffect(() => {
    setFilteredRows(rows);
  }, [rows]);

  const statusBody = (row: TripPlanRecord) => {
    const updateStatus = async (checked: boolean) => {
      setUpdating(true);
      try {
        await tripPlanApi.update(row.unique_id, { status: checked ? "ACTIVE" : "INACTIVE" });
        setRawRows((current) => current.map((item) => item.unique_id === row.unique_id ? { ...item, status: checked ? "ACTIVE" : "INACTIVE" } : item));
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

  /* ── build one detailed export row per stop (collection point/bin/customer),
     falling back to a single plan-level row when a plan has no stops ── */
  const buildExportRows = (source: TripPlanRecord[]): Record<string, unknown>[] => {
    const out: Record<string, unknown>[] = [];
    source.forEach((record) => {
      const base = {
        "Plan Code": record.display_code ?? record.unique_id,
        Location: locationText(record),
        "Staff Template": staffText(record),
        Driver: driverText(record),
        Operator: operatorText(record),
        Vehicle: vehicleText(record),
        "Waste Type": wasteTypeText(record),
        "Start Time": time12h(record.scheduled_time),
        "Auto Assign": record.is_auto_assign ? "Auto" : "Manual",
        "Collection Type": collectionTypeDisplay(record),
        Approval: record.approval_status ?? "-",
        Status: record.status ?? "-",
      };

      const stops = Array.isArray(record.plan_collection_points) ? record.plan_collection_points : [];

      stops.forEach((stop: any, index: number) => {
        out.push({
          ...base,
          Sequence: stop?.sequence ?? index + 1,
          "Collection Point": stop?.collection_point?.cp_name ?? stop?.collection_point_name ?? stop?.collection_point_id ?? "-",
          Bin: stop?.bin?.bin_name ?? stop?.bin_name ?? stop?.bin_id ?? "-",
          Customer: stop?.customer?.customer_name ?? stop?.customer_name ?? stop?.customer_id ?? "-",
        });
      });

      if (stops.length === 0) {
        out.push({
          ...base,
          Sequence: "-",
          "Collection Point": "-",
          Bin: "-",
          Customer: "-",
        });
      }
    });
    return out;
  };

  const handleDownload = (format: "excel" | "pdf") => {
    setIsExporting(true);
    try {
      const exportRows = buildExportRows(filteredRows.length > 0 ? filteredRows : rows);
      if (exportRows.length === 0) {
        Swal.fire({ icon: "warning", title: "No records", text: "There are no trip plans to export." });
        return;
      }
      if (format === "excel") {
        exportRecordsToExcel(exportRows, getAdminScreenExcelFilename("all"), "Trip Plans");
      } else {
        downloadRecordsPdf({
          title: "Trip Plans",
          filename: "trip_plans.pdf",
          rows: exportRows,
          columns: Object.keys(exportRows[0]).map((key) => ({ key, label: key })),
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: t("common.error"), text: err?.message ?? String(err) });
    } finally {
      setIsExporting(false);
    }
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
        onSearchChange={(value) => setGlobalFilterValue(value)}
        searchPlaceholder={t("common.search_placeholder")}
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              label={isExporting ? "Exporting..." : "Download Excel"}
              icon="pi pi-file-excel"
              className="p-button-outlined p-button-sm"
              disabled={isExporting}
              onClick={() => handleDownload("excel")}
            />
            <Button
              label={isExporting ? "Exporting..." : "Download PDF"}
              icon="pi pi-file-pdf"
              className="p-button-outlined p-button-sm"
              disabled={isExporting}
              onClick={() => handleDownload("pdf")}
            />
          </div>
        }
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
        <FilterBarSelect
          value={autoAssignFilter}
          onChange={(value) => setAutoAssignFilter(value as "all" | "auto" | "manual")}
          options={[
            { value: "all", label: "All Plans" },
            { value: "auto", label: "Auto-Assign" },
            { value: "manual", label: "Manual" },
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
        lazy
        paginator
        first={first}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPage={onPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        loading={loading}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No trip plans found"
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column field="display_code" header="Plan Code" sortable />
        <Column field="_location" header="Location" body={locationText} />
        <Column field="_staff" header="Staff Template" body={staffText} />
        <Column field="_vehicle" header="Vehicle" body={vehicleText} />
        <Column header="Vehicle Breakdown" body={breakdownBody} style={{ minWidth: 140 }} />
        <Column field="_waste_type" header="Waste Type" body={WasteTypeChips} />
        <Column field="_stop_count" header="Stops" style={{ width: 100 }} body={stopCountText} />
        <Column field="scheduled_time" header="Start Time" body={(row: TripPlanRecord) => time12h(row.scheduled_time)} />
        <Column
          header="Auto Assign"
          body={(row: TripPlanRecord) => (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_auto_assign ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"}`}>
              {row.is_auto_assign ? "Auto" : "Manual"}
            </span>
          )}
          style={{ width: 110 }}
        />
        <Column
          field="_collection_type"
          header="Collection Type"
          body={CollectionTypeBadge}
          style={{ minWidth: 170 }}
        />
        <Column
          field="_driver"
          header="Driver"
          body={driverText}
          style={{ minWidth: 130 }}
        />
        <Column
          field="_operator"
          header="Operator"
          body={operatorText}
          style={{ minWidth: 130 }}
        />
        <Column field="approval_status" header="Approval" sortable />
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
