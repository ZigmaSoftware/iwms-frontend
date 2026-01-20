import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";

type TripInstanceRecord = {
  id: number;
  unique_id: string;
  trip_no: string;
  trip_definition_id: string;
  staff_template_id: string;
  alternative_staff_template_id?: string | null;
  zone_id: string;
  vehicle_id: string;
  property_id: string;
  sub_property_id: string;
  current_load_kg: number;
  status: string;
  trip_start_time?: string | null;
  trip_end_time?: string | null;
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

export default function TripInstanceList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tripInstanceApi = adminApi.tripInstances;
  const tripDefinitionApi = adminApi.tripDefinitions;
  const staffTemplateApi = adminApi.staffTemplate;
  const altStaffTemplateApi = adminApi.alternativeStaffTemplate;
  const zoneApi = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  const [records, setRecords] = useState<TripInstanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [tripDefinitionLookup, setTripDefinitionLookup] = useState<Record<string, string>>({});
  const [staffTemplateLookup, setStaffTemplateLookup] = useState<Record<string, string>>({});
  const [altStaffTemplateLookup, setAltStaffTemplateLookup] = useState<Record<string, string>>({});
  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [vehicleLookup, setVehicleLookup] = useState<Record<string, string>>({});
  const [propertyLookup, setPropertyLookup] = useState<Record<string, string>>({});
  const [subPropertyLookup, setSubPropertyLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encTripInstance } = getEncryptedRoute();
  const ENC_EDIT_PATH = (id: number) => `/${encTransportMaster}/${encTripInstance}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [
        tripRes,
        tripDefRes,
        staffRes,
        altStaffRes,
        zoneRes,
        vehicleRes,
        propertyRes,
        subPropertyRes,
      ] = await Promise.all([
        tripInstanceApi.list(),
        tripDefinitionApi.list(),
        staffTemplateApi.list(),
        altStaffTemplateApi.list(),
        zoneApi.list(),
        vehicleApi.list(),
        propertyApi.list(),
        subPropertyApi.list(),
      ]);

      setRecords(normalizeList(tripRes));
      setTripDefinitionLookup(buildLookup(normalizeList(tripDefRes), "unique_id", "unique_id"));
      setStaffTemplateLookup(buildLookup(normalizeList(staffRes), "unique_id", "display_code", "unique_id"));
      setAltStaffTemplateLookup(buildLookup(normalizeList(altStaffRes), "unique_id", "unique_id"));
      setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "name"));
      setVehicleLookup(buildLookup(normalizeList(vehicleRes), "unique_id", "vehicle_no"));
      setPropertyLookup(buildLookup(normalizeList(propertyRes), "unique_id", "property_name"));
      setSubPropertyLookup(buildLookup(normalizeList(subPropertyRes), "unique_id", "sub_property_name"));
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

  const resolveDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.trip_instance.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.trip_instance.list_subtitle")}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.trip_instance.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const actionTemplate = (row: TripInstanceRecord) => (
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
          "trip_no",
          "trip_definition_id",
          "staff_template_id",
          "zone_id",
          "vehicle_id",
          "status",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.trip_instance.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column field="trip_no" header={t("admin.trip_instance.trip_no")} />
        <Column
          header={t("admin.trip_instance.trip_definition")}
          body={(row: TripInstanceRecord) =>
            tripDefinitionLookup[row.trip_definition_id] ?? row.trip_definition_id
          }
        />
        <Column
          header={t("admin.trip_instance.staff_template")}
          body={(row: TripInstanceRecord) =>
            staffTemplateLookup[row.staff_template_id] ?? row.staff_template_id
          }
        />
        <Column
          header={t("admin.trip_instance.alt_staff_template")}
          body={(row: TripInstanceRecord) =>
            row.alternative_staff_template_id
              ? altStaffTemplateLookup[row.alternative_staff_template_id] ?? row.alternative_staff_template_id
              : "-"
          }
        />
        <Column
          header={t("admin.trip_instance.zone")}
          body={(row: TripInstanceRecord) => zoneLookup[row.zone_id] ?? row.zone_id}
        />
        <Column
          header={t("admin.trip_instance.vehicle")}
          body={(row: TripInstanceRecord) => vehicleLookup[row.vehicle_id] ?? row.vehicle_id}
        />
        <Column
          header={t("admin.trip_instance.property")}
          body={(row: TripInstanceRecord) => propertyLookup[row.property_id] ?? row.property_id}
        />
        <Column
          header={t("admin.trip_instance.sub_property")}
          body={(row: TripInstanceRecord) =>
            subPropertyLookup[row.sub_property_id] ?? row.sub_property_id
          }
        />
        <Column field="current_load_kg" header={t("admin.trip_instance.current_load")} />
        <Column field="status" header={t("admin.trip_instance.status")} />
        <Column
          header={t("admin.trip_instance.trip_start_time")}
          body={(row: TripInstanceRecord) => resolveDateTime(row.trip_start_time)}
        />
        <Column
          header={t("admin.trip_instance.trip_end_time")}
          body={(row: TripInstanceRecord) => resolveDateTime(row.trip_end_time)}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
