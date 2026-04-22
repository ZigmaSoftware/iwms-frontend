// import { type ChangeEvent, useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { staffCreationApi } from "@/helpers/admin";
// import Swal from "sweetalert2";
// import ReactDOM from "react-dom/client";

// import { DataTable } from "@/components/common/SafeDataTable";
// import { Column } from "primereact/column";
// import { Button } from "primereact/button";
// import { InputText } from "primereact/inputtext";
// import { FilterMatchMode } from "primereact/api";
// import QRCode from "react-qr-code";
// import { useTranslation } from "react-i18next";

// import { PencilIcon, TrashBinIcon } from "@/icons";
// import { getEncryptedRoute } from "@/utils/routeCache";

// import { Switch } from "@/components/ui/switch";

// type Staff = {
//   unique_id: number;
//   employee_name: string;
//   staff_unique_id: string;
//   designation?: string;
//   doj?: string;
//   site_name?: string;
//   active_status: boolean;
//   salary_type?: string;
//  contact_mobile?: number;
//   department?: string;
// };

// const cap = (val?: string | number | null) => {
//   if (val === undefined || val === null || val === "") return "";
//   const s = String(val);
//   return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
// };

// export default function StaffCreationList() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();
//   const [staffs, setStaffs] = useState<Staff[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [filterParams, setFilterParams] = useState({
//     salary_type: "",
//     active_status: "",
//     site_name: "",
//     employee_name: "",
//   });

//   const [globalFilterValue, setGlobalFilterValue] = useState("");
//   const [datatableFilters, setDatatableFilters] = useState<any>({
//     global: { value: null, matchMode: FilterMatchMode.CONTAINS },
//   });

//   const { encStaffMasters, encStaffCreation } = getEncryptedRoute();
//   const ENC_NEW_PATH = `/${encStaffMasters}/${encStaffCreation}/new`;
//   const ENC_EDIT_PATH = (unique_id: number) =>
//     `/${encStaffMasters}/${encStaffCreation}/${unique_id}/edit`;

//   const globalFilterFields = [
//     "employee_name",
//     "employee_id",
//     "designation",
//     "site_name",
//     "contact_mobile",
//   ];

//   const fetchStaffs = async (params = filterParams) => {
//     // setLoading(true);
//     try {
//       const payload: any = await staffCreationApi.list({ params });
//       const data = Array.isArray(payload)
//         ? payload
//         : Array.isArray(payload?.data)
//           ? payload.data
//           : payload?.data?.results ?? [];
//       setStaffs(data);
//       console.log("Fetched staffs:", data);
//     } catch (err) {
//       Swal.fire(t("common.error"), t("common.load_failed"), "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStaffs(filterParams);
//   }, []);

//   const applyFilter = () => fetchStaffs(filterParams);

//   const handleFilterChange = (
//     ev: ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = ev.target;
//     setFilterParams((prev) => ({ ...prev, [name]: value }));
//   };

//   const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
//     const updated = { ...datatableFilters };
//     updated.global.value = e.target.value;
//     setGlobalFilterValue(e.target.value);
//     setDatatableFilters(updated);
//   };

//   const handleDelete = async (id: number) => {
//     const confirm = await Swal.fire({
//       title: t("common.confirm_title"),
//       text: t("admin.staff_creation.delete_confirm"),
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonColor: "#d33",
//     });

//     if (!confirm.isConfirmed) return;

//     try {
//       await staffCreationApi.remove(id);
//       Swal.fire(t("common.deleted_success"), t("common.record_removed"), "success");
//       fetchStaffs(filterParams);
//     } catch (err) {
//       Swal.fire(t("common.error"), t("admin.staff_creation.delete_failed"), "error");
//     }
//   };

 
//   const statusTemplate = (row: Staff) => {
//     const updateStatus = async (value: boolean) => {
//       try {
//         const formData = new FormData();
//         formData.append("active_status", String(value));

//         await staffCreationApi.update(row.unique_id, formData, {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         });

