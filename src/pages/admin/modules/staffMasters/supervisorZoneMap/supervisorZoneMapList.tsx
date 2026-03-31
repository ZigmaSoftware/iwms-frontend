// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
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
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";

type SupervisorZoneMapRecord = {
  id: number;
  unique_id: string;
  supervisor_id: string;
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

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.results ?? [];

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

  const supervisorZoneMapApi = adminApi.supervisorZoneMap;
  const districtApi = adminApi.districts;
  const cityApi = adminApi.cities;
  const zoneApi = adminApi.zones;
  const userCreationApi = adminApi.usersCreation;

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
  const ENC_EDIT_PATH = (id: number) =>
    `/${encStaffMasters}/${encSupervisorZoneMap}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [mapRes, districtRes, cityRes, zoneRes, userRes] = await Promise.all([
        supervisorZoneMapApi.list(),
        districtApi.list(),
        cityApi.list(),
        zoneApi.list(),
        userCreationApi.list(),
      ]);

      const users = normalizeList(userRes).filter(
        (u: any) =>
          u?.user_type_name?.toLowerCase() === "staff" &&
          String(u?.staffusertype_name ?? "").trim().toLowerCase() === "supervisor"
      );

      // Build lookups locally first so we can enrich records immediately
      const dLookup = buildLookup(normalizeList(districtRes), "unique_id", "name");
      const cLookup = buildLookup(normalizeList(cityRes), "unique_id", "name");
      const zLookup = buildLookup(normalizeList(zoneRes), "unique_id", "zone_name");
      const sLookup = buildLookup(normalizeList(users), "unique_id", "employee_name");

      // Enrich each record with resolved name fields for column filtering
      const enriched = normalizeList(mapRes).map((rec: any) => ({
        ...rec,
        _supervisor_name: sLookup[rec.supervisor_id] ?? rec.supervisor_id ?? "",
        _district_name: rec.district_id
          ? (dLookup[String(rec.district_id)] ?? rec.district_id)
          : "",
        _city_name: rec.city_id
          ? (cLookup[String(rec.city_id)] ?? rec.city_id)
          : "",
        _zone_names: Array.isArray(rec.zone_ids)
          ? rec.zone_ids.map((z: string) => zLookup[String(z)] ?? z).join(", ")
          : "",
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
  }, []);

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
        await supervisorZoneMapApi.update(row.id, {
          status: checked ? "ACTIVE" : "INACTIVE",
        });
        fetchRecords();
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
        onClick={() => navigate(ENC_EDIT_PATH(row.id))}
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

        <Button
          label={t("admin.supervisor_zone_map.create_button")}
          icon="pi pi-plus"
          className="p-button-success p-button-sm"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
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
          "unique_id",
          "_supervisor_name",
          "_district_name",
          "_city_name",
          "_zone_names",
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

        <Column
          field="unique_id"
          header={t("admin.supervisor_zone_map.mapping_id")}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_supervisor_name"
          header={t("admin.supervisor_zone_map.supervisor")}
          body={resolveSupervisor}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_district_name"
          header={t("admin.supervisor_zone_map.district")}
          body={resolveDistrict}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_city_name"
          header={t("admin.supervisor_zone_map.city")}
          body={resolveCity}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_zone_names"
          header={t("admin.supervisor_zone_map.zones")}
          body={resolveZones}
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("common.status")}
          body={statusBodyTemplate}
          style={{ width: 120 }}
        />

        <Column
          header={t("common.created_at")}
          body={(r: SupervisorZoneMapRecord) =>
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"
          }
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