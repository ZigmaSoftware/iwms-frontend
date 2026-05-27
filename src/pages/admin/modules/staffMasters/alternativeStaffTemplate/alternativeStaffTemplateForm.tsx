// import { useEffect, useState, useRef } from "react";
// import type { FormEvent } from "react";
// import { useNavigate, useParams, useLocation} from "react-router-dom";
// import Swal from "sweetalert2";
// import { useTranslation } from "react-i18next";
// import { MultiSelect } from "primereact/multiselect";

// import ComponentCard from "@/components/common/ComponentCard";
// import Label from "@/components/form/Label";
// import Select from "@/components/form/Select";
// import InputField from "@/components/form/input/InputField";

// import { getEncryptedRoute } from "@/utils/routeCache";
// import { useFieldVisibility } from "@/hooks/useFieldVisibility";
// import {
//   useAlternativeStaffTemplateQuery,
//   useCreateAlternativeStaffTemplate,
//   useUpdateAlternativeStaffTemplate,
// } from "@/tanstack/admin/queries/masters/alternativeStaffTemplate";
// import { useStaffCreationList } from "@/tanstack/admin/queries/masters/staffCreation";
// import {
//   useStaffTemplateList,
//   useStaffTemplateQuery,
// } from "@/tanstack/admin/queries/masters/staffTemplate";
// import { companyApi, projectApi } from "@/helpers/admin";

// type Option = { value: string; label: string };
// type StaffRecord = {
//   unique_id?: string;
//   company_id?: string;
//   project_id?: string;
//   staff_name?: string;
//   employee_name?: string;
//   username?: string;
//   user_type_name?: string;
//   staffusertype_name?: string;
//   designation?: string;
//   is_active?: boolean;
//   is_deleted?: boolean;
//   active_status?: boolean | number | string | null;
//   company_name?: string;
//   project_name?: string;
// };

// type FormState = {
//   staff_template: string;
//   effective_date: string;
//   driver: string;
//   operator: string;
//   extra_operator: string[];
//   change_reason: string;
//   change_remarks: string;
//   approval_status?: string;
//   display_code?: string;
// };

// const initialFormState: FormState = {
//   staff_template: "",
//   effective_date: "",
//   driver: "",
//   operator: "",
//   extra_operator: [],
//   change_reason: "",
//   change_remarks: "",
// };

// const ALTERNATIVE_STAFF_TEMPLATE_FIELDS: Record<string, string[]> = {
//   staff_template: ["staff_template", "staff_template_id"],
//   effective_date: ["effective_date"],
//   company_id: ["company_id", "company"],
//   project_id: ["project_id", "project"],
//   driver: ["driver", "driver_id"],
//   operator: ["operator", "operator_id"],
//   extra_operator: ["extra_operator", "extra_operator_id", "extra_staff"],
//   change_reason: ["change_reason"],
//   change_remarks: ["change_remarks", "remarks"],
//   approval_status: ["approval_status"],
//   display_code: ["display_code"],
// };

// export default function AlternativeStaffTemplateForm() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();
//   const { id } = useParams<{ id?: string }>();
//   const isEdit = Boolean(id);
//   const { showField, filterPayload } = useFieldVisibility(
//     "staff-masters",
//     "alternative-staff-template",
//     ALTERNATIVE_STAFF_TEMPLATE_FIELDS
//   );

//   const [formData, setFormData] = useState<FormState>(initialFormState);
//   const [loading, setLoading] = useState(false);

//   const [staffTemplateOptions, setStaffTemplateOptions] = useState<Option[]>([]);
//   const [driverOptions, setDriverOptions] = useState<Option[]>([]);
//   const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
//   const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
//   const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
//   const [projectOptions, setProjectOptions] = useState<Option[]>([]);
//   const [allProjects, setAllProjects] = useState<any[]>([]);
//   const [selectedCompanyId, setSelectedCompanyId] = useState("");
//   const [selectedProjectId, setSelectedProjectId] = useState("");

//   const templateSelectedByUser = useRef(false);
//   // Tracks whether the edit form data has been fully loaded at least once.
//   // Prevents the validation useEffect from wiping saved values before options load.
//   const editDataLoaded = useRef(false);

//   const { encStaffMasters, encAlternativeStaffTemplate } = getEncryptedRoute();
//   const ENC_LIST_PATH = `/${encStaffMasters}/${encAlternativeStaffTemplate}`;

//   const staffTemplatesQuery = useStaffTemplateList();
//   const staffCreationQuery = useStaffCreationList({ active_status: 1 });
//   const alternativeTemplateQuery = useAlternativeStaffTemplateQuery(id);
//   const selectedStaffTemplateQuery = useStaffTemplateQuery(
//     formData.staff_template || null
//   );
//   const createMutation = useCreateAlternativeStaffTemplate();
//   const updateMutation = useUpdateAlternativeStaffTemplate();

//   const normalizeRole = (value: unknown) =>
//     String(value ?? "").trim().toLowerCase();

//   const normalizeActiveStatus = (value: StaffRecord["active_status"]): boolean => {
//     if (typeof value === "boolean") return value;
//     const normalized = String(value ?? "").trim().toLowerCase();
//     return normalized === "1" || normalized === "true" || normalized === "active";
//   };

//   const getStaffRole = (staff: StaffRecord): string =>
//     normalizeRole(staff.staffusertype_name ?? staff.designation);

//   const isStaffRow = (staff: StaffRecord): boolean => {
//     const userType = normalizeRole(staff.user_type_name);
//     return !userType || userType === "staff";
//   };

//   const isActiveStaff = (staff: StaffRecord): boolean => {
//     if (staff.is_deleted === true) return false;
//     if (typeof staff.is_active === "boolean") return staff.is_active;
//     return normalizeActiveStatus(staff.active_status);
//   };

//   const getStaffDisplayName = (staff: StaffRecord): string =>
//     String(
//       staff.employee_name ?? staff.staff_name ?? staff.username ?? staff.unique_id ?? ""
//     ).trim();

//   const toText = (value: unknown): string => String(value ?? "").trim();

//   const getCompanyId = (staff: StaffRecord): string =>
//     toText(staff.company_id) || toText(staff.company_name);

//   const getProjectId = (staff: StaffRecord): string =>
//     toText(staff.project_id) || toText(staff.project_name);

