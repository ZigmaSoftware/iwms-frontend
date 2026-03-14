// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";

// import { DataTable } from "primereact/datatable";
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
// import { userScreenPermissionApi } from "@/helpers/admin";

// import type { StaffUserType, GroupedMap } from "../types/admin.types";

// import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

// /* -----------------------------------------------------------
//    COMPONENT
// ----------------------------------------------------------- */

// export default function UserScreenPermissionList() {
//   const { t } = useTranslation();

//   const navigate = useNavigate();

//   const [records, setRecords] = useState<StaffUserType[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [globalFilterValue, setGlobalFilterValue] = useState("");

//   const {
//     companyUniqueId,
//     companies,
//     onCompanyChange,
//     isSuperAdmin,
//   } = useCompanyProjectSelection({ isEdit: false });

//   const [filters, setFilters] = useState<any>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//     staffusertype_name: {
//       value: null,
//       matchMode: FilterMatchMode.STARTS_WITH,
//     },
//     company_name: {
//       value: null,
//       matchMode: FilterMatchMode.STARTS_WITH,
//     },
//     mainscreen_name: {
//       value: null,
//       matchMode: FilterMatchMode.STARTS_WITH,
//     },
//   });

//   const { encAdmins, encUserScreenPermission } = getEncryptedRoute();

//   const ENC_NEW_PATH = `/${encAdmins}/${encUserScreenPermission}/new`;

//   const ENC_EDIT_PATH = (staffTypeId: string) =>
//     `/${encAdmins}/${encUserScreenPermission}/${staffTypeId}/edit`;

//   /* -----------------------------------------------------------
//      FETCH DATA
//   ----------------------------------------------------------- */

//   const fetchRecords = async () => {
//     try {
//       setLoading(true);

//       const params: Record<string, any> = {};

//       if (companyUniqueId) {
//         params.company_id = companyUniqueId;
//       }

//       const res: any = await userScreenPermissionApi.list({ params });

//       let data: any[] = [];

//       if (Array.isArray(res)) {
//         data = res;
//       } else if (res?.data) {
//         data = res.data;
//       }

//       /* ✅ GROUP BY staffusertype_id + mainscreen_id COMBINED
//          This ensures each staff type × mainscreen pair = one row.
//          Previously grouping only by staffusertype_id caused
//          later mainscreens to be silently dropped.
//       */
//       const groupedObj: Record<string, any> = data.reduce((acc, item) => {

//         // ✅ Composite key → one row per staff type per mainscreen
//         const key = `${item.staffusertype_id}__${item.mainscreen_id}`;

//         if (!acc[key]) {
//           acc[key] = {
//             unique_id: item.staffusertype_id,           // used for edit/delete
//             composite_key: key,
//             company_name: item.company_name,
//             staffusertype_name: item.staffusertype_name ?? t("common.unknown"),
//             mainscreen_name: item.mainscreen_name ?? t("common.unknown"),
//             mainscreen_id: item.mainscreen_id,
//             is_active: item.is_active,
//             screens: [],
//           };
//         }

//         acc[key].screens.push({
//           screen: item.userscreen_name,
//           action: item.userscreenaction_name,
//           order: item.order_no,
//         });

//         return acc;

//       }, {} as Record<string, any>);

//       setRecords(Object.values(groupedObj));

//     } catch (err) {
//       console.error("Fetch failed:", err);
//       setRecords([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchRecords();
//   }, [companyUniqueId]);

//   /* -----------------------------------------------------------
//      DELETE RECORD
//   ----------------------------------------------------------- */

//   const handleDelete = async (staffTypeId: string) => {
//     const confirmDelete = await Swal.fire({
//       title: t("common.confirm_title"),
//       text: t("admin.user_screen_permission.confirm_delete"),
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#d33",
//     });

//     if (!confirmDelete.isConfirmed) return;

//     try {
//       await userScreenPermissionApi.remove(
//         `delete-by-staffusertype/${staffTypeId}`
//       );

//       Swal.fire(
//         t("common.deleted_success"),
//         t("admin.user_screen_permission.delete_success"),
//         "success"
//       );

//       fetchRecords();

//     } catch (error) {
//       console.error("DELETE ERROR:", error);

//       Swal.fire(
//         t("common.error"),
//         t("admin.user_screen_permission.delete_failed"),
//         "error"
//       );
//     }
//   };

//   /* -----------------------------------------------------------
//      ACTION BUTTONS
//   ----------------------------------------------------------- */

