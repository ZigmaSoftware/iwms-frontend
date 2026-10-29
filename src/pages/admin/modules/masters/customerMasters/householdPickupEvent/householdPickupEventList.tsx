import type { HouseholdPickupEventRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";

import { ActionMenu } from "@/components/ui/ActionMenu";
import {
  createCrudHelpers,
  customerCreationApi,
  propertiesApi,
  staffCreationApi,
  subPropertiesApi,
  vehicleCreationApi,
  zoneApi,
} from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { StackCell } from "@/components/common/TableCells";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";
import { Can } from "@/contexts/ScreenPermissionContext";

const householdPickupEventApi = createCrudHelpers<HouseholdPickupEventRecord>(
  "customer-masters/household-pickup-events",
);

const buildLookup = (items: any[], key: string, label: string) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(item?.[label] ?? lookupKey);
    }
    return acc;
  }, {});

const HOUSEHOLD_PICKUP_COLUMN_FIELDS: Record<string, string[]> = {
  customer_id: ["customer_id", "customer"],
  zone_id: ["zone_id", "zone"],
  property_id: ["property_id", "property"],
  sub_property_id: ["sub_property_id", "sub_property"],
  pickup_time: ["pickup_time"],
  weight_kg: ["weight_kg"],
  collector_staff_id: ["collector_staff_id", "collector"],
  vehicle_id: ["vehicle_id", "vehicle"],
  source: ["source"],
};