//   const getCompanyProjectLabel = (staff: StaffRecord): string => {
//     const company = String(staff.company_name ?? "").trim();
//     const project = String(staff.project_name ?? "").trim();
//     if (company && project) return `${company} / ${project}`;
//     return company || project;
//   };

//   const toStaffOption = (staff: StaffRecord): Option => {
//     const baseLabel = getStaffDisplayName(staff);
//     const companyProject = getCompanyProjectLabel(staff);
//     return {
//       value: String(staff.unique_id ?? ""),
//       label: companyProject ? `${baseLabel} (${companyProject})` : baseLabel,
//     };
//   };

//   /* ============================
//      LOAD COMPANIES & PROJECTS FROM API
//   ============================ */

//   useEffect(() => {
//     Promise.all([companyApi.list(), projectApi.list()])
//       .then(([companiesRes, projectsRes]) => {
//         const companiesData = Array.isArray(companiesRes)
//           ? companiesRes
//           : Array.isArray(companiesRes?.data)
//             ? companiesRes.data
//             : [];

//         const normalizedCompanies = companiesData
//           .filter((c: any) => c?.is_active !== false && c?.is_deleted !== true)
//           .map((c: any) => ({
//             value: String(c?.unique_id ?? c?.id ?? ""),
//             label: c?.name ?? "",
//           }))
//           .filter((opt: Option) => opt.value && opt.label);

//         setCompanyOptions(normalizedCompanies);
//         setSelectedCompanyId((prev) => {
//           if (prev && normalizedCompanies.some((opt) => opt.value === prev)) return prev;
//           return normalizedCompanies[0]?.value ?? "";
//         });

//         const projectsData = Array.isArray(projectsRes)
//           ? projectsRes
//           : Array.isArray(projectsRes?.data)
//             ? projectsRes.data
//             : [];

//         const normalizedProjects = projectsData
//           .filter((p: any) => p?.is_active !== false && p?.is_deleted !== true)
//           .map((p: any) => ({
//             value: String(p?.unique_id ?? p?.id ?? ""),
//             label: p?.name ?? "",
//             company_id: p?.company_unique_id ?? p?.company_id,
//           }))
//           .filter((opt: any) => opt.value && opt.label);

//         setAllProjects(normalizedProjects);
//       })
//       .catch(() => {
//         Swal.fire(t("common.error"), t("common.load_failed"), "error");
//       });
//   }, [t]);

//   /* ============================
//      LOAD STAFF + TEMPLATE OPTIONS
//   ============================ */

//   useEffect(() => {
//     const templatesPayload: any = staffTemplatesQuery.data;
//     const templateRows = Array.isArray(templatesPayload)
//       ? templatesPayload
//       : templatesPayload?.data ?? [];

//     setStaffTemplateOptions(
//       templateRows.map((tpl: any) => ({
//         value: String(tpl.unique_id),
//         label: tpl.display_code ?? tpl.unique_id,
//       }))
//     );

//     const staffPayload: any = staffCreationQuery.data;
//     const data = Array.isArray(staffPayload)
//       ? staffPayload
//       : Array.isArray(staffPayload?.results)
//         ? staffPayload.results
//         : Array.isArray(staffPayload?.data?.results)
//           ? staffPayload.data.results
//           : Array.isArray(staffPayload?.data)
//             ? staffPayload.data
//             : [];

//     const staff = data.filter(
//       (u: StaffRecord) => isStaffRow(u) && isActiveStaff(u) && u.unique_id
//     );

//     setStaffRecords(staff);
//   }, [staffCreationQuery.data, staffTemplatesQuery.data]);

//   /* ============================
//      FILTER PROJECTS BY SELECTED COMPANY
//   ============================ */

//   useEffect(() => {
//     const filtered = selectedCompanyId
//       ? allProjects.filter(
//           (p: any) => !p.company_id || p.company_id === selectedCompanyId
//         )
//       : allProjects;

//     setProjectOptions(filtered);
//     setSelectedProjectId((prev) => {
//       if (prev && filtered.some((opt) => opt.value === prev)) return prev;
//       return filtered[0]?.value ?? "";
//     });
//   }, [selectedCompanyId, allProjects]);

//   /* ============================
//      FILTER DRIVERS & OPERATORS BY COMPANY + PROJECT
//   ============================ */

//   useEffect(() => {
//     const scopedStaff = staffRecords.filter((staff) => {
//       const companyMatch =
//         !selectedCompanyId || getCompanyId(staff) === selectedCompanyId;
//       const projectMatch =
//         !selectedProjectId || getProjectId(staff) === selectedProjectId;
//       return companyMatch && projectMatch;
//     });

//     setDriverOptions(
//       scopedStaff
//         .filter((staff) => getStaffRole(staff) === "company driver")
//         .map((staff) => toStaffOption(staff))
//     );

//     setOperatorOptions(
//       scopedStaff
//         .filter((staff) => getStaffRole(staff) === "company operator")
//         .map((staff) => toStaffOption(staff))
//     );
//   }, [selectedCompanyId, selectedProjectId, staffRecords]);

//   /* ============================
//      EDIT MODE — load saved values
//   ============================ */

//   useEffect(() => {
//     if (!isEdit || !id || staffRecords.length === 0) return;

//     const rec: any = alternativeTemplateQuery.data;
//     if (!rec) return;

//     setLoading(true);
//     templateSelectedByUser.current = false;

//     // Find the saved driver to derive company/project scope
//     const matchedStaff =
//       staffRecords.find(
//         (staff) => String(staff.unique_id) === String(rec.driver ?? "")
//       ) ??
//       staffRecords.find(
//         (staff) => String(staff.unique_id) === String(rec.operator ?? "")
//       );

//     if (matchedStaff) {
//       setSelectedCompanyId(getCompanyId(matchedStaff));
//       setSelectedProjectId(getProjectId(matchedStaff));
//     }

//     setFormData({
//       staff_template: String(rec.staff_template ?? ""),
//       effective_date: rec.effective_date ?? "",
//       driver: String(rec.driver ?? ""),
//       operator: String(rec.operator ?? ""),
//       extra_operator: Array.isArray(rec.extra_operator)
//         ? rec.extra_operator.map(String)
//         : [],
//       change_reason: rec.change_reason ?? "",
//       change_remarks: rec.change_remarks ?? "",
//       approval_status: rec.approval_status,
//       display_code: rec.display_code,
//     });

