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

type UnassignedStaffPoolRecord = {
  id: number;
  operator_id?: string | null;
  driver_id?: string | null;
  zone_id: string;
  ward_id: string;
  status: string;
  trip_instance_id?: string | null;
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

export default function UnassignedStaffPoolList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const unassignedStaffPoolApi = adminApi.unassignedStaffPool;
  const userApi = adminApi.usersCreation;
  const zoneApi = adminApi.zones;
  const wardApi = adminApi.wards;
  const tripInstanceApi = adminApi.tripInstances;

  const [records, setRecords] = useState<UnassignedStaffPoolRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [userLookup, setUserLookup] = useState<Record<string, string>>({});
  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [wardLookup, setWardLookup] = useState<Record<string, string>>({});
  const [tripInstanceLookup, setTripInstanceLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encStaffMasters, encUnassignedStaffPool } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encUnassignedStaffPool}/new`;
  const ENC_EDIT_PATH = (id: number) => `/${encStaffMasters}/${encUnassignedStaffPool}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [poolRes, userRes, zoneRes, wardRes, tripRes] = await Promise.all([
        unassignedStaffPoolApi.list(),
        userApi.list(),
        zoneApi.list(),
        wardApi.list(),
        tripInstanceApi.list(),
      ]);

      setRecords(normalizeList(poolRes));
      setUserLookup(buildLookup(normalizeList(userRes), "unique_id", "staff_name", "unique_id"));
      setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "name"));
      setWardLookup(buildLookup(normalizeList(wardRes), "unique_id", "name"));
      setTripInstanceLookup(buildLookup(normalizeList(tripRes), "unique_id", "trip_no"));
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

  const statusBodyTemplate = (row: UnassignedStaffPoolRecord) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await unassignedStaffPoolApi.update(row.id, {
          status: checked ? "AVAILABLE" : "ASSIGNED",
        });
        fetchRecords();
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return (
      <Switch
        checked={row.status === "AVAILABLE"}
        onCheckedChange={updateStatus}
      />
    );
  };

  const resolveDateTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.unassigned_staff_pool.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.unassigned_staff_pool.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.unassigned_staff_pool.create_button")}
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
            placeholder={t("admin.unassigned_staff_pool.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const actionTemplate = (row: UnassignedStaffPoolRecord) => (
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
        globalFilterFields={["operator_id", "driver_id", "zone_id", "ward_id", "status", "trip_instance_id"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.unassigned_staff_pool.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column
          header={t("admin.unassigned_staff_pool.operator")}
          body={(row: UnassignedStaffPoolRecord) =>
            row.operator_id ? userLookup[row.operator_id] ?? row.operator_id : "-"
          }
        />
        <Column
          header={t("admin.unassigned_staff_pool.driver")}
          body={(row: UnassignedStaffPoolRecord) =>
            row.driver_id ? userLookup[row.driver_id] ?? row.driver_id : "-"
          }
        />
        <Column
          header={t("admin.unassigned_staff_pool.zone")}
          body={(row: UnassignedStaffPoolRecord) => zoneLookup[row.zone_id] ?? row.zone_id}
        />
        <Column
          header={t("admin.unassigned_staff_pool.ward")}
          body={(row: UnassignedStaffPoolRecord) => wardLookup[row.ward_id] ?? row.ward_id}
        />
        <Column
          header={t("admin.unassigned_staff_pool.status")}
          body={statusBodyTemplate}
          style={{ width: 120 }}
        />
        <Column
          header={t("admin.unassigned_staff_pool.trip_instance")}
          body={(row: UnassignedStaffPoolRecord) =>
            row.trip_instance_id
              ? tripInstanceLookup[row.trip_instance_id] ?? row.trip_instance_id
              : "-"
          }
        />
        <Column
          header={t("admin.unassigned_staff_pool.created_at")}
          body={(row: UnassignedStaffPoolRecord) => resolveDateTime(row.created_at)}
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
