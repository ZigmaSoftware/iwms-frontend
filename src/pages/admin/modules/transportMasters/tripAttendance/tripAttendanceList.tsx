import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { api } from "@/api";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";

const TRIP_ATTENDANCE_COLUMN_FIELDS: Record<string, string[]> = {
  trip_instance_id: ["trip_instance_id", "trip_instance"],
  staff_id: ["staff_id", "staff"],
  vehicle_id: ["vehicle_id", "vehicle"],
  attendance_time: ["attendance_time"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  source: ["source"],
  photo: ["photo"],
  created_at: ["created_at"],
};

type TripAttendanceRecord = {
  id: number;
  trip_instance_id: string;
  staff_id: string;
  vehicle_id: string;
  attendance_time: string;
  latitude: string | number;
  longitude: string | number;
  photo?: string | null;
  source: string;
  created_at?: string | null;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

type  TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  trip_instance_id?: { value: string | null; matchMode: FilterMatchMode };
  staff_id?: { value: string | null; matchMode: FilterMatchMode };
  vehicle_id?: { value: string | null; matchMode: FilterMatchMode };
  source?: { value: string | null; matchMode: FilterMatchMode };
  attendance_time?: { value: string | null; matchMode: FilterMatchMode };
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

export default function TripAttendanceList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol } = useFieldVisibility(
    "transport-master",
    "trip-attendance",
    TRIP_ATTENDANCE_COLUMN_FIELDS
  );

  const tripAttendanceApi = adminApi.tripAttendances;
  const tripInstanceApi = adminApi.tripInstances;
  const userApi = adminApi.usersCreation;
  const vehicleApi = adminApi.vehicleCreations;

  const [records, setRecords] = useState<TripAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [tripLookup, setTripLookup] = useState<Record<string, string>>({});
  const [staffLookup, setStaffLookup] = useState<Record<string, string>>({});
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
  // });/

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    trip_instance_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    staff_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    source: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    attendance_time: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const { encTransportMaster, encTripAttendance } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encTripAttendance}/new`;
  const ENC_EDIT_PATH = (id: number) => `/${encTransportMaster}/${encTripAttendance}/${id}/edit`;

  const backendOrigin = useMemo(
    () => api.defaults.baseURL?.replace(/\/api\/desktop\/?$/, "") || "",
    []
  );

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

      const [attendanceRes, tripRes, userRes, vehicleRes] = await Promise.all([
        tripAttendanceApi.list({ params }),
        tripInstanceApi.list({ params }),
        userApi.list({ params }),
        vehicleApi.list({ params }),
      ]);

      const attendanceRows = filterByCompanyProject(
        normalizeList(attendanceRes),
        companyUniqueId,
        projectId
      );
      const tripRows = filterByCompanyProject(
        normalizeList(tripRes),
        companyUniqueId,
        projectId
      );
      const userRows = filterByCompanyProject(
        normalizeList(userRes),
        companyUniqueId,
        projectId
      );
      const vehicleRows = filterByCompanyProject(
        normalizeList(vehicleRes),
        companyUniqueId,
        projectId
      );

      setRecords(attendanceRows as TripAttendanceRecord[]);
      setTripLookup(
        buildLookup(
          tripRows,
          "unique_id",
          "trip_no",
          "unique_id"
        )
      );
      setStaffLookup(buildLookup(userRows, "unique_id", "staff_name", "unique_id"));
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

  const resolveSource = (value?: string) => {
    if (value === "MOBILE") return t("admin.trip_attendance.source_mobile");
    if (value === "VEHICLE_CAM") return t("admin.trip_attendance.source_vehicle_cam");
    return value ?? "-";
  };

  const resolvePhotoLink = (value?: string | null) => {
    if (!value) return "-";
    const url = value.startsWith("http") ? value : `${backendOrigin}${value}`;
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
        {t("common.view")}
      </a>
    );
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.trip_attendance.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.trip_attendance.list_subtitle")}
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
            label={t("admin.trip_attendance.create_button")}
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
            placeholder={t("admin.trip_attendance.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const actionTemplate = (row: TripAttendanceRecord) => (
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
          ...(showCol("trip_instance_id") ? ["trip_instance_id"] : []),
          ...(showCol("staff_id") ? ["staff_id"] : []),
          ...(showCol("vehicle_id") ? ["vehicle_id"] : []),
          ...(showCol("source") ? ["source"] : []),
          "company_name",
          "project_name",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.trip_attendance.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        {showCol("trip_instance_id") && (
          <Column
            header={t("admin.trip_attendance.trip_instance")}
            body={(row: TripAttendanceRecord) =>
              tripLookup[row.trip_instance_id] ?? row.trip_instance_id
            }
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("staff_id") && (
          <Column
            header={t("admin.trip_attendance.staff")}
            body={(row: TripAttendanceRecord) => staffLookup[row.staff_id] ?? row.staff_id}
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("vehicle_id") && (
          <Column
            header={t("admin.trip_attendance.vehicle")}
            body={(row: TripAttendanceRecord) =>
              vehicleLookup[row.vehicle_id] ?? row.vehicle_id
            }
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("attendance_time") && (
          <Column
            header={t("admin.trip_attendance.attendance_time")}
            body={(row: TripAttendanceRecord) => formatDateTime(row.attendance_time)}
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("latitude") && (
          <Column field="latitude" header={t("admin.trip_attendance.latitude")} />
        )}
        {showCol("longitude") && (
          <Column field="longitude" header={t("admin.trip_attendance.longitude")} />
        )}
        {showCol("source") && (
          <Column
            header={t("admin.trip_attendance.source")}
            body={(row: TripAttendanceRecord) => resolveSource(row.source)}
            filter
            showFilterMatchModes={false}
          />
        )}
        {showCol("photo") && (
          <Column
            header={t("admin.trip_attendance.photo")}
            body={(row: TripAttendanceRecord) => resolvePhotoLink(row.photo)}
          />
        )}
        {showCol("created_at") && (
          <Column
            header={t("common.created_at")}
            body={(row: TripAttendanceRecord) => formatDateTime(row.created_at)}
            filter
            showFilterMatchModes={false}
          />
        )}
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
