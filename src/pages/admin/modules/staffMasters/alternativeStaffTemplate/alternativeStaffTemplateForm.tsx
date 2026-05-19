import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { MultiSelect } from "primereact/multiselect";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";

import { getEncryptedRoute } from "@/utils/routeCache";
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
  designation?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  active_status?: boolean | number | string | null;
  company_name?: string;
  project_name?: string;
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

const initialFormState: FormState = {
  staff_template: "",
  effective_date: "",
  driver: "",
  operator: "",
  extra_operator: [],
  change_reason: "",
  change_remarks: "",
};

export default function AlternativeStaffTemplateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);

  const [staffTemplateOptions, setStaffTemplateOptions] = useState<Option[]>([]);
  const [driverOptions, setDriverOptions] = useState<Option[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const templateSelectedByUser = useRef(false);
  // Tracks whether the edit form data has been fully loaded at least once.
  // Prevents the validation useEffect from wiping saved values before options load.
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

  const normalizeRole = (value: unknown) =>
    String(value ?? "").trim().toLowerCase();

  const normalizeActiveStatus = (value: StaffRecord["active_status"]): boolean => {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "active";
  };

  const getStaffRole = (staff: StaffRecord): string =>
    normalizeRole(staff.staffusertype_name ?? staff.designation);

  const isStaffRow = (staff: StaffRecord): boolean => {
    const userType = normalizeRole(staff.user_type_name);
    return !userType || userType === "staff";
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

  /* ============================
     LOAD COMPANIES & PROJECTS FROM API
  ============================ */

  useEffect(() => {
    Promise.all([companyApi.list(), projectApi.list()])
      .then(([companiesRes, projectsRes]) => {
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
          if (prev && normalizedCompanies.some((opt) => opt.value === prev)) return prev;
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
     LOAD STAFF + TEMPLATE OPTIONS
  ============================ */

  useEffect(() => {
    const templatesPayload: any = staffTemplatesQuery.data;
    const templateRows = Array.isArray(templatesPayload)
      ? templatesPayload
      : templatesPayload?.data ?? [];

    setStaffTemplateOptions(
      templateRows.map((tpl: any) => ({
        value: String(tpl.unique_id),
        label: tpl.display_code ?? tpl.unique_id,
      }))
    );

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
      if (prev && filtered.some((opt) => opt.value === prev)) return prev;
      return filtered[0]?.value ?? "";
    });
  }, [selectedCompanyId, allProjects]);

  /* ============================
     FILTER DRIVERS & OPERATORS BY COMPANY + PROJECT
  ============================ */

  useEffect(() => {
    const scopedStaff = staffRecords.filter((staff) => {
      const companyMatch =
        !selectedCompanyId || getCompanyId(staff) === selectedCompanyId;
      const projectMatch =
        !selectedProjectId || getProjectId(staff) === selectedProjectId;
      return companyMatch && projectMatch;
    });

    setDriverOptions(
      scopedStaff
        .filter((staff) => getStaffRole(staff) === "company driver")
        .map((staff) => toStaffOption(staff))
    );

    setOperatorOptions(
      scopedStaff
        .filter((staff) => getStaffRole(staff) === "company operator")
        .map((staff) => toStaffOption(staff))
    );
  }, [selectedCompanyId, selectedProjectId, staffRecords]);

  /* ============================
     EDIT MODE — load saved values
  ============================ */

  useEffect(() => {
    if (!isEdit || !id || staffRecords.length === 0) return;

    const rec: any = alternativeTemplateQuery.data;
    if (!rec) return;

    setLoading(true);
    templateSelectedByUser.current = false;

    // Find the saved driver to derive company/project scope
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

    // Mark edit data as loaded so validation won't wipe values
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
     — skipped in edit mode until options are populated,
       and skipped entirely if options are still empty
  ============================ */

  useEffect(() => {
    // In edit mode: don't validate until edit data has been loaded
    // AND the options lists are non-empty (i.e., scoped staff has loaded).
    // This prevents the saved driver/operator from being wiped on first render.
    if (isEdit && (!editDataLoaded.current || (driverOptions.length === 0 && operatorOptions.length === 0))) {
      return;
    }

    setFormData((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      // Only clear driver if options have loaded but the value is genuinely invalid
      if (prev.driver && driverOptions.length > 0) {
        const isDriverValid = driverOptions.some(
          (option) => String(option.value) === prev.driver
        );
        if (!isDriverValid) {
          next.driver = "";
          hasChanges = true;
        }
      }

      // Only clear operator if options have loaded but the value is genuinely invalid
      if (prev.operator && operatorOptions.length > 0) {
        const isOperatorValid = operatorOptions.some(
          (option) => String(option.value) === prev.operator
        );
        if (!isOperatorValid) {
          next.operator = "";
          hasChanges = true;
        }
      }

      // Only clear extra operators against loaded options
      if (operatorOptions.length > 0) {
        const validOperatorIds = new Set(
          operatorOptions.map((option) => String(option.value))
        );
        const filteredExtras = next.extra_operator.filter(
          (value) =>
            validOperatorIds.has(value) &&
            value !== next.driver &&
            value !== next.operator
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

    if (isEdit && formData.approval_status === "APPROVED") {
      Swal.fire("Warning", "Approved records cannot be modified.", "warning");
      return;
    }

    const payload = {
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

    setLoading(true);

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      Swal.fire("Success", "Saved successfully", "success");
      navigate(ENC_LIST_PATH);
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
     — each "WithCurrent" variant guarantees the saved value
       is always present in the list so the dropdown can
       render its label even before scoped data loads
  ============================ */

  // Staff template: inject saved option if not yet in loaded list
  const staffTemplateOptionsWithCurrent = (() => {
    if (!isEdit || !formData.staff_template) return staffTemplateOptions;
    const alreadyIncluded = staffTemplateOptions.some(
      (o) => o.value === formData.staff_template
    );
    if (alreadyIncluded) return staffTemplateOptions;
    return [
      { value: formData.staff_template, label: formData.staff_template },
      ...staffTemplateOptions,
    ];
  })();

  // Driver: inject saved option if not yet in scoped list
  const driverOptionsWithCurrent = (() => {
    if (!isEdit || !formData.driver) return driverOptions;
    const alreadyIncluded = driverOptions.some((o) => o.value === formData.driver);
    if (alreadyIncluded) return driverOptions;
    const currentRecord = staffRecords.find(
      (s) => String(s.unique_id) === formData.driver
    );
    if (!currentRecord) return driverOptions;
    return [toStaffOption(currentRecord), ...driverOptions];
  })();

  // Operator: exclude selected driver + inject saved option if not yet in scoped list
  const operatorOptionsWithCurrent = (() => {
    const base = operatorOptions.filter((o) => o.value !== formData.driver);
    if (!isEdit || !formData.operator) return base;
    const alreadyIncluded = base.some((o) => o.value === formData.operator);
    if (alreadyIncluded) return base;
    const currentRecord = staffRecords.find(
      (s) => String(s.unique_id) === formData.operator
    );
    if (!currentRecord) return base;
    return [toStaffOption(currentRecord), ...base];
  })();

  // Extra operator: exclude driver and operator
  const availableExtraOperatorOptions = operatorOptions.filter(
    (o) => o.value !== formData.driver && o.value !== formData.operator
  );

  return (
    <div className="p-6">
      <ComponentCard
        title={isEdit ? "Edit Alternative Staff" : "Add Alternative Staff"}
        desc="Configure temporary or permanent staff substitution"
      >
        <form onSubmit={handleSubmit} className="space-y-6">

          {isEdit && formData.display_code && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-lg font-semibold text-blue-900">
                {formData.display_code}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">

            {/* STAFF TEMPLATE */}
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

            {/* EFFECTIVE DATE */}
            <div>
              <Label>{t("admin.alternative_staff_template.effective_date")}</Label>
              <InputField
                type="date"
                value={formData.effective_date}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, effective_date: e.target.value }))
                }
                required
              />
            </div>

            {/* COMPANY */}
            <div>
              <Label htmlFor="company_id">
                {t("admin.nav.company") || "Company"}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                id="company_id"
                value={selectedCompanyId}
                options={companyOptions}
                placeholder={t("admin.nav.company_placeholder") || "Select company"}
                onChange={(value) => {
                  setSelectedCompanyId(value);
                  setSelectedProjectId("");
                  // User manually changed company — allow validation to clear stale values
                  editDataLoaded.current = false;
                }}
              />
            </div>

            {/* PROJECT */}
            <div>
              <Label htmlFor="project_id">
                {t("admin.nav.project") || "Project"}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                id="project_id"
                value={selectedProjectId}
                options={projectOptions}
                placeholder={t("admin.nav.project_placeholder") || "Select project"}
                onChange={(value) => {
                  setSelectedProjectId(value);
                  // User manually changed project — allow validation to clear stale values
                  editDataLoaded.current = false;
                }}
              />
            </div>

            {/* DRIVER */}
            <div>
              <Label>
                Driver
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={formData.driver}
                options={driverOptionsWithCurrent}
                placeholder={t("common.select_option")}
                onChange={(v) => setFormData((p) => ({ ...p, driver: v }))}
                required
              />
            </div>

            {/* OPERATOR */}
            <div>
              <Label>
                Operator
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={formData.operator}
                options={operatorOptionsWithCurrent}
                placeholder={t("common.select_option")}
                onChange={(v) => setFormData((p) => ({ ...p, operator: v }))}
                required
              />
            </div>

            {/* EXTRA OPERATOR — MultiSelect with chip display */}
            <div>
              <Label>Extra Operator</Label>
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

            {/* CHANGE REASON */}
            <div>
              <Label>
                Change Reason
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <InputField
                value={formData.change_reason}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, change_reason: e.target.value }))
                }
                required
              />
            </div>

          </div>

          {/* REMARKS */}
          <div>
            <Label>Remarks</Label>
            <InputField
              value={formData.change_remarks}
              onChange={(e) =>
                setFormData((p) => ({ ...p, change_remarks: e.target.value }))
              }
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="bg-green-custom text-white px-5 py-2 rounded-lg"
              disabled={loading}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
              className="border px-5 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>

        </form>
      </ComponentCard>
    </div>
  );
}