import type { VehicleTypeRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { vehicleTypeApi } from "@/helpers/admin";
import { FilterBar, type StatusFilterValue } from "@/components/common/FilterBar";

const SORTABLE_FIELDS = new Set(["vehicleType", "is_active"]);

const cap = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const toRecordList = (value: unknown): VehicleTypeRecord[] => {
  if (Array.isArray(value)) return value as VehicleTypeRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: VehicleTypeRecord[] }).results;
  }
  return [];
};

export default function VehicleTypeCreationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [rows, setRows] = useState<VehicleTypeRecord[]>([]);
  const [exportRows, setExportRows] = useState<VehicleTypeRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusValue, setStatusValue] = useState<StatusFilterValue>("all");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);

  const { encTransportMaster, encVehicleType } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encTransportMaster,
    encVehicleType,
  );

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRows([]);
    try {
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";
      if (ordering) params.ordering = ordering;

      const response = await vehicleTypeApi.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;

      const list = toRecordList(response);
      setRows(list);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count?: number }).count as number
          : list.length,
      );
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire({ icon: "error", title: t("common.error"), text: String(error) });
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, first, rowsPerPage, searchTerm, statusValue, ordering]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // SafeDataTable's built-in "Download All Excel" button reads the `exportRows`
  // prop synchronously, so keep it refreshed with the full (unpaginated),
  // currently-filtered result set whenever filters change.
  useEffect(() => {
    let mounted = true;
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";

    vehicleTypeApi.readAllForExport({ params })
      .then((data: unknown) => { if (mounted) setExportRows(toRecordList(data)); })
      .catch(() => { if (mounted) setExportRows([]); });
    return () => { mounted = false; };
  }, [searchTerm, statusValue]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(e.target.value);
  };

  const onStatusFilterChange = (value: StatusFilterValue) => {
    setStatusValue(value);
    setFirst(0);
  };

  const statusTemplate = (row: VehicleTypeRecord) => {
    const updateStatus = async (value: boolean) => {
      setPendingStatusId(row.unique_id);
      setIsUpdating(true);
      try {
        await vehicleTypeApi.update(row.unique_id, {
          vehicleType: row.vehicleType,
          description: row.description,
          is_active: value,
        });
        setRows((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch (error) {
        console.error("Failed to update vehicle type status:", error);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={isUpdating && pendingStatusId === row.unique_id}
        onCheckedChange={updateStatus}
      />
    );
  };

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

  const renderHeader = () => (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={(value) =>
        onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
      }
      searchPlaceholder={t("admin.vehicle_type.search_placeholder")}
      statusValue={statusValue}
      onStatusChange={onStatusFilterChange}
    />
  );

  return (
    <div className="p-3">
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
          <Button
            label={t("admin.vehicle_type.add")}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={rows}
        exportRows={exportRows}
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
        loading={isLoading}
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.vehicle_type.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        <Column
          field="vehicleType"
          header={t("admin.vehicle_type.label")}
          sortable={SORTABLE_FIELDS.has("vehicleType")}
          body={(row: VehicleTypeRecord) => cap(row.vehicleType)}
          style={{ minWidth: "200px" }}
        />

        <Column
          field="is_active"
          header={t("common.status")}
          sortable={SORTABLE_FIELDS.has("is_active")}
          body={statusTemplate}
          style={{ width: "140px" }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
