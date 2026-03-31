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
// import { staffCreationApi, staffTemplateApi } from "@/helpers/admin";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { Switch } from "@/components/ui/switch";

// /* ================= TYPES ================= */

// type StaffTemplate = {
//   id: number;
//   unique_id: string;
//   display_code?: string;

//   driver_id: string;
//   driver_name: string;

//   operator_id: string;
//   operator_name: string;

//   extra_operator_id?: string[];

//   status: string;
//   approval_status: string;

//   created_at: string;
//   updated_at: string;
// };

// /* ================= COMPONENT ================= */

// export default function StaffTemplateList() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();

//   const [templates, setTemplates] = useState<StaffTemplate[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [globalFilterValue, setGlobalFilterValue] = useState("");

//   const [datatableFilters, setDatatableFilters] = useState<any>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   const { encStaffMasters, encStaffTemplate } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encStaffMasters}/${encStaffTemplate}/new`;
//   const ENC_EDIT_PATH = (id: string) =>
//     `/${encStaffMasters}/${encStaffTemplate}/${id}/edit`;

//   /* ================= FETCH ================= */

//   const fetchTemplates = async () => {
//     setLoading(true);
//     try {
//       const payload: any = await staffTemplateApi.list(); // GET
//       const data =
//         Array.isArray(payload) ? payload :
//         Array.isArray(payload?.data) ? payload.data :
//         payload?.data?.results ?? [];
//       setTemplates(data);
//     } catch {
//       Swal.fire(t("common.error"), t("common.load_failed"), "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTemplates();
//   }, []);

//   /* ================= FILTER ================= */

//   const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setGlobalFilterValue(value);
//     setDatatableFilters({
//       global: { value, matchMode: FilterMatchMode.CONTAINS },
//     });
//   };

//   /* ================= STATUS TOGGLE ================= */
//   const statusBodyTemplate = (row: StaffTemplate) => {
//     const updateStatus = async (checked: boolean) => {
//       try {
//         await staffTemplateApi.update(row.unique_id, {
//           status: checked ? "ACTIVE" : "INACTIVE",
//         });
//         fetchTemplates();
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

//   /* ================= ACTIONS ================= */

//   const actionTemplate = (row: StaffTemplate) => (
//     <div className="flex justify-center">
//       <button
//         title={t("common.edit")}
//         onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
//         className="text-blue-600 hover:text-blue-800"
//       >
//         <PencilIcon className="size-5" />
//       </button>
//     </div>
//   );

//   const indexTemplate = (_: StaffTemplate, { rowIndex }: any) => rowIndex + 1;

//   /* ================= HEADER ================= */

//   const header = (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">
//             {t("admin.staff_template.list_title")}
//           </h1>
//           <p className="text-sm text-gray-500">
//             {t("admin.staff_template.list_subtitle")}
//           </p>
//         </div>

//         <Button
//           label={t("admin.staff_template.create_button")}
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
//             placeholder={t("admin.staff_template.search_placeholder")}
//             className="border-none text-sm"
//           />
//         </div>
//       </div>
//     </div>
//   );

//   /* ================= RENDER ================= */

//   return (
//     <div className="p-3">
//       <DataTable
//         value={templates}
//         paginator
//         rows={10}
//         loading={loading}
//         filters={datatableFilters}
//         globalFilterFields={[
//           "unique_id",
//           "display_code",
//           "driver_name",
//           "operator_name",
//           "status",
//           "approval_status",
//         ]}
//         header={header}
//         stripedRows
//         showGridlines
//         className="p-datatable-sm"
//         emptyMessage={t("admin.staff_template.empty_message")}
//       >
//         <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />

//         <Column
//           header={t("admin.staff_template.columns.template_id")}
//           body={(r: StaffTemplate) => r.display_code ?? r.unique_id}
//           sortable
//           field="unique_id"
//         />

//         <Column
//           header={t("admin.staff_template.columns.primary_driver")}
//           body={(r: StaffTemplate) => r.driver_name}
//           sortable
//         />

//         <Column
//           header={t("admin.staff_template.columns.primary_operator")}
//           body={(r: StaffTemplate) => r.operator_name}
//           sortable
//         />

//         <Column
//           header={t("admin.staff_template.columns.extra_staff")}
//           body={(r: StaffTemplate) =>
//             r.extra_operator_id?.length ?? 0
//           }
//           style={{ width: 130 }}
//         />

