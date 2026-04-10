// import { useCallback, useEffect, useState } from "react";
// import { adminApi } from "@/helpers/admin/registry";
// import Swal from "sweetalert2";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";

// import "primereact/resources/themes/lara-light-blue/theme.css";
// import "primereact/resources/primereact.min.css";
// import "primeicons/primeicons.css";

// type RawRow = Record<string, unknown>;

// type ApartmentRow = {
//   apartment_name: string;
//   total_users: number;
//   total_blocks: number;
//   total_flats: number;
//   qr_code?: string;
// };

// type BlockRow = {
//   block: string;
//   flat_count: number;
// };

// type FlatRow = {
//   flat_no: string;
//   user_count: number;
// };

// type UserRow = {
//   customer_name: string;
//   contact_no: string;
//   flat_no: string;
// };

// const customerApi = adminApi.customerCreations;

// // ─── Mappers ─────────────────────────────────────────────────────────────────

// const toRows = (value: unknown): RawRow[] => {
//   if (Array.isArray(value))
//     return value.filter((item): item is RawRow => Boolean(item && typeof item === "object"));
//   if (value && typeof value === "object") {
//     const p = value as { data?: unknown; results?: unknown; items?: unknown; rows?: unknown };
//     if (Array.isArray(p.data))    return toRows(p.data);
//     if (Array.isArray(p.results)) return toRows(p.results);
//     if (Array.isArray(p.items))   return toRows(p.items);
//     if (Array.isArray(p.rows))    return toRows(p.rows);
//   }
//   return [];
// };

// const readStr = (row: RawRow, keys: string[], fb = "") => {
//   for (const k of keys) {
//     const v = row[k];
//     if (v !== null && v !== undefined) {
//       const t = String(v).trim();
//       if (t) return t;
//     }
//   }
//   return fb;
// };

// const readNum = (row: RawRow, keys: string[], fb = 0) => {
//   for (const k of keys) {
//     const v = row[k];
//     if (typeof v === "number" && isFinite(v)) return v;
//     if (typeof v === "string") { const n = Number(v); if (isFinite(n)) return n; }
//   }
//   return fb;
// };

// const mapApartments = (v: unknown): ApartmentRow[] =>
//   toRows(v)
//     .map((r) => ({
//       apartment_name: readStr(r, ["apartment_name", "apartment", "property_name", "name"]),
//       total_users:  readNum(r, ["total_users",  "user_count",  "users_count",  "total_user_count"]),
//       total_blocks: readNum(r, ["total_blocks", "block_count", "total_block_count"]),
//       total_flats:  readNum(r, ["total_flats",  "flat_count",  "total_flat_count"]),
//       qr_code:      readStr(r, ["qr_code", "qr", "code"], ""),
//     }))
//     .filter((r) => r.apartment_name.length > 0);

// const mapBlocks = (v: unknown): BlockRow[] =>
//   toRows(v)
//     .map((r) => ({
//       block:      readStr(r, ["block", "block_no", "block_name", "name"]),
//       flat_count: readNum(r, ["flat_count", "total_flats", "flats_count", "total_flat_count"]),
//     }))
//     .filter((r) => r.block.length > 0);

// const mapFlats = (v: unknown): FlatRow[] =>
//   toRows(v)
//     .map((r) => ({
//       flat_no:    readStr(r, ["flat_no", "flat_number", "flat", "name"]),
//       user_count: readNum(r, ["user_count", "users_count", "total_users", "total_user_count"]),
//     }))
//     .filter((r) => r.flat_no.length > 0);

