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
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";

import {
  useUnassignedStaffPoolList,
  useUsersList,
  useZonesList,
  useWardsList,
  useTripInstancesList,
  useUpdateUnassignedStaffPool,
} from "@/tanstack/admin/queries/masters/unassignedStaffPool";

const UNASSIGNED_STAFF_POOL_COLUMN_FIELDS: Record<string, string[]> = {
  operator: ["operator_id", "operator"],
  driver: ["driver_id", "driver"],
  zone: ["zone_id", "zone"],
  ward: ["ward_id", "ward"],
  status: ["status"],
  trip_instance: ["trip_instance_id", "trip_instance"],
  created_at: ["created_at"],
};

type UnassignedStaffPoolRecord = {
  id: number;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  operator_id?: string | null;
  driver_id?: string | null;
  zone_id: string;
  ward_id: string;
  status: string;
  trip_instance_id?: string | null;
  created_at?: string | null;
  // Enriched name fields for filtering
  _operator_name?: string;
  _driver_name?: string;
  _zone_name?: string;
  _ward_name?: string;
  _trip_instance_name?: string;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  status: { value: string | null; matchMode: FilterMatchMode };
  _operator_name: { value: string | null; matchMode: FilterMatchMode };
  _driver_name: { value: string | null; matchMode: FilterMatchMode };
  _zone_name: { value: string | null; matchMode: FilterMatchMode };
  _ward_name: { value: string | null; matchMode: FilterMatchMode };
  _trip_instance_name: { value: string | null; matchMode: FilterMatchMode };
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const filterByCompanyProject = (
  items: any[],
  companyId: string,
  projectId: string
) => {
  const hasContextFields = items.some((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    return Boolean(rowCompanyId || rowProjectId);
  });

  if (!hasContextFields) {
    return items;
  }

  return items.filter((item) => {
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
      acc[String(lookupKey)] = String(
        item?.[label] ?? item?.[fallbackKey ?? ""] ?? lookupKey
      );
    }
    return acc;
  }, {});

export default function UnassignedStaffPoolList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "staff-masters",
    "unassigned-staff-pool",
    UNASSIGNED_STAFF_POOL_COLUMN_FIELDS
  );
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const listParams: Record<string, string> = { company_id: companyUniqueId };
  if (projectId) listParams.project_id = projectId;

  const { data: poolRes } = useUnassignedStaffPoolList(listParams) as any;
  const { data: userRes } = useUsersList(listParams) as any;
  const { data: zoneRes } = useZonesList(listParams) as any;
  const { data: wardRes } = useWardsList(listParams) as any;
  const { data: tripRes } = useTripInstancesList(listParams) as any;

  const updateMutation = useUpdateUnassignedStaffPool();

  const [records, setRecords] = useState<UnassignedStaffPoolRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [userLookup, setUserLookup] = useState<Record<string, string>>({});
  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [wardLookup, setWardLookup] = useState<Record<string, string>>({});
  const [tripInstanceLookup, setTripInstanceLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _operator_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _driver_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _zone_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _ward_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _trip_instance_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encStaffMasters, encUnassignedStaffPool } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encUnassignedStaffPool}/new`;
  const ENC_EDIT_PATH = (id: number) =>
    `/${encStaffMasters}/${encUnassignedStaffPool}/${id}/edit`;

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
      const poolRows = filterByCompanyProject(normalizeList(poolRes), companyUniqueId, projectId);
      const userRows = filterByCompanyProject(normalizeList(userRes), companyUniqueId, projectId);
      const zoneRows = filterByCompanyProject(normalizeList(zoneRes), companyUniqueId, projectId);
      const wardRows = filterByCompanyProject(normalizeList(wardRes), companyUniqueId, projectId);
      const tripRows = filterByCompanyProject(normalizeList(tripRes), companyUniqueId, projectId);

      const uLookup = buildLookup(userRows, "unique_id", "staff_name", "unique_id");
      const znLookup = buildLookup(zoneRows, "unique_id", "name");
      const wLookup = buildLookup(wardRows, "unique_id", "name");
      const tLookup = buildLookup(tripRows, "unique_id", "trip_no");

      const enriched = poolRows.map((rec: any) => ({
        ...rec,
        _operator_name: rec.operator_id ? (uLookup[rec.operator_id] ?? rec.operator_id) : "",
        _driver_name: rec.driver_id ? (uLookup[rec.driver_id] ?? rec.driver_id) : "",
        _zone_name: znLookup[rec.zone_id] ?? rec.zone_id,
        _ward_name: wLookup[rec.ward_id] ?? rec.ward_id,
        _trip_instance_name: rec.trip_instance_id ? (tLookup[rec.trip_instance_id] ?? rec.trip_instance_id) : "",
      }));

      setRecords(enriched);
      setUserLookup(uLookup);
      setZoneLookup(znLookup);
      setWardLookup(wLookup);
      setTripInstanceLookup(tLookup);
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const statusBodyTemplate = (row: UnassignedStaffPoolRecord) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await updateMutation.mutateAsync({
          id: row.id,
          payload: filterPayload({ status: checked ? "AVAILABLE" : "ASSIGNED" }),
        });
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
            label={t("admin.unassigned_staff_pool.create_button")}
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
        onFilter={onFilter}
        globalFilterFields={[
          ...(showCol("operator") ? ["_operator_name"] : []),
          ...(showCol("driver") ? ["_driver_name"] : []),
          ...(showCol("zone") ? ["_zone_name"] : []),
          ...(showCol("ward") ? ["_ward_name"] : []),
          ...(showCol("status") ? ["status"] : []),
          ...(showCol("trip_instance") ? ["_trip_instance_name"] : []),
          "company_name",
          "project_name",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.unassigned_staff_pool.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />

        {showCol("operator") && (
          <Column
            field="_operator_name"
            header={t("admin.unassigned_staff_pool.operator")}
            body={(row: UnassignedStaffPoolRecord) =>
              row.operator_id ? userLookup[row.operator_id] ?? row.operator_id : "-"
            }
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("driver") && (
          <Column
            field="_driver_name"
            header={t("admin.unassigned_staff_pool.driver")}
            body={(row: UnassignedStaffPoolRecord) =>
              row.driver_id ? userLookup[row.driver_id] ?? row.driver_id : "-"
            }
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("zone") && (
          <Column
            field="_zone_name"
            header={t("admin.unassigned_staff_pool.zone")}
            body={(row: UnassignedStaffPoolRecord) =>
              zoneLookup[row.zone_id] ?? row.zone_id
            }
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("ward") && (
          <Column
            field="_ward_name"
            header={t("admin.unassigned_staff_pool.ward")}
            body={(row: UnassignedStaffPoolRecord) =>
              wardLookup[row.ward_id] ?? row.ward_id
            }
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("status") && (
          <Column
            field="status"
            header={t("admin.unassigned_staff_pool.status")}
            body={statusBodyTemplate}
            style={{ width: 120 }}
          />
        )}

        {showCol("trip_instance") && (
          <Column
            field="_trip_instance_name"
            header={t("admin.unassigned_staff_pool.trip_instance")}
            body={(row: UnassignedStaffPoolRecord) =>
              row.trip_instance_id
                ? tripInstanceLookup[row.trip_instance_id] ?? row.trip_instance_id
                : "-"
            }
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("created_at") && (
          <Column
            header={t("admin.unassigned_staff_pool.created_at")}
            body={(row: UnassignedStaffPoolRecord) => resolveDateTime(row.created_at)}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>
    </div>
  );
}
