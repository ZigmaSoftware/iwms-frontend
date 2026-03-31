// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";
// import { useTranslation } from "react-i18next";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";

// import { PencilIcon } from "@/icons";
// import { adminApi } from "@/helpers/admin/registry";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { Switch } from "@/components/ui/switch";

// type UnassignedStaffPoolRecord = {
//   id: number;
//   operator_id?: string | null;
//   driver_id?: string | null;
//   zone_id: string;
//   ward_id: string;
//   status: string;
//   trip_instance_id?: string | null;
//   created_at?: string | null;
// };

// const normalizeList = (payload: any): any[] =>
//   Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

// const buildLookup = (items: any[], key: string, label: string, fallbackKey?: string) =>
//   items.reduce<Record<string, string>>((acc, item) => {
//     const lookupKey = item?.[key];
//     if (lookupKey !== undefined && lookupKey !== null) {
//       acc[String(lookupKey)] = String(item?.[label] ?? item?.[fallbackKey ?? ""] ?? lookupKey);
//     }
//     return acc;
//   }, {});

// export default function UnassignedStaffPoolList() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();

//   const unassignedStaffPoolApi = adminApi.unassignedStaffPool;
//   const userApi = adminApi.usersCreation;
//   const zoneApi = adminApi.zones;
//   const wardApi = adminApi.wards;
//   const tripInstanceApi = adminApi.tripInstances;

//   const [records, setRecords] = useState<UnassignedStaffPoolRecord[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [userLookup, setUserLookup] = useState<Record<string, string>>({});
//   const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
//   const [wardLookup, setWardLookup] = useState<Record<string, string>>({});
//   const [tripInstanceLookup, setTripInstanceLookup] = useState<Record<string, string>>({});

//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [filters, setFilters] = useState<any>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   const { encStaffMasters, encUnassignedStaffPool } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encStaffMasters}/${encUnassignedStaffPool}/new`;
//   const ENC_EDIT_PATH = (id: number) => `/${encStaffMasters}/${encUnassignedStaffPool}/${id}/edit`;

//   const fetchRecords = async () => {
//     setLoading(true);
//     try {
//       const [poolRes, userRes, zoneRes, wardRes, tripRes] = await Promise.all([
//         unassignedStaffPoolApi.list(),
//         userApi.list(),
//         zoneApi.list(),
//         wardApi.list(),
//         tripInstanceApi.list(),
//       ]);

//       setRecords(normalizeList(poolRes));
//       setUserLookup(buildLookup(normalizeList(userRes), "unique_id", "staff_name", "unique_id"));
//       setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "name"));
//       setWardLookup(buildLookup(normalizeList(wardRes), "unique_id", "name"));
//       setTripInstanceLookup(buildLookup(normalizeList(tripRes), "unique_id", "trip_no"));
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

//   const statusBodyTemplate = (row: UnassignedStaffPoolRecord) => {
//     const updateStatus = async (checked: boolean) => {
//       try {
//         await unassignedStaffPoolApi.update(row.id, {
//           status: checked ? "AVAILABLE" : "ASSIGNED",
//         });
//         fetchRecords();
//       } catch {
//         Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
//       }
//     };

//     return (
//       <Switch
//         checked={row.status === "AVAILABLE"}
//         onCheckedChange={updateStatus}
//       />
//     );
//   };

//   const resolveDateTime = (value?: string | null) =>
//     value ? new Date(value).toLocaleString() : "-";

//   const header = (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">
//             {t("admin.unassigned_staff_pool.list_title")}
//           </h1>
//           <p className="text-sm text-gray-500">
//             {t("admin.unassigned_staff_pool.list_subtitle")}
//           </p>
//         </div>

//         <Button
//           label={t("admin.unassigned_staff_pool.create_button")}
//           icon="pi pi-plus"
//           className="p-button-success p-button-sm"
//           onClick={() => navigate(ENC_NEW_PATH)}
//         />
//       </div>

//       <div className="flex justify-end">
//         <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
//           <i className="pi pi-search text-gray-500" />
//           <InputText
//             value={globalFilterValue}
//             onChange={onGlobalFilterChange}
//             placeholder={t("admin.unassigned_staff_pool.search_placeholder")}
//             className="border-none text-sm"
//           />
//         </div>
//       </div>
//     </div>
//   );

//   const actionTemplate = (row: UnassignedStaffPoolRecord) => (
//     <div className="flex justify-center">
//       <button
//         title={t("common.edit")}
//         onClick={() => navigate(ENC_EDIT_PATH(row.id), { state: { record: row } })}
//         className="text-blue-600 hover:text-blue-800"
//       >
//         <PencilIcon className="size-5" />
//       </button>
//     </div>
//   );