// const mapUsers = (v: unknown): UserRow[] =>
//   toRows(v).map((r) => ({
//     customer_name: readStr(r, ["customer_name", "name", "user_name"], "-"),
//     contact_no:    readStr(r, ["contact_no", "contact_number", "mobile", "phone_no"], "-"),
//     flat_no:       readStr(r, ["flat_no", "flat_number", "flat"], "-"),
//   }));

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function ApartmentListPage() {
//   const [apartments, setApartments] = useState<ApartmentRow[]>([]);
//   const [blocks,     setBlocks]     = useState<BlockRow[]>([]);
//   const [flats,      setFlats]      = useState<FlatRow[]>([]);
//   const [users,      setUsers]      = useState<UserRow[]>([]);

//   const [selectedApartment, setSelectedApartment] = useState("");
//   const [selectedBlock,     setSelectedBlock]     = useState("");
//   const [selectedFlat,      setSelectedFlat]      = useState("");

//   const [apartmentsLoading, setApartmentsLoading] = useState(false);
//   const [blocksLoading,     setBlocksLoading]     = useState(false);
//   const [flatsLoading,      setFlatsLoading]      = useState(false);
//   const [usersLoading,      setUsersLoading]      = useState(false);

//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [filters, setFilters] = useState({
//     global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   // ── Fetchers ────────────────────────────────────────────────────────────────

//   const fetchApartments = useCallback(async () => {
//     try {
//       setApartmentsLoading(true);
//       const data = await customerApi.get("apartment-count/");
//       setApartments(mapApartments(data));
//     } catch (e) { console.error(e); setApartments([]); }
//     finally { setApartmentsLoading(false); }
//   }, []);

//   const fetchBlocks = useCallback(async (apartmentName: string) => {
//     if (!apartmentName) { setBlocks([]); return; }
//     try {
//       setBlocksLoading(true);
//       const data = await customerApi.get("block-count/", { params: { apartment_name: apartmentName } });
//       setBlocks(mapBlocks(data));
//     } catch (e) { console.error(e); setBlocks([]); }
//     finally { setBlocksLoading(false); }
//   }, []);

//   const fetchFlats = useCallback(async (apt: string, blk: string) => {
//     if (!apt || !blk) { setFlats([]); return; }
//     try {
//       setFlatsLoading(true);
//       const data = await customerApi.get("flat-count/", { params: { apartment_name: apt, block: blk } });
//       setFlats(mapFlats(data));
//     } catch (e) { console.error(e); setFlats([]); }
//     finally { setFlatsLoading(false); }
//   }, []);

//   const fetchUsers = useCallback(async (apt: string, blk: string, flat: string) => {
//     if (!apt || !blk) { setUsers([]); return; }
//     try {
//       setUsersLoading(true);
//       const params: Record<string, string> = { subproperty: "apartment", apartment_name: apt, block: blk };
//       if (flat) params.flat_no = flat;
//       const data = await customerApi.get("property-user-count/", { params });
//       const list = Array.isArray(data) ? data.flatMap((g: any) => g.users || []) : [];
//       setUsers(mapUsers(list));
//     } catch (e) { console.error(e); setUsers([]); }
//     finally { setUsersLoading(false); }
//   }, []);

//   useEffect(() => { fetchApartments(); }, [fetchApartments]);

//   // ── Search ──────────────────────────────────────────────────────────────────

//   const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
//     setGlobalFilterValue(value);
//   };

//   const searchHeader = (
//     <div className="flex justify-end items-center">
//       <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
//         <i className="pi pi-search text-gray-500" />
//         <InputText
//           value={globalFilterValue}
//           onChange={onGlobalFilterChange}
//           placeholder="Search apartments..."
//           className="p-inputtext-sm !border-0 !shadow-none"
//         />
//       </div>
//     </div>
//   );

//   // ── Templates ───────────────────────────────────────────────────────────────

//   const indexTemplate = (_: unknown, options: { rowIndex: number }) => options.rowIndex + 1;

//   const openQrPopup = (qrUrl: string) =>
//     Swal.fire({
//       title: "Apartment QR",
//       html: `<div class="flex justify-center"><img src="${qrUrl}" style="width:200px;height:200px;" /></div>`,
//       width: 350,
//     });

//   const qrTemplate = (row: ApartmentRow) =>
//     row.qr_code ? (
//       <button
//         className="p-1 border rounded bg-white shadow-sm hover:bg-gray-50"
//         onClick={() => openQrPopup(row.qr_code!)}
//       >
//         <img src={row.qr_code} alt="QR" className="w-12 h-12 object-contain" />
//       </button>
//     ) : (
//       <span className="text-gray-400 text-xs">No QR</span>
//     );

//   const aptActionTemplate = (row: ApartmentRow) => (
//     <div className="flex gap-3 justify-center">
//       <Button
//         // label="View Blocks"
//         icon="pi pi-eye"
//         className="p-button-sm p-button-outlined"
//         onClick={() => {
//           setSelectedApartment(row.apartment_name);
//           setSelectedBlock("");
//           setSelectedFlat("");
//           setBlocks([]);
//           setFlats([]);
//           setUsers([]);
//           fetchBlocks(row.apartment_name);
//         }}
//       />
//     </div>
//   );

//   const blkActionTemplate = (row: BlockRow) => (
//     <div className="flex gap-3 justify-center">
//       <Button
//         // label="View Flats"
//         icon="pi pi-eye"
//         className="p-button-sm p-button-outlined"
//         onClick={() => {
//           setSelectedBlock(row.block);
//           setSelectedFlat("");
//           setFlats([]);
//           setUsers([]);
//           fetchFlats(selectedApartment, row.block);
//         }}
//       />
//     </div>
//   );

//   const flatActionTemplate = (row: FlatRow) => (
//     <div className="flex gap-3 justify-center">
//       <Button
//         // label="View Users"
//         icon="pi pi-eye"
//         className="p-button-sm p-button-outlined"
//         onClick={() => {
//           setSelectedFlat(row.flat_no);
//           setUsers([]);
//           fetchUsers(selectedApartment, selectedBlock, row.flat_no);
//         }}
//       />
//     </div>
//   );

//   // ── Render ───────────────────────────────────────────────────────────────────

//   return (
//     <div className="p-3">

//       {/* ── Apartment Table ── */}
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-800 mb-1">Apartment List</h1>
//           <p className="text-gray-500 text-sm">View all apartments and drill down to blocks, flats and users</p>
//         </div>
//       </div>

//       <DataTable
//         value={apartments}
//         dataKey="apartment_name"
//         paginator
//         rows={10}
//         rowsPerPageOptions={[5, 10, 25, 50]}
//         loading={apartmentsLoading}
//         filters={filters}
//         globalFilterFields={["apartment_name"]}
//         header={searchHeader}
//         emptyMessage="No apartments found."
//         stripedRows
//         showGridlines
//         className="p-datatable-sm"
//       >
//         <Column header="S.No"           body={indexTemplate}   style={{ width: "70px" }} />
//         <Column field="apartment_name"  header="Apartment Name" sortable />
//         <Column header="QR Code"        body={qrTemplate}      style={{ width: "100px" }} />
//         <Column field="total_users"     header="Total Users"   sortable />
//         <Column field="total_blocks"    header="Total Blocks"  sortable />
//         <Column field="total_flats"     header="Total Flats"   sortable />
//         <Column header="Actions"        body={aptActionTemplate} style={{ textAlign: "center" }} />
//       </DataTable>

//       {/* ── Block Table ── */}
//       {selectedApartment && (
//         <>
//           <div className="flex justify-between items-center mt-8 mb-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-800 mb-1">Block List</h1>
//               <p className="text-gray-500 text-sm">
//                 Apartment: <span className="font-medium text-blue-600">{selectedApartment}</span>
//               </p>
//             </div>
//           </div>

//           <DataTable
//             value={blocks}
//             dataKey="block"
//             paginator
//             rows={10}
//             rowsPerPageOptions={[5, 10, 25, 50]}
//             loading={blocksLoading}
//             emptyMessage="No blocks found."
//             stripedRows
//             showGridlines
//             className="p-datatable-sm"
//           >
//             <Column header="S.No"      body={indexTemplate}    style={{ width: "70px" }} />
//             <Column field="block"      header="Block Name"     sortable />
//             <Column field="flat_count" header="Flat Count"     sortable />
//             <Column header="Actions"   body={blkActionTemplate} style={{ textAlign: "center" }} />
//           </DataTable>
//         </>
//       )}

//       {/* ── Flat Table ── */}
//       {selectedApartment && selectedBlock && (
//         <>
//           <div className="flex justify-between items-center mt-8 mb-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-800 mb-1">Flat List</h1>
//               <p className="text-gray-500 text-sm">
//                 {selectedApartment} / <span className="font-medium text-blue-600">{selectedBlock}</span>
//               </p>
//             </div>
//           </div>

//           <DataTable
//             value={flats}
//             dataKey="flat_no"
//             paginator
//             rows={10}
//             rowsPerPageOptions={[5, 10, 25, 50]}
//             loading={flatsLoading}
//             emptyMessage="No flats found."
//             stripedRows
//             showGridlines
//             className="p-datatable-sm"
//           >
//             <Column header="S.No"      body={indexTemplate}     style={{ width: "70px" }} />
//             <Column field="flat_no"    header="Flat Number"     sortable />
//             <Column field="user_count" header="User Count"      sortable />
//             <Column header="Actions"   body={flatActionTemplate} style={{ textAlign: "center" }} />
//           </DataTable>
//         </>
//       )}

//       {/* ── User Table ── */}
//       {selectedApartment && selectedBlock && selectedFlat && (
//         <>
//           <div className="flex justify-between items-center mt-8 mb-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-800 mb-1">User List</h1>
//               <p className="text-gray-500 text-sm">
//                 {selectedApartment} / {selectedBlock} /{" "}
//                 <span className="font-medium text-blue-600">{selectedFlat}</span>
//               </p>
//             </div>
//           </div>

//           <DataTable
//             value={users}
//             dataKey="contact_no"
//             paginator
//             rows={10}
//             rowsPerPageOptions={[5, 10, 25, 50]}
//             loading={usersLoading}
//             emptyMessage="No users found."
//             stripedRows
//             showGridlines
//             className="p-datatable-sm"
//           >
//             <Column header="S.No"          body={indexTemplate} style={{ width: "70px" }} />
//             <Column field="customer_name"  header="Customer Name"  sortable />
//             <Column field="contact_no"     header="Contact Number" sortable />
//             <Column field="flat_no"        header="Flat Number"    sortable />
//           </DataTable>
//         </>
//       )}

//     </div>
//   );
// }





import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/helpers/admin/registry";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useTranslation } from "react-i18next";

type RawRow = Record<string, unknown>;

type ApartmentRow = {
  apartment_name: string;
  total_users: number;
  total_blocks: number;
  total_flats: number;
  qr_code?: string;
};

type BlockRow = {
  block: string;
  flat_count: number;
};

type FlatRow = {
  flat_no: string;
  user_count: number;
};

type UserRow = {
  customer_name: string;
  contact_no: string;
  flat_no: string;
};

type ViewLevel = "apartment" | "block" | "flat" | "user";

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
};