//     // Mark edit data as loaded so validation won't wipe values
//     editDataLoaded.current = true;

//     setLoading(false);
//   }, [alternativeTemplateQuery.data, id, isEdit, staffRecords]);

//   useEffect(() => {
//     if (!alternativeTemplateQuery.isError) return;
//     Swal.fire(t("common.error"), t("common.load_failed"), "error");
//     setLoading(false);
//   }, [alternativeTemplateQuery.isError, t]);

//   /* ============================
//      AUTO FILL FROM TEMPLATE (create mode only)
//   ============================ */

//   useEffect(() => {
//     if (!templateSelectedByUser.current || !formData.staff_template) return;
//     const tpl: any = selectedStaffTemplateQuery.data;
//     if (!tpl) return;

//     setFormData((p) => ({
//       ...p,
//       driver: tpl.driver_id ?? "",
//       operator: tpl.operator_id ?? "",
//       extra_operator: Array.isArray(tpl.extra_operator_id)
//         ? tpl.extra_operator_id.map(String)
//         : [],
//     }));

//     const matchedStaff =
//       staffRecords.find(
//         (staff) => String(staff.unique_id) === String(tpl.driver_id ?? "")
//       ) ??
//       staffRecords.find(
//         (staff) => String(staff.unique_id) === String(tpl.operator_id ?? "")
//       );

//     if (matchedStaff) {
//       setSelectedCompanyId(getCompanyId(matchedStaff));
//       setSelectedProjectId(getProjectId(matchedStaff));
//     }
//   }, [formData.staff_template, selectedStaffTemplateQuery.data, staffRecords]);

//   /* ============================
//      VALIDATE SELECTIONS WHEN OPTIONS CHANGE
//      — skipped in edit mode until options are populated,
//        and skipped entirely if options are still empty
//   ============================ */

//   useEffect(() => {
//     // In edit mode: don't validate until edit data has been loaded
//     // AND the options lists are non-empty (i.e., scoped staff has loaded).
//     // This prevents the saved driver/operator from being wiped on first render.
//     if (isEdit && (!editDataLoaded.current || (driverOptions.length === 0 && operatorOptions.length === 0))) {
//       return;
//     }

//     setFormData((prev) => {
//       let hasChanges = false;
//       const next = { ...prev };

//       // Only clear driver if options have loaded but the value is genuinely invalid
//       if (prev.driver && driverOptions.length > 0) {
//         const isDriverValid = driverOptions.some(
//           (option) => String(option.value) === prev.driver
//         );
//         if (!isDriverValid) {
//           next.driver = "";
//           hasChanges = true;
//         }
//       }

//       // Only clear operator if options have loaded but the value is genuinely invalid
//       if (prev.operator && operatorOptions.length > 0) {
//         const isOperatorValid = operatorOptions.some(
//           (option) => String(option.value) === prev.operator
//         );
//         if (!isOperatorValid) {
//           next.operator = "";
//           hasChanges = true;
//         }
//       }

//       // Only clear extra operators against loaded options
//       if (operatorOptions.length > 0) {
//         const validOperatorIds = new Set(
//           operatorOptions.map((option) => String(option.value))
//         );
//         const filteredExtras = next.extra_operator.filter(
//           (value) =>
//             validOperatorIds.has(value) &&
//             value !== next.driver &&
//             value !== next.operator
//         );
//         if (filteredExtras.length !== next.extra_operator.length) {
//           next.extra_operator = filteredExtras;
//           hasChanges = true;
//         }
//       }

//       return hasChanges ? next : prev;
//     });
//   }, [driverOptions, operatorOptions, isEdit]);

//   /* ============================
//      SUBMIT
//   ============================ */

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();

//     if (showField("approval_status") && isEdit && formData.approval_status === "APPROVED") {
//       Swal.fire("Warning", "Approved records cannot be modified.", "warning");
//       return;
//     }

//     const rawPayload = {
//       staff_template: formData.staff_template,
//       effective_date: formData.effective_date,
//       driver: formData.driver,
//       operator: formData.operator,
//       extra_operator: formData.extra_operator,
//       change_reason: formData.change_reason,
//       change_remarks: formData.change_remarks || null,
//       company_id: selectedCompanyId || undefined,
//       project_id: selectedProjectId || undefined,
//     };
//     const payload = filterPayload(rawPayload, ["company_id", "project_id"]);

//     setLoading(true);

//     try {
//       if (isEdit && id) {
//         await updateMutation.mutateAsync({ id, payload });
//       } else {
//         await createMutation.mutateAsync(payload);
//       }

//       Swal.fire("Success", "Saved successfully", "success");
//       navigate(ENC_LIST_PATH);
//     } catch (err: any) {
//       const errorMessage =
//         err?.response?.data?.detail ||
//         err?.response?.data?.non_field_errors?.[0] ||
//         err?.response?.data?.staff_template?.[0] ||
//         err?.response?.data?.effective_date?.[0] ||
//         "Error occurred";

//       Swal.fire("Save failed", errorMessage, "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ============================
//      COMPUTED OPTIONS FOR RENDER
//      — each "WithCurrent" variant guarantees the saved value
//        is always present in the list so the dropdown can
//        render its label even before scoped data loads
//   ============================ */

//   // Staff template: inject saved option if not yet in loaded list
//   const staffTemplateOptionsWithCurrent = (() => {
//     if (!isEdit || !formData.staff_template) return staffTemplateOptions;
//     const alreadyIncluded = staffTemplateOptions.some(
//       (o) => o.value === formData.staff_template
//     );
//     if (alreadyIncluded) return staffTemplateOptions;
//     return [
//       { value: formData.staff_template, label: formData.staff_template },
//       ...staffTemplateOptions,
//     ];
//   })();

//   // Driver: inject saved option if not yet in scoped list
//   const driverOptionsWithCurrent = (() => {
//     if (!isEdit || !formData.driver) return driverOptions;
//     const alreadyIncluded = driverOptions.some((o) => o.value === formData.driver);
//     if (alreadyIncluded) return driverOptions;
//     const currentRecord = staffRecords.find(
//       (s) => String(s.unique_id) === formData.driver
//     );
//     if (!currentRecord) return driverOptions;
//     return [toStaffOption(currentRecord), ...driverOptions];
//   })();

