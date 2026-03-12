import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";

type VehicleTripAuditRecord = {
  id: number;
  trip_instance_id: string;
  vehicle_id: string;
  gps_lat: number[];
  gps_lon: number[];
  avg_speed: number;
  idle_seconds: number;
  captured_at: string;
  created_at?: string | null;
};

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const buildLookup = (items: any[], key: string, label: string, fallbackKey?: string) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(item?.[label] ?? item?.[fallbackKey ?? ""] ?? lookupKey);
    }
    return acc;
  }, {});

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

export default function VehicleTripAuditList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const vehicleTripAuditApi = adminApi.vehicleTripAudits;
  const tripInstanceApi = adminApi.tripInstances;
  const vehicleApi = adminApi.vehicleCreations;

  const [records, setRecords] = useState<VehicleTripAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [tripLookup, setTripLookup] = useState<Record<string, string>>({});
  const [vehicleLookup, setVehicleLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encVehicleTripAudit } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleTripAudit}/new`;
  const ENC_EDIT_PATH = (id: number) => `/${encTransportMaster}/${encVehicleTripAudit}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [auditRes, tripRes, vehicleRes] = await Promise.all([
        vehicleTripAuditApi.list(),
        tripInstanceApi.list(),
        vehicleApi.list(),
      ]);

      setRecords(normalizeList(auditRes));
      setTripLookup(
        buildLookup(
          normalizeList(tripRes),
          "unique_id",
          "trip_no",
          "unique_id"
        )
      );
      setVehicleLookup(buildLookup(normalizeList(vehicleRes), "unique_id", "vehicle_no"));
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.vehicle_trip_audit.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.vehicle_trip_audit.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.vehicle_trip_audit.create_button")}
          icon="pi pi-plus"
          className="p-button-success p-button-sm"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.vehicle_trip_audit.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const actionTemplate = (row: VehicleTripAuditRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.id), { state: { record: row } })}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const gpsCount = (value?: number[]) => (Array.isArray(value) ? value.length : 0);

  return (
    <div className="p-3">
      <DataTable
        value={records}
        dataKey="id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={["trip_instance_id", "vehicle_id"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.vehicle_trip_audit.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column
          header={t("admin.vehicle_trip_audit.trip_instance")}
          body={(row: VehicleTripAuditRecord) =>
            tripLookup[row.trip_instance_id] ?? row.trip_instance_id
          }
        />
        <Column
          header={t("admin.vehicle_trip_audit.vehicle")}
          body={(row: VehicleTripAuditRecord) =>
            vehicleLookup[row.vehicle_id] ?? row.vehicle_id
          }
        />
        <Column
          header={t("admin.vehicle_trip_audit.gps_lat")}
          body={(row: VehicleTripAuditRecord) => gpsCount(row.gps_lat)}
        />
        <Column
          header={t("admin.vehicle_trip_audit.gps_lon")}
          body={(row: VehicleTripAuditRecord) => gpsCount(row.gps_lon)}
        />
        <Column field="avg_speed" header={t("admin.vehicle_trip_audit.avg_speed")} />
        <Column field="idle_seconds" header={t("admin.vehicle_trip_audit.idle_seconds")} />
        <Column
          header={t("admin.vehicle_trip_audit.captured_at")}
          body={(row: VehicleTripAuditRecord) => formatDateTime(row.captured_at)}
        />
        <Column
          header={t("common.created_at")}
          body={(row: VehicleTripAuditRecord) => formatDateTime(row.created_at)}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