//   const actionTemplate = (row: any) => (
//     <div className="flex gap-2 justify-center">

//       <button
//         title={t("common.edit")}
//         className="text-blue-600 hover:text-blue-800"
//         onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
//       >
//         <PencilIcon className="size-5" />
//       </button>

//       <button
//         title={t("common.delete")}
//         className="text-red-600 hover:text-red-800"
//         onClick={() => handleDelete(row.unique_id)}
//       >
//         <TrashBinIcon className="size-5" />
//       </button>

//     </div>
//   );

//   const indexTemplate = (_: any, { rowIndex }: any) => rowIndex + 1;

//   /* -----------------------------------------------------------
//      GLOBAL SEARCH
//   ----------------------------------------------------------- */

//   const onGlobalFilterChange = (e: any) => {
//     const value = e.target.value;
//     const updated = { ...filters };
//     updated["global"].value = value;
//     setFilters(updated);
//     setGlobalFilterValue(value);
//   };

//   const header = (
//     <div className="flex justify-end items-center">
//       <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border shadow-sm">
//         <i className="pi pi-search text-gray-500" />
//         <InputText
//           value={globalFilterValue}
//           onChange={onGlobalFilterChange}
//           placeholder={t("common.search_placeholder")}
//           className="p-inputtext-sm !border-0 !shadow-none"
//         />
//       </div>
//     </div>
//   );

//   /* -----------------------------------------------------------
//      RENDER
//   ----------------------------------------------------------- */

//   return (
//     <div className="p-3">

//       {/* HEADER */}

//       <div className="flex justify-between items-center mb-6">

//         <div>
//           <h1 className="text-3xl font-bold text-gray-800">
//             {t("admin.user_screen_permission.title")}
//           </h1>
//           <p className="text-gray-500 text-sm">
//             {t("admin.user_screen_permission.subtitle")}
//           </p>
//         </div>

//         <div className="flex gap-3 items-center">

//           {/* COMPANY SELECT */}

//           {isSuperAdmin && (
//             <select
//               value={companyUniqueId || ""}
//               onChange={(e) => onCompanyChange(e.target.value)}
//               className="border rounded px-3 py-2 text-sm"
//             >
//               <option value="">
//                 {t("common.all")} {t("admin.nav.company")}
//               </option>

//               {companies.map((c: any) => (
//                 <option key={c.value} value={c.value}>
//                   {c.label}
//                 </option>
//               ))}
//             </select>
//           )}

//           <Button
//             label={t("common.add_item", {
//               item: t("admin.user_screen_permission.permission_label"),
//             })}
//             icon="pi pi-plus"
//             className="p-button-success"
//             onClick={() => navigate(ENC_NEW_PATH)}
//           />

//         </div>

//       </div>

//       {/* TABLE */}

//       <DataTable
//         value={records}
//         dataKey="composite_key"
//         paginator
//         rows={10}
//         loading={loading}
//         filters={filters}
//         rowsPerPageOptions={[5, 10, 25, 50]}
//         globalFilterFields={["staffusertype_name", "company_name", "mainscreen_name"]}
//         header={header}
//         stripedRows
//         showGridlines
//         emptyMessage={t("common.no_items_found", {
//           item: t("admin.user_screen_permission.permission_label"),
//         })}
//         className="p-datatable-sm"
//       >

//         <Column
//           header={t("common.s_no")}
//           body={indexTemplate}
//           style={{ width: 80 }}
//         />

//         <Column
//           field="company_name"
//           header={t("admin.nav.company")}
//           sortable
//         />

//         <Column
//           field="mainscreen_name"
//           header={t("admin.nav.main_screen")}
//           sortable
//         />

//         <Column
//           field="staffusertype_name"
//           header={t("admin.nav.staff_user_type")}
//           sortable
//         />

//         <Column
//           header={t("common.actions")}
//           body={actionTemplate}
//           style={{ width: 150 }}
//         />

//       </DataTable>

//     </div>
//   );
// }




import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "primereact/datatable";
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
import { userScreenPermissionApi } from "@/helpers/admin";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

/* -----------------------------------------------------------
   COMPONENT
----------------------------------------------------------- */