//         fetchStaffs(filterParams);
//       } catch (err) {
//         Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
//       }
//     };

//     return (
//       <Switch
//         checked={row.active_status}
//         onCheckedChange={updateStatus}
//       />
//     );
//   };

//   const buildStaffQrPayload = (row: Staff) => ({
//     id: row.staff_unique_id || row.unique_id,
//     name: row.employee_name,
//     designation: row.designation || "-",
//     site: row.site_name || "-",
//     status: row.active_status ? t("common.active") : t("common.inactive"),
//     contact: row.contact_mobile || "-",
//   });

//   const openQrPopup = (data: any) => {
//     Swal.fire({
//       title: t("admin.staff_creation.qr_title"),
//       html: `<div id="staff-qr-holder" class="flex justify-center"></div>`,
//       width: 350,
//       didOpen: () => {
//         const div = document.getElementById("staff-qr-holder");
//         if (div) {
//           const root = ReactDOM.createRoot(div);
//           root.render(<QRCode value={JSON.stringify(data)} size={200} />);
//         }
//       },
//     });
//   };

//   const qrTemplate = (row: Staff) => {
//     const payload = buildStaffQrPayload(row);
//     return (
//       <button
//         className="p-1 border rounded hover:bg-gray-50 flex justify-center"
//         onClick={() => openQrPopup(payload)}
//         title={t("admin.staff_creation.qr_show")}
//       >
//         <QRCode value={JSON.stringify(payload)} size={48} />
//       </button>
//     );
//   };

//   const actionTemplate = (row: Staff) => (
//     <div className="flex gap-3 justify-center">
//       <button
//         title={t("common.edit")}
//         onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
//         className="text-blue-600 hover:text-blue-800"
//       >
//         <PencilIcon className="size-5" />
//       </button>

//       {/* <button
//         title="Delete"
//         onClick={() => handleDelete(row.unique_id)}
//         className="text-red-600 hover:text-red-800"
//       >
//         <TrashBinIcon className="size-5" />
//       </button> */}
//     </div>
//   );

//   const indexTemplate = (_: Staff, { rowIndex }: { rowIndex: number }) =>
//     rowIndex + 1;

//   const header = (
//     <div className="space-y-4">
//       <div className="flex flex-wrap items-start justify-between gap-3">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">
//             {t("admin.staff_creation.title")}
//           </h1>
//           <p className="text-sm text-gray-500">
//             {t("admin.staff_creation.subtitle")}
//           </p>
//         </div>

//         <div className="flex flex-wrap gap-2">
//           <Button
//             label={t("admin.staff_creation.create")}
//             icon="pi pi-plus"
//             className="p-button-success p-button-sm"
//             onClick={() => navigate(ENC_NEW_PATH)}
//           />
//         </div>
//       </div>

//       {/* Filters Row */}
//       <div className="grid gap-3 md:grid-cols-5">
//         <div className="flex flex-col gap-1">
//           <span className="text-xs font-semibold">
//             {t("admin.staff_creation.salary_type")}
//           </span>
//           <select
//             name="salary_type"
//             value={filterParams.salary_type}
//             onChange={handleFilterChange}
//             className="h-10 rounded-lg border px-3 text-sm"
//           >
//             <option value="">{t("common.all")}</option>
//             <option value="Monthly">{t("admin.staff_creation.salary_monthly")}</option>
//             <option value="Daily">{t("admin.staff_creation.salary_daily")}</option>
//             <option value="Contract">{t("admin.staff_creation.salary_contract")}</option>
//           </select>
//         </div>

//         <div className="flex flex-col gap-1">
//           <span className="text-xs font-semibold">{t("common.status")}</span>
//           <select
//             name="active_status"
//             value={filterParams.active_status}
//             onChange={handleFilterChange}
//             className="h-10 rounded-lg border px-3 text-sm"
//           >
//             <option value="">{t("common.all")}</option>
//             <option value="1">{t("common.active")}</option>
//             <option value="0">{t("common.inactive")}</option>
//           </select>
//         </div>

