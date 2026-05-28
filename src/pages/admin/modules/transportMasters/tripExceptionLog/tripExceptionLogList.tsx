import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
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
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";

type TripExceptionLogRecord = {
  id: number;
  trip_instance_id: string;
  exception_type: string;
  remarks?: string | null;
  detected_by: string;
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
  exception_type?: { value: string | null; matchMode: FilterMatchMode };
  detected_by?: { value: string | null; matchMode: FilterMatchMode };
  remarks?: { value: string | null; matchMode: FilterMatchMode };
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
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

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

      const [logRes, tripRes] = await Promise.all([
        tripExceptionLogApi.list({ params }),
        tripInstanceApi.list({ params }),
      ]);

      const logRows = filterByCompanyProject(
        normalizeList(logRes),
        companyUniqueId,
        projectId
      );
      const tripRows = filterByCompanyProject(
        normalizeList(tripRes),
        companyUniqueId,
        projectId
      );

      setRecords(logRows as TripExceptionLogRecord[]);
      setTripLookup(
        buildLookup(
          tripRows,
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
            {t("admin.trip_exception_log.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.trip_exception_log.list_subtitle")}
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
            label={t("admin.trip_exception_log.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
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
        globalFilterFields={[
          "trip_instance_id",
          "exception_type",
          "detected_by",
          "remarks",
          "company_name",
          "project_name",
        ]}
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