export default function UserScreenPermissionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const {
    companyUniqueId,
    companies,
    onCompanyChange,
    isSuperAdmin,
  } = useCompanyProjectSelection({ isEdit: false });

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    staffusertype_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    company_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    mainscreen_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
  });

  const { encAdmins, encUserScreenPermission } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encAdmins}/${encUserScreenPermission}/new`;

  const ENC_EDIT_PATH = (staffTypeId: string, companyId: string) =>
    `/${encAdmins}/${encUserScreenPermission}/${staffTypeId}/edit?company_unique_id=${encodeURIComponent(companyId)}`;

  /* -----------------------------------------------------------
     FETCH DATA
  ----------------------------------------------------------- */

  const fetchRecords = async () => {
    try {
      setLoading(true);

      const params: Record<string, any> = {};

      if (companyUniqueId) {
        params.company_id = companyUniqueId;
      }

      const res: any = await userScreenPermissionApi.list({ params });

      let data: any[] = [];

      if (Array.isArray(res)) {
        data = res;
      } else if (res?.data) {
        data = res.data;
      }

      /* GROUP BY staffusertype_id + mainscreen_id COMBINED */

      const groupedObj: Record<string, any> = data.reduce((acc, item) => {
        const key = `${item.staffusertype_id}__${item.mainscreen_id}`;

        if (!acc[key]) {
          acc[key] = {
            unique_id: item.staffusertype_id,
            composite_key: key,
            company_id: item.company_id,
            company_name: item.company_name ?? t("common.unknown"),
            staffusertype_name: item.staffusertype_name ?? t("common.unknown"),
            mainscreen_name: item.mainscreen_name ?? t("common.unknown"),
            mainscreen_id: item.mainscreen_id,
            is_active: item.is_active,
            screens: [],
          };
        }

        acc[key].screens.push({
          screen: item.userscreen_name,
          action: item.userscreenaction_name,
          order: item.order_no,
        });

        return acc;
      }, {} as Record<string, any>);

      setRecords(Object.values(groupedObj));

    } catch (err) {
      console.error("Fetch failed:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ companies.length === 0 means hook is still initializing
    // Don't fetch until companies are loaded — that's when companyUniqueId is reliable
    if (companies.length === 0) return;
    fetchRecords();
  }, [companyUniqueId, location.key, companies.length]);

  /* -----------------------------------------------------------
     DELETE RECORD
  ----------------------------------------------------------- */

  const handleDelete = async (row: any) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("admin.user_screen_permission.confirm_delete"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      await userScreenPermissionApi.remove(
        `delete-by-staffusertype/${row.unique_id}/?company_id=${row.company_id}&mainscreen_id=${row.mainscreen_id}`
      );

      Swal.fire(
        t("common.deleted_success"),
        t("admin.user_screen_permission.delete_success"),
        "success"
      );

      fetchRecords();

    } catch (error) {
      console.error("DELETE ERROR:", error);

      Swal.fire(
        t("common.error"),
        t("admin.user_screen_permission.delete_failed"),
        "error"
      );
    }
  };

  /* -----------------------------------------------------------
     ACTION BUTTONS
  ----------------------------------------------------------- */

  const actionTemplate = (row: any) => (
    <div className="flex gap-2 justify-center">

      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id, row.company_id))}
      >
        <PencilIcon className="size-5" />
      </button>

      <button
        title={t("common.delete")}
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row)}
      >
        <TrashBinIcon className="size-5" />
      </button>

    </div>
  );

  const indexTemplate = (_: any, { rowIndex }: any) => rowIndex + 1;

  /* -----------------------------------------------------------
     GLOBAL SEARCH
  ----------------------------------------------------------- */

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated["global"].value = value;
    setFilters(updated);
    setGlobalFilterValue(value);
  };

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

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */

  return (
    <div className="p-3">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {t("admin.user_screen_permission.title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("admin.user_screen_permission.subtitle")}
          </p>
        </div>

        <div className="flex gap-3 items-center">

          {isSuperAdmin && (
            <select
              value={companyUniqueId || ""}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">
                {t("common.all")} {t("admin.nav.company")}
              </option>

              {companies.map((c: any) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          )}

          <Button
            label={t("common.add_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />

        </div>

      </div>

      {/* TABLE */}

      <DataTable
        value={records}
        dataKey="composite_key"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={["staffusertype_name", "company_name", "mainscreen_name"]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.user_screen_permission.permission_label"),
        })}
        className="p-datatable-sm"
      >

        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: 80 }}
        />

        <Column
          field="company_name"
          header={t("admin.nav.company")}
          sortable
        />

        <Column
          field="mainscreen_name"
          header={t("admin.nav.main_screen")}
          sortable
        />

        <Column
          field="staffusertype_name"
          header={t("admin.nav.staff_user_type")}
          sortable
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 150 }}
        />

      </DataTable>

    </div>
  );
}