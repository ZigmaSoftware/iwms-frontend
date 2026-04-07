// import { useCallback, useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";
// import { useTranslation } from "react-i18next";

// import { PencilIcon, TrashBinIcon } from "@/icons";
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
//   response?: {
//     data?: unknown;
//   };
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
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     name: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   const navigate = useNavigate();

//   const { encMasters, encDistricts } = getEncryptedRoute();

//   const ENC_NEW_PATH = `/${encMasters}/${encDistricts}/new`;
//   const ENC_EDIT_PATH = (id: string) =>
//     `/${encMasters}/${encDistricts}/${id}/edit`;

//   const fetchDistricts = useCallback(async () => {
//     // setLoading(true);
//     try {
//       const res = await districtApi.list();
//       const data = res as any[];

//       const mapped: DistrictRecord[] = data.map((d: any) => ({
//         unique_id: d.unique_id,
//         countryName: d.country_name,
//         stateName: d.state_name,
//         name: d.name,
//         is_active: d.is_active,
//       }));

//       mapped.sort((a, b) => a.name.localeCompare(b.name));
//       setDistricts(mapped);
//     } catch (error) {
//       Swal.fire({
//         icon: "error",
//         title: t("common.error"),
//         text: extractErrorMessage(error),
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchDistricts();
//   }, [fetchDistricts]);

//   const handleDelete = async (id: string) => {
//     const confirm = await Swal.fire({
//       title: t("common.confirm_title"),
//       text: t("common.confirm_delete_text"),
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#d33",
//       confirmButtonText: t("common.confirm_delete_button"),
//     });

//     if (!confirm.isConfirmed) return;

//     await districtApi.remove(id);

//     Swal.fire({
//       icon: "success",
//       title: t("common.deleted_success"),
//       timer: 1500,
//       showConfirmButton: false,
//     });

//     fetchDistricts();
//   };

//   const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setFilters((prev: any) => ({
//       ...prev,
//       global: { ...prev.global, value },
//     }));
//     setGlobalFilterValue(value);
//   };

//   const renderHeader = () => (
//     <div className="flex justify-end items-center">
//       <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
//         <i className="pi pi-search text-gray-500" />
//         <InputText
//           value={globalFilterValue}
//           onChange={onGlobalFilterChange}
//           placeholder={t("common.search_item_placeholder", {
//             item: t("admin.nav.district"),
//           })}
//           className="p-inputtext-sm !border-0 !shadow-none"
//         />
//       </div>
//     </div>
//   );

//   const cap = (str?: string) =>
//     str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

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

//       {/* <button
//         onClick={() => handleDelete(row.unique_id)}
//         className="text-red-600 hover:text-red-800"
//       >
//         <TrashBinIcon className="size-5" />
//       </button> */}
//     </div>
//   );

//   const indexTemplate = (_: DistrictRecord, { rowIndex }: any) => rowIndex + 1;

//   return (
//     <div className="p-3">
  
//         <div className="flex justify-between items-center mb-6">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-800 mb-1">
//               {t("admin.nav.district")}
//             </h1>
//             <p className="text-gray-500 text-sm">
//               {t("common.manage_item_records", { item: t("admin.nav.district") })}
//             </p>
//           </div>

//           <Button
//             label={t("common.add_item", { item: t("admin.nav.district") })}
//             icon="pi pi-plus"
//             className="p-button-success"
//             onClick={() => navigate(ENC_NEW_PATH)}
//           />
//         </div>