//         <div className="flex flex-col gap-1">
//           <span className="text-xs font-semibold">
//             {t("admin.staff_creation.site_name")}
//           </span>
//           <input
//             name="site_name"
//             value={filterParams.site_name}
//             onChange={handleFilterChange}
//             placeholder={t("admin.staff_creation.site_placeholder")}
//             className="h-10 rounded-lg border px-3 text-sm"
//           />
//         </div>

//         <div className="flex flex-col gap-1">
//           <span className="text-xs font-semibold">
//             {t("admin.staff_creation.employee_name")}
//           </span>
//           <input
//             name="employee_name"
//             value={filterParams.employee_name}
//             onChange={handleFilterChange}
//             placeholder={t("admin.staff_creation.employee_placeholder")}
//             className="h-10 rounded-lg border px-3 text-sm"
//           />
//         </div>

//         <div className="flex items-end">
//           <button
//             onClick={applyFilter}
//             className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
//           >
//             {t("common.go")}
//           </button>
//         </div>
//       </div>

//       {/* Search Bar */}
//       <div className="flex justify-end">
//         <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
//           <i className="pi pi-search text-gray-500" />
//           <InputText
//             value={globalFilterValue}
//             onChange={onGlobalFilterChange}
//             placeholder={t("admin.staff_creation.search_placeholder")}
//             className="border-none text-sm"
//           />
//         </div>
//       </div>
//     </div>
//   );

//   return (
//     <>
//       <div className="p-3">
      
//           <DataTable
//             value={staffs}
//             paginator
//             rows={10}
//             loading={loading}
//             filters={datatableFilters}
//             globalFilterFields={globalFilterFields}
//             header={header}
//             emptyMessage={t("common.no_items_found", {
//               item: t("admin.staff_creation.staff_label"),
//             })}
//             stripedRows
//             showGridlines
//             className="p-datatable-sm"
//           >
//             <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />
//             <Column field="unique_id" header={t("admin.staff_creation.zigma_id")} sortable
//               body={(row: Staff) => cap(row.unique_id)}
            
//             />
//             <Column
//               field="employee_name"
//               header={t("admin.staff_creation.employee_name")}
//               sortable
//               body={(row: Staff) => cap(row.employee_name)}
//             />
//             <Column field="designation" header={t("admin.staff_creation.designation")} sortable />
//             <Column field="doj" header={t("admin.staff_creation.doj")} sortable />
//             <Column field="site_name" header={t("admin.staff_creation.site_name")} sortable />
//             <Column
//               header={t("admin.staff_creation.contact")}
//               body={(row: Staff) => row.contact_mobile || "-"}
//             />

//             {/* Toggle with FormData */}
//             <Column
//               header={t("common.status")}
//               body={statusTemplate}
//               style={{ width: 120 }}
//             />

//             <Column header={t("admin.staff_creation.qr_label")} body={qrTemplate} style={{ width: 120 }} />

//             <Column header={t("common.actions")} body={actionTemplate} style={{ width: 140 }} />
//           </DataTable>
    
//       </div>
//     </>
//   );
// }