export default function HouseholdPickupEventList() {
  const { t } = useTranslation();
  const { showColumn: showCol } = useFieldVisibility(
    "customer-master",
    "household-pickup-event",
    HOUSEHOLD_PICKUP_COLUMN_FIELDS,
  );
  const navigate = useNavigate();

  const [records, setRecords] = useState<HouseholdPickupEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [customerLookup, setCustomerLookup] = useState<Record<string, string>>(
    {},
  );
  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [propertyLookup, setPropertyLookup] = useState<Record<string, string>>(
    {},
  );
  const [subPropertyLookup, setSubPropertyLookup] = useState<
    Record<string, string>
  >({});
  const [collectorLookup, setCollectorLookup] = useState<
    Record<string, string>
  >({});
  const [vehicleLookup, setVehicleLookup] = useState<Record<string, string>>(
    {},
  );

  const { filters, globalFilterValue, onGlobalFilterChange } =
    useFilterBarFilters({
      withStatusFilter: false,
    });

  const { encCustomerMaster, encHouseholdPickupEvent } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encCustomerMaster, encHouseholdPickupEvent);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [
        pickupRes,
        customerRes,
        zoneRes,
        propertyRes,
        subPropertyRes,
        userRes,
        vehicleRes,
      ] = await Promise.all([
        householdPickupEventApi.readAll(),
        customerCreationApi.readAll(),
        zoneApi.readAll(),
        propertiesApi.readAll(),
        subPropertiesApi.readAll(),
        staffCreationApi.readAll(),
        vehicleCreationApi.readAll(),
      ]);

      const staffUsers = normalizeList(userRes).filter(
        (u: any) => String(u?.user_type_name ?? "").toLowerCase() === "staff",
      );

      setRecords(normalizeList(pickupRes));
      setCustomerLookup(
        buildLookup(normalizeList(customerRes), "unique_id", "customer_name"),
      );
      setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "name"));
      setPropertyLookup(
        buildLookup(normalizeList(propertyRes), "unique_id", "property_name"),
      );
      setSubPropertyLookup(
        buildLookup(
          normalizeList(subPropertyRes),
          "unique_id",
          "sub_property_name",
        ),
      );
      setCollectorLookup(buildLookup(staffUsers, "unique_id", "staff_name"));
      setVehicleLookup(
        buildLookup(normalizeList(vehicleRes), "unique_id", "vehicle_no"),
      );
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  const filteredExportRows = (): HouseholdPickupEventRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    if (!search) return records;
    return records.filter((record) =>
      [
        customerLookup[record.customer_id] ?? record.customer_id,
        zoneLookup[record.zone_id] ?? record.zone_id,
        propertyLookup[record.property_id] ?? record.property_id,
        subPropertyLookup[record.sub_property_id] ?? record.sub_property_id,
        collectorLookup[record.collector_staff_id] ?? record.collector_staff_id,
        vehicleLookup[record.vehicle_id] ?? record.vehicle_id,
        record.source,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  };

  const header = (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.household_pickup_event.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.household_pickup_event.list_subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Can action="add">
            <Button
              label={t("admin.household_pickup_event.create_button")}
              icon="pi pi-plus"
              className="p-button-success p-button-sm"
              onClick={() => navigate(ENC_NEW_PATH)}
            />
          </Can>
        </div>
      </div>

      <div className="flex justify-end">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={onGlobalFilterChange}
          searchPlaceholder={t(
            "admin.household_pickup_event.search_placeholder",
          )}
        />
      </div>
    </div>
  );

  const handleDelete = async (id: number) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await householdPickupEventApi.delete(String(id), withDeleteReason(reason));
      setRecords((current) => current.filter((item) => item.id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: String(error ?? t("common.request_failed")),
      });
    }
  };

  const actionTemplate = (row: HouseholdPickupEventRecord) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(row.id), { state: { record: row } })
        }
        onDelete={() => void handleDelete(row.id)}
      />
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        loadExportRows={async () => filteredExportRows()}
        value={records}
        dataKey="id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "customer_id",
          "zone_id",
          "property_id",
          "sub_property_id",
          "collector_staff_id",
          "vehicle_id",
          "source",
        ]}
        header={header}
        stripedRows
        showGridlines
        fitWidth
        className="p-datatable-sm"
        emptyMessage={t("admin.household_pickup_event.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: "5%" }}
        />
        {(showCol("customer_id") ||
          showCol("pickup_time") ||
          showCol("source")) && (
          <Column
            header={t("admin.household_pickup_event.customer")}
            style={{ width: "24%" }}
            body={(row: HouseholdPickupEventRecord) => (
              <StackCell
                primary={
                  showCol("customer_id") &&
                  (customerLookup[row.customer_id] ?? row.customer_id)
                }
                lines={[
                  showCol("pickup_time") && {
                    icon: "pi-clock",
                    title: t("admin.household_pickup_event.pickup_time"),
                    value: formatDate(row.pickup_time),
                  },
                  showCol("source") && {
                    label: t("admin.household_pickup_event.source"),
                    value: row.source,
                  },
                ]}
              />
            )}
          />
        )}
        {locationColumn<HouseholdPickupEventRecord>({
          header: t("common.location"),
          style: { width: "12%" },
          levels: [
            showCol("zone_id") && {
              label: t("admin.household_pickup_event.zone"),
              value: (row) => zoneLookup[row.zone_id] ?? row.zone_id,
            },
          ],
        })}
        {(showCol("property_id") || showCol("sub_property_id")) && (
          <Column
            header={t("admin.household_pickup_event.property")}
            style={{ width: "20%" }}
            body={(row: HouseholdPickupEventRecord) => (
              <StackCell
                primary={
                  showCol("property_id") &&
                  (propertyLookup[row.property_id] ?? row.property_id)
                }
                lines={[
                  showCol("sub_property_id") && {
                    label: t("admin.household_pickup_event.sub_property"),
                    value:
                      subPropertyLookup[row.sub_property_id] ??
                      row.sub_property_id,
                  },
                ]}
              />
            )}
          />
        )}
        {(showCol("collector_staff_id") || showCol("vehicle_id")) && (
          <Column
            header={t("admin.household_pickup_event.collector")}
            style={{ width: "20%" }}
            body={(row: HouseholdPickupEventRecord) => (
              <StackCell
                primary={
                  showCol("collector_staff_id") &&
                  (collectorLookup[row.collector_staff_id] ??
                    row.collector_staff_id)
                }
                lines={[
                  showCol("vehicle_id") && {
                    icon: "pi-truck",
                    title: t("admin.household_pickup_event.vehicle"),
                    value: vehicleLookup[row.vehicle_id] ?? row.vehicle_id,
                  },
                ]}
              />
            )}
          />
        )}
        {showCol("weight_kg") && (
          <Column
            field="weight_kg"
            header={t("admin.household_pickup_event.weight_kg")}
            style={{ width: "12%" }}
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "7%" }}
        />
      </DataTable>
    </div>
  );
}
