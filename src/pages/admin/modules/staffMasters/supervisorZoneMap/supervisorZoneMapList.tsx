// import { useEffect, useState } from "react";
// import { useNavigate, useLocation} from "react-router-dom";
// import Swal from "sweetalert2";
// import { useTranslation } from "react-i18next";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { InputText } from "primereact/inputtext";
// import { Button } from "primereact/button";
// import { FilterMatchMode } from "primereact/api";

// import { adminApi } from "@/helpers/admin/registry";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { Switch } from "@/components/ui/switch";

// type SupervisorZoneMapRecord = {
//   id: number;
//   unique_id: string;
//   supervisor_id: string;
//   employee_name?: string;
//   district_id?: string | null;
//   city_id?: string | null;
//   zone_ids?: string[];
//   status?: string | null;
//   created_at?: string | null;
// };

// const normalizeList = (payload: any): any[] =>
//   Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

// const buildLookup = (items: any[], key: string, label: string) =>
//   items.reduce<Record<string, string>>((acc, item) => {
//     const lookupKey = item?.[key];
//     if (lookupKey !== undefined && lookupKey !== null) {
//       acc[String(lookupKey)] = String(item?.[label] ?? lookupKey);
//     }
//     return acc;
//   }, {});

// export default function SupervisorZoneMapList() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();

//   const supervisorZoneMapApi = adminApi.supervisorZoneMap;
//   const districtApi = adminApi.districts;
//   const cityApi = adminApi.cities;
//   const zoneApi = adminApi.zones;
//   const userCreationApi = adminApi.usersCreation;

//   const [records, setRecords] = useState<SupervisorZoneMapRecord[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [filters, setFilters] = useState<any>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   const [districtLookup, setDistrictLookup] = useState<Record<string, string>>({});
//   const [cityLookup, setCityLookup] = useState<Record<string, string>>({});
//   const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
//   const [supervisorLookup, setSupervisorLookup] = useState<Record<string, string>>({});

//   const { encStaffMasters, encSupervisorZoneMap } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encStaffMasters}/${encSupervisorZoneMap}/new`;
//   const ENC_EDIT_PATH = (id: number) =>
//     `/${encStaffMasters}/${encSupervisorZoneMap}/${id}/edit`;

//   const fetchRecords = async () => {
//     setLoading(true);
//     try {
//       const [mapRes, districtRes, cityRes, zoneRes, userRes] = await Promise.all([
//         supervisorZoneMapApi.list(),
//         districtApi.list(),
//         cityApi.list(),
//         zoneApi.list(),
//         userCreationApi.list(),
//       ]);


//       console.log("User Response:", userRes)

//       const users = normalizeList(userRes).filter(
//         (u: any) =>
//           u?.user_type_name?.toLowerCase() === "staff" &&
//           String(u?.staffusertype_name ?? "").trim().toLowerCase() === "supervisor"
//       );
//       console.log("Filtered Supervisors:", users);

//       setRecords(normalizeList(mapRes));
//       setDistrictLookup(buildLookup(normalizeList(districtRes), "unique_id", "name"));
//       setCityLookup(buildLookup(normalizeList(cityRes), "unique_id", "name"));
//       setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "zone_name"));
//       setSupervisorLookup(buildLookup(normalizeList(users), "unique_id", "employee_name"));
//     } catch {
//       Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
//     } finally {
//       setLoading(false);
//     }

    
//   };

  

//   useEffect(() => {
//     fetchRecords();
//   }, []);

//   const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setGlobalFilterValue(value);
//     setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
//   };

//   const resolveDistrict = (row: SupervisorZoneMapRecord) =>
//     row.district_id ? districtLookup[String(row.district_id)] ?? row.district_id : "-";

//   const resolveCity = (row: SupervisorZoneMapRecord) =>
//     row.city_id ? cityLookup[String(row.city_id)] ?? row.city_id : "-";

//   const resolveSupervisor = (row: SupervisorZoneMapRecord) =>
//     supervisorLookup[row.supervisor_id] ?? row.supervisor_id ?? "-";

//   const resolveZones = (row: SupervisorZoneMapRecord) => {
//     const zones = Array.isArray(row.zone_ids) ? row.zone_ids : [];
//     if (!zones.length) return "-";
//     return zones
//       .map((zoneId) => zoneLookup[String(zoneId)] ?? zoneId)
//       .join(", ");
//   };

//   const statusBodyTemplate = (row: SupervisorZoneMapRecord) => {
//     const updateStatus = async (checked: boolean) => {
//       try {
//         await supervisorZoneMapApi.update(row.id, {
//           status: checked ? "ACTIVE" : "INACTIVE",
//         });
//         fetchRecords();
//       } catch {
//         Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
//       }
//     };

//     return (
//       <Switch
//         checked={row.status === "ACTIVE"}
//         onCheckedChange={updateStatus}
//       />
//     );
//   };

//   const actionTemplate = (row: SupervisorZoneMapRecord) => (
//     <div className="flex justify-center">
//       <button
//         title={t("common.edit")}
//         onClick={() => navigate(ENC_EDIT_PATH(row.id))}
//         className="text-blue-600 hover:text-blue-800"
//       >
//         {t("common.edit")}
//       </button>
//     </div>
//   );

