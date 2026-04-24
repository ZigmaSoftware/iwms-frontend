// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Swal from "sweetalert2";
// import { useTranslation } from "react-i18next";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";

// import { alternativeStaffTemplateApi } from "@/helpers/admin";
// import { getEncryptedRoute } from "@/utils/routeCache";

// type AlternativeStaffTemplate = {
//   id: number;
//   unique_id: string;
//   display_code?: string;
//   staff_template: string;
//   staff_template_display_code?: string;
//   effective_date: string;
//   driver: string;
//   driver_name?: string;
//   operator: string;
//   operator_name?: string;
//   extra_operator?: string[] | null;
//   change_reason: string;
//   change_remarks?: string;
//   approval_status: string;
//   created_at: string;
// };

// export default function AlternativeStaffTemplateList() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();

//   const [records, setRecords] = useState<AlternativeStaffTemplate[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [datatableFilters, setDatatableFilters] = useState<any>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   const { encStaffMasters, encAlternativeStaffTemplate } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encStaffMasters}/${encAlternativeStaffTemplate}/new`;
//   const ENC_EDIT_PATH = (id: number) =>
//     `/${encStaffMasters}/${encAlternativeStaffTemplate}/${id}/edit`;

//   const fetchRecords = async () => {
//     setLoading(true);
//     try {
//       const payload: any = await alternativeStaffTemplateApi.list();
//       const data =
//         Array.isArray(payload)
//           ? payload
//           : Array.isArray(payload?.data)
//           ? payload.data
//           : payload?.data?.results ?? [];
//       setRecords(data);
//     } catch {
//       Swal.fire(t("common.error"), t("common.load_failed"), "error");
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
//     setDatatableFilters({
//       global: { value, matchMode: FilterMatchMode.CONTAINS },
//     });
//   };

//   const header = (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">
//             {t("admin.alternative_staff_template.list_title")}
//           </h1>
//           <p className="text-sm text-gray-500">
//             {t("admin.alternative_staff_template.list_subtitle")}
//           </p>
//         </div>

//         <Button
//           label={t("admin.alternative_staff_template.create_button")}
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
//             placeholder={t("admin.alternative_staff_template.search_placeholder")}
//             className="border-none text-sm"
//           />
//         </div>
//       </div>
//     </div>
//   );

//   const indexTemplate = (_: AlternativeStaffTemplate, { rowIndex }: any) =>
//     rowIndex + 1;

//   const actionTemplate = (row: AlternativeStaffTemplate) => (
//     <div className="flex justify-center">
//       <button
//         title={t("common.edit")}
//         onClick={() => navigate(ENC_EDIT_PATH(row.id), { state: { record: row } })}
//         className="text-blue-600 hover:text-blue-800"
//       >
//         <i className="pi pi-pencil" />
//       </button>
//     </div>
//   );

//   return (
//     <div className="p-3">
//       <DataTable
//         value={records}
//         paginator
//         rows={10}
//         loading={loading}
//         filters={datatableFilters}
//         globalFilterFields={[
//           "unique_id",
//           "display_code",
//           "staff_template",
//           "staff_template_display_code",
//           "driver",
//           "driver_name",
//           "operator",
//           "operator_name",
//           "change_reason",
//           "approval_status",
//         ]}
//         header={header}
//         stripedRows
//         showGridlines
//         className="p-datatable-sm"
//         emptyMessage={t("admin.alternative_staff_template.empty_message")}
//       >
//         <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />
//         <Column 
//           header={t("admin.alternative_staff_template.columns.template_id")} 
//           body={(row: AlternativeStaffTemplate) =>
//             row.display_code ?? row.unique_id
//           }
//           sortable 
//         />
//         <Column
//           header={t("admin.alternative_staff_template.columns.staff_template")}
//           body={(row: AlternativeStaffTemplate) =>
//             row.staff_template_display_code ?? row.staff_template
//           }
//         />
//         <Column field="effective_date" header={t("admin.alternative_staff_template.columns.effective_date")} />
//         <Column
//           header={t("admin.alternative_staff_template.columns.driver")}
//           body={(row: AlternativeStaffTemplate) => row.driver_name ?? row.driver}
//         />
//         <Column
//           header={t("admin.alternative_staff_template.columns.operator")}
//           body={(row: AlternativeStaffTemplate) => row.operator_name ?? row.operator}
//         />
//         <Column
//           header={t("admin.alternative_staff_template.columns.extra_operator")}
//           body={(row: AlternativeStaffTemplate) =>
//             Array.isArray(row.extra_operator)
//               ? row.extra_operator.length
//               : row.extra_operator
//               ? 1
//               : 0
//           }
//         />
//         <Column field="change_reason" header={t("admin.alternative_staff_template.columns.change_reason")} />
//         <Column field="approval_status" header={t("admin.alternative_staff_template.columns.approval_status")} />
//         <Column
//           header={t("common.created_at")}
//           body={(r: AlternativeStaffTemplate) =>
//             r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"
//           }
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

