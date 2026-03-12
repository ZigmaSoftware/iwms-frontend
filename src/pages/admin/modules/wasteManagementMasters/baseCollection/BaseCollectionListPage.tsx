// import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
// import { adminApi } from "@/helpers/admin/registry";

// import { DataTable } from "primereact/datatable";
// import { Column } from "primereact/column";
// import { InputText } from "primereact/inputtext";
// import { Dialog } from "primereact/dialog";

// import "primereact/resources/themes/lara-light-blue/theme.css";
// import "primereact/resources/primereact.min.css";
// import "primeicons/primeicons.css";

// /* ================= TYPES ================= */

// export type BaseCollectionScope = "panchayat" | "ward";

// type CollectionRecord = {
//   unique_id: string;

//   panchayat_id?: string;
//   panchayat_name?: string;
//   panchayat_total_weight?: string | number;

//   ward_id?: string;
//   ward_name?: string;
//   ward_total_weight?: string | number;

//   zone_id?: string;
//   zone_name?: string;

//   wastetype_name?: string;
//   collection_date?: string;
//   trip_id?: string;

//   company_name?: string;
//   project_name?: string;

//   point_collection_id?: string | null;
//   bin_name?: string;
//   collection_point_name?: string;
//   latitude?: string | number;
//   longitude?: string | number;
// };

// type SummaryRow = {
//   id: string;
//   name: string;
//   count: number;
//   total_weight: number;
//   records: CollectionRecord[];
//   zone_name?: string;
// };

// type CollectionApiResponse = {
//   daily_total_weight?: number | string;
//   overall_total_weight?: number | string;
//   panchayat_collections?: CollectionRecord[];
//   ward_collections?: CollectionRecord[];
// };

// type Props = {
//   scope: BaseCollectionScope;
// };

// type DialogFilters = {
//   wastetype_name: string;
//   collection_date: string;
//   bin_name: string;
//   collection_point_name: string;
//   trip_id: string;
//   company_name: string;
//   project_name: string;
// };

// const EMPTY_DIALOG_FILTERS: DialogFilters = {
//   wastetype_name: "",
//   collection_date: "",
//   bin_name: "",
//   collection_point_name: "",
//   trip_id: "",
//   company_name: "",
//   project_name: "",
// };

// /* ================= HELPERS ================= */

// const cap = (value?: string) =>
//   value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "-";

// const today = new Date().toISOString().split("T")[0];

// /* ================= COMPONENT ================= */

// export default function BaseCollectionListPage({ scope }: Props) {
//   const collectionApi =
//     scope === "panchayat"
//       ? adminApi.panchayatWiseCollections
//       : adminApi.wardWiseCollections;

//   const [summaryRows, setSummaryRows]         = useState<SummaryRow[]>([]);
//   const [selectedLocation, setSelectedLocation] = useState<SummaryRow | null>(null);
//   const [dialogVisible, setDialogVisible]     = useState(false);
//   const [loading, setLoading]                 = useState(true);

//   // Search & filter states — managed manually so totals stay in sync
//   const [searchText, setSearchText]     = useState("");
//   const [zoneFilter, setZoneFilter]     = useState(""); // ward scope only

//   const [dialogFilters, setDialogFilters] = useState<DialogFilters>(EMPTY_DIALOG_FILTERS);

//   /* ================= FETCH ================= */

//   const fetchRows = useCallback(async () => {
//     try {
//       const res = (await collectionApi.list()) as CollectionApiResponse;

//       const rows =
//         scope === "panchayat"
//           ? res.panchayat_collections ?? []
//           : res.ward_collections ?? [];

//       const grouped: Record<string, SummaryRow> = {};

//       rows.forEach((row) => {
//         const id     = scope === "panchayat" ? row.panchayat_id   : row.ward_id;
//         const name   = scope === "panchayat" ? row.panchayat_name : row.ward_name;
//         const weight =
//           scope === "panchayat"
//             ? row.panchayat_total_weight
//             : row.ward_total_weight;

//         const key = id || "unknown";

//         if (!grouped[key]) {
//           grouped[key] = {
//             id: key,
//             name: name || "-",
//             count: 0,
//             total_weight: 0,
//             records: [],
//             zone_name: scope === "ward" ? (row.zone_name ?? "-") : undefined,
//           };
//         }

