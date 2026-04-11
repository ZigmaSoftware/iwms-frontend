// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";
// import { useTranslation } from "react-i18next";

// import "primereact/resources/themes/lara-light-blue/theme.css";
// import "primereact/resources/primereact.min.css";
// import "primeicons/primeicons.css";

// import { PencilIcon, TrashBinIcon } from "@/icons";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { Switch } from "@/components/ui/switch";


// import type { UserType } from "../types/admin.types"; 

// import { userTypeApi } from "@/helpers/admin";

// export default function UserTypePage() {
//   const { t } = useTranslation();
//   const [userTypes, setUserTypes] = useState<UserType[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [filters, setFilters] = useState({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
//   });

//   const navigate = useNavigate();
//   const { encAdmins, encUserType } = getEncryptedRoute();

//   const ENC_NEW_PATH = `/${encAdmins}/${encUserType}/new`;
//   const ENC_EDIT_PATH = (unique_id: string) =>
//     `/${encAdmins}/${encUserType}/${unique_id}/edit`;

//   const fetchUserTypes = async () => {
//     try {
//       const res = await userTypeApi.list();
//       const payload: any = res;
//       const data = Array.isArray(payload)
//         ? payload
//         : Array.isArray(payload.data)
//           ? payload.data
//           : (payload.data?.results ?? []);
//       setUserTypes(data);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUserTypes();
//   }, []);

//   const handleDelete = async (unique_id: string) => {
//     const confirmDelete = await Swal.fire({
//       title: t("common.confirm_title"),
//       text: t("common.confirm_delete_text"),
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#d33",
//       cancelButtonColor: "#3085d6",
//       confirmButtonText: t("common.confirm_delete_button"),
//     });

//     if (!confirmDelete.isConfirmed) return;

//     await userTypeApi.remove(unique_id);

//     Swal.fire({
//       icon: "success",
//       title: t("common.deleted_success"),
//       timer: 1500,
//       showConfirmButton: false,
//     });

//     fetchUserTypes();
//   };

//   const onGlobalFilterChange = (e: any) => {
//     const value = e.target.value;
//     const _filters = { ...filters };
//     _filters["global"].value = value;
//     setFilters(_filters);
//     setGlobalFilterValue(value);
//   };

//   const indexTemplate = (_: UserType, { rowIndex }: { rowIndex: number }) =>
//     rowIndex + 1;

//   const actionTemplate = (row: UserType) => (
//     <div className="flex gap-2 justify-center">
//       <button
//         title={t("common.edit")}
//         className="text-blue-600 hover:text-blue-800"
//         onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
//       >
//         <PencilIcon className="size-5" />
//       </button>

//       {/* <button
//         title="Delete"
//         className="text-red-600 hover:text-red-800"
//         onClick={() => handleDelete(row.unique_id)}
//       >
//         <TrashBinIcon className="size-5" />
//       </button> */}
//     </div>
//   );

//   const statusTemplate = (row: UserType) => {
//     const updateStatus = async (value: boolean) => {
//       await userTypeApi.update(row.unique_id, {
//         name: row.name, // correct field name
//         is_active: value,
//       });

//       fetchUserTypes();
//     };

//     return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
//   };

//   const header = (
//     <div className="flex justify-end items-center">
//       <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
//         <i className="pi pi-search text-gray-500" />
//         <InputText
//           value={globalFilterValue}
//           onChange={onGlobalFilterChange}
//           placeholder={t("common.search_item_placeholder", {
//             item: t("admin.nav.user_type"),
//           })}
//           className="p-inputtext-sm !border-0 !shadow-none"
//         />
//       </div>
//     </div>
//   );

//   return (
//     <div className="px-3 py-3 w-full ">
//         {/* Header */}
//         <div className="flex justify-between items-center mb-6">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-800 mb-1">
//               {t("admin.nav.user_type")}
//             </h1>
//             <p className="text-gray-500 text-sm">
//               {t("common.manage_item_records", {
//                 item: t("admin.nav.user_type"),
//               })}
//             </p>
//           </div>

//           <Button
//             label={t("common.add_item", { item: t("admin.nav.user_type") })}
//             icon="pi pi-plus"
//             className="p-button-success"
//             onClick={() => navigate(ENC_NEW_PATH)}
//           />
//         </div>

//         <DataTable
//           value={userTypes}
//           paginator
//           rows={10}
//           loading={loading}
//           filters={filters}
//           rowsPerPageOptions={[5, 10, 25, 50]}
//           globalFilterFields={["name"]}
//           header={header}
//           emptyMessage={t("common.no_items_found", {
//             item: t("admin.nav.user_type"),
//           })}
//           stripedRows
//           showGridlines
//           className="p-datatable-sm"
//         >
//           <Column
//             header={t("common.s_no")}
//             body={indexTemplate}
//             style={{ width: "80px" }}
//           />
//           <Column
//             field="name"
//             header={t("admin.nav.user_type")}
//             sortable
//             style={{ minWidth: "200px" }}
//           />
//           <Column
//             header={t("common.status")}
//             body={statusTemplate}
//             style={{ width: "150px" }}
//           />
//           <Column
//             header={t("common.actions")}
//             body={actionTemplate}
//             style={{ width: "150px" }}
//           />
//         </DataTable>
    
//     </div>
//   );
// }




import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

import type { UserType } from "../types/admin.types";
import { userTypeApi } from "@/helpers/admin";

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  name: { value: string | null; matchMode: FilterMatchMode };
};

type UserTypeListRecord = UserType & {
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function UserTypePage() {
  const { t } = useTranslation();
  const [userTypes, setUserTypes] = useState<UserTypeListRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encAdmins, encUserType } = getEncryptedRoute();
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const ENC_NEW_PATH = `/${encAdmins}/${encUserType}/new`;
  const ENC_EDIT_PATH = (unique_id: string) =>
    `/${encAdmins}/${encUserType}/${unique_id}/edit`;

  const fetchUserTypes = async () => {
    if (isSuperAdmin && companies.length === 0) {
      setUserTypes([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setUserTypes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await userTypeApi.list({ params });
      const payload: any = res;
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : (payload.data?.results ?? payload.results ?? []);
      const rows = data as UserTypeListRecord[];

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setUserTypes(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setUserTypes(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTypes();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

  const handleDelete = async (unique_id: string) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("common.confirm_delete_button"),
    });

    if (!confirmDelete.isConfirmed) return;

    await userTypeApi.remove(unique_id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchUserTypes();
  };

  /* -----------------------------------------------------------
     FILTERS
  ----------------------------------------------------------- */
  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters["global"].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const indexTemplate = (_: UserType, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const actionTemplate = (row: UserType) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        title="Delete"
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row.unique_id)}
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const statusTemplate = (row: UserType) => {
    const updateStatus = async (value: boolean) => {
      await userTypeApi.update(row.unique_id, {
        name: row.name,
        is_active: value,
      });

      fetchUserTypes();
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.user_type"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="px-3 py-3 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.user_type")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", {
              item: t("admin.nav.user_type"),
            })}
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
            label={t("common.add_item", { item: t("admin.nav.user_type") })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={userTypes}
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        onFilter={onFilter}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={["name", "company_name", "project_name"]}
        header={header}
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.user_type"),
        })}
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        <Column
          field="name"
          header={t("admin.nav.user_type")}
          sortable
          filter
          showFilterMatchModes={false}
          style={{ minWidth: "200px" }}
        />
        <Column
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "150px" }}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px" }}
        />
      </DataTable>
    </div>
  );
}