const customerApi = adminApi.customerCreations;

/* ---------------- HELPERS ---------------- */

const toRows = (value: unknown): RawRow[] => {
  if (Array.isArray(value))
    return value.filter((item): item is RawRow => Boolean(item && typeof item === "object"));
  if (value && typeof value === "object") {
    const p = value as Record<string, unknown>;
    if (Array.isArray(p.data)) return toRows(p.data);
    if (Array.isArray(p.results)) return toRows(p.results);
    if (Array.isArray(p.items)) return toRows(p.items);
    if (Array.isArray(p.rows)) return toRows(p.rows);
  }
  return [];
};

const readStr = (row: RawRow, keys: string[], fb = "") => {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined) {
      const t = String(v).trim();
      if (t) return t;
    }
  }
  return fb;
};

const readNum = (row: RawRow, keys: string[], fb = 0) => {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return fb;
};

/* ---------------- MAPPERS ---------------- */

const mapApartments = (v: unknown): ApartmentRow[] =>
  toRows(v)
    .map((r) => ({
      apartment_name: readStr(r, ["apartment_name"]),
      total_users: readNum(r, ["user_count"]),
      total_blocks: readNum(r, ["block_count"]),
      total_flats: readNum(r, ["flat_count"]),
      qr_code: readStr(r, ["qr_code"]),
    }))
    .filter((r) => r.apartment_name.length > 0);