//         grouped[key].count        += 1;
//         grouped[key].total_weight += Number(weight || 0);
//         grouped[key].records.push(row);
//       });

//       setSummaryRows(
//         Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name))
//       );
//     } catch (error) {
//       console.error("Fetch error", error);
//     } finally {
//       setLoading(false);
//     }
//   }, [collectionApi, scope]);

//   useEffect(() => { fetchRows(); }, [fetchRows]);

//   /* ================= ZONE OPTIONS ================= */

//   // Unique zones derived from ward summary rows
//   const zoneOptions = useMemo(() => {
//     if (scope !== "ward") return [];
//     const seen = new Set<string>();
//     const options: string[] = [];
//     summaryRows.forEach((r) => {
//       const z = r.zone_name ?? "-";
//       if (!seen.has(z)) { seen.add(z); options.push(z); }
//     });
//     return options.sort((a, b) => a.localeCompare(b));
//   }, [summaryRows, scope]);

//   /* ================= FILTERED SUMMARY ROWS ================= */

//   const filteredSummaryRows = useMemo(() => {
//     return summaryRows.filter((row) => {
//       // Zone filter (ward only)
//       if (zoneFilter && row.zone_name !== zoneFilter) return false;
//       // Global text search on name and zone_name
//       if (searchText) {
//         const q = searchText.toLowerCase();
//         const inName = row.name.toLowerCase().includes(q);
//         const inZone = (row.zone_name ?? "").toLowerCase().includes(q);
//         if (!inName && !inZone) return false;
//       }
//       return true;
//     });
//   }, [summaryRows, zoneFilter, searchText]);

//   /* ================= FILTERED TOTALS ================= */

//   // Recompute daily & overall from the currently visible (filtered) rows
//   const { filteredDailyWeight, filteredOverallWeight } = useMemo(() => {
//     let daily   = 0;
//     let overall = 0;

//     filteredSummaryRows.forEach((row) => {
//       row.records.forEach((r) => {
//         const weight =
//           scope === "panchayat"
//             ? Number(r.panchayat_total_weight || 0)
//             : Number(r.ward_total_weight || 0);
//         overall += weight;
//         if (r.collection_date === today) daily += weight;
//       });
//     });

//     return {
//       filteredDailyWeight:   daily.toFixed(2),
//       filteredOverallWeight: overall.toFixed(2),
//     };
//   }, [filteredSummaryRows, scope]);

//   /* ================= DIALOG FILTER ================= */

//   const onDialogFilterChange =
//     (field: keyof DialogFilters) => (e: ChangeEvent<HTMLInputElement>) => {
//       setDialogFilters((prev) => ({ ...prev, [field]: e.target.value }));
//     };

//   const resetDialogFilters = () => setDialogFilters(EMPTY_DIALOG_FILTERS);

//   const closeDialog = () => {
//     setDialogVisible(false);
//     setSelectedLocation(null);
//     resetDialogFilters();
//   };

//   /* ================= TEMPLATES ================= */

//   const indexTemplate = (_: unknown, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

//   const actionTemplate = (row: SummaryRow) => (
//     <button
//       className="p-button p-button-text focus:!outline-none focus:!ring-0 focus:!shadow-none"
//       onClick={() => { setSelectedLocation(row); setDialogVisible(true); }}
//     >
//       <i className="pi pi-eye"></i>
//     </button>
//   );

//   /* ================= DIALOG TOTALS ================= */

//   const selectedTotals = useMemo(() => {
//     if (!selectedLocation) return { daily: 0, overall: 0 };

//     let daily   = 0;
//     let overall = 0;

//     selectedLocation.records.forEach((r) => {
//       const weight =
//         scope === "panchayat"
//           ? Number(r.panchayat_total_weight || 0)
//           : Number(r.ward_total_weight || 0);
//       overall += weight;
//       if (r.collection_date === today) daily += weight;
//     });

//     return { daily, overall };
//   }, [selectedLocation, scope]);

//   const filteredDialogRecords = useMemo(() => {
//     if (!selectedLocation) return [];

//     return selectedLocation.records.filter((r) => {
//       const match = (value: string | undefined, filter: string) =>
//         !filter || (value ?? "").toLowerCase().includes(filter.toLowerCase());