import { useAlternativeStaffTemplateList } from "@/tanstack/admin/queries/masters/alternativeStaffTemplate";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type AlternativeStaffTemplate = {
  id: number;
  unique_id: string;
  display_code?: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  staff_template: string;
  staff_template_display_code?: string;
  effective_date: string;
  driver: string;
  driver_name?: string;
  operator: string;
  operator_name?: string;
  extra_operator?: string[] | null;
  change_reason: string;
  change_remarks?: string;
  approval_status: string;
  created_at: string;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  effective_date: { value: string | null; matchMode: FilterMatchMode };
  driver_name: { value: string | null; matchMode: FilterMatchMode };
  operator_name: { value: string | null; matchMode: FilterMatchMode };
  change_reason: { value: string | null; matchMode: FilterMatchMode };
  approval_status: { value: string | null; matchMode: FilterMatchMode };
};

export default function AlternativeStaffTemplateList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const [records, setRecords] = useState<AlternativeStaffTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [datatableFilters, setDatatableFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    effective_date: { value: null, matchMode: FilterMatchMode.CONTAINS },
    driver_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    operator_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    change_reason: { value: null, matchMode: FilterMatchMode.CONTAINS },
    approval_status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encStaffMasters, encAlternativeStaffTemplate } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encAlternativeStaffTemplate}/new`;
  const ENC_EDIT_PATH = (id: number) =>
    `/${encStaffMasters}/${encAlternativeStaffTemplate}/${id}/edit`;

  const params =
    companyUniqueId
      ? {
          company_id: companyUniqueId,
          ...(projectId ? { project_id: projectId } : {}),
        }
      : undefined;
  const recordsQuery = useAlternativeStaffTemplateList(params);

  const normalizeId = (value: unknown): string =>
    value === null || value === undefined ? "" : String(value).trim();

  const fetchRecords = async () => {
    if (isSuperAdmin && companies.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const payload: any = recordsQuery.data;
      const data =
        Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
          ? payload.data
          : payload?.data?.results ?? [];
      const rows = data as AlternativeStaffTemplate[];

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setRecords(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setRecords(filtered);
    } catch {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId, recordsQuery.data]);

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

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.alternative_staff_template.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.alternative_staff_template.list_subtitle")}
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
            label={t("admin.alternative_staff_template.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.alternative_staff_template.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  const indexTemplate = (_: AlternativeStaffTemplate, { rowIndex }: any) =>
    rowIndex + 1;

  const actionTemplate = (row: AlternativeStaffTemplate) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.id), { state: { record: row } })}
        className="text-blue-600 hover:text-blue-800"
      >
        <i className="pi pi-pencil" />
      </button>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={records}
        paginator
        rows={10}
        loading={loading}
        filters={datatableFilters}
        onFilter={onFilter}
        globalFilterFields={[
          "unique_id",
          "display_code",
          "staff_template",
          "staff_template_display_code",
          "driver",
          "driver_name",
          "operator",
          "operator_name",
          "change_reason",
          "approval_status",
          "company_name",
          "project_name",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.alternative_staff_template.empty_message")}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />

        <Column
          header={t("admin.alternative_staff_template.columns.template_id")}
          body={(row: AlternativeStaffTemplate) => row.display_code ?? row.unique_id}
          sortable
        />

        <Column
          header={t("admin.alternative_staff_template.columns.staff_template")}
          body={(row: AlternativeStaffTemplate) =>
            row.staff_template_display_code ?? row.staff_template
          }
        />

        <Column
          field="effective_date"
          header={t("admin.alternative_staff_template.columns.effective_date")}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="driver_name"
          header={t("admin.alternative_staff_template.columns.driver")}
          body={(row: AlternativeStaffTemplate) => row.driver_name ?? row.driver}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="operator_name"
          header={t("admin.alternative_staff_template.columns.operator")}
          body={(row: AlternativeStaffTemplate) => row.operator_name ?? row.operator}
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("admin.alternative_staff_template.columns.extra_operator")}
          body={(row: AlternativeStaffTemplate) =>
            Array.isArray(row.extra_operator)
              ? row.extra_operator.length
              : row.extra_operator
              ? 1
              : 0
          }
        />

        <Column
          field="change_reason"
          header={t("admin.alternative_staff_template.columns.change_reason")}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="approval_status"
          header={t("admin.alternative_staff_template.columns.approval_status")}
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("common.created_at")}
          body={(r: AlternativeStaffTemplate) =>
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
