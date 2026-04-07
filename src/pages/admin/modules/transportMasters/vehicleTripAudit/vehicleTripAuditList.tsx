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

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

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
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  trip_instance_id?: { value: string | null; matchMode: FilterMatchMode };
  vehicle_id?: { value: string | null; matchMode: FilterMatchMode };
};

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const filterByCompanyProject = (
  rows: any[],
  companyId: string,
  projectId: string
) => {
  const hasContextFields = rows.some((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    return Boolean(rowCompanyId || rowProjectId);
  });

  if (!hasContextFields) {
    return rows;
  }

  return rows.filter((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    const companyMatches = !companyId || rowCompanyId === companyId;
    const projectMatches = !projectId || rowProjectId === projectId;
    return companyMatches && projectMatches;
  });
};

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
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  // });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    trip_instance_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const { encTransportMaster, encVehicleTripAudit } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleTripAudit}/new`;
  const ENC_EDIT_PATH = (id: number) => `/${encTransportMaster}/${encVehicleTripAudit}/${id}/edit`;

  const fetchRecords = async () => {
    if (isSuperAdmin && companies.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const [auditRes, tripRes, vehicleRes] = await Promise.all([
        vehicleTripAuditApi.list({ params }),
        tripInstanceApi.list({ params }),
        vehicleApi.list({ params }),
      ]);

      const auditRows = filterByCompanyProject(
        normalizeList(auditRes),
        companyUniqueId,
        projectId
      );
      const tripRows = filterByCompanyProject(
        normalizeList(tripRes),
        companyUniqueId,
        projectId
      );
      const vehicleRows = filterByCompanyProject(
        normalizeList(vehicleRes),
        companyUniqueId,
        projectId
      );

      setRecords(auditRows as VehicleTripAuditRecord[]);
      setTripLookup(
        buildLookup(
          tripRows,
          "unique_id",
          "trip_no",
          "unique_id"
        )
      );
      setVehicleLookup(buildLookup(vehicleRows, "unique_id", "vehicle_no"));
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

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

        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            </option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("admin.vehicle_trip_audit.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
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
        globalFilterFields={[
          "trip_instance_id",
          "vehicle_id",
          "company_name",
          "project_name",
        ]}
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
          filter
          showFilterMatchModes={false}

        />
        <Column
          header={t("admin.vehicle_trip_audit.vehicle")}
          body={(row: VehicleTripAuditRecord) =>
            vehicleLookup[row.vehicle_id] ?? row.vehicle_id
          }
          filter
          showFilterMatchModes={false}

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
