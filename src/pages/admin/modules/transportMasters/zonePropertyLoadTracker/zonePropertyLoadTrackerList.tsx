// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";
// import { useTranslation } from "react-i18next";

// import { DataTable } from "@/components/common/SafeDataTable";
// import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";

// import { PencilIcon } from "@/icons";
// import { adminApi } from "@/helpers/admin/registry";
// import { getEncryptedRoute } from "@/utils/routeCache";

// export type ZonePropertyLoadTrackerApiRecord = {
//   unique_id: string;

//   zone_details: {
//     unique_id: string;
//     name: string;
//   };

//   vehicle_details: {
//     unique_id: string;
//     vehicle_no: string;
//   };

//   property_details: {
//     unique_id: string;
//     property_name: string;
//   };

//   sub_property_details: {
//     unique_id: string;
//     sub_property_name: string;
//   };

//   current_weight_kg: number;
//   last_updated: string;
// };

// type TableFilters = {
//   global: { value: string | null; matchMode: FilterMatchMode };
//   zone_id?: { value: string | null; matchMode: FilterMatchMode };
//   vehicle_id?: { value: string | null; matchMode: FilterMatchMode };
//   property_id?: { value: string | null; matchMode: FilterMatchMode };
//   sub_property_id?: { value: string | null; matchMode: FilterMatchMode };
// };

// const normalizeList = (payload: any): any[] =>
//   Array.isArray(payload)
//     ? payload
//     : Array.isArray(payload?.data)
//       ? payload.data
//       : payload?.results ?? [];

// export default function ZonePropertyLoadTrackerList() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();

//   const zonePropertyLoadTrackerApi = adminApi.zonePropertyLoadTrackers;

//   const [records, setRecords] = useState<ZonePropertyLoadTrackerApiRecord[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   // const [filters, setFilters] = useState<any>({
//   //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   // });

//   const [filters, setFilters] = useState<TableFilters>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     zone_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     vehicle_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     property_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     sub_property_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });


//   const { encTransportMaster, encZonePropertyLoadTracker } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encTransportMaster}/${encZonePropertyLoadTracker}/new`;
//   const ENC_EDIT_PATH = (id: string) =>
//     `/${encTransportMaster}/${encZonePropertyLoadTracker}/${id}/edit`;

//   const fetchRecords = async () => {
//     setLoading(true);
//     try {
//       const trackerRes = await zonePropertyLoadTrackerApi.list();
//       setRecords(normalizeList(trackerRes));
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

//   const header = (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">
//             {t("admin.zone_property_load_tracker.list_title")}
//           </h1>
//           <p className="text-sm text-gray-500">
//             {t("admin.zone_property_load_tracker.list_subtitle")}
//           </p>
//         </div>

//         <Button
//           label={t("admin.zone_property_load_tracker.create_button")}
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
//             placeholder={t("admin.zone_property_load_tracker.search_placeholder")}
//             className="border-none text-sm"
//           />
//         </div>
//       </div>
//     </div>
//   );

//   const actionTemplate = (row: ZonePropertyLoadTrackerApiRecord) => (
//     <div className="flex justify-center">
//       <button
//         title={t("common.edit")}
//         onClick={() => navigate(ENC_EDIT_PATH(row.unique_id), { state: { record: row } })}
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
//         dataKey="unique_id"
//         paginator
//         rows={10}
//         loading={loading}
//         filters={filters}
//         globalFilterFields={[
//           "zone_details.name",
//           "vehicle_details.vehicle_no",
//           "property_details.property_name",
//           "sub_property_details.sub_property_name",
//         ]}
//         header={header}
//         stripedRows
//         showGridlines
//         className="p-datatable-sm"
//         emptyMessage={t("admin.zone_property_load_tracker.empty_message")}
//       >
//         <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
//         <Column
//           field="zone_id"
//           header={t("admin.zone_property_load_tracker.zone")}
//           body={(row: ZonePropertyLoadTrackerApiRecord) => row.zone_details.name}
//           filter
//           showFilterMatchModes={false}

