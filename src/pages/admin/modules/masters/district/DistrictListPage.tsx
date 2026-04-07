// import { useCallback, useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";
// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { Dropdown } from "primereact/dropdown";
// import { FilterMatchMode } from "primereact/api";
// import { useTranslation } from "react-i18next";
// import { PencilIcon } from "@/icons";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { Switch } from "@/components/ui/switch";
// import { districtApi } from "@/helpers/admin";

// type DistrictRecord = {
//   unique_id: string;
//   countryName: string;
//   stateName: string;
//   name: string;
//   is_active: boolean;
// };

// type ErrorWithResponse = {
//   response?: { data?: unknown };
// };

// const extractErrorMessage = (error: unknown) => {
//   if (!error) return "Something went wrong while processing the request.";
//   if (typeof error === "string") return error;
//   const data = (error as ErrorWithResponse)?.response?.data;
//   if (typeof data === "string") return data;
//   if (Array.isArray(data)) return data.join(", ");
//   if (data && typeof data === "object") {
//     return Object.entries(data as Record<string, unknown>)
//       .map(([k, v]) =>
//         Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
//       )
//       .join("\n");
//   }
//   if (error instanceof Error && error.message) return error.message;
//   return "Something went wrong while processing the request.";
// };

// export default function DistrictListPage() {
//   const { t } = useTranslation();
//   const [districts, setDistricts] = useState<DistrictRecord[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [filters, setFilters] = useState<any>({
//     global:      { value: null, matchMode: FilterMatchMode.CONTAINS },
//     countryName: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     stateName:   { value: null, matchMode: FilterMatchMode.CONTAINS },
//     name:        { value: null, matchMode: FilterMatchMode.CONTAINS },
//     is_active:   { value: null, matchMode: FilterMatchMode.EQUALS },
//   });

//   const navigate = useNavigate();
//   const { encMasters, encDistricts } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encMasters}/${encDistricts}/new`;
//   const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encDistricts}/${id}/edit`;

//   const fetchDistricts = useCallback(async () => {
//     try {
//       const res = await districtApi.list();
//       const data = res as any[];
//       const mapped: DistrictRecord[] = data.map((d: any) => ({
//         unique_id:   d.unique_id,
//         countryName: d.country_name,
//         stateName:   d.state_name,
//         name:        d.name,
//         is_active:   d.is_active,
//       }));
//       mapped.sort((a, b) => a.name.localeCompare(b.name));
//       setDistricts(mapped);
//     } catch (error) {
//       Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(error) });
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { fetchDistricts(); }, [fetchDistricts]);

//   const cap = (str?: string) =>
//     str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

//   const statusOptions = [
//     { label: t("common.all") ?? "All",          value: null },
//     { label: t("common.active") ?? "Active",     value: true },
//     { label: t("common.inactive") ?? "Inactive", value: false },
//   ];

//   const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setFilters((prev: any) => ({ ...prev, global: { ...prev.global, value } }));
//     setGlobalFilterValue(value);
//   };

//   const renderHeader = () => (
//     <div className="flex justify-end items-center">
//       <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
//         <i className="pi pi-search text-gray-500" />
//         <InputText
//           value={globalFilterValue}
//           onChange={onGlobalFilterChange}
//           placeholder={t("common.search_item_placeholder", { item: t("admin.nav.district") })}
//           className="p-inputtext-sm !border-0 !shadow-none"
//         />
//       </div>
//     </div>
//   );

//   // Text filter popup content
//   const textFilterElement = (options: any) => (
//     <InputText
//       value={options.value ?? ""}
//       onChange={(e) => options.filterApplyCallback(e.target.value)}
//       placeholder="Search..."
//       className="p-inputtext-sm w-full"
//       autoFocus
//     />
//   );

