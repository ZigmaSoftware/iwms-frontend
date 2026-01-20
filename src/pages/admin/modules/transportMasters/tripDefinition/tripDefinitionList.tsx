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
import { Switch } from "@/components/ui/switch";

type TripDefinitionRecord = {
  unique_id: string;
  routeplan_id: string;
  staff_template_id: string;
  property_id: string;
  sub_property_id: string;
  trip_trigger_weight_kg: number;
  max_vehicle_capacity_kg: number;
  approval_status: string;
  status: string;
  created_at: string;
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

const extractErrorMessage = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return null;
};

export default function TripDefinitionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tripDefinitionApi = adminApi.tripDefinitions;
  const routePlanApi = adminApi.routePlans;
  const staffTemplateApi = adminApi.staffTemplate;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  const [records, setRecords] = useState<TripDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [routePlanLookup, setRoutePlanLookup] = useState<Record<string, string>>({});
  const [staffTemplateLookup, setStaffTemplateLookup] = useState<Record<string, string>>({});
  const [propertyLookup, setPropertyLookup] = useState<Record<string, string>>({});
  const [subPropertyLookup, setSubPropertyLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encTripDefinition } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encTripDefinition}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encTransportMaster}/${encTripDefinition}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [tripRes, routeRes, staffRes, propertyRes, subPropertyRes] = await Promise.all([
        tripDefinitionApi.list(),
        routePlanApi.list(),
        staffTemplateApi.list(),
        propertyApi.list(),
        subPropertyApi.list(),
      ]);

      setRecords(normalizeList(tripRes));
      setRoutePlanLookup(buildLookup(normalizeList(routeRes), "unique_id", "unique_id"));
      setStaffTemplateLookup(
        buildLookup(normalizeList(staffRes), "unique_id", "display_code", "unique_id")
      );
      setPropertyLookup(buildLookup(normalizeList(propertyRes), "unique_id", "property_name"));
      setSubPropertyLookup(buildLookup(normalizeList(subPropertyRes), "unique_id", "sub_property_name"));
    } catch (error: any) {
      const message = extractErrorMessage(error) ?? t("common.fetch_failed");
      Swal.fire(t("common.error"), message, "error");
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

  const statusBodyTemplate = (row: TripDefinitionRecord) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await tripDefinitionApi.update(row.unique_id, {
          status: checked ? "ACTIVE" : "INACTIVE",
        });
        fetchRecords();
      } catch (error: any) {
        const message = extractErrorMessage(error) ?? t("common.update_status_failed");
        Swal.fire(t("common.error"), message, "error");
      }
    };

    return (
      <Switch
        checked={row.status === "ACTIVE"}
        onCheckedChange={updateStatus}
      />
    );
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.trip_definition.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.trip_definition.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.trip_definition.create_button")}
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
            placeholder={t("admin.trip_definition.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const actionTemplate = (row: TripDefinitionRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id), { state: { record: row } })}
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
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "unique_id",
          "routeplan_id",
          "staff_template_id",
          "property_id",
          "sub_property_id",
          "approval_status",
          "status",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.trip_definition.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column field="unique_id" header="ID" />
        <Column
          header={t("admin.trip_definition.route_plan")}
          body={(row: TripDefinitionRecord) => routePlanLookup[row.routeplan_id] ?? row.routeplan_id}
        />
        <Column
          header={t("admin.trip_definition.staff_template")}
          body={(row: TripDefinitionRecord) =>
            staffTemplateLookup[row.staff_template_id] ?? row.staff_template_id
          }
        />
        <Column
          header={t("admin.trip_definition.property")}
          body={(row: TripDefinitionRecord) => propertyLookup[row.property_id] ?? row.property_id}
        />
        <Column
          header={t("admin.trip_definition.sub_property")}
          body={(row: TripDefinitionRecord) =>
            subPropertyLookup[row.sub_property_id] ?? row.sub_property_id
          }
        />
        <Column field="trip_trigger_weight_kg" header={t("admin.trip_definition.trigger_weight")} />
        <Column field="max_vehicle_capacity_kg" header={t("admin.trip_definition.max_capacity")} />
        <Column field="approval_status" header={t("admin.trip_definition.approval_status")} />
        <Column header={t("admin.trip_definition.status")} body={statusBodyTemplate} style={{ width: 120 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