//         />
//         <Column
//         field="vehicle_details"
//           header={t("admin.zone_property_load_tracker.vehicle")}
//           body={(row: ZonePropertyLoadTrackerApiRecord) => row.vehicle_details.vehicle_no}
//           filter
//           showFilterMatchModes={false}

//         />
//         <Column
//           header={t("admin.zone_property_load_tracker.property")}
//           body={(row: ZonePropertyLoadTrackerApiRecord) => row.property_details.property_name}
//           filter
//           showFilterMatchModes={false}
//         />
//         <Column
//           header={t("admin.zone_property_load_tracker.sub_property")}
//           body={(row: ZonePropertyLoadTrackerApiRecord) => row.sub_property_details.sub_property_name}
//           filter
//           showFilterMatchModes={false}
//         />
//         <Column
//           field="current_weight_kg"
//           header={t("admin.zone_property_load_tracker.current_weight")}
//           filter
//           showFilterMatchModes={false}

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

export type ZonePropertyLoadTrackerApiRecord = {
  unique_id: string;

  zone_details: {
    unique_id: string;
    name: string;
  };

  vehicle_details: {
    unique_id: string;
    vehicle_no: string;
  };

  property_details: {
    unique_id: string;
    property_name: string;
  };

  sub_property_details: {
    unique_id: string;
    sub_property_name: string;
  };

  current_weight_kg: number;
  last_updated: string;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  "zone_details.name": { value: string | null; matchMode: FilterMatchMode };
  "vehicle_details.vehicle_no": { value: string | null; matchMode: FilterMatchMode };
  "property_details.property_name": { value: string | null; matchMode: FilterMatchMode };
  "sub_property_details.sub_property_name": { value: string | null; matchMode: FilterMatchMode };
  current_weight_kg: { value: string | null; matchMode: FilterMatchMode };
};

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.results ?? [];

export default function ZonePropertyLoadTrackerList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const zonePropertyLoadTrackerApi = adminApi.zonePropertyLoadTrackers;

  const [records, setRecords] = useState<ZonePropertyLoadTrackerApiRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    "zone_details.name": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "vehicle_details.vehicle_no": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "property_details.property_name": { value: null, matchMode: FilterMatchMode.CONTAINS },
    "sub_property_details.sub_property_name": { value: null, matchMode: FilterMatchMode.CONTAINS },
    current_weight_kg: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encTransportMaster, encZonePropertyLoadTracker } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encZonePropertyLoadTracker}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encTransportMaster}/${encZonePropertyLoadTracker}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const trackerRes = await zonePropertyLoadTrackerApi.list();
      setRecords(normalizeList(trackerRes));
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

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.zone_property_load_tracker.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.zone_property_load_tracker.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.zone_property_load_tracker.create_button")}
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
            placeholder={t("admin.zone_property_load_tracker.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const actionTemplate = (row: ZonePropertyLoadTrackerApiRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id), { state: { record: row } })}
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
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={[
          "zone_details.name",
          "vehicle_details.vehicle_no",
          "property_details.property_name",
          "sub_property_details.sub_property_name",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.zone_property_load_tracker.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />

        <Column
          field="zone_details.name"
          header={t("admin.zone_property_load_tracker.zone")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.zone_details.name}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="vehicle_details.vehicle_no"
          header={t("admin.zone_property_load_tracker.vehicle")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.vehicle_details.vehicle_no}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="property_details.property_name"
          header={t("admin.zone_property_load_tracker.property")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.property_details.property_name}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="sub_property_details.sub_property_name"
          header={t("admin.zone_property_load_tracker.sub_property")}
          body={(row: ZonePropertyLoadTrackerApiRecord) => row.sub_property_details.sub_property_name}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="current_weight_kg"
          header={t("admin.zone_property_load_tracker.current_weight")}
          filter
          showFilterMatchModes={false}
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