//   // Status filter popup content
//   const statusFilterElement = (options: any) => (
//     <Dropdown
//       value={options.value}
//       options={statusOptions}
//       onChange={(e) => options.filterApplyCallback(e.value)}
//       placeholder={t("common.all") ?? "All"}
//       className="p-inputtext-sm w-full"
//       showClear={options.value !== null && options.value !== undefined}
//     />
//   );

//   const statusTemplate = (row: DistrictRecord) => {
//     const updateStatus = async (value: boolean) => {
//       try {
//         await districtApi.update(row.unique_id, { is_active: value });
//         fetchDistricts();
//       } catch (e) {
//         console.error("Toggle update failed:", e);
//       }
//     };
//     return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
//   };

//   const actionTemplate = (row: DistrictRecord) => (
//     <div className="flex gap-3 justify-center">
//       <button
//         onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
//         className="text-blue-600 hover:text-blue-800"
//       >
//         <PencilIcon className="size-5" />
//       </button>
//     </div>
//   );

//   const indexTemplate = (_: DistrictRecord, { rowIndex }: any) => rowIndex + 1;

//   return (
//     <div className="p-3">
//       <div className="flex justify-between items-center mb-6">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-800 mb-1">
//             {t("admin.nav.district")}
//           </h1>
//           <p className="text-gray-500 text-sm">
//             {t("common.manage_item_records", { item: t("admin.nav.district") })}
//           </p>
//         </div>
//         <Button
//           label={t("common.add_item", { item: t("admin.nav.district") })}
//           icon="pi pi-plus"
//           className="p-button-success"
//           onClick={() => navigate(ENC_NEW_PATH)}
//         />
//       </div>

//       <DataTable
//         value={districts}
//         dataKey="unique_id"
//         loading={loading}
//         paginator
//         rows={10}
//         rowsPerPageOptions={[5, 10, 25, 50]}
//         filters={filters}
//         onFilter={(e) => setFilters(e.filters)}
//         filterDisplay="menu"
//         header={renderHeader()}
//         stripedRows
//         showGridlines
//         emptyMessage={t("common.no_items_found", { item: t("admin.nav.district") })}
//         globalFilterFields={["name", "countryName", "stateName"]}
//         className="p-datatable-sm"
//       >
//         <Column
//           header={t("common.s_no")}
//           body={indexTemplate}
//           style={{ width: "80px" }}
//         />
//         <Column
//           field="countryName"
//           header={t("admin.nav.country")}
//           body={(row) => cap(row.countryName)}
//           sortable
//           filter
//           filterField="countryName"
//           filterElement={textFilterElement}
//           filterPlaceholder="Search country"
//         />
//         <Column
//           field="stateName"
//           header={t("admin.nav.state")}
//           body={(row) => cap(row.stateName)}
//           sortable
//           filter
//           filterField="stateName"
//           filterElement={textFilterElement}
//           filterPlaceholder="Search state"
//         />
//         <Column
//           field="name"
//           header={t("admin.nav.district")}
//           body={(row) => cap(row.name)}
//           sortable
//           filter
//           filterField="name"
//           filterElement={textFilterElement}
//           filterPlaceholder="Search district"
//         />
//         <Column
//           field="is_active"
//           header={t("common.status")}
//           body={statusTemplate}
//           // filter
//           // filterField="is_active"
//           // filterElement={statusFilterElement}
//           // showFilterMatchModes={false}
//           // style={{ width: "140px" }}
//         />
//         <Column
//           header={t("common.actions")}
//           body={actionTemplate}
//           style={{ width: "100px", textAlign: "center" }}
//         />
//       </DataTable>
//     </div>
//   );
// }


import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { districtApi, projectApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type DistrictRecord = {
  unique_id: string;
  countryName: string;
  stateName: string;
  name: string;
  is_active: boolean;
};

type ProjectOption = {
  label: string;
  value: string;
};

type ErrorWithResponse = {
  response?: { data?: unknown };
};

const extractErrorMessage = (error: unknown) => {
  if (!error) return "Something went wrong while processing the request.";
  if (typeof error === "string") return error;
  const data = (error as ErrorWithResponse)?.response?.data;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) =>
        Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
      )
      .join("\n");
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong while processing the request.";
};