//   // Operator: exclude selected driver + inject saved option if not yet in scoped list
//   const operatorOptionsWithCurrent = (() => {
//     const base = operatorOptions.filter((o) => o.value !== formData.driver);
//     if (!isEdit || !formData.operator) return base;
//     const alreadyIncluded = base.some((o) => o.value === formData.operator);
//     if (alreadyIncluded) return base;
//     const currentRecord = staffRecords.find(
//       (s) => String(s.unique_id) === formData.operator
//     );
//     if (!currentRecord) return base;
//     return [toStaffOption(currentRecord), ...base];
//   })();

//   // Extra operator: exclude driver and operator
//   const availableExtraOperatorOptions = operatorOptions.filter(
//     (o) => o.value !== formData.driver && o.value !== formData.operator
//   );

//   return (
//     <div className="p-6">
//       <ComponentCard
//         title={isEdit ? "Edit Alternative Staff" : "Add Alternative Staff"}
//         desc="Configure temporary or permanent staff substitution"
//       >
//         <form onSubmit={handleSubmit} className="space-y-6">

//           {isEdit && formData.display_code && showField("display_code") && (
//             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//               <div className="text-lg font-semibold text-blue-900">
//                 {formData.display_code}
//               </div>
//             </div>
//           )}

//           <div className="grid md:grid-cols-2 gap-5">

//             {/* COMPANY */}
//             {showField("company_id") && (
//             <div>
//               <Label htmlFor="company_id">
//                 {t("admin.nav.company") || "Company"}
//                 <span className="text-red-500 ml-1">*</span>
//               </Label>
//               <Select
//                 id="company_id"
//                 value={selectedCompanyId}
//                 options={companyOptions}
//                 placeholder={t("admin.nav.company_placeholder") || "Select company"}
//                 onChange={(value) => {
//                   setSelectedCompanyId(value);
//                   setSelectedProjectId("");
//                   // User manually changed company — allow validation to clear stale values
//                   editDataLoaded.current = false;
//                 }}
//               />
//             </div>
//             )}

//             {/* PROJECT */}
//             {showField("project_id") && (
//             <div>
//               <Label htmlFor="project_id">
//                 {t("admin.nav.project") || "Project"}
//                 <span className="text-red-500 ml-1">*</span>
//               </Label>
//               <Select
//                 id="project_id"
//                 value={selectedProjectId}
//                 options={projectOptions}
//                 placeholder={t("admin.nav.project_placeholder") || "Select project"}
//                 onChange={(value) => {
//                   setSelectedProjectId(value);
//                   // User manually changed project — allow validation to clear stale values
//                   editDataLoaded.current = false;
//                 }}
//               />
//             </div>
//             )}

//             {/* STAFF TEMPLATE */}
//             {showField("staff_template") && (
//             <div>
//               <Label>Staff Template</Label>
//               <Select
//                 value={formData.staff_template}
//                 options={staffTemplateOptionsWithCurrent}
//                 disabled={isEdit}
//                 placeholder={t("common.select_option")}
//                 onChange={(v) => {
//                   templateSelectedByUser.current = true;
//                   setFormData((p) => ({ ...p, staff_template: v }));
//                 }}
//               />
//             </div>
//             )}

//             {/* EFFECTIVE DATE */}
//             {showField("effective_date") && (
//             <div>
//               <Label>{t("admin.alternative_staff_template.effective_date")}</Label>
//               <InputField
//                 type="date"
//                 value={formData.effective_date}
//                 onChange={(e) =>
//                   setFormData((p) => ({ ...p, effective_date: e.target.value }))
//                 }
//                 required
//               />
//             </div>
//             )}

            

//             {/* DRIVER */}
//             {showField("driver") && (
//             <div>
//               <Label>
//                 Driver
//                 <span className="text-red-500 ml-1">*</span>
//               </Label>
//               <Select
//                 value={formData.driver}
//                 options={driverOptionsWithCurrent}
//                 placeholder={t("common.select_option")}
//                 onChange={(v) => setFormData((p) => ({ ...p, driver: v }))}
//                 required
//               />
//             </div>
//             )}

//             {/* OPERATOR */}
//             {showField("operator") && (
//             <div>
//               <Label>
//                 Operator
//                 <span className="text-red-500 ml-1">*</span>
//               </Label>
//               <Select
//                 value={formData.operator}
//                 options={operatorOptionsWithCurrent}
//                 placeholder={t("common.select_option")}
//                 onChange={(v) => setFormData((p) => ({ ...p, operator: v }))}
//                 required
//               />
//             </div>
//             )}

//             {/* EXTRA OPERATOR — MultiSelect with chip display */}
//             {showField("extra_operator") && (
//             <div>
//               <Label>Extra Operator</Label>
//               <MultiSelect
//                 value={formData.extra_operator}
//                 options={availableExtraOperatorOptions}
//                 onChange={(e) =>
//                   setFormData((p) => ({ ...p, extra_operator: e.value }))
//                 }
//                 optionLabel="label"
//                 optionValue="value"
//                 display="chip"
//                 placeholder={t("common.select_option")}
//                 className="w-full"
//                 filter
//               />
//             </div>
//             )}

//             {/* CHANGE REASON */}
//             {showField("change_reason") && (
//             <div>
//               <Label>
//                 Change Reason
//                 <span className="text-red-500 ml-1">*</span>
//               </Label>
//               <InputField
//                 value={formData.change_reason}
//                 onChange={(e) =>
//                   setFormData((p) => ({ ...p, change_reason: e.target.value }))
//                 }
//                 required
//               />
//             </div>
//             )}

//           </div>

//           {/* REMARKS */}
//           {showField("change_remarks") && (
//           <div>
//             <Label>Remarks</Label>
//             <InputField
//               value={formData.change_remarks}
//               onChange={(e) =>
//                 setFormData((p) => ({ ...p, change_remarks: e.target.value }))
//               }
//             />
//           </div>
//           )}

