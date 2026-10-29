import type { TripPlanRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";
import { useTranslation } from "react-i18next";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";

import { DataTable } from "@/components/common/SafeDataTable";
import { Switch } from "@/components/ui/switch";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/ActionMenu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/api";
import Select from "@/components/form/Select";
import { tripPlanApi, vehicleCreationApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { StackCell } from "@/components/common/TableCells";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import {
  combineFilters,
  useOptionFilter,
} from "@/components/filters/useOptionFilter";
import { downloadRecordsPdf } from "@/utils/exportPdf";
import { wasteTypeColorClass } from "@/utils/wasteTypeColors";
import { ListPageHeader } from "@/components/common/ListPageHeader";
import { useScreenAccess } from "@/contexts/screenPermission";

// The `rows` memo below always derives _location/_staff/_vehicle/etc. from
// the raw nested objects on every fetched page. These accessors read the
// precomputed string when present and otherwise fall back to deriving it
// directly from the raw record, so Column `body` renderers never hand a raw
// object straight to React.
const asDisplayText = (value: unknown): string =>
  typeof value === "string" ? value : "";

const singleWardName = (row: TripPlanRecord): string => {
  const ward = (row as { ward?: { ward_name?: string } }).ward;
  return ward?.ward_name ?? "";
};

const wardNamesText = (row: TripPlanRecord): string =>
  Array.isArray(row.wards) && row.wards.length
    ? row.wards
        .map((ward) => ward?.ward_name)
        .filter(Boolean)
        .join(", ")
    : singleWardName(row);

/** Ward name(s) plus which zone/panchayat they belong to, e.g. "Ward 4 (Panchayat: North PLB)". */
const locationText = (row: TripPlanRecord): string => {
  const wardNames = wardNamesText(row);
  const panchayat = row.panchayat?.panchayat_name || "";
  const zone = row.zone?.name || "";
  const parent = panchayat
    ? `Panchayat: ${panchayat}`
    : zone
      ? `Zone: ${zone}`
      : "";

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
  const names = text
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
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
    return row.waste_types
      .map((wasteType) => wasteType?.waste_type_name)
      .filter(Boolean)
      .join(", ");
  }
  return row.waste_type?.waste_type_name ?? "";
};

const rawStopCountText = (row: TripPlanRecord): string =>
  row.stop_count !== undefined &&
  row.stop_count !== null &&
  row.stop_count !== ""
    ? String(row.stop_count)
    : String(
        Array.isArray(row.plan_collection_points)
          ? row.plan_collection_points.length
          : 0,
      );

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
  asDisplayText(row._collection_type) ||
  COLLECTION_TYPE_LABELS[row.collection_type ?? ""] ||
  row.collection_type ||
  "";

const CollectionTypeBadge = (row: TripPlanRecord) => {
  const label = collectionTypeDisplay(row) || "Unknown";
  const colorClass =
    COLLECTION_TYPE_STYLES[row.collection_type ?? ""] ??
    "bg-gray-100 text-gray-500";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  );
};

