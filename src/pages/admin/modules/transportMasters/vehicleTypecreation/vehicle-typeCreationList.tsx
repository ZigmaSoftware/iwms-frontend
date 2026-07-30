import type { VehicleTypeRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { vehicleTypeApi } from "@/helpers/admin";
import { FilterBar, type StatusFilterValue } from "@/components/common/FilterBar";

const cap = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

export default function VehicleTypeCreationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [allVehicleTypes, setAllVehicleTypes] = useState<VehicleTypeRecord[]>([]);
  const [filteredRows, setFilteredRows] = useState<VehicleTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [statusValue, setStatusValue] = useState<StatusFilterValue>("all");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    vehicleType: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    is_active: { value: null as boolean | null, matchMode: FilterMatchMode.EQUALS },
  });

  const { encTransportMaster, encVehicleType } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encTransportMaster,
    encVehicleType,
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    vehicleTypeApi.readAll()
      .then((data: unknown) => {
        if (mounted) setAllVehicleTypes(Array.isArray(data) ? (data as VehicleTypeRecord[]) : []);
      })
      .catch((error: unknown) => {
        if (mounted) {
          Swal.fire({ icon: "error", title: t("common.error"), text: String(error) });
        }
      })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [t]);

  // Keeps exported Excel rows in sync with the currently displayed
  // (filtered/searched) rows rather than the full unfiltered set.
  useEffect(() => {
    setFilteredRows(allVehicleTypes);
  }, [allVehicleTypes]);

  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const onStatusFilterChange = (value: StatusFilterValue) => {
    setStatusValue(value);
    setFilters((prev) => ({
      ...prev,
      is_active: {
        value: value === "all" ? null : value === "active",
        matchMode: FilterMatchMode.EQUALS,
      },
    }));
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
        setAllVehicleTypes((current) =>
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
        value={allVehicleTypes}
        exportRows={filteredRows}
        onValueChange={(value) => setFilteredRows(value as VehicleTypeRecord[])}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && allVehicleTypes.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        globalFilterFields={["vehicleType"]}
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
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: VehicleTypeRecord) => cap(row.vehicleType)}
          style={{ minWidth: "200px" }}
        />

        <Column
          header={t("common.status")}
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
