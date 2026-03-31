import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";

type TripExceptionLogRecord = {
  id: number;
  trip_instance_id: string;
  exception_type: string;
  remarks?: string | null;
  detected_by: string;
  created_at?: string | null;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  trip_instance_id?: { value: string | null; matchMode: FilterMatchMode };
  exception_type?: { value: string | null; matchMode: FilterMatchMode };
  detected_by?: { value: string | null; matchMode: FilterMatchMode };
  remarks?: { value: string | null; matchMode: FilterMatchMode };
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

const formatEnum = (value?: string | null) =>
  value ? value.replace(/_/g, " ") : "-";

export default function TripExceptionLogList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tripExceptionLogApi = adminApi.tripExceptionLogs;
  const tripInstanceApi = adminApi.tripInstances;

  const [records, setRecords] = useState<TripExceptionLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [tripLookup, setTripLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  // });
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    trip_instance_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },  
    exception_type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    detected_by: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    remarks: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encTripExceptionLog } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encTripExceptionLog}/new`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [logRes, tripRes] = await Promise.all([
        tripExceptionLogApi.list(),
        tripInstanceApi.list(),
      ]);

      setRecords(normalizeList(logRes));
      setTripLookup(
        buildLookup(
          normalizeList(tripRes),
          "unique_id",
          "trip_no",
          "unique_id"
        )
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
            {t("admin.trip_exception_log.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.trip_exception_log.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.trip_exception_log.create_button")}
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
            placeholder={t("admin.trip_exception_log.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={records}
        dataKey="id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={["trip_instance_id", "exception_type", "detected_by", "remarks"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.trip_exception_log.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column
          header={t("admin.trip_exception_log.trip_instance")}
          body={(row: TripExceptionLogRecord) =>
            tripLookup[row.trip_instance_id] ?? row.trip_instance_id
          }
          filter
          showFilterMatchModes={false}
        />
        <Column
          header={t("admin.trip_exception_log.exception_type")}
          body={(row: TripExceptionLogRecord) => {
            switch (row.exception_type) {
              case "GPS_MISMATCH":
                return t("admin.trip_exception_log.exception_types.gps_mismatch");
              case "MISSED_ATTENDANCE":
                return t("admin.trip_exception_log.exception_types.missed_attendance");
              case "OVER_CAPACITY":
                return t("admin.trip_exception_log.exception_types.over_capacity");
              case "ROUTE_DEVIATION":
                return t("admin.trip_exception_log.exception_types.route_deviation");
              case "VEHICLE_UNAVAILABLE":
                return t("admin.trip_exception_log.exception_types.vehicle_unavailable");
              default:
                return formatEnum(row.exception_type);
            }
          }}
          filter
          showFilterMatchModes={false}
        />
        <Column
          header={t("admin.trip_exception_log.detected_by")}
          body={(row: TripExceptionLogRecord) => {
            switch (row.detected_by) {
              case "SYSTEM":
                return t("admin.trip_exception_log.detected_by_options.system");
              case "SUPERVISOR":
                return t("admin.trip_exception_log.detected_by_options.supervisor");
              default:
                return formatEnum(row.detected_by);
            }
          }}
          filter
          showFilterMatchModes={false}
        />
        <Column field="remarks" header={t("admin.trip_exception_log.remarks")} filter showFilterMatchModes={false} />
        <Column
          header={t("common.created_at")}
          body={(row: TripExceptionLogRecord) => formatDateTime(row.created_at)}
        />
      </DataTable>
    </div>
  );
}