//   return (
//     <div className="p-3">
//       <DataTable
//         value={records}
//         dataKey="id"
//         paginator
//         rows={10}
//         loading={loading}
//         filters={filters}
//         globalFilterFields={["operator_id", "driver_id", "zone_id", "ward_id", "status", "trip_instance_id"]}
//         header={header}
//         stripedRows
//         showGridlines
//         className="p-datatable-sm"
//         emptyMessage={t("admin.unassigned_staff_pool.empty_message")}
//       >
//         <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
//         <Column
//           header={t("admin.unassigned_staff_pool.operator")}
//           body={(row: UnassignedStaffPoolRecord) =>
//             row.operator_id ? userLookup[row.operator_id] ?? row.operator_id : "-"
//           }
//         />
//         <Column
//           header={t("admin.unassigned_staff_pool.driver")}
//           body={(row: UnassignedStaffPoolRecord) =>
//             row.driver_id ? userLookup[row.driver_id] ?? row.driver_id : "-"
//           }
//         />
//         <Column
//           header={t("admin.unassigned_staff_pool.zone")}
//           body={(row: UnassignedStaffPoolRecord) => zoneLookup[row.zone_id] ?? row.zone_id}
//         />
//         <Column
//           header={t("admin.unassigned_staff_pool.ward")}
//           body={(row: UnassignedStaffPoolRecord) => wardLookup[row.ward_id] ?? row.ward_id}
//         />
//         <Column
//           header={t("admin.unassigned_staff_pool.status")}
//           body={statusBodyTemplate}
//           style={{ width: 120 }}
//         />
//         <Column
//           header={t("admin.unassigned_staff_pool.trip_instance")}
//           body={(row: UnassignedStaffPoolRecord) =>
//             row.trip_instance_id
//               ? tripInstanceLookup[row.trip_instance_id] ?? row.trip_instance_id
//               : "-"
//           }
//         />
//         <Column
//           header={t("admin.unassigned_staff_pool.created_at")}
//           body={(row: UnassignedStaffPoolRecord) => resolveDateTime(row.created_at)}
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

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.results ?? [];

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
    setLoading(true);
    try {
      const [poolRes, userRes, zoneRes, wardRes, tripRes] = await Promise.all([
        unassignedStaffPoolApi.list(),
        userApi.list(),
        zoneApi.list(),
        wardApi.list(),
        tripInstanceApi.list(),
      ]);

      // Build lookups locally first so we can enrich records immediately
      const uLookup = buildLookup(
        normalizeList(userRes),
        "unique_id",
        "staff_name",
        "unique_id"
      );
      const znLookup = buildLookup(normalizeList(zoneRes), "unique_id", "name");
      const wLookup = buildLookup(normalizeList(wardRes), "unique_id", "name");
      const tLookup = buildLookup(normalizeList(tripRes), "unique_id", "trip_no");

      // Enrich each record with resolved name fields for column filtering
      const enriched = normalizeList(poolRes).map((rec: any) => ({
        ...rec,
        _operator_name: rec.operator_id
          ? (uLookup[rec.operator_id] ?? rec.operator_id)
          : "",
        _driver_name: rec.driver_id
          ? (uLookup[rec.driver_id] ?? rec.driver_id)
          : "",
        _zone_name: znLookup[rec.zone_id] ?? rec.zone_id,
        _ward_name: wLookup[rec.ward_id] ?? rec.ward_id,
        _trip_instance_name: rec.trip_instance_id
          ? (tLookup[rec.trip_instance_id] ?? rec.trip_instance_id)
          : "",
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
        onFilter={onFilter}
        globalFilterFields={[
          "_operator_name",
          "_driver_name",
          "_zone_name",
          "_ward_name",
          "status",
          "_trip_instance_name",
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

        <Column
          field="_operator_name"
          header={t("admin.unassigned_staff_pool.operator")}
          body={(row: UnassignedStaffPoolRecord) =>
            row.operator_id ? userLookup[row.operator_id] ?? row.operator_id : "-"
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_driver_name"
          header={t("admin.unassigned_staff_pool.driver")}
          body={(row: UnassignedStaffPoolRecord) =>
            row.driver_id ? userLookup[row.driver_id] ?? row.driver_id : "-"
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_zone_name"
          header={t("admin.unassigned_staff_pool.zone")}
          body={(row: UnassignedStaffPoolRecord) =>
            zoneLookup[row.zone_id] ?? row.zone_id
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_ward_name"
          header={t("admin.unassigned_staff_pool.ward")}
          body={(row: UnassignedStaffPoolRecord) =>
            wardLookup[row.ward_id] ?? row.ward_id
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="status"
          header={t("admin.unassigned_staff_pool.status")}
          body={statusBodyTemplate}
          style={{ width: 120 }}
        />

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

        <Column
          header={t("admin.unassigned_staff_pool.created_at")}
          body={(row: UnassignedStaffPoolRecord) => resolveDateTime(row.created_at)}
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