import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import {
  type VehicleTripAuditRecord,
  useVehicleTripAuditsQuery,
} from "@/tanstack/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";

const tripInstanceQueryKey = ["masters", "trip_instances"] as const;
const vehicleCreationQueryKey = ["masters", "vehicle_creations"] as const;

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  trip_instance_id: { value: string | null; matchMode: FilterMatchMode };
  vehicle_id: { value: string | null; matchMode: FilterMatchMode };
};

type TripInstanceRecord = {
  unique_id: string;
  trip_no?: string;
};

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

const buildLookup = (
  items: any[],
  key: string,
  label: string,
  fallbackKey?: string
) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(
        item?.[label] ?? item?.[fallbackKey ?? ""] ?? lookupKey
      );
    }
    return acc;
  }, {});

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const extractErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } }).response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(", ");
  }

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function VehicleTripAuditList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tripInstanceApi = adminApi.tripInstances;
  const vehicleApi = adminApi.vehicleCreations;

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
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    trip_instance_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const { encTransportMaster, encVehicleTripAudit } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encVehicleTripAudit}/new`;
  const ENC_EDIT_PATH = (id: number) =>
    `/${encTransportMaster}/${encVehicleTripAudit}/${id}/edit`;

  const auditsQuery = useVehicleTripAuditsQuery(
    companyUniqueId
      ? { company_id: companyUniqueId, project_id: projectId }
      : null
  );

  const tripInstancesQuery = useQuery({
    queryKey: tripInstanceQueryKey,
    queryFn: () => {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }
      return tripInstanceApi.list({ params });
    },
    enabled: Boolean(companyUniqueId),
  });

  const vehiclesQuery = useQuery({
    queryKey: vehicleCreationQueryKey,
    queryFn: () => {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }
      return vehicleApi.list({ params });
    },
    enabled: Boolean(companyUniqueId),
  });

  useEffect(() => {
    if (
      !auditsQuery.isError &&
      !tripInstancesQuery.isError &&
      !vehiclesQuery.isError
    ) {
      return;
    }

    const error =
      auditsQuery.error ?? tripInstancesQuery.error ?? vehiclesQuery.error;

    Swal.fire(
      t("common.error"),
      extractErrorMessage(error, t("common.fetch_failed")),
      "error"
    );
  }, [
    auditsQuery.error,
    auditsQuery.isError,
    t,
    tripInstancesQuery.error,
    tripInstancesQuery.isError,
    vehiclesQuery.error,
    vehiclesQuery.isError,
  ]);

  const previousContextRef = useRef(
    JSON.stringify({
      companyUniqueId: companyUniqueId ?? "",
      projectId: projectId ?? "",
    })
  );

  useEffect(() => {
    const nextContext = JSON.stringify({
      companyUniqueId: companyUniqueId ?? "",
      projectId: projectId ?? "",
    });

    if (previousContextRef.current === nextContext) {
      return;
    }

    previousContextRef.current = nextContext;

    if (companyUniqueId) {
      void tripInstancesQuery.refetch();
      void vehiclesQuery.refetch();
    }
  }, [companyUniqueId, projectId, tripInstancesQuery.refetch, vehiclesQuery.refetch]);

  const records = useMemo(
    () =>
      filterByCompanyProject(
        normalizeList(auditsQuery.data ?? []),
        companyUniqueId,
        projectId
      ) as VehicleTripAuditRecord[],
    [auditsQuery.data, companyUniqueId, projectId]
  );

  const tripLookup = useMemo(
    () =>
      buildLookup(
        filterByCompanyProject(
          normalizeList(tripInstancesQuery.data ?? []) as TripInstanceRecord[],
          companyUniqueId,
          projectId
        ),
        "unique_id",
        "trip_no",
        "unique_id"
      ),
    [companyUniqueId, projectId, tripInstancesQuery.data]
  );

  const vehicleLookup = useMemo(
    () =>
      buildLookup(
        filterByCompanyProject(
          normalizeList(vehiclesQuery.data ?? []),
          companyUniqueId,
          projectId
        ),
        "unique_id",
        "vehicle_no"
      ),
    [companyUniqueId, projectId, vehiclesQuery.data]
  );

  const loading =
    (auditsQuery.isPending && records.length === 0) ||
    (tripInstancesQuery.isPending && !tripInstancesQuery.data) ||
    (vehiclesQuery.isPending && !vehiclesQuery.data);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const updatedFilters = { ...filters };

    updatedFilters.global.value = value;
    setFilters(updatedFilters);
    setGlobalFilterValue(value);
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
        onFilter={onFilter}
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
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />
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
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>
    </div>
  );
}