//         <Column
//           header={t("common.status")}
//           body={statusBodyTemplate}
//           style={{ width: 120 }}
//         />

//         <Column
//           field="approval_status"
//           header={t("admin.staff_template.columns.approval_status")}
//           sortable
//         />

//         <Column
//           header={t("admin.staff_template.columns.created_at")}
//           body={(r: StaffTemplate) =>
//             new Date(r.created_at).toLocaleDateString()
//           }
//         />

//         <Column
//             header={t("admin.staff_template.columns.updated_at")}
//             body={(r: StaffTemplate)=>
//                 new Date(r.updated_at).toLocaleDateString()
//             }
//         />

//         <Column
//           header={t("common.actions")}
//           body={actionTemplate}
//           style={{ width: 120 }}
//         />
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
import { staffCreationApi, staffTemplateApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";

/* ================= TYPES ================= */

type StaffTemplate = {
  id: number;
  unique_id: string;
  display_code?: string;

  driver_id: string;
  driver_name: string;

  operator_id: string;
  operator_name: string;

  extra_operator_id?: string[];

  status: string;
  approval_status: string;

  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  unique_id: { value: string | null; matchMode: FilterMatchMode };
  driver_name: { value: string | null; matchMode: FilterMatchMode };
  operator_name: { value: string | null; matchMode: FilterMatchMode };
  approval_status: { value: string | null; matchMode: FilterMatchMode };
};

/* ================= COMPONENT ================= */

export default function StaffTemplateList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<StaffTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [datatableFilters, setDatatableFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    driver_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    operator_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    approval_status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encStaffMasters, encStaffTemplate } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encStaffTemplate}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encStaffMasters}/${encStaffTemplate}/${id}/edit`;

  /* ================= FETCH ================= */

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const payload: any = await staffTemplateApi.list();
      const data =
        Array.isArray(payload) ? payload :
        Array.isArray(payload?.data) ? payload.data :
        payload?.data?.results ?? [];
      setTemplates(data);
    } catch {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  /* ================= FILTERS ================= */

  const onFilter = (e: DataTableFilterEvent) => {
    setDatatableFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setDatatableFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  /* ================= STATUS TOGGLE ================= */

  const statusBodyTemplate = (row: StaffTemplate) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await staffTemplateApi.update(row.unique_id, {
          status: checked ? "ACTIVE" : "INACTIVE",
        });
        fetchTemplates();
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

  /* ================= ACTIONS ================= */

  const actionTemplate = (row: StaffTemplate) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: StaffTemplate, { rowIndex }: any) => rowIndex + 1;

  /* ================= HEADER ================= */

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.staff_template.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.staff_template.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.staff_template.create_button")}
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
            placeholder={t("admin.staff_template.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  /* ================= RENDER ================= */

  return (
    <div className="p-3">
      <DataTable
        value={templates}
        paginator
        rows={10}
        loading={loading}
        filters={datatableFilters}
        onFilter={onFilter}
        globalFilterFields={[
          "unique_id",
          "display_code",
          "driver_name",
          "operator_name",
          "status",
          "approval_status",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.staff_template.empty_message")}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />

        <Column
          field="unique_id"
          header={t("admin.staff_template.columns.template_id")}
          body={(r: StaffTemplate) => r.display_code ?? r.unique_id}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="driver_name"
          header={t("admin.staff_template.columns.primary_driver")}
          body={(r: StaffTemplate) => r.driver_name}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="operator_name"
          header={t("admin.staff_template.columns.primary_operator")}
          body={(r: StaffTemplate) => r.operator_name}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("admin.staff_template.columns.extra_staff")}
          body={(r: StaffTemplate) => r.extra_operator_id?.length ?? 0}
          style={{ width: 130 }}
        />

        <Column
          header={t("common.status")}
          body={statusBodyTemplate}
          style={{ width: 120 }}
        />

        <Column
          field="approval_status"
          header={t("admin.staff_template.columns.approval_status")}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("admin.staff_template.columns.created_at")}
          body={(r: StaffTemplate) => new Date(r.created_at).toLocaleDateString()}
        />

        <Column
          header={t("admin.staff_template.columns.updated_at")}
          body={(r: StaffTemplate) => new Date(r.updated_at).toLocaleDateString()}
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