//       return (
//         match(r.wastetype_name,        dialogFilters.wastetype_name)        &&
//         match(r.collection_date,       dialogFilters.collection_date)       &&
//         match(r.bin_name,              dialogFilters.bin_name)               &&
//         match(r.collection_point_name, dialogFilters.collection_point_name) &&
//         match(r.trip_id,               dialogFilters.trip_id)                &&
//         match(r.company_name,          dialogFilters.company_name)           &&
//         match(r.project_name,          dialogFilters.project_name)
//       );
//     });
//   }, [selectedLocation, dialogFilters]);

//   const hasActiveDialogFilter = Object.values(dialogFilters).some((v) => v !== "");

//   if (loading) return <div className="p-6">Loading...</div>;

//   /* ================= RENDER ================= */

//   const scopeLabel = scope === "panchayat" ? "Panchayat" : "Ward";
//   const isWard     = scope === "ward";
//   const isFiltered = isWard
//     ? (zoneFilter !== "" || searchText !== "")
//     : searchText !== "";

//   return (
//     <div className="p-4">

//       <h1 className="text-3xl font-bold mb-4">
//         {scopeLabel} Base Collection
//       </h1>

//       {/* TOTALS — update live as filters change */}
//       <div className="mb-4 flex flex-wrap gap-3 text-sm">
//         <span className="bg-slate-100 px-4 py-2 rounded-full">
//           Daily Total Weight (Kg):{" "}
//           <span className="font-semibold">{filteredDailyWeight}</span>
//           {isFiltered && (
//             <span className="ml-1 text-xs text-slate-500">(filtered)</span>
//           )}
//         </span>
//         <span className="bg-slate-100 px-4 py-2 rounded-full">
//           Overall Total Weight (Kg):{" "}
//           <span className="font-semibold">{filteredOverallWeight}</span>
//           {isFiltered && (
//             <span className="ml-1 text-xs text-slate-500">(filtered)</span>
//           )}
//         </span>
//       </div>

//       {/* SUMMARY TABLE FILTERS */}
//       <div className="flex flex-wrap items-center justify-between gap-3 mb-3">

//         {/* Zone dropdown — ward scope only */}
//         {isWard && (
//           <div className="flex items-center gap-2">
//             <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
//               Filter by Zone:
//             </label>
//             <select
//               value={zoneFilter}
//               onChange={(e) => setZoneFilter(e.target.value)}
//               className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
//             >
//               <option value="">All Zones</option>
//               {zoneOptions.map((z) => (
//                 <option key={z} value={z}>{z}</option>
//               ))}
//             </select>
//             {/* {zoneFilter && (
//               <button
//                 onClick={() => setZoneFilter("")}
//                 className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
//               >
//                 <i className="pi pi-times-circle" /> Clear
//               </button>
//             )} */}
//           </div>
//         )}

//         {/* Global text search */}
//         <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm ml-auto">
//           <i className="pi pi-search text-gray-500" />
//           <InputText
//             value={searchText}
//             onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
//             placeholder={`Search ${scopeLabel}${isWard ? " / Zone" : ""}`}
//             className="p-inputtext-sm !border-0 !shadow-none"
//           />
//           {searchText && (
//             <button onClick={() => setSearchText("")}>
//               <i className="pi pi-times text-gray-400 hover:text-gray-600" />
//             </button>
//           )}
//         </div>

//       </div>

//       {/* Filtered row count badge */}
//       {isFiltered && (
//         <div className="mb-2 text-xs text-slate-500">
//           Showing{" "}
//           <span className="font-semibold text-slate-700">{filteredSummaryRows.length}</span>{" "}
//           of{" "}
//           <span className="font-semibold text-slate-700">{summaryRows.length}</span>{" "}
//           {scopeLabel.toLowerCase()}s
//         </div>
//       )}

//       {/* SUMMARY TABLE — driven by filteredSummaryRows, no PrimeReact filter needed */}
//       <DataTable
//         value={filteredSummaryRows}
//         paginator
//         rows={10}
//         stripedRows
//         showGridlines
//       >
//         <Column header="S.No"              body={indexTemplate} />
//         <Column field="name"               header={scopeLabel} sortable />