//   return (
//     <div className="p-3">
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">
//             {t("admin.supervisor_zone_map.list_title")}
//           </h1>
//           <p className="text-sm text-gray-500">
//             {t("admin.supervisor_zone_map.list_subtitle")}
//           </p>
//         </div>

//         <Button
//           label={t("admin.supervisor_zone_map.create_button")}
//           icon="pi pi-plus"
//           className="p-button-success p-button-sm"
//           onClick={() => navigate(ENC_NEW_PATH)}
//         />
//       </div>

//       <div className="flex justify-end mb-4">
//         <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
//           <i className="pi pi-search text-gray-500" />
//           <InputText
//             value={globalFilterValue}
//             onChange={onGlobalFilterChange}
//             placeholder={t("common.search_placeholder")}
//             className="border-none text-sm"
//           />
//         </div>
//       </div>

//       <DataTable
//         value={records}
//         dataKey="unique_id"
//         paginator
//         rows={10}
//         loading={loading}
//         filters={filters}
//         globalFilterFields={["unique_id", "supervisor_id", "status"]}
//         stripedRows
//         showGridlines
//         className="p-datatable-sm"
//         emptyMessage={t("admin.supervisor_zone_map.empty_message")}
//       >
//         <Column
//           header={t("common.s_no")}
//           body={(_, { rowIndex }) => rowIndex + 1}
//           style={{ width: 70 }}
//         />
//         <Column field="unique_id" header={t("admin.supervisor_zone_map.mapping_id")} sortable />
//         <Column
//           header={t("admin.supervisor_zone_map.supervisor")}
//           body={resolveSupervisor}
//           sortable
//         />
//         <Column header={t("admin.supervisor_zone_map.district")} body={resolveDistrict} />
//         <Column header={t("admin.supervisor_zone_map.city")} body={resolveCity} />
//         <Column header={t("admin.supervisor_zone_map.zones")} body={resolveZones} />
//         <Column header={t("common.status")} body={statusBodyTemplate} style={{ width: 120 }} />
//         <Column
//           header={t("common.created_at")}
//           body={(r: SupervisorZoneMapRecord) =>
//             r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"
//           }
//         />
//         <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
//       </DataTable>
//     </div>
//   );
// }



import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import {
  useSupervisorZoneMapList,
  useDistrictsList,
  useCitiesList,
  useZonesList,
  useUsersList,
  useUpdateSupervisorZoneMap,
} from "@/tanstack/admin/queries/masters/supervisorZoneMap";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";

const SUPERVISOR_ZONE_MAP_COLUMN_FIELDS: Record<string, string[]> = {
  unique_id: ["unique_id", "mapping_id"],
  supervisor: ["supervisor_id", "supervisor"],
  district: ["district_id", "district"],
  city: ["city_id", "city"],
  zones: ["zone_ids", "zones", "zone_id"],
  status: ["status"],
  created_at: ["created_at"],
};

type SupervisorZoneMapRecord = {
  id: number;
  unique_id: string;
  supervisor_id: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  employee_name?: string;
  district_id?: string | null;
  city_id?: string | null;
  zone_ids?: string[];
  status?: string | null;
  created_at?: string | null;
  // Enriched name fields for filtering
  _supervisor_name?: string;
  _district_name?: string;
  _city_name?: string;
  _zone_names?: string;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  unique_id: { value: string | null; matchMode: FilterMatchMode };
  _supervisor_name: { value: string | null; matchMode: FilterMatchMode };
  _district_name: { value: string | null; matchMode: FilterMatchMode };
  _city_name: { value: string | null; matchMode: FilterMatchMode };
  _zone_names: { value: string | null; matchMode: FilterMatchMode };
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

const buildLookup = (items: any[], key: string, label: string) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(item?.[label] ?? lookupKey);
    }
    return acc;
  }, {});

