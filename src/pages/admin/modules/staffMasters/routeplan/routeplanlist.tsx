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
  display_code?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  zone_name?: string | null;
  vehicle_no?: string | null;
  supervisor_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

const routePlanApi = adminApi.routePlans;

const normalize = (payload: any): RoutePlanRecord[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.results ?? [];

export default function RoutePlanList() {
  const { t } = useTranslation();
  const [list, setList] = useState<RoutePlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encRoutePlans}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encStaffMasters}/${encRoutePlans}/${id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await routePlanApi.list();
      setList(normalize(res));
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const statusBodyTemplate = (row: RoutePlanRecord) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await routePlanApi.update(row.unique_id, {
          is_active: checked,
        });
        fetchList();
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return (
      <Switch
        checked={!!row.is_active}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionTemplate = (row: RoutePlanRecord) => (
    <div className="flex justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("admin.route_plan.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.route_plan.subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.route_plan.add")}
          icon="pi pi-plus"
          className="p-button-success p-button-sm"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1">
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
          "display_code",
          "district_name",
          "city_name",
          "zone_name",
          "vehicle_no",
          "supervisor_name",
        ]}
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("admin.route_plan.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />
        <Column header="Display Code" field="display_code" />
        <Column header={t("admin.route_plan.district")} field="district_name" />
        <Column header={t("common.city")} field="city_name" />
        <Column header={t("admin.route_plan.zone")} field="zone_name" />
        <Column header={t("admin.route_plan.vehicle")} field="vehicle_no" />
        <Column header={t("admin.route_plan.supervisor")} field="supervisor_name" />
        <Column header={t("common.status")} body={statusBodyTemplate} />
        <Column header={t("common.actions")} body={actionTemplate} />
      </DataTable>
    </div>
  );
}