//         {isWard && (
//           <Column
//             field="zone_name"
//             header="Zone"
//             body={(row: SummaryRow) => cap(row.zone_name)}
//             sortable
//           />
//         )}

//         <Column header="Records"           body={(row: SummaryRow) => row.count} />
//         <Column
//           header="Total Weight (Kg)"
//           body={(row: SummaryRow) => row.total_weight.toFixed(2)}
//         />
//         <Column header="Action"            body={actionTemplate} />
//       </DataTable>

//       {/* DETAILS DIALOG */}
//       <Dialog
//         header={`${selectedLocation?.name} — ${scopeLabel} Collection Details`}
//         visible={dialogVisible}
//         style={{ width: "80vw" }}
//         onHide={closeDialog}
//       >

//         {/* DIALOG TOTALS */}
//         <div className="mb-4 flex gap-3">
//           <span className="bg-slate-100 px-4 py-2 rounded-full text-sm">
//             Daily Total Weight (Kg): {selectedTotals.daily.toFixed(2)}
//           </span>
//           <span className="bg-slate-100 px-4 py-2 rounded-full text-sm">
//             Overall Total Weight (Kg): {selectedTotals.overall.toFixed(2)}
//           </span>
//         </div>

//         {/* DIALOG SEARCH FILTERS */}
//         <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
//           <div className="flex items-center justify-between mb-3">
//             <span className="text-sm font-semibold text-slate-600">
//               <i className="pi pi-filter mr-2" />
//               Filter Records
//             </span>
//             {hasActiveDialogFilter && (
//               <button
//                 onClick={resetDialogFilters}
//                 className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
//               >
//                 <i className="pi pi-times-circle" />
//                 Clear All Filters
//               </button>
//             )}
//           </div>

//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Waste Type</label>
//               <InputText
//                 value={dialogFilters.wastetype_name}
//                 onChange={onDialogFilterChange("wastetype_name")}
//                 placeholder="e.g. Organic"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Date</label>
//               <InputText
//                 value={dialogFilters.collection_date}
//                 onChange={onDialogFilterChange("collection_date")}
//                 placeholder="e.g. 2024-01-15"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Bin Name</label>
//               <InputText
//                 value={dialogFilters.bin_name}
//                 onChange={onDialogFilterChange("bin_name")}
//                 placeholder="e.g. Bin A"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Collection Point</label>
//               <InputText
//                 value={dialogFilters.collection_point_name}
//                 onChange={onDialogFilterChange("collection_point_name")}
//                 placeholder="e.g. Point 1"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Trip ID</label>
//               <InputText
//                 value={dialogFilters.trip_id}
//                 onChange={onDialogFilterChange("trip_id")}
//                 placeholder="e.g. TRP-001"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Company</label>
//               <InputText
//                 value={dialogFilters.company_name}
//                 onChange={onDialogFilterChange("company_name")}
//                 placeholder="e.g. Zigma"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>

//             <div className="flex flex-col gap-1">
//               <label className="text-xs font-medium text-slate-500">Project</label>
//               <InputText
//                 value={dialogFilters.project_name}
//                 onChange={onDialogFilterChange("project_name")}
//                 placeholder="e.g. Project A"
//                 className="p-inputtext-sm w-full"
//               />
//             </div>
//           </div>

//           {hasActiveDialogFilter && (
//             <div className="mt-3 text-xs text-slate-500">
//               Showing{" "}
//               <span className="font-bold text-slate-700">{filteredDialogRecords.length}</span>{" "}
//               of{" "}
//               <span className="font-bold text-slate-700">
//                 {selectedLocation?.records.length ?? 0}
//               </span>{" "}
//               records
//             </div>
//           )}
//         </div>

//         {/* DETAIL TABLE */}
//         <DataTable
//           value={filteredDialogRecords}
//           paginator
//           rows={10}
//           stripedRows
//           showGridlines
//           emptyMessage="No records match the current filters."
//         >
//           <Column header="S.No" body={indexTemplate} />

//           <Column
//             field="wastetype_name"
//             header="Waste Type"
//             body={(r: CollectionRecord) => cap(r.wastetype_name)}
//           />