const mapBlocks = (v: unknown): BlockRow[] =>
  toRows(v)
    .map((r) => ({
      block: readStr(r, ["block_no"]),
      flat_count: readNum(r, ["flat_count"]),
    }))
    .filter((r) => r.block.length > 0);

const mapFlats = (v: unknown): FlatRow[] =>
  toRows(v)
    .map((r) => ({
      flat_no: readStr(r, ["flat_no"]),
      user_count: readNum(r, ["user_count"]),
    }))
    .filter((r) => r.flat_no.length > 0);

const mapUsers = (v: unknown): UserRow[] =>
  toRows(v).map((r) => ({
    customer_name: readStr(r, ["customer_name"]),
    contact_no: readStr(r, ["contact_no"]),
    flat_no: readStr(r, ["flat_no"]),
  }));

/* ---------------- COMPONENT ---------------- */

export default function ApartmentListPage() {
  const { t } = useTranslation();

  const [viewLevel, setViewLevel] = useState<ViewLevel>("apartment");

  const [apartments, setApartments] = useState<ApartmentRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [flats, setFlats] = useState<FlatRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [selectedApartment, setSelectedApartment] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");

  const [loading, setLoading] = useState(false);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  /* ---- fetchers ---- */

  const fetchApartments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      const data = await customerApi.get("apartment-count/", { params });
      setApartments(mapApartments(data));
    } catch (err) {
      console.error("Failed to fetch apartments", err);
      setApartments([]);
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, projectId]);

  const fetchBlocks = async (apt: string) => {
    try {
      setLoading(true);
      const data = await customerApi.get("block-count/", {
        params: { apartment_name: apt, company_id: companyUniqueId },
      });
      setBlocks(mapBlocks(data));
    } finally {
      setLoading(false);
    }
  };

  const fetchFlats = async (apt: string, blk: string) => {
    try {
      setLoading(true);
      const data = await customerApi.get("flat-count/", {
        params: { apartment_name: apt, block: blk, company_id: companyUniqueId },
      });
      setFlats(mapFlats(data));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (apt: string, blk: string, flat: string) => {
    try {
      setLoading(true);
      const data = await customerApi.get("property-user-count/", {
        params: {
          subproperty: "apartment",
          apartment_name: apt,
          block: blk,
          flat_no: flat,
          company_id: companyUniqueId,
        },
      });
      const list = Array.isArray(data)
        ? data.flatMap((g: Record<string, unknown>) =>
            Array.isArray(g.users) ? g.users : []
          )
        : [];
      setUsers(mapUsers(list));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApartments();
  }, [fetchApartments]);

  useEffect(() => {
    setSelectedApartment("");
    setSelectedBlock("");
    setBlocks([]);
    setFlats([]);
    setUsers([]);
    setViewLevel("apartment");
  }, [companyUniqueId, projectId]);

  /* ---- filter ---- */

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
    setGlobalFilterValue(value);
  };

  const resetFilter = () => {
    setGlobalFilterValue("");
    setFilters({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });
  };

  /* ---- drill-down navigation ---- */

  const drillToBlock = (apt: ApartmentRow) => {
    setSelectedApartment(apt.apartment_name);
    fetchBlocks(apt.apartment_name);
    setViewLevel("block");
    resetFilter();
  };

  const drillToFlat = (blk: BlockRow) => {
    setSelectedBlock(blk.block);
    fetchFlats(selectedApartment, blk.block);
    setViewLevel("flat");
    resetFilter();
  };

  const drillToUser = (flat: FlatRow) => {
    fetchUsers(selectedApartment, selectedBlock, flat.flat_no);
    setViewLevel("user");
    resetFilter();
  };

  const goBack = () => {
    resetFilter();
    if (viewLevel === "user") setViewLevel("flat");
    else if (viewLevel === "flat") setViewLevel("block");
    else if (viewLevel === "block") setViewLevel("apartment");
  };

  /* ---- breadcrumb ---- */

  const breadcrumbItems = () => {
    const crumbs: { label: string; level: ViewLevel }[] = [
      { label: "Apartments", level: "apartment" },
    ];
    if (viewLevel === "block" || viewLevel === "flat" || viewLevel === "user")
      crumbs.push({ label: selectedApartment, level: "block" });
    if (viewLevel === "flat" || viewLevel === "user")
      crumbs.push({ label: `Block ${selectedBlock}`, level: "flat" });
    if (viewLevel === "user")
      crumbs.push({ label: "Users", level: "user" });
    return crumbs;
  };

  /* ---- table search header ---- */

  const tableHeader = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder="Search…"
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  /* ---- shared column templates ---- */

  const indexTemplate = (_: unknown, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  const viewActionTemplate = (onClick: () => void) => (
    <div className="flex gap-3 justify-center">
      <Button
        icon="pi pi-eye"
        className="p-button-sm p-button-text p-button-info"
        tooltip="View"
        tooltipOptions={{ position: "top" }}
        onClick={onClick}
      />
    </div>
  );

  const backButton = (
    <div className="flex justify-end mt-3">
      <Button
        label="Back"
        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2.5 rounded-md font-medium transition duration-200"
        onClick={goBack}
      />
    </div>
  );

  /* ---- title / subtitle / empty message per level ---- */

  const levelMeta: Record<ViewLevel, { title: string; subtitle: string; emptyMessage: string }> = {
    apartment: {
      title: "Apartment List",
      subtitle: "Browse all apartments and drill down into blocks, flats and residents.",
      emptyMessage: "No apartments found.",
    },
    block: {
      title: `Blocks — ${selectedApartment}`,
      subtitle: "Select a block to view its flats.",
      emptyMessage: "No blocks found for this apartment.",
    },
    flat: {
      title: `Flats — Block ${selectedBlock}`,
      subtitle: `Apartment: ${selectedApartment}`,
      emptyMessage: "No flats found for this block.",
    },
    user: {
      title: "Residents",
      subtitle: `Block ${selectedBlock} · ${selectedApartment}`,
      emptyMessage: "No residents found for this flat.",
    },
  };

  const { title, subtitle, emptyMessage } = levelMeta[viewLevel];

  /* ---- global filter fields per level ---- */

  const globalFilterFields: Record<ViewLevel, string[]> = {
    apartment: ["apartment_name"],
    block: ["block"],
    flat: ["flat_no"],
    user: ["customer_name", "contact_no", "flat_no"],
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="p-3">

      {/* PAGE HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{title}</h1>
          <p className="text-gray-500 text-sm">{subtitle}</p>
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
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
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
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BREADCRUMB */}
      {viewLevel !== "apartment" && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          {breadcrumbItems().map((crumb, idx, arr) => (
            <span key={crumb.level} className="flex items-center gap-1">
              <span
                className={
                  idx === arr.length - 1
                    ? "font-semibold text-gray-800"
                    : "hover:underline cursor-pointer"
                }
                onClick={() => {
                  if (idx < arr.length - 1) {
                    setViewLevel(crumb.level);
                    resetFilter();
                  }
                }}
              >
                {crumb.label}
              </span>
              {idx < arr.length - 1 && (
                <i className="pi pi-chevron-right text-xs" />
              )}
            </span>
          ))}
        </div>
      )}

      {/* ---- APARTMENT TABLE ---- */}
      {viewLevel === "apartment" && (
        <DataTable
          value={apartments}
          dataKey="apartment_name"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={loading}
          filters={filters}
          globalFilterFields={globalFilterFields.apartment}
          header={tableHeader}
          emptyMessage={emptyMessage}
          stripedRows
          showGridlines
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
          <Column field="apartment_name" header="Apartment" sortable />
          <Column field="total_blocks" header="Blocks" sortable style={{ width: "100px" }} />
          <Column field="total_flats" header="Flats" sortable style={{ width: "100px" }} />
          <Column field="total_users" header="Residents" sortable style={{ width: "120px" }} />
          <Column
            header={t("common.actions")}
            style={{ textAlign: "center", width: "100px" }}
            body={(row: ApartmentRow) => viewActionTemplate(() => drillToBlock(row))}
          />
        </DataTable>
      )}

      {/* ---- BLOCK TABLE ---- */}
      {viewLevel === "block" && (
        <div>
          <DataTable
            value={blocks}
            dataKey="block"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            loading={loading}
            filters={filters}
            globalFilterFields={globalFilterFields.block}
            header={tableHeader}
            emptyMessage={emptyMessage}
            stripedRows
            showGridlines
            className="p-datatable-sm"
          >
            <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
            <Column field="block" header="Block No." sortable />
            <Column field="flat_count" header="Flats" sortable style={{ width: "100px" }} />
            <Column
              header={t("common.actions")}
              style={{ textAlign: "center", width: "100px" }}
              body={(row: BlockRow) => viewActionTemplate(() => drillToFlat(row))}
            />
          </DataTable>
          {backButton}
        </div>
      )}

      {/* ---- FLAT TABLE ---- */}
      {viewLevel === "flat" && (
        <div>
          <DataTable
            value={flats}
            dataKey="flat_no"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            loading={loading}
            filters={filters}
            globalFilterFields={globalFilterFields.flat}
            header={tableHeader}
            emptyMessage={emptyMessage}
            stripedRows
            showGridlines
            className="p-datatable-sm"
          >
            <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
            <Column field="flat_no" header="Flat No." sortable />
            <Column field="user_count" header="Residents" sortable style={{ width: "120px" }} />
            <Column
              header={t("common.actions")}
              style={{ textAlign: "center", width: "100px" }}
              body={(row: FlatRow) => viewActionTemplate(() => drillToUser(row))}
            />
          </DataTable>
          {backButton}
        </div>
      )}

      {/* ---- USER TABLE ---- */}
      {viewLevel === "user" && (
        <div>
          <DataTable
            value={users}
            dataKey="customer_name"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            loading={loading}
            filters={filters}
            globalFilterFields={globalFilterFields.user}
            header={tableHeader}
            emptyMessage={emptyMessage}
            stripedRows
            showGridlines
            className="p-datatable-sm"
          >
            <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
            <Column field="customer_name" header="Resident Name" sortable />
            <Column field="contact_no" header={t("common.mobile")} sortable />
            <Column field="flat_no" header="Flat No." sortable style={{ width: "120px" }} />
          </DataTable>
          {backButton}
        </div>
      )}

    </div>
  );
}