export default function SupervisorZoneMapList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "staff-masters",
    "supervisor-zone-map",
    SUPERVISOR_ZONE_MAP_COLUMN_FIELDS
  );
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

  const updateMutation = useUpdateSupervisorZoneMap();

  const [records, setRecords] = useState<SupervisorZoneMapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _supervisor_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _district_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _city_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _zone_names: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const [districtLookup, setDistrictLookup] = useState<Record<string, string>>({});
  const [cityLookup, setCityLookup] = useState<Record<string, string>>({});
  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [supervisorLookup, setSupervisorLookup] = useState<Record<string, string>>({});

  const { encStaffMasters, encSupervisorZoneMap } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encSupervisorZoneMap}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encStaffMasters}/${encSupervisorZoneMap}/${id}/edit`;

  const params =
    companyUniqueId
      ? {
          company_id: companyUniqueId,
          ...(projectId ? { project_id: projectId } : {}),
        }
      : undefined;
  const mapQuery = useSupervisorZoneMapList(params);
  const districtsQuery = useDistrictsList(params);
  const citiesQuery = useCitiesList(params);
  const zonesQuery = useZonesList(params);
  const usersQuery = useUsersList(params);

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
      const mapRows = filterByCompanyProject(normalizeList(mapQuery.data), companyUniqueId, projectId);
      const districtRows = filterByCompanyProject(normalizeList(districtsQuery.data), companyUniqueId, projectId);
      const cityRows = filterByCompanyProject(normalizeList(citiesQuery.data), companyUniqueId, projectId);
      const zoneRows = filterByCompanyProject(normalizeList(zonesQuery.data), companyUniqueId, projectId);
      const userRows = filterByCompanyProject(normalizeList(usersQuery.data), companyUniqueId, projectId);

      const users = userRows.filter(
        (u: any) => u?.user_type_name?.toLowerCase() === "staff" &&
          String(u?.staffusertype_name ?? "").trim().toLowerCase() === "supervisor"
      );

      const dLookup = buildLookup(districtRows, "unique_id", "name");
      const cLookup = buildLookup(cityRows, "unique_id", "name");
      const zLookup = buildLookup(zoneRows, "unique_id", "zone_name");
      const sLookup = buildLookup(normalizeList(users), "unique_id", "employee_name");

      const enriched = mapRows.map((rec: any) => ({
        ...rec,
        _supervisor_name: sLookup[rec.supervisor_id] ?? rec.supervisor_id ?? "",
        _district_name: rec.district_id ? (dLookup[String(rec.district_id)] ?? rec.district_id) : "",
        _city_name: rec.city_id ? (cLookup[String(rec.city_id)] ?? rec.city_id) : "",
        _zone_names: Array.isArray(rec.zone_ids) ? rec.zone_ids.map((z: string) => zLookup[String(z)] ?? z).join(", ") : "",
      }));

      setRecords(enriched);
      setDistrictLookup(dLookup);
      setCityLookup(cLookup);
      setZoneLookup(zLookup);
      setSupervisorLookup(sLookup);
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [
    citiesQuery.data,
    companyUniqueId,
    companies.length,
    districtsQuery.data,
    isSuperAdmin,
    mapQuery.data,
    projectId,
    usersQuery.data,
    zonesQuery.data,
  ]);

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

  const resolveDistrict = (row: SupervisorZoneMapRecord) =>
    row.district_id ? districtLookup[String(row.district_id)] ?? row.district_id : "-";

  const resolveCity = (row: SupervisorZoneMapRecord) =>
    row.city_id ? cityLookup[String(row.city_id)] ?? row.city_id : "-";

  const resolveSupervisor = (row: SupervisorZoneMapRecord) =>
    supervisorLookup[row.supervisor_id] ?? row.supervisor_id ?? "-";

  const resolveZones = (row: SupervisorZoneMapRecord) => {
    const zones = Array.isArray(row.zone_ids) ? row.zone_ids : [];
    if (!zones.length) return "-";
    return zones.map((zoneId) => zoneLookup[String(zoneId)] ?? zoneId).join(", ");
  };

  const statusBodyTemplate = (row: SupervisorZoneMapRecord) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await updateMutation.mutateAsync({
          id: row.id,
          payload: filterPayload({ status: checked ? "ACTIVE" : "INACTIVE" }),
        });
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

  const actionTemplate = (row: SupervisorZoneMapRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        {t("common.edit")}
      </button>
    </div>
  );

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.supervisor_zone_map.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.supervisor_zone_map.list_subtitle")}
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
            label={t("admin.supervisor_zone_map.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() =>
              navigate(
                `${ENC_NEW_PATH}?company_unique_id=${encodeURIComponent(
                  companyUniqueId
                )}&project_id=${encodeURIComponent(projectId)}`
              )
            }
          />
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("common.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>

      <DataTable
        value={records}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={[
          ...(showCol("unique_id") ? ["unique_id"] : []),
          ...(showCol("supervisor") ? ["_supervisor_name"] : []),
          ...(showCol("district") ? ["_district_name"] : []),
          ...(showCol("city") ? ["_city_name"] : []),
          ...(showCol("zones") ? ["_zone_names"] : []),
          "company_name",
          "project_name",
        ]}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.supervisor_zone_map.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />

        {showCol("unique_id") && (
          <Column
            field="unique_id"
            header={t("admin.supervisor_zone_map.mapping_id")}
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("supervisor") && (
          <Column
            field="_supervisor_name"
            header={t("admin.supervisor_zone_map.supervisor")}
            body={resolveSupervisor}
            sortable
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("district") && (
          <Column
            field="_district_name"
            header={t("admin.supervisor_zone_map.district")}
            body={resolveDistrict}
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("city") && (
          <Column
            field="_city_name"
            header={t("admin.supervisor_zone_map.city")}
            body={resolveCity}
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("zones") && (
          <Column
            field="_zone_names"
            header={t("admin.supervisor_zone_map.zones")}
            body={resolveZones}
            filter
            showFilterMatchModes={false}
          />
        )}

        {showCol("status") && (
          <Column
            header={t("common.status")}
            body={statusBodyTemplate}
            style={{ width: 120 }}
          />
        )}

        {showCol("created_at") && (
          <Column
            header={t("common.created_at")}
            body={(r: SupervisorZoneMapRecord) =>
              r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"
            }
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