//           <Column
//             header="Weight (Kg)"
//             body={(r: CollectionRecord) =>
//               scope === "panchayat"
//                 ? r.panchayat_total_weight ?? "-"
//                 : r.ward_total_weight ?? "-"
//             }
//           />

//           <Column field="collection_date" header="Date" style={{ minWidth: "130px" }} />

//           <Column
//             field="bin_name"
//             header="Bin Name"
//             body={(r: CollectionRecord) => cap(r.bin_name)}
//           />

//           <Column
//             field="collection_point_name"
//             header="Collection Point"
//             body={(r: CollectionRecord) => r.collection_point_name ?? "-"}
//           />

//           <Column
//             field="latitude"
//             header="Latitude"
//             body={(r: CollectionRecord) => r.latitude ?? "-"}
//           />

//           <Column
//             field="longitude"
//             header="Longitude"
//             body={(r: CollectionRecord) => r.longitude ?? "-"}
//           />

//           <Column
//             field="trip_id"
//             header="Trip ID"
//             body={(r: CollectionRecord) => r.trip_id ?? "-"}
//           />

//           <Column
//             field="company_name"
//             header="Company"
//             body={(r: CollectionRecord) => cap(r.company_name)}
//           />

//           <Column
//             field="project_name"
//             header="Project"
//             body={(r: CollectionRecord) => cap(r.project_name)}
//           />
//         </DataTable>

//       </Dialog>
//     </div>
//   );
// }



import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { adminApi } from "@/helpers/admin/registry";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

/* ================= TYPES ================= */

export type BaseCollectionScope = "panchayat" | "ward";

type CollectionRecord = {
  unique_id: string;

  panchayat_id?: string;
  panchayat_name?: string;
  panchayat_total_weight?: string | number;

  ward_id?: string;
  ward_name?: string;
  ward_total_weight?: string | number;

  zone_id?: string;
  zone_name?: string;

  wastetype_name?: string;
  collection_date?: string;
  trip_id?: string;

  company_name?: string;
  project_name?: string;

  point_collection_id?: string | null;
  bin_name?: string;
  collection_point_name?: string;
  latitude?: string | number;
  longitude?: string | number;
};

type SummaryRow = {
  id: string;
  name: string;
  count: number;
  total_weight: number;
  records: CollectionRecord[];
  zone_name?: string;
};

type CollectionApiResponse = {
  daily_total_weight?: number | string;
  overall_total_weight?: number | string;
  panchayat_collections?: CollectionRecord[];
  ward_collections?: CollectionRecord[];
};

type Props = {
  scope: BaseCollectionScope;
};

type DialogFilters = {
  wastetype_name: string;
  collection_date: string;
  bin_name: string;
  collection_point_name: string;
  trip_id: string;
  company_name: string;
  project_name: string;
};

const EMPTY_DIALOG_FILTERS: DialogFilters = {
  wastetype_name: "",
  collection_date: "",
  bin_name: "",
  collection_point_name: "",
  trip_id: "",
  company_name: "",
  project_name: "",
};

/* ================= HELPERS ================= */