const extractErrorMessage = (error: unknown): string | null => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof (data as Record<string, unknown>)?.detail === "string")
    return (data as Record<string, unknown>).detail as string;
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
  const { canAdd, canEdit } = useScreenAccess();
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;

  const [first, setFirst] = useState(0);
  const resetPage = () => setFirst(0);
  const companyProject = useCompanyProjectFilter(resetPage, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const companyUniqueId = companyProject.companyId;
  const projectId = companyProject.projectId;
  const { isSuperAdmin } = companyProject.selection;

  // Both filter the fetched page client-side (see `rows` below).
  const collectionTypeFilter = useOptionFilter({
    param: "collection_type",
    label: "Collection type",
    options: [
      { value: "bin_collection", label: "Bin Collection" },
      { value: "household_collection", label: "Household Collection" },
    ],
    allLabel: "All Types",
    onAppliedChange: resetPage,
  });
  const autoAssignFilter = useOptionFilter({
    param: "auto_assign",
    label: "Assignment",
    options: [
      { value: "auto", label: "Auto-Assign" },
      { value: "manual", label: "Manual" },
    ],
    allLabel: "All Plans",
    onAppliedChange: resetPage,
  });
  const collectionType = collectionTypeFilter.value;
  const autoAssign = autoAssignFilter.value;

  const { encScheduleSetup, encTripPlans } = getEncryptedRoute();
  const { newPath: newPath } = createCrudRoutePaths(
    encScheduleSetup,
    encTripPlans,
  );
  const { editPath } = createCrudRoutePaths(encScheduleSetup, encTripPlans);

  const [rawRows, setRawRows] = useState<TripPlanRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);

  // "Use another vehicle" — the plan runs on a stand-in vehicle (same crew)
  // while its own vehicle is under breakdown.
  const [substitutionRow, setSubstitutionRow] = useState<TripPlanRecord | null>(null);
  const [substituteOptions, setSubstituteOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [substituteVehicleId, setSubstituteVehicleId] = useState("");
  const [substituteFromDate, setSubstituteFromDate] = useState("");
  const [savingSubstitution, setSavingSubstitution] = useState(false);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const ordering = sortField
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = (
    page: number,
    limit: number,
    search: string,
    orderingParam?: string,
  ) => {
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
    tripPlanApi
      .readAllwithPaginated(page, limit, { params })
      .then((response) => {
        if (!mounted || requestId !== requestIdRef.current) return;
        setRawRows(normalizeList(response) as TripPlanRecord[]);
        setTotalRecords(
          typeof response?.count === "number"
            ? response.count
            : normalizeList(response).length,
        );
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return;
        Swal.fire(
          t("common.error"),
          extractErrorMessage(error) ?? t("common.fetch_failed"),
          "error",
        );
      })
      .finally(() => {
        if (mounted && requestId === requestIdRef.current) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  };

  const reloadRows = () =>
    loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);

  const localToday = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  };

  const openSubstitution = async (row: TripPlanRecord) => {
    setSubstitutionRow(row);
    setSubstituteVehicleId(row.vehicle_substitution?.replacement_vehicle_id ?? "");
    setSubstituteFromDate(localToday());
    setSubstituteOptions([]);
    try {
      const vehicles = (await vehicleCreationApi.readAll({
        params: {
          company_id: row.company_id ?? undefined,
          project_id: row.project_id ?? undefined,
        },
      })) as {
        unique_id: string;
        vehicle_no: string;
        is_active?: boolean;
        operational_status?: string;
      }[];
      setSubstituteOptions(
        vehicles
          .filter(
            (v) =>
              v.is_active &&
              v.operational_status !== "BREAKDOWN" &&
              v.unique_id !== row.vehicle_id,
          )
          .map((v) => ({ value: v.unique_id, label: v.vehicle_no })),
      );
    } catch (error) {
      Swal.fire(t("common.error"), extractErrorMessage(error) ?? "Could not load vehicles.", "error");
    }
  };

  const saveSubstitution = async () => {
    if (!substitutionRow || !substituteVehicleId) return;
    const url = `/schedule-setup/trip-plans/${substitutionRow.unique_id}/vehicle-substitution/`;
    const payload = {
      replacement_vehicle_id: substituteVehicleId,
      from_date: substituteFromDate,
    };
    setSavingSubstitution(true);
    try {
      try {
        await api.post(url, payload);
      } catch (error) {
        const response = (error as {
          response?: {
            status?: number;
            data?: {
              detail?: string;
              clashes?: { display_code?: string | null; scheduled_time?: string | null; days: string[] }[];
            };
          };
        }).response;
        if (response?.status !== 409) throw error;
        // The vehicle already has regular work on this plan's days.
        const clashes = (response.data?.clashes ?? [])
          .map(
            (c) =>
              `${c.display_code ?? "Another plan"}${c.scheduled_time ? ` at ${c.scheduled_time.slice(0, 5)}` : ""} on ${c.days.join(", ")}`,
          )
          .join("\n");
        const confirm = await Swal.fire({
          title: "Vehicle already busy",
          text: `${response.data?.detail ?? ""}\n${clashes}\n\nUse it for this plan anyway?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, use it",
          cancelButtonText: "Cancel",
        });
        if (!confirm.isConfirmed) return;
        await api.post(url, { ...payload, confirm_clashes: true });
      }
      Swal.fire({
        icon: "success",
        title: "Replacement vehicle set",
        text: "Daily trips for this plan will run on it with the same crew until the vehicle is repaired.",
        timer: 2500,
        showConfirmButton: false,
      });
      setSubstitutionRow(null);
      reloadRows();
    } catch (error) {
      Swal.fire(t("common.error"), extractErrorMessage(error) ?? "Could not save.", "error");
    } finally {
      setSavingSubstitution(false);
    }
  };

  const endSubstitution = async (row: TripPlanRecord) => {
    const confirm = await Swal.fire({
      title: "Stop using the replacement vehicle?",
      text: "No trip is created for this plan while its own vehicle is still under breakdown.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, stop",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;
    try {
      await api.post(
        `/schedule-setup/trip-plans/${row.unique_id}/vehicle-substitution/end/`,
      );
      reloadRows();
    } catch (error) {
      Swal.fire(t("common.error"), extractErrorMessage(error) ?? "Could not update.", "error");
    }
  };

  const vehicleBody = (row: TripPlanRecord) => (
    <div className="flex flex-col gap-1">
      <span>{vehicleText(row)}</span>
      {row.vehicle?.operational_status === "BREAKDOWN" && (
        <span className="inline-flex w-fit rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          Under breakdown
        </span>
      )}
      {row.vehicle?.operational_status === "BREAKDOWN" && row.vehicle_substitution && (
        <span
          className="inline-flex w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
          title={`From ${row.vehicle_substitution.from_date} until repaired`}
        >
          Running on {row.vehicle_substitution.replacement_vehicle_no ?? "replacement"}
        </span>
      )}
    </div>
  );

  const rowActions = (row: TripPlanRecord): ActionMenuItem[] => {
    if (!canEdit || row.vehicle?.operational_status !== "BREAKDOWN") return [];
    const actions: ActionMenuItem[] = [
      {
        key: "use-another-vehicle",
        label: row.vehicle_substitution
          ? "Change replacement vehicle"
          : "Use another vehicle",
        icon: <i className="pi pi-car" />,
        onClick: () => void openSubstitution(row),
      },
    ];
    if (row.vehicle_substitution) {
      actions.push({
        key: "end-replacement",
        label: "Stop using replacement",
        icon: <i className="pi pi-times-circle" />,
        onClick: () => void endSubstitution(row),
      });
    }
    return actions;
  };

  useEffect(() => {
    const cleanup = loadRows(
      first / rowsPerPage + 1,
      rowsPerPage,
      searchTerm,
      ordering,
    );
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyUniqueId,
    projectId,
    isSuperAdmin,
    first,
    rowsPerPage,
    searchTerm,
    ordering,
  ]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const rows = useMemo(
    () =>
      rawRows
        .filter((record) => {
          if (collectionType) {
            const stops = Array.isArray(record.plan_collection_points)
              ? record.plan_collection_points
              : [];
            if (
              !stops.some(
                (s: any) =>
                  (s.collection_type ?? "bin_collection") ===
                  collectionType,
              )
            )
              return false;
          }
          if (autoAssign === "auto" && !record.is_auto_assign)
            return false;
          if (autoAssign === "manual" && record.is_auto_assign)
            return false;
          return true;
        })
        .map((record) => ({
          ...record,
          _location: locationText(record),
          _staff: record.staff_template?.display_code ?? "",
          _vehicle: record.vehicle?.vehicle_no ?? "",
          _waste_type:
            Array.isArray(record.waste_types) && record.waste_types.length
              ? record.waste_types
                  .map((wasteType) => wasteType?.waste_type_name)
                  .filter(Boolean)
                  .join(", ")
              : (record.waste_type?.waste_type_name ?? ""),
          _stop_count: rawStopCountText(record),
          _driver: record.staff_template?.driver ?? "",
          _operator: record.staff_template?.operator ?? "",
          _collection_type:
            COLLECTION_TYPE_LABELS[record.collection_type ?? ""] ??
            record.collection_type ??
            "",
        })),
    [rawRows, collectionType, autoAssign],
  );

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
        await tripPlanApi.update(row.unique_id, {
          status: checked ? "ACTIVE" : "INACTIVE",
        });
        setRawRows((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, status: checked ? "ACTIVE" : "INACTIVE" }
              : item,
          ),
        );
      } catch (error) {
        Swal.fire(
          t("common.error"),
          extractErrorMessage(error) ?? t("common.update_status_failed"),
          "error",
        );
      } finally {
        setUpdating(false);
      }
    };
    return (
      <Switch
        checked={row.status === "ACTIVE"}
        disabled={!canEdit || updating}
        onCheckedChange={updateStatus}
      />
    );
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
            <span className="font-medium">Veh:</span>{" "}
            {bd.replacement_vehicle_no}
          </div>
        )}
      </div>
    );
  };

  /* ── build one detailed export row per stop (collection point/bin/customer),
     falling back to a single plan-level row when a plan has no stops ── */
  const buildExportRows = (
    source: TripPlanRecord[],
  ): Record<string, unknown>[] => {
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

      const stops = Array.isArray(record.plan_collection_points)
        ? record.plan_collection_points
        : [];

      stops.forEach((stop: any, index: number) => {
        out.push({
          ...base,
          Sequence: stop?.sequence ?? index + 1,
          "Collection Point":
            stop?.collection_point?.cp_name ??
            stop?.collection_point_name ??
            stop?.collection_point_id ??
            "-",
          Bin: stop?.bin?.bin_name ?? stop?.bin_name ?? stop?.bin_id ?? "-",
          Customer:
            stop?.customer?.customer_name ??
            stop?.customer_name ??
            stop?.customer_id ??
            "-",
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

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await tripPlanApi.delete(id, withDeleteReason(reason));
      setRawRows((current) => current.filter((item) => item.unique_id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error) ?? t("common.delete_failed"),
        "error",
      );
    }
  };

  const handleDownloadPdf = async () => {
    const exportRows = buildExportRows(
      filteredRows.length > 0 ? filteredRows : rows,
    );
    if (exportRows.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No records",
        text: "There are no trip plans to export.",
      });
      return;
    }
    await downloadRecordsPdf({
      title: "Trip Plans",
      filename: "trip_plans.pdf",
      rows: exportRows,
      columns: Object.keys(exportRows[0]).map((key) => ({
        key,
        label: key,
      })),
    });
  };

  return (
    <div className="p-3">
      <ListPageHeader
        title="Trip Plans"
        subtitle="Manage trip route, staff, vehicle, schedule, and stop list"
        actions={
          canAdd ? (
            <Button
              label="Add Trip Plan"
              icon="pi pi-plus"
              className="p-button-success p-button-sm"
              onClick={() =>
                navigate(newPath, { state: { companyUniqueId, projectId } })
              }
            />
          ) : undefined
        }
        className="mb-4"
      />

      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={(value) => setGlobalFilterValue(value)}
            searchPlaceholder={t("common.search_placeholder")}
          />
        }
        filterPanel={combineFilters(
          companyProject,
          collectionTypeFilter,
          autoAssignFilter,
        )}
        loadExportRows={async () =>
          buildExportRows(filteredRows.length > 0 ? filteredRows : rows)
        }
        value={rows}
        exportRows={filteredRows}
        onPdfRequest={handleDownloadPdf}
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
        stripedRows
        showGridlines
        fitWidth
        className="p-datatable-sm"
        emptyMessage="No trip plans found"
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: "4%" }}
        />
        <Column
          field="display_code"
          header="Plan Code"
          sortable
          style={{ width: "15%" }}
          body={(row: TripPlanRecord) => (
            <StackCell
              primary={row.display_code}
              lines={[CollectionTypeBadge(row)]}
            />
          )}
        />
        {locationColumn<TripPlanRecord>({
          header: "Location",
          style: { width: "14%" },
          levels: [
            { label: "Panchayat", value: (row) => row.panchayat?.panchayat_name },
            { label: "Zone", value: (row) => row.zone?.name },
            { label: "Ward", value: wardNamesText },
          ],
        })}
        <Column
          field="_staff"
          header="Crew & Vehicle"
          style={{ width: "20%" }}
          body={(row: TripPlanRecord) => (
            <StackCell
              primary={staffText(row)}
              lines={[
                { label: "Driver", value: driverText(row) },
                { label: "Operator", value: operatorText(row) },
                vehicleText(row) && { icon: "pi-truck", value: vehicleBody(row) },
                row.active_breakdown ? breakdownBody(row) : null,
              ]}
            />
          )}
        />
        <Column
          field="_waste_type"
          header="Waste Type"
          body={WasteTypeChips}
          style={{ width: "12%" }}
        />
        <Column
          field="scheduled_time"
          header="Schedule"
          style={{ width: "12%" }}
          body={(row: TripPlanRecord) => (
            <StackCell
              primary={time12h(row.scheduled_time)}
              lines={[
                { label: "Stops", value: stopCountText(row) },
                <span
                  key="assign"
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_auto_assign ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"}`}
                >
                  {row.is_auto_assign ? "Auto" : "Manual"}
                </span>,
              ]}
            />
          )}
        />
        <Column
          field="approval_status"
          header="Approval"
          sortable
          style={{ width: "9%" }}
        />
        <Column header="Status" body={statusBody} style={{ width: "8%" }} />
        <Column
          header={t("common.actions")}
          style={{ width: "6%" }}
          body={(row: TripPlanRecord) => (
            <div className="flex justify-center">
              <ActionMenu
                onEdit={() =>
                  navigate(editPath(row.unique_id), {
                    state: { record: row, companyUniqueId, projectId },
                  })
                }
                actions={rowActions(row)}
                onDelete={() => void handleDelete(row.unique_id)}
              />
            </div>
          )}
        />
      </DataTable>

      {/* The ui/dialog (z-50) keeps the vehicle Select's popover (z-80) on
          top; a PrimeReact Dialog (z-index 1000+) would hide it. */}
      <Dialog
        open={Boolean(substitutionRow)}
        onOpenChange={(open) => !open && !savingSubstitution && setSubstitutionRow(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Use another vehicle</DialogTitle>
          </DialogHeader>
          {substitutionRow && (
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">{substitutionRow.display_code}</span>{" "}
              will run on this vehicle with its own crew while{" "}
              <span className="font-medium text-red-700">
                {vehicleText(substitutionRow)}
              </span>{" "}
              is under breakdown. It switches back automatically once the
              vehicle is marked repaired.
            </p>
            <div>
              <p className="mb-1.5 font-medium text-gray-700">Vehicle *</p>
              <Select
                value={substituteVehicleId}
                onChange={setSubstituteVehicleId}
                options={substituteOptions}
                placeholder="Select vehicle"
                disabled={savingSubstitution}
              />
            </div>
            <div>
              <p className="mb-1.5 font-medium text-gray-700">From date *</p>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={substituteFromDate}
                min={localToday()}
                onChange={(e) => setSubstituteFromDate(e.target.value)}
                disabled={savingSubstitution}
              />
              <p className="mt-1 text-xs text-gray-500">
                For today, press "Generate Daily" on the Daily Trip Plan after saving.
              </p>
            </div>
          </div>
          )}
          <DialogFooter>
            <Button
              label={t("common.cancel")}
              className="p-button-text p-button-secondary"
              onClick={() => setSubstitutionRow(null)}
              disabled={savingSubstitution}
            />
            <Button
              label="Save"
              icon="pi pi-check"
              loading={savingSubstitution}
              disabled={!substituteVehicleId || !substituteFromDate}
              onClick={() => void saveSubstitution()}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