//         <DataTable
//           value={districts}
//           dataKey="unique_id"
//           loading={loading}
//           paginator
//           rows={10}
//           rowsPerPageOptions={[5, 10, 25, 50]}
//           filters={filters}
//           header={renderHeader()}
//           stripedRows
//           showGridlines
//           emptyMessage={t("common.no_items_found", {
//             item: t("admin.nav.district"),
//           })}
//           globalFilterFields={["name", "countryName", "stateName"]}
//           className="p-datatable-sm"
//         >
//           <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
//           <Column
//             field="countryName"
//             header={t("admin.nav.country")}
//             body={(row) => cap(row.countryName)}
//             sortable
//           />
//           <Column
//             field="stateName"
//             header={t("admin.nav.state")}
//             body={(row) => cap(row.stateName)}
//             sortable
//           />
//           <Column
//             field="name"
//             header={t("admin.nav.district")}
//             body={(row) => cap(row.name)}
//             sortable
//           />
//           <Column header={t("common.status")} body={statusTemplate} />
//           <Column header={t("common.actions")} body={actionTemplate} />
//         </DataTable>
    
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
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { useTranslation } from "react-i18next";
import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { districtApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type DistrictRecord = {
  unique_id: string;
  countryName: string;
  stateName: string;
  name: string;
  is_active: boolean;
  company_id?: string;
  company_unique_id?: string;
  company_name?: string;
  project_id?: string;
  project_unique_id?: string;
  project_name?: string;
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

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function DistrictListPage() {
  const { t } = useTranslation();
  const [districts, setDistricts] = useState<DistrictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global:      { value: null, matchMode: FilterMatchMode.CONTAINS },
    countryName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    stateName:   { value: null, matchMode: FilterMatchMode.CONTAINS },
    name:        { value: null, matchMode: FilterMatchMode.CONTAINS },
    is_active:   { value: null, matchMode: FilterMatchMode.EQUALS },
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

  const navigate = useNavigate();
  const { encMasters, encDistricts } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encMasters}/${encDistricts}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encDistricts}/${id}/edit`;

  const fetchDistricts = useCallback(async () => {
    if (isSuperAdmin && companies.length === 0) {
      setDistricts([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setDistricts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await districtApi.list({ params });
      const rows = Array.isArray(res) ? (res as Record<string, unknown>[]) : [];
      const mapped: DistrictRecord[] = rows.map((d) => ({
        unique_id: String(d.unique_id ?? ""),
        countryName: String(d.country_name ?? ""),
        stateName: String(d.state_name ?? ""),
        name: String(d.name ?? ""),
        is_active: Boolean(d.is_active),
        company_id: d.company_id ? String(d.company_id) : undefined,
        company_unique_id: d.company_unique_id
          ? String(d.company_unique_id)
          : undefined,
        company_name: d.company_name ? String(d.company_name) : undefined,
        project_id: d.project_id ? String(d.project_id) : undefined,
        project_unique_id: d.project_unique_id
          ? String(d.project_unique_id)
          : undefined,
        project_name: d.project_name ? String(d.project_name) : undefined,
      }));
      const filtered = mapped.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;

        return companyMatches && projectMatches;
      });
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      setDistricts(filtered);
    } catch (error) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId, t]);

  useEffect(() => { fetchDistricts(); }, [fetchDistricts]);

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
    setGlobalFilterValue(value);
  };

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", { item: t("admin.nav.district") })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  type TextFilterOptions = {
    value?: string | null;
    filterApplyCallback: (value: string | null) => void;
  };

  const textFilterElement = (options: TextFilterOptions) => (
    <InputText
      value={options.value ?? ""}
      onChange={(e) => options.filterApplyCallback(e.target.value)}
      placeholder="Search..."
      className="p-inputtext-sm w-full"
      autoFocus
    />
  );

  const statusTemplate = (row: DistrictRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await districtApi.update(row.unique_id, { is_active: value });
        fetchDistricts();
      } catch (e) {
        console.error("Toggle update failed:", e);
      }
    };
    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: DistrictRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: DistrictRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.district")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", { item: t("admin.nav.district") })}
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
            label={t("common.add_item", { item: t("admin.nav.district") })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={districts}
        dataKey="unique_id"
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        filters={filters}
        onFilter={(e) => setFilters(e.filters)}
        filterDisplay="menu"
        header={renderHeader()}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.district") })}
        globalFilterFields={["name", "countryName", "stateName", "company_name", "project_name"]}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        <Column
          field="countryName"
          header={t("admin.nav.country")}
          body={(row) => cap(row.countryName)}
          sortable
          filter
          filterField="countryName"
          filterElement={textFilterElement}
          filterPlaceholder="Search country"
        />
        <Column
          field="stateName"
          header={t("admin.nav.state")}
          body={(row) => cap(row.stateName)}
          sortable
          filter
          filterField="stateName"
          filterElement={textFilterElement}
          filterPlaceholder="Search state"
        />
        <Column
          field="name"
          header={t("admin.nav.district")}
          body={(row) => cap(row.name)}
          sortable
          filter
          filterField="name"
          filterElement={textFilterElement}
          filterPlaceholder="Search district"
        />
        <Column
          field="is_active"
          header={t("common.status")}
          body={statusTemplate}
          // filter
          // filterField="is_active"
          // filterElement={statusFilterElement}
          // showFilterMatchModes={false}
          // style={{ width: "140px" }}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "100px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
