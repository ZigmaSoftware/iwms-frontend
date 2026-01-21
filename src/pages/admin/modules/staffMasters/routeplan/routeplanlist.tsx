import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";
import { PencilIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";

type RoutePlanRecord = {
  unique_id: string;
  district_id?: string | null;
  zone_id?: string | null;
  vehicle_id?: string | number | null;
  supervisor_id?: string | number | null;
  status?: string | null;
  created_at?: string | null;
};

const routePlanApi = adminApi.routePlans;

const normalize = (payload: any): RoutePlanRecord[] => {
  const rawList: RoutePlanRecord[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return rawList;
};

export default function RoutePlanList() {
  const { t } = useTranslation();
  const [list, setList] = useState<RoutePlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const districtApi = adminApi.districts;
  const zoneApi = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const staffApi = adminApi.staffCreation;

  const [districtLookup, setDistrictLookup] = useState<Record<string, string>>({});
  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [vehicleLookup, setVehicleLookup] = useState<Record<string, string>>({});
  const [supervisorLookup, setSupervisorLookup] = useState<Record<string, string>>({});

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encRoutePlans}/new`;
  const ENC_EDIT_PATH = (id: string | number) => `/${encStaffMasters}/${encRoutePlans}/${id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

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

  const fetchList = async () => {
    try {
      setLoading(true);
      const [routeRes, districtRes, zoneRes, vehicleRes, staffRes] = await Promise.all([
        routePlanApi.list(),
        districtApi.list(),
        zoneApi.list(),
        vehicleApi.list(),
        staffApi.list(),
      ]);
      console.log(routeRes);

      setList(normalize(routeRes));
      setDistrictLookup(buildLookup(normalizeList(districtRes), "unique_id", "name"));
      setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "name"));
      setVehicleLookup(buildLookup(normalizeList(vehicleRes), "id", "vehicle_no"));
      setSupervisorLookup(buildLookup(normalizeList(staffRes), "id", "employee_name"));
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: "error", title: t("common.error"), text: t("common.fetch_failed") });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const resolveId = (row: RoutePlanRecord) => row.unique_id;

  const resolveDistrict = (row: RoutePlanRecord) =>
    row.district_id ? districtLookup[String(row.district_id)] ?? row.district_id : "-";

  const resolveZone = (row: RoutePlanRecord) =>
    row.zone_id ? zoneLookup[String(row.zone_id)] ?? row.zone_id : "-";

  const resolveVehicle = (row: RoutePlanRecord) =>
    row.vehicle_id ? vehicleLookup[String(row.vehicle_id)] ?? row.vehicle_id : "-";

  const resolveSupervisor = (row: RoutePlanRecord) =>
    row.supervisor_id ? supervisorLookup[String(row.supervisor_id)] ?? row.supervisor_id : "-";

  const statusBodyTemplate = (row: RoutePlanRecord) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await routePlanApi.update(row.unique_id, {
          status: checked ? "ACTIVE" : "INACTIVE",
        });
        fetchList();
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return (
      <Switch
        checked={row.status === "ACTIVE"}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionTemplate = (row: RoutePlanRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(resolveId(row)))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated.global.value = value;
    setFilters(updated);
    setGlobalFilterValue(value);
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.route_plan.title")}
          </h1>
          <p className="text-sm text-gray-500">{t("admin.route_plan.subtitle")}</p>
        </div>

        <Button
          label={t("admin.route_plan.add")}
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
            placeholder={t("admin.route_plan.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={list}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "unique_id",
          "district_id",
          "zone_id",
          "vehicle_id",
          "supervisor_id",
          "status",
        ]}
        rowsPerPageOptions={[5, 10, 25, 50]}
        className="p-datatable-sm"
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("admin.route_plan.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column header={t("admin.route_plan.district")} body={resolveDistrict} />
        <Column header={t("admin.route_plan.zone")} body={resolveZone} />
        <Column header={t("admin.route_plan.vehicle")} body={resolveVehicle} />
        <Column header={t("admin.route_plan.supervisor")} body={resolveSupervisor} />
        <Column header={t("common.status")} body={statusBodyTemplate} style={{ width: 120 }} />
        <Column
          header={t("common.created_at")}
          body={(row: RoutePlanRecord) =>
            row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"
          }
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