import { type ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { staffCreationApi } from "@/helpers/admin";
import {
  useStaffCreationList,
  useUpdateStaff,
  useDeleteStaff,
} from "@/tanstack/admin/queries/masters/staffCreation";
import Swal from "sweetalert2";
import ReactDOM from "react-dom/client";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type Staff = {
  unique_id: number;
  employee_name: string;
  staff_unique_id: string;
  designation?: string;
  doj?: string;
  site_name?: string;
  active_status: boolean;
  salary_type?: string;
  contact_mobile?: number;
  department?: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  employee_name: { value: string | null; matchMode: FilterMatchMode };
  designation: { value: string | null; matchMode: FilterMatchMode };
  doj: { value: string | null; matchMode: FilterMatchMode };
  site_name: { value: string | null; matchMode: FilterMatchMode };
};

const cap = (val?: string | number | null) => {
  if (val === undefined || val === null || val === "") return "";
  const s = String(val);
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function StaffCreationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const [filterParams, setFilterParams] = useState({
    salary_type: "",
    active_status: "",
    site_name: "",
    employee_name: "",
  });

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [datatableFilters, setDatatableFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    employee_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    designation: { value: null, matchMode: FilterMatchMode.CONTAINS },
    doj: { value: null, matchMode: FilterMatchMode.CONTAINS },
    site_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encStaffMasters, encStaffCreation } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encStaffCreation}/new`;
  const ENC_EDIT_PATH = (unique_id: number) =>
    `/${encStaffMasters}/${encStaffCreation}/${unique_id}/edit`;

  const globalFilterFields = [
    "employee_name",
    "employee_id",
    "designation",
    "site_name",
    "contact_mobile",
    "company_name",
    "project_name",
  ];

  const updateMutation = useUpdateStaff();
  const deleteMutation = useDeleteStaff();

  const requestParams = {
    salary_type: filterParams.salary_type,
    active_status: filterParams.active_status,
    site_name: filterParams.site_name,
    employee_name: filterParams.employee_name,
    company_id: companyUniqueId,
    ...(projectId ? { project_id: projectId } : {}),
  };

  const { data: rawData, isLoading } = useStaffCreationList(requestParams.company_id ? requestParams : undefined);

  useEffect(() => {
    const load = async () => {
      if (isSuperAdmin && companies.length === 0) {
        setStaffs([]);
        setLoading(false);
        return;
      }

      if (!companyUniqueId) {
        setStaffs([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const payload: any = rawData ?? [];
        const data = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : payload?.data?.results ?? [];
        const rows = data as Staff[];

        const hasContextFields = rows.some((row) => {
          const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
          const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
          return Boolean(rowCompanyId || rowProjectId);
        });

        if (!hasContextFields) {
          setStaffs(rows);
          return;
        }

        const filtered = rows.filter((row) => {
          const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
          const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

          const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
          const projectMatches = !projectId || rowProjectId === projectId;

          return companyMatches && projectMatches;
        });

        setStaffs(filtered);
      } catch (err) {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [rawData, companyUniqueId, companies.length, isSuperAdmin, projectId]);

  const applyFilter = () => fetchStaffs(filterParams);

  const handleFilterChange = (
    ev: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = ev.target;
    setFilterParams((prev) => ({ ...prev, [name]: value }));
  };

  const onFilter = (e: DataTableFilterEvent) => {
    setDatatableFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const updated = { ...datatableFilters };
    updated.global.value = e.target.value;
    setGlobalFilterValue(e.target.value);
    setDatatableFilters(updated);
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("admin.staff_creation.delete_confirm"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
      Swal.fire(t("common.deleted_success"), t("common.record_removed"), "success");
    } catch (err) {
      Swal.fire(t("common.error"), t("admin.staff_creation.delete_failed"), "error");
    }
  };

  const statusTemplate = (row: Staff) => {
    const updateStatus = async (value: boolean) => {
      try {
        const formData = new FormData();
        formData.append("active_status", String(value));

        await updateMutation.mutateAsync({ id: row.unique_id, payload: formData });
      } catch (err) {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return (
      <Switch checked={row.active_status} onCheckedChange={updateStatus} />
    );
  };

  const buildStaffQrPayload = (row: Staff) => ({
    id: row.staff_unique_id || row.unique_id,
    name: row.employee_name,
    designation: row.designation || "-",
    site: row.site_name || "-",
    status: row.active_status ? t("common.active") : t("common.inactive"),
    contact: row.contact_mobile || "-",
  });

  const openQrPopup = (data: any) => {
    Swal.fire({
      title: t("admin.staff_creation.qr_title"),
      html: `<div id="staff-qr-holder" class="flex justify-center"></div>`,
      width: 350,
      didOpen: () => {
        const div = document.getElementById("staff-qr-holder");
        if (div) {
          const root = ReactDOM.createRoot(div);
          root.render(<QRCode value={JSON.stringify(data)} size={200} />);
        }
      },
    });
  };

  const qrTemplate = (row: Staff) => {
    const payload = buildStaffQrPayload(row);
    return (
      <button
        className="p-1 border rounded hover:bg-gray-50 flex justify-center"
        onClick={() => openQrPopup(payload)}
        title={t("admin.staff_creation.qr_show")}
      >
        <QRCode value={JSON.stringify(payload)} size={48} />
      </button>
    );
  };

  const actionTemplate = (row: Staff) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Staff, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const header = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.staff_creation.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.staff_creation.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="h-10 rounded-lg border px-3 text-sm"
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
            className="h-10 rounded-lg border px-3 text-sm"
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
            label={t("admin.staff_creation.create")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid gap-3 md:grid-cols-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">
            {t("admin.staff_creation.salary_type")}
          </span>
          <select
            name="salary_type"
            value={filterParams.salary_type}
            onChange={handleFilterChange}
            className="h-10 rounded-lg border px-3 text-sm"
          >
            <option value="">{t("common.all")}</option>
            <option value="Monthly">{t("admin.staff_creation.salary_monthly")}</option>
            <option value="Daily">{t("admin.staff_creation.salary_daily")}</option>
            <option value="Contract">{t("admin.staff_creation.salary_contract")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">{t("common.status")}</span>
          <select
            name="active_status"
            value={filterParams.active_status}
            onChange={handleFilterChange}
            className="h-10 rounded-lg border px-3 text-sm"
          >
            <option value="">{t("common.all")}</option>
            <option value="1">{t("common.active")}</option>
            <option value="0">{t("common.inactive")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">
            {t("admin.staff_creation.site_name")}
          </span>
          <input
            name="site_name"
            value={filterParams.site_name}
            onChange={handleFilterChange}
            placeholder={t("admin.staff_creation.site_placeholder")}
            className="h-10 rounded-lg border px-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold">
            {t("admin.staff_creation.employee_name")}
          </span>
          <input
            name="employee_name"
            value={filterParams.employee_name}
            onChange={handleFilterChange}
            placeholder={t("admin.staff_creation.employee_placeholder")}
            className="h-10 rounded-lg border px-3 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={applyFilter}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("common.go")}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.staff_creation.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-3">
        <DataTable
          value={staffs}
          paginator
          rows={10}
          loading={loading}
          filters={datatableFilters}
          onFilter={onFilter}
          globalFilterFields={globalFilterFields}
          header={header}
          emptyMessage={t("common.no_items_found", {
            item: t("admin.staff_creation.staff_label"),
          })}
          stripedRows
          showGridlines
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />

          <Column
            field="unique_id"
            header={t("admin.staff_creation.zigma_id")}
            sortable
            body={(row: Staff) => cap(row.unique_id)}
          />

          <Column
            field="employee_name"
            header={t("admin.staff_creation.employee_name")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: Staff) => cap(row.employee_name)}
          />

          <Column
            field="designation"
            header={t("admin.staff_creation.designation")}
            sortable
            filter
            showFilterMatchModes={false}
          />

          <Column
            field="doj"
            header={t("admin.staff_creation.doj")}
            sortable
            filter
            showFilterMatchModes={false}
          />

          <Column
            field="site_name"
            header={t("admin.staff_creation.site_name")}
            sortable
            filter
            showFilterMatchModes={false}
          />

          <Column
            header={t("admin.staff_creation.contact")}
            body={(row: Staff) => row.contact_mobile || "-"}
          />

          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: 120 }}
          />

          <Column
            header={t("admin.staff_creation.qr_label")}
            body={qrTemplate}
            style={{ width: 120 }}
          />

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: 140 }}
          />
        </DataTable>
      </div>
    </>
  );
}