const cap = (value?: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "-";

const today = new Date().toISOString().split("T")[0];

/* ================= COMPONENT ================= */

export default function BaseCollectionListPage({ scope }: Props) {
  const collectionApi =
    scope === "panchayat"
      ? adminApi.panchayatWiseCollections
      : adminApi.wardWiseCollections;

  const [summaryRows, setSummaryRows]         = useState<SummaryRow[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SummaryRow | null>(null);
  const [dialogVisible, setDialogVisible]     = useState(false);
  const [loading, setLoading]                 = useState(true);

  // Search & filter states — managed manually so totals stay in sync
  const [searchText, setSearchText]     = useState("");
  const [zoneFilter, setZoneFilter]     = useState(""); // ward scope only

  const [dialogFilters, setDialogFilters] = useState<DialogFilters>(EMPTY_DIALOG_FILTERS);

  /* ================= FETCH ================= */

  const fetchRows = useCallback(async () => {
    try {
      const res = (await collectionApi.list()) as CollectionApiResponse;

      const rows =
        scope === "panchayat"
          ? res.panchayat_collections ?? []
          : res.ward_collections ?? [];

      const grouped: Record<string, SummaryRow> = {};

      rows.forEach((row) => {
        const id     = scope === "panchayat" ? row.panchayat_id   : row.ward_id;
        const name   = scope === "panchayat" ? row.panchayat_name : row.ward_name;
        const weight =
          scope === "panchayat"
            ? row.panchayat_total_weight
            : row.ward_total_weight;

        const key = id || "unknown";

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            name: name || "-",
            count: 0,
            total_weight: 0,
            records: [],
            zone_name: scope === "ward" ? (row.zone_name ?? "-") : undefined,
          };
        }

        grouped[key].count        += 1;
        grouped[key].total_weight += Number(weight || 0);
        grouped[key].records.push(row);
      });

      setSummaryRows(
        Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  }, [collectionApi, scope]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  /* ================= ZONE OPTIONS ================= */

  // Unique zones derived from ward summary rows
  const zoneOptions = useMemo(() => {
    if (scope !== "ward") return [];
    const seen = new Set<string>();
    const options: string[] = [];
    summaryRows.forEach((r) => {
      const z = r.zone_name ?? "-";
      if (!seen.has(z)) { seen.add(z); options.push(z); }
    });
    return options.sort((a, b) => a.localeCompare(b));
  }, [summaryRows, scope]);

  /* ================= FILTERED SUMMARY ROWS ================= */

  const filteredSummaryRows = useMemo(() => {
    return summaryRows.filter((row) => {
      // Zone filter (ward only)
      if (zoneFilter && row.zone_name !== zoneFilter) return false;
      // Global text search on name and zone_name
      if (searchText) {
        const q = searchText.toLowerCase();
        const inName = row.name.toLowerCase().includes(q);
        const inZone = (row.zone_name ?? "").toLowerCase().includes(q);
        if (!inName && !inZone) return false;
      }
      return true;
    });
  }, [summaryRows, zoneFilter, searchText]);

  /* ================= FILTERED TOTALS ================= */

  // Recompute daily & overall from the currently visible (filtered) rows
  const { filteredDailyWeight, filteredOverallWeight } = useMemo(() => {
    let daily   = 0;
    let overall = 0;

    filteredSummaryRows.forEach((row) => {
      row.records.forEach((r) => {
        const weight =
          scope === "panchayat"
            ? Number(r.panchayat_total_weight || 0)
            : Number(r.ward_total_weight || 0);
        overall += weight;
        if (r.collection_date === today) daily += weight;
      });
    });

    return {
      filteredDailyWeight:   daily.toFixed(2),
      filteredOverallWeight: overall.toFixed(2),
    };
  }, [filteredSummaryRows, scope]);

  /* ================= DIALOG FILTER ================= */

  const onDialogFilterChange =
    (field: keyof DialogFilters) => (e: ChangeEvent<HTMLInputElement>) => {
      setDialogFilters((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const resetDialogFilters = () => setDialogFilters(EMPTY_DIALOG_FILTERS);

  const closeDialog = () => {
    setDialogVisible(false);
    setSelectedLocation(null);
    resetDialogFilters();
  };

  /* ================= TEMPLATES ================= */

  const indexTemplate = (_: unknown, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const actionTemplate = (row: SummaryRow) => (
    <button
      className="p-button p-button-text focus:!outline-none focus:!ring-0 focus:!shadow-none"
      onClick={() => { setSelectedLocation(row); setDialogVisible(true); }}
    >
      <i className="pi pi-eye"></i>
    </button>
  );

  /* ================= DIALOG FILTERED RECORDS ================= */

  const filteredDialogRecords = useMemo(() => {
    if (!selectedLocation) return [];

    return selectedLocation.records.filter((r) => {
      const match = (value: string | undefined, filter: string) =>
        !filter || (value ?? "").toLowerCase().includes(filter.toLowerCase());

      return (
        match(r.wastetype_name,        dialogFilters.wastetype_name)        &&
        match(r.collection_date,       dialogFilters.collection_date)       &&
        match(r.bin_name,              dialogFilters.bin_name)               &&
        match(r.collection_point_name, dialogFilters.collection_point_name) &&
        match(r.trip_id,               dialogFilters.trip_id)                &&
        match(r.company_name,          dialogFilters.company_name)           &&
        match(r.project_name,          dialogFilters.project_name)
      );
    });
  }, [selectedLocation, dialogFilters]);

  const hasActiveDialogFilter = Object.values(dialogFilters).some((v) => v !== "");

  /* ================= DIALOG TOTALS (from filtered records) ================= */

  const selectedTotals = useMemo(() => {
    let daily   = 0;
    let overall = 0;

    filteredDialogRecords.forEach((r) => {
      const weight =
        scope === "panchayat"
          ? Number(r.panchayat_total_weight || 0)
          : Number(r.ward_total_weight || 0);
      overall += weight;
      if (r.collection_date === today) daily += weight;
    });

    return { daily, overall };
  }, [filteredDialogRecords, scope]);

  if (loading) return <div className="p-6">Loading...</div>;

  /* ================= RENDER ================= */

  const scopeLabel = scope === "panchayat" ? "Panchayat" : "Ward";
  const isWard     = scope === "ward";
  const isFiltered = isWard
    ? (zoneFilter !== "" || searchText !== "")
    : searchText !== "";

  return (
    <div className="p-4">

      <h1 className="text-3xl font-bold mb-4">
        {scopeLabel} Base Collection
      </h1>

      {/* TOTALS — update live as filters change */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <span className="bg-slate-100 px-4 py-2 rounded-full">
          Daily Total Weight (Kg):{" "}
          <span className="font-semibold">{filteredDailyWeight}</span>
          {isFiltered && (
            <span className="ml-1 text-xs text-slate-500">(filtered)</span>
          )}
        </span>
        <span className="bg-slate-100 px-4 py-2 rounded-full">
          Overall Total Weight (Kg):{" "}
          <span className="font-semibold">{filteredOverallWeight}</span>
          {isFiltered && (
            <span className="ml-1 text-xs text-slate-500">(filtered)</span>
          )}
        </span>
      </div>

      {/* SUMMARY TABLE FILTERS */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">

        {/* Zone dropdown — ward scope only */}
        {isWard && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 whitespace-nowrap">
              Filter by Zone:
            </label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">All Zones</option>
              {zoneOptions.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            {/* {zoneFilter && (
              <button
                onClick={() => setZoneFilter("")}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <i className="pi pi-times-circle" /> Clear
              </button>
            )} */}
          </div>
        )}

        {/* Global text search */}
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm ml-auto">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={searchText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            placeholder={`Search ${scopeLabel}${isWard ? " / Zone" : ""}`}
            className="p-inputtext-sm !border-0 !shadow-none"
          />
          {searchText && (
            <button onClick={() => setSearchText("")}>
              <i className="pi pi-times text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

      </div>

      {/* Filtered row count badge */}
      {isFiltered && (
        <div className="mb-2 text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">{filteredSummaryRows.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">{summaryRows.length}</span>{" "}
          {scopeLabel.toLowerCase()}s
        </div>
      )}

      {/* SUMMARY TABLE — driven by filteredSummaryRows, no PrimeReact filter needed */}
      <DataTable
        value={filteredSummaryRows}
        paginator
        rows={10}
        stripedRows
        showGridlines
      >
        <Column header="S.No"              body={indexTemplate} />
        <Column field="name"               header={scopeLabel} sortable />

        {isWard && (
          <Column
            field="zone_name"
            header="Zone"
            body={(row: SummaryRow) => cap(row.zone_name)}
            sortable
          />
        )}

        <Column header="Records"           body={(row: SummaryRow) => row.count} />
        <Column
          header="Total Weight (Kg)"
          body={(row: SummaryRow) => row.total_weight.toFixed(2)}
        />
        <Column header="Action"            body={actionTemplate} />
      </DataTable>

      {/* DETAILS DIALOG */}
      <Dialog
        header={`${selectedLocation?.name} — ${scopeLabel} Collection Details`}
        visible={dialogVisible}
        style={{ width: "80vw" }}
        onHide={closeDialog}
      >

        {/* DIALOG TOTALS — update live as dialog filters change */}
        <div className="mb-4 flex flex-wrap gap-3">
          <span className="bg-slate-100 px-4 py-2 rounded-full text-sm">
            Daily Total Weight (Kg):{" "}
            <span className="font-semibold">{selectedTotals.daily.toFixed(2)}</span>
            {hasActiveDialogFilter && (
              <span className="ml-1 text-xs text-slate-500">(filtered)</span>
            )}
          </span>
          <span className="bg-slate-100 px-4 py-2 rounded-full text-sm">
            Overall Total Weight (Kg):{" "}
            <span className="font-semibold">{selectedTotals.overall.toFixed(2)}</span>
            {hasActiveDialogFilter && (
              <span className="ml-1 text-xs text-slate-500">(filtered)</span>
            )}
          </span>
        </div>

        {/* DIALOG SEARCH FILTERS */}
        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600">
              <i className="pi pi-filter mr-2" />
              Filter Records
            </span>
            {hasActiveDialogFilter && (
              <button
                onClick={resetDialogFilters}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium"
              >
                <i className="pi pi-times-circle" />
                Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Waste Type</label>
              <InputText
                value={dialogFilters.wastetype_name}
                onChange={onDialogFilterChange("wastetype_name")}
                placeholder="e.g. Organic"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date</label>
              <InputText
                value={dialogFilters.collection_date}
                onChange={onDialogFilterChange("collection_date")}
                placeholder="e.g. 2024-01-15"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Bin Name</label>
              <InputText
                value={dialogFilters.bin_name}
                onChange={onDialogFilterChange("bin_name")}
                placeholder="e.g. Bin A"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Collection Point</label>
              <InputText
                value={dialogFilters.collection_point_name}
                onChange={onDialogFilterChange("collection_point_name")}
                placeholder="e.g. Point 1"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Trip ID</label>
              <InputText
                value={dialogFilters.trip_id}
                onChange={onDialogFilterChange("trip_id")}
                placeholder="e.g. TRP-001"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Company</label>
              <InputText
                value={dialogFilters.company_name}
                onChange={onDialogFilterChange("company_name")}
                placeholder="e.g. Zigma"
                className="p-inputtext-sm w-full"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Project</label>
              <InputText
                value={dialogFilters.project_name}
                onChange={onDialogFilterChange("project_name")}
                placeholder="e.g. Project A"
                className="p-inputtext-sm w-full"
              />
            </div>
          </div>

          {hasActiveDialogFilter && (
            <div className="mt-3 text-xs text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-700">{filteredDialogRecords.length}</span>{" "}
              of{" "}
              <span className="font-bold text-slate-700">
                {selectedLocation?.records.length ?? 0}
              </span>{" "}
              records
            </div>
          )}
        </div>

        {/* DETAIL TABLE */}
        <DataTable
          value={filteredDialogRecords}
          paginator
          rows={10}
          stripedRows
          showGridlines
          emptyMessage="No records match the current filters."
        >
          <Column header="S.No" body={indexTemplate} />

          <Column
            field="wastetype_name"
            header="Waste Type"
            body={(r: CollectionRecord) => cap(r.wastetype_name)}
          />

          <Column
            header="Weight (Kg)"
            body={(r: CollectionRecord) =>
              scope === "panchayat"
                ? r.panchayat_total_weight ?? "-"
                : r.ward_total_weight ?? "-"
            }
          />

          <Column field="collection_date" header="Date" style={{ minWidth: "130px" }} />

          <Column
            field="bin_name"
            header="Bin Name"
            body={(r: CollectionRecord) => cap(r.bin_name)}
          />

          <Column
            field="collection_point_name"
            header="Collection Point"
            body={(r: CollectionRecord) => r.collection_point_name ?? "-"}
          />

          <Column
            field="latitude"
            header="Latitude"
            body={(r: CollectionRecord) => r.latitude ?? "-"}
          />

          <Column
            field="longitude"
            header="Longitude"
            body={(r: CollectionRecord) => r.longitude ?? "-"}
          />

          <Column
            field="trip_id"
            header="Trip ID"
            body={(r: CollectionRecord) => r.trip_id ?? "-"}
          />

          <Column
            field="company_name"
            header="Company"
            body={(r: CollectionRecord) => cap(r.company_name)}
          />

          <Column
            field="project_name"
            header="Project"
            body={(r: CollectionRecord) => cap(r.project_name)}
          />
        </DataTable>

      </Dialog>
    </div>
  );
}