//           {/* ACTIONS */}
//           <div className="flex justify-end gap-3">
//             <button
//               type="submit"
//               className="bg-green-custom text-white px-5 py-2 rounded-lg"
//               disabled={loading}
//             >
//               Save
//             </button>
//             <button
//               type="button"
//               onClick={() => navigate(ENC_LIST_PATH)}
//               className="border px-5 py-2 rounded-lg"
//             >
//               Cancel
//             </button>
//           </div>

//         </form>
//       </ComponentCard>
//     </div>
//   );
// }





import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { MultiSelect } from "primereact/multiselect";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  useAlternativeStaffTemplateQuery,
  useCreateAlternativeStaffTemplate,
  useUpdateAlternativeStaffTemplate,
} from "@/tanstack/admin/queries/masters/alternativeStaffTemplate";
import { useStaffCreationList } from "@/tanstack/admin/queries/masters/staffCreation";
import {
  useStaffTemplateList,
  useStaffTemplateQuery,
} from "@/tanstack/admin/queries/masters/staffTemplate";
import { companyApi, projectApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

/* ================= TYPES ================= */

type Option = { value: string; label: string };

type StaffRecord = {
  unique_id?: string;
  company_id?: string;
  project_id?: string;
  staff_name?: string;
  employee_name?: string;
  username?: string;
  user_type_name?: string;
  staffusertype_name?: string;
  contractorusertype_name?: string;
  designation?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  active_status?: boolean | number | string | null;
  company_name?: string;
  project_name?: string;
};

// Raw staff template record — must carry company/project ids for scoping
type StaffTemplateRaw = {
  unique_id: string;
  display_code?: string;
  company_id?: string;
  project_id?: string;
  company_unique_id?: string;
  project_unique_id?: string;
  driver_id?: string;
  operator_id?: string;
  extra_operator_id?: string[];
};

type FormState = {
  staff_template: string;
  effective_date: string;
  driver: string;
  operator: string;
  extra_operator: string[];
  change_reason: string;
  change_remarks: string;
  approval_status?: string;
  display_code?: string;
};

/* ================= INITIAL STATE ================= */

const initialFormState: FormState = {
  staff_template: "",
  effective_date: "",
  driver: "",
  operator: "",
  extra_operator: [],
  change_reason: "",
  change_remarks: "",
};

const ALTERNATIVE_STAFF_TEMPLATE_FIELDS: Record<string, string[]> = {
  staff_template: ["staff_template", "staff_template_id"],
  effective_date: ["effective_date"],
  company_id: ["company_id", "company"],
  project_id: ["project_id", "project"],
  driver: ["driver", "driver_id"],
  operator: ["operator", "operator_id"],
  extra_operator: ["extra_operator", "extra_operator_id", "extra_staff"],
  change_reason: ["change_reason"],
  change_remarks: ["change_remarks", "remarks"],
  approval_status: ["approval_status"],
  display_code: ["display_code"],
};

/* ================= COMPONENT ================= */

export default function AlternativeStaffTemplateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { showField, filterPayload } = useFieldVisibility(
    "staff-masters",
    "alternative-staff-template",
    ALTERNATIVE_STAFF_TEMPLATE_FIELDS
  );

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);

  // All raw staff templates (unfiltered) — used for scoping by company/project
  const [allStaffTemplates, setAllStaffTemplates] = useState<StaffTemplateRaw[]>([]);
  const [staffTemplateOptions, setStaffTemplateOptions] = useState<Option[]>([]);

  const [driverOptions, setDriverOptions] = useState<Option[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId: globalCompanyId,
    projectId: globalProjectId,
    onCompanyChange: onGlobalCompanyChange,
    setProjectId: setGlobalProjectId,
  } = useCompanyProjectSelection({ isEdit: false, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

  const templateSelectedByUser = useRef(false);
  const editDataLoaded = useRef(false);

  const { encStaffMasters, encAlternativeStaffTemplate } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encAlternativeStaffTemplate}`;

  const staffTemplatesQuery = useStaffTemplateList();
  const staffCreationQuery = useStaffCreationList({ active_status: 1 });
  const alternativeTemplateQuery = useAlternativeStaffTemplateQuery(id);
  const selectedStaffTemplateQuery = useStaffTemplateQuery(
    formData.staff_template || null
  );
  const createMutation = useCreateAlternativeStaffTemplate();
  const updateMutation = useUpdateAlternativeStaffTemplate();

  /* ================= HELPERS ================= */

  const normalizeRole = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  const normalizeActiveStatus = (value: StaffRecord["active_status"]): boolean => {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "active";
  };

  const getStaffRole = (staff: StaffRecord): string =>
    normalizeRole(
      staff.staffusertype_name ||
        staff.contractorusertype_name ||
        staff.designation
    );

  const isDriverRole = (staff: StaffRecord): boolean => {
    const role = getStaffRole(staff);
    return role === "company driver" || role === "contractor driver";
  };

  const isOperatorRole = (staff: StaffRecord): boolean => {
    const role = getStaffRole(staff);
    return role === "company operator" || role === "contractor operator";
  };

  const isStaffRow = (staff: StaffRecord): boolean => {
    const userType = normalizeRole(staff.user_type_name);
    return !userType || userType === "staff" || userType === "contractor";
  };

  const isActiveStaff = (staff: StaffRecord): boolean => {
    if (staff.is_deleted === true) return false;
    if (typeof staff.is_active === "boolean") return staff.is_active;
    return normalizeActiveStatus(staff.active_status);
  };

  const getStaffDisplayName = (staff: StaffRecord): string =>
    String(
      staff.employee_name ?? staff.staff_name ?? staff.username ?? staff.unique_id ?? ""
    ).trim();

  const toText = (value: unknown): string => String(value ?? "").trim();

  const getCompanyId = (staff: StaffRecord): string =>
    toText(staff.company_id) || toText(staff.company_name);

  const getProjectId = (staff: StaffRecord): string =>
    toText(staff.project_id) || toText(staff.project_name);

  const getCompanyProjectLabel = (staff: StaffRecord): string => {
    const company = String(staff.company_name ?? "").trim();
    const project = String(staff.project_name ?? "").trim();
    if (company && project) return `${company} / ${project}`;
    return company || project;
  };

  const toStaffOption = (staff: StaffRecord): Option => {
    const baseLabel = getStaffDisplayName(staff);
    const companyProject = getCompanyProjectLabel(staff);
    return {
      value: String(staff.unique_id ?? ""),
      label: companyProject ? `${baseLabel} (${companyProject})` : baseLabel,
    };
  };

  // Resolve company/project id from a raw staff template record
  const getTemplateCompanyId = (tpl: StaffTemplateRaw): string =>
    toText(tpl.company_unique_id) || toText(tpl.company_id);

  const getTemplateProjectId = (tpl: StaffTemplateRaw): string =>
    toText(tpl.project_unique_id) || toText(tpl.project_id);

  /* ============================
     LOAD COMPANIES & PROJECTS FROM API
  ============================ */

  useEffect(() => {
    (Promise.all([
      companyApi.list() as Promise<any>,
      projectApi.list() as Promise<any>,
    ]) as Promise<[any, any]>)
      .then(([companiesRes, projectsRes]: [any, any]) => {
        const companiesData = Array.isArray(companiesRes)
          ? companiesRes
          : Array.isArray(companiesRes?.data)
            ? companiesRes.data
            : [];

        const normalizedCompanies = companiesData
          .filter((c: any) => c?.is_active !== false && c?.is_deleted !== true)
          .map((c: any) => ({
            value: String(c?.unique_id ?? c?.id ?? ""),
            label: c?.name ?? "",
          }))
          .filter((opt: Option) => opt.value && opt.label);

        setCompanyOptions(normalizedCompanies);
        setSelectedCompanyId((prev) => {
          if (prev && normalizedCompanies.some((opt: Option) => opt.value === prev))
            return prev;
          if (globalCompanyId && normalizedCompanies.some((opt: Option) => opt.value === globalCompanyId))
            return globalCompanyId;
          return normalizedCompanies[0]?.value ?? "";
        });

        const projectsData = Array.isArray(projectsRes)
          ? projectsRes
          : Array.isArray(projectsRes?.data)
            ? projectsRes.data
            : [];

        const normalizedProjects = projectsData
          .filter((p: any) => p?.is_active !== false && p?.is_deleted !== true)
          .map((p: any) => ({
            value: String(p?.unique_id ?? p?.id ?? ""),
            label: p?.name ?? "",
            company_id: p?.company_unique_id ?? p?.company_id,
          }))
          .filter((opt: any) => opt.value && opt.label);

        setAllProjects(normalizedProjects);
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });
  }, [t]);

  /* ============================
     STORE RAW TEMPLATES + STAFF RECORDS
  ============================ */

  useEffect(() => {
    // Store all raw template records for scoped filtering later
    const templatesPayload: any = staffTemplatesQuery.data;
    const templateRows: StaffTemplateRaw[] = Array.isArray(templatesPayload)
      ? templatesPayload
      : (templatesPayload?.data ?? []);
    setAllStaffTemplates(templateRows);

    // Staff creation records
    const staffPayload: any = staffCreationQuery.data;
    const data = Array.isArray(staffPayload)
      ? staffPayload
      : Array.isArray(staffPayload?.results)
        ? staffPayload.results
        : Array.isArray(staffPayload?.data?.results)
          ? staffPayload.data.results
          : Array.isArray(staffPayload?.data)
            ? staffPayload.data
            : [];

    const staff = data.filter(
      (u: StaffRecord) => isStaffRow(u) && isActiveStaff(u) && u.unique_id
    );
    setStaffRecords(staff);
  }, [staffCreationQuery.data, staffTemplatesQuery.data]);

  /* ============================
     FILTER PROJECTS BY SELECTED COMPANY
  ============================ */

  useEffect(() => {
    const filtered = selectedCompanyId
      ? allProjects.filter(
          (p: any) => !p.company_id || p.company_id === selectedCompanyId
        )
      : allProjects;

    setProjectOptions(filtered);
    setSelectedProjectId((prev) => {
      if (prev && filtered.some((opt: any) => opt.value === prev)) return prev;
      if (globalProjectId && filtered.some((opt: any) => opt.value === globalProjectId)) return globalProjectId;
      return filtered[0]?.value ?? "";
    });
  }, [selectedCompanyId, allProjects]);

  /* ============================
     SCOPE ALL DROPDOWNS BY COMPANY + PROJECT
     — staff templates, drivers, operators all react together
  ============================ */

  useEffect(() => {
    // ---- Staff Templates ----
    const scopedTemplates = allStaffTemplates.filter((tpl) => {
      const companyMatch =
        !selectedCompanyId || getTemplateCompanyId(tpl) === selectedCompanyId;
      const projectMatch =
        !selectedProjectId || getTemplateProjectId(tpl) === selectedProjectId;
      return companyMatch && projectMatch;
    });

    setStaffTemplateOptions(
      scopedTemplates.map((tpl) => ({
        value: String(tpl.unique_id),
        label: tpl.display_code ?? tpl.unique_id,
      }))
    );

    // Reset staff_template if it's no longer in the scoped list
    const scopedTemplateIds = new Set(
      scopedTemplates.map((t) => String(t.unique_id))
    );
    setFormData((prev) => {
      if (prev.staff_template && !scopedTemplateIds.has(prev.staff_template)) {
        return { ...prev, staff_template: "" };
      }
      return prev;
    });

    // ---- Drivers & Operators ----
    const scopedStaff = staffRecords.filter((staff) => {
      const companyMatch =
        !selectedCompanyId || getCompanyId(staff) === selectedCompanyId;
      const projectMatch =
        !selectedProjectId || getProjectId(staff) === selectedProjectId;
      return companyMatch && projectMatch;
    });

    setDriverOptions(
      scopedStaff.filter(isDriverRole).map((staff) => toStaffOption(staff))
    );

    setOperatorOptions(
      scopedStaff.filter(isOperatorRole).map((staff) => toStaffOption(staff))
    );

    // Reset driver/operator/extra if no longer in scoped staff
    const scopedStaffIds = new Set(
      scopedStaff.map((s) => String(s.unique_id))
    );
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };

      if (next.driver && !scopedStaffIds.has(next.driver)) {
        next.driver = "";
        changed = true;
      }
      if (next.operator && !scopedStaffIds.has(next.operator)) {
        next.operator = "";
        changed = true;
      }
      const filteredExtras = next.extra_operator.filter((v) =>
        scopedStaffIds.has(v)
      );
      if (filteredExtras.length !== next.extra_operator.length) {
        next.extra_operator = filteredExtras;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [selectedCompanyId, selectedProjectId, allStaffTemplates, staffRecords]);

  /* ============================
     EDIT MODE — load saved values
  ============================ */

  useEffect(() => {
    if (!isEdit || !id || staffRecords.length === 0) return;

    const rec: any = alternativeTemplateQuery.data;
    if (!rec) return;

    setLoading(true);
    templateSelectedByUser.current = false;

    // Find the saved driver/operator to derive company/project scope
    const matchedStaff =
      staffRecords.find(
        (staff) => String(staff.unique_id) === String(rec.driver ?? "")
      ) ??
      staffRecords.find(
        (staff) => String(staff.unique_id) === String(rec.operator ?? "")
      );

    if (matchedStaff) {
      setSelectedCompanyId(getCompanyId(matchedStaff));
      setSelectedProjectId(getProjectId(matchedStaff));
    }

    setFormData({
      staff_template: String(rec.staff_template ?? ""),
      effective_date: rec.effective_date ?? "",
      driver: String(rec.driver ?? ""),
      operator: String(rec.operator ?? ""),
      extra_operator: Array.isArray(rec.extra_operator)
        ? rec.extra_operator.map(String)
        : [],
      change_reason: rec.change_reason ?? "",
      change_remarks: rec.change_remarks ?? "",
      approval_status: rec.approval_status,
      display_code: rec.display_code,
    });

    editDataLoaded.current = true;
    setLoading(false);
  }, [alternativeTemplateQuery.data, id, isEdit, staffRecords]);

  useEffect(() => {
    if (!alternativeTemplateQuery.isError) return;
    Swal.fire(t("common.error"), t("common.load_failed"), "error");
    setLoading(false);
  }, [alternativeTemplateQuery.isError, t]);

  /* ============================
     AUTO FILL FROM TEMPLATE (create mode only)
  ============================ */

  useEffect(() => {
    if (!templateSelectedByUser.current || !formData.staff_template) return;
    const tpl: any = selectedStaffTemplateQuery.data;
    if (!tpl) return;

    setFormData((p) => ({
      ...p,
      driver: tpl.driver_id ?? "",
      operator: tpl.operator_id ?? "",
      extra_operator: Array.isArray(tpl.extra_operator_id)
        ? tpl.extra_operator_id.map(String)
        : [],
    }));

    const matchedStaff =
      staffRecords.find(
        (staff) => String(staff.unique_id) === String(tpl.driver_id ?? "")
      ) ??
      staffRecords.find(
        (staff) => String(staff.unique_id) === String(tpl.operator_id ?? "")
      );

    if (matchedStaff) {
      setSelectedCompanyId(getCompanyId(matchedStaff));
      setSelectedProjectId(getProjectId(matchedStaff));
    }
  }, [formData.staff_template, selectedStaffTemplateQuery.data, staffRecords]);

  /* ============================
     VALIDATE SELECTIONS WHEN OPTIONS CHANGE
     — skipped in edit mode until scoped options are populated
  ============================ */

  useEffect(() => {
    if (
      isEdit &&
      (!editDataLoaded.current ||
        (driverOptions.length === 0 && operatorOptions.length === 0))
    ) {
      return;
    }

    setFormData((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      if (prev.driver && driverOptions.length > 0) {
        const valid = driverOptions.some(
          (opt) => String(opt.value) === prev.driver
        );
        if (!valid) { next.driver = ""; hasChanges = true; }
      }

      if (prev.operator && operatorOptions.length > 0) {
        const valid = operatorOptions.some(
          (opt) => String(opt.value) === prev.operator
        );
        if (!valid) { next.operator = ""; hasChanges = true; }
      }

      if (operatorOptions.length > 0) {
        const validIds = new Set(
          operatorOptions.map((opt) => String(opt.value))
        );
        const filteredExtras = next.extra_operator.filter(
          (v) =>
            validIds.has(v) &&
            v !== next.driver &&
            v !== next.operator
        );
        if (filteredExtras.length !== next.extra_operator.length) {
          next.extra_operator = filteredExtras;
          hasChanges = true;
        }
      }

      return hasChanges ? next : prev;
    });
  }, [driverOptions, operatorOptions, isEdit]);

  /* ============================
     SUBMIT
  ============================ */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      showField("approval_status") &&
      isEdit &&
      formData.approval_status === "APPROVED"
    ) {
      Swal.fire("Warning", "Approved records cannot be modified.", "warning");
      return;
    }

    const rawPayload = {
      staff_template: formData.staff_template,
      effective_date: formData.effective_date,
      driver: formData.driver,
      operator: formData.operator,
      extra_operator: formData.extra_operator,
      change_reason: formData.change_reason,
      change_remarks: formData.change_remarks || null,
      company_id: selectedCompanyId || undefined,
      project_id: selectedProjectId || undefined,
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]);

    setLoading(true);

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      Swal.fire("Success", "Saved successfully", "success");
        // sync global filters to match the form selection before returning
        try { onGlobalCompanyChange(selectedCompanyId); } catch {}
        try { setGlobalProjectId(selectedProjectId); } catch {}
        navigate(
          `${ENC_LIST_PATH}?company_unique_id=${encodeURIComponent(
            String(selectedCompanyId || "")
          )}&project_id=${encodeURIComponent(String(selectedProjectId || ""))}`
        );
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.staff_template?.[0] ||
        err?.response?.data?.effective_date?.[0] ||
        "Error occurred";

      Swal.fire("Save failed", errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ============================
     COMPUTED OPTIONS FOR RENDER
     — "WithCurrent" variants guarantee the saved value
       is always present so the dropdown shows its label
       even before scoped data loads
  ============================ */

  // Staff template: inject saved option if not yet in scoped list
  const staffTemplateOptionsWithCurrent = (() => {
    if (!isEdit || !formData.staff_template) return staffTemplateOptions;
    const already = staffTemplateOptions.some(
      (o) => o.value === formData.staff_template
    );
    if (already) return staffTemplateOptions;
    const raw = allStaffTemplates.find(
      (t) => String(t.unique_id) === formData.staff_template
    );
    return [
      {
        value: formData.staff_template,
        label: raw?.display_code ?? formData.staff_template,
      },
      ...staffTemplateOptions,
    ];
  })();

  // Driver: inject saved option if not yet in scoped list
  const driverOptionsWithCurrent = (() => {
    if (!isEdit || !formData.driver) return driverOptions;
    const already = driverOptions.some((o) => o.value === formData.driver);
    if (already) return driverOptions;
    const rec = staffRecords.find(
      (s) => String(s.unique_id) === formData.driver
    );
    if (!rec) return driverOptions;
    return [toStaffOption(rec), ...driverOptions];
  })();

  // Operator: exclude selected driver + inject saved option if not yet in scoped list
  const operatorOptionsWithCurrent = (() => {
    const base = operatorOptions.filter((o) => o.value !== formData.driver);
    if (!isEdit || !formData.operator) return base;
    const already = base.some((o) => o.value === formData.operator);
    if (already) return base;
    const rec = staffRecords.find(
      (s) => String(s.unique_id) === formData.operator
    );
    if (!rec) return base;
    return [toStaffOption(rec), ...base];
  })();

  // Extra operator: exclude driver and operator
  const availableExtraOperatorOptions = operatorOptions.filter(
    (o) => o.value !== formData.driver && o.value !== formData.operator
  );

  /* ============================
     RENDER
  ============================ */

  return (
    <div className="p-6">
      <ComponentCard
        title={isEdit ? "Edit Alternative Staff" : "Add Alternative Staff"}
        desc="Configure temporary or permanent staff substitution"
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {isEdit && formData.display_code && showField("display_code") && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-blue-900">
                {formData.display_code}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">

            {/* COMPANY — always first so user sets scope before other fields */}
            {showField("company_id") && (
              <div>
                <Label htmlFor="company_id">
                  {t("admin.nav.company") || "Company"}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  id="company_id"
                  value={selectedCompanyId}
                  options={companyOptions}
                  placeholder={
                    t("admin.nav.company_placeholder") || "Select company"
                  }
                  onChange={(value) => {
                    setSelectedCompanyId(value);
                    setSelectedProjectId("");
                    // update global selection so other pages reflect this choice
                    try {
                      onGlobalCompanyChange(value);
                    } catch {
                      /* ignore */
                    }
                    editDataLoaded.current = false;
                  }}
                />
              </div>
            )}

            {/* PROJECT */}
            {showField("project_id") && (
              <div>
                <Label htmlFor="project_id">
                  {t("admin.nav.project") || "Project"}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  id="project_id"
                  value={selectedProjectId}
                  options={projectOptions}
                  placeholder={
                    t("admin.nav.project_placeholder") || "Select project"
                  }
                  onChange={(value) => {
                    setSelectedProjectId(value);
                    // reflect in global selection
                    try {
                      setGlobalProjectId(value);
                    } catch {
                      /* ignore */
                    }
                    editDataLoaded.current = false;
                  }}
                />
              </div>
            )}

            {/* STAFF TEMPLATE — scoped to selected company + project */}
            {showField("staff_template") && (
              <div>
                <Label>Staff Template</Label>
                <Select
                  value={formData.staff_template}
                  options={staffTemplateOptionsWithCurrent}
                  disabled={isEdit}
                  placeholder={t("common.select_option")}
                  onChange={(v) => {
                    templateSelectedByUser.current = true;
                    setFormData((p) => ({ ...p, staff_template: v }));
                  }}
                />
              </div>
            )}

            {/* EFFECTIVE DATE */}
            {showField("effective_date") && (
              <div>
                <Label>
                  {t("admin.alternative_staff_template.effective_date")}
                </Label>
                <InputField
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      effective_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            )}

            {/* DRIVER — scoped to selected company + project */}
            {showField("driver") && (
              <div>
                <Label>
                  {t("admin.staff_template.primary_driver") || "Driver"}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={formData.driver}
                  options={driverOptionsWithCurrent}
                  placeholder={t("common.select_option")}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, driver: v }))
                  }
                  required
                />
              </div>
            )}

            {/* OPERATOR — scoped to selected company + project */}
            {showField("operator") && (
              <div>
                <Label>
                  {t("admin.staff_template.primary_operator") || "Operator"}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={formData.operator}
                  options={operatorOptionsWithCurrent}
                  placeholder={t("common.select_option")}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, operator: v }))
                  }
                  required
                />
              </div>
            )}

            {/* EXTRA OPERATOR — scoped to selected company + project */}
            {showField("extra_operator") && (
              <div>
                <Label>
                  {t("admin.staff_template.extra_staff") || "Extra Operator"}
                </Label>
                <MultiSelect
                  value={formData.extra_operator}
                  options={availableExtraOperatorOptions}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, extra_operator: e.value }))
                  }
                  optionLabel="label"
                  optionValue="value"
                  display="chip"
                  placeholder={t("common.select_option")}
                  className="w-full"
                  filter
                />
              </div>
            )}

            {/* CHANGE REASON */}
            {showField("change_reason") && (
              <div>
                <Label>
                  {t("admin.alternative_staff_template.change_reason") ||
                    "Change Reason"}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <InputField
                  value={formData.change_reason}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      change_reason: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            )}

          </div>

          {/* REMARKS */}
          {showField("change_remarks") && (
            <div>
              <Label>
                {t("admin.alternative_staff_template.change_remarks") ||
                  "Remarks"}
              </Label>
              <InputField
                value={formData.change_remarks}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    change_remarks: e.target.value,
                  }))
                }
              />
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="bg-green-custom text-white px-5 py-2 rounded-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? t("common.saving") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => {
                try { onGlobalCompanyChange(selectedCompanyId); } catch {}
                try { setGlobalProjectId(selectedProjectId); } catch {}
                navigate(
                  `${ENC_LIST_PATH}?company_unique_id=${encodeURIComponent(
                    String(selectedCompanyId || "")
                  )}&project_id=${encodeURIComponent(String(selectedProjectId || ""))}`
                );
              }}
              className="border border-gray-300 px-5 py-2 rounded-lg text-gray-600"
            >
              {t("common.cancel")}
            </button>
          </div>

        </form>
      </ComponentCard>
    </div>
  );
}