export default function DistrictListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [districts, setDistricts] = useState<DistrictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectUniqueId, setProjectUniqueId] = useState<string>("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    countryName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    stateName:   { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    name:        { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const {
    companyUniqueId,
    companies,
    onCompanyChange,
    isSuperAdmin,
    } = useCompanyProjectSelection({ isEdit: false });

  const { encMasters, encDistricts } = getEncryptedRoute();
  const ENC_NEW_PATH  = `/${encMasters}/${encDistricts}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encDistricts}/${id}/edit`;

  /* ── Fetch projects ─────────────────────────────────────── */
  useEffect(() => {
    if (!companyUniqueId) {
      setProjects([]);
      setProjectUniqueId("");
      return;
    }

      const loadProjects = async () => {
      setProjectsLoading(true);
      try {
        const res = await projectApi.list({ params: { company_id: companyUniqueId } });
        const data = res as any[];
        const filtered = data.filter(
          (p: any) =>
            String(p.company_id ?? p.company_unique_id ?? "") === companyUniqueId
        );
        setProjects(
          filtered.map((p: any) => ({
            label: p.name ?? p.project_name,
            value: p.unique_id,
          })),
        );
        setProjectUniqueId("");
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [companyUniqueId, ]);

  /* ── Fetch districts ───────────────────────────────────── */
  const fetchDistricts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectUniqueId) params.project_id = projectUniqueId;

      const res  = await districtApi.list({ params });
      const data = res as any[];

      const mapped: DistrictRecord[] = data
        .map((d: any) => ({
          unique_id:   d.unique_id,
          countryName: d.country_name,
          stateName:   d.state_name,
          name:        d.name,
          is_active:   d.is_active,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setDistricts(mapped);
    } catch (error) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, projectUniqueId]);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  /* ── Global search ─────────────────────────────────────── */
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev: any) => ({ ...prev, global: { ...prev.global, value } }));
    setGlobalFilterValue(value);
  };

  /* ── Table header ──────────────────────────────────────── */
  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  /* ── Templates ─────────────────────────────────────────── */
  const indexTemplate = (_: any, { rowIndex }: any) => rowIndex + 1;

  const actionTemplate = (row: DistrictRecord) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {t("admin.nav.district")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("admin.nav.district_subtitle", { defaultValue: "Manage districts" })}
          </p>
        </div>

        <div className="flex gap-3 items-center flex-wrap justify-end">
          {isSuperAdmin ? (
            <select
              value={companyUniqueId || ""}
              onChange={(e) => onCompanyChange(e.target.value === "ALL" ? "" : e.target.value)}
              className="border rounded px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="ALL">N/A</option>
              {/* <option value="" disabled>
                {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
              </option> */}
              {companies.map((c: any) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 border rounded px-3 py-2 text-sm bg-gray-50 min-w-[180px]">
              <span className="text-gray-700 font-medium">
                {companies.find((c: any) => c.value === companyUniqueId)?.label ?? t("admin.nav.company")}
              </span>
            </div>
          )}

          {companyUniqueId && (
            <Dropdown
              value={projectUniqueId || null}
              options={projects}
              onChange={(e) => setProjectUniqueId(e.value ?? "")}
              placeholder={t("admin.nav.project")}
              disabled={projectsLoading}
              className="text-sm min-w-[180px]"
            />
          )}

          <Button
            label={t("common.add_item", { item: t("admin.nav.district") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={districts}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={["countryName", "stateName", "name"]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.district") })}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: 80 }}
        />
        <Column field="countryName" header={t("admin.nav.country")} sortable />
        <Column field="stateName"   header={t("admin.nav.state")}   sortable />
        <Column field="name"        header={t("admin.nav.district")} sortable />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 100 }}
        />
      </DataTable>
    </div>
  );
}