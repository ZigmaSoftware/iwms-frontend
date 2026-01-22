import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";

export type BinLoadLogApiRecord = {
  unique_id: string;

  zone_details: {
    unique_id: string;
    name: string;
  };

  vehicle_details: {
    unique_id: string;
    vehicle_no: string;
  };

  property_details: {
    unique_id: string;
    property_name: string;
  };

  sub_property_details: {
    unique_id: string;
    sub_property_name: string;
  };

  bin_details: {
    unique_id: string;
    bin_code: string | null;
  } | null;

  weight_kg: number;
  source_type: "MANUAL" | string;
  event_time: string;   // ISO datetime
  processed: boolean;
  created_at: string;   // ISO datetime
};


const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const buildLookup = (items: any[], key: string, label: string) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(item?.[label] ?? lookupKey);
    }
    return acc;
  }, {});

export default function BinLoadLogList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const binLoadLogApi = adminApi.binLoadLogs;
  const zoneApi = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  const [records, setRecords] = useState<BinLoadLogApiRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [vehicleLookup, setVehicleLookup] = useState<Record<string, string>>({});
  const [propertyLookup, setPropertyLookup] = useState<Record<string, string>>({});
  const [subPropertyLookup, setSubPropertyLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encBinLoadLog } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encBinLoadLog}/new`;
  const ENC_EDIT_PATH = (id: number) =>
    `/${encTransportMaster}/${encBinLoadLog}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const binLoadRes = await binLoadLogApi.list()
      console.log(binLoadRes);
      setRecords(normalizeList(binLoadRes));
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
            {t("admin.bin_load_log.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.bin_load_log.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.bin_load_log.create_button")}
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
            placeholder={t("admin.bin_load_log.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const resolveEventTime = (value?: string) =>
    value ? new Date(value).toLocaleString() : "-";



  return (
    <div className="p-3">
      <DataTable
        value={records}
        dataKey="id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "zone_id",
          "vehicle_id",
          "property_id",
          "sub_property_id",
          "source_type",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.bin_load_log.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column
          header={t("admin.bin_load_log.zone")}
          body={(row: BinLoadLogApiRecord) => zoneLookup[row.zone_details.name] ?? row.zone_details.name}
        />
        <Column
          header={t("admin.bin_load_log.vehicle")}
          body={(row: BinLoadLogApiRecord) => vehicleLookup[row.vehicle_details.vehicle_no] ?? row.vehicle_details.vehicle_no}
        />
        <Column
          header={t("admin.bin_load_log.property")}
          body={(row: BinLoadLogApiRecord) => propertyLookup[row.property_details.property_name] ?? row.property_details.property_name}
        />
        <Column
          header={t("admin.bin_load_log.sub_property")}
          body={(row: BinLoadLogApiRecord) =>
            subPropertyLookup[row.sub_property_details.sub_property_name] ?? row.sub_property_details.sub_property_name
          }
        />
        <Column field="weight_kg" header={t("admin.bin_load_log.weight_kg")} />
        <Column field="source_type" header={t("admin.bin_load_log.source_type")} />
        <Column
          header={t("admin.bin_load_log.event_time")}
          body={(row: BinLoadLogApiRecord) => resolveEventTime(row.event_time)}
        />
        <Column
          header={t("admin.bin_load_log.processed")}
          body={(row: BinLoadLogApiRecord) => (row.processed ? t("common.active") : t("common.inactive"))}
        />
     
      </DataTable>
    </div>
  );
}
