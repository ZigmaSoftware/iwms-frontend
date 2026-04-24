import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

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
import {
  useStaffCreationList,
} from "@/tanstack/admin/queries/masters/staffCreation";
import {
  useStaffTemplateList,
  useStaffTemplateQuery,
} from "@/tanstack/admin/queries/masters/staffTemplate";

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
  const [extraOperatorPick, setExtraOperatorPick] = useState("");

  const [staffTemplateOptions, setStaffTemplateOptions] = useState<Option[]>([]);
  const [driverOptions, setDriverOptions] = useState<Option[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const templateSelectedByUser = useRef(false);

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

  const normalizeActiveStatus = (
    value: StaffRecord["active_status"]
  ): boolean => {
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
      staff.employee_name ??
        staff.staff_name ??
        staff.username ??
        staff.unique_id ??
        ""
    ).trim();

  const toText = (value: unknown): string =>
    String(value ?? "").trim();

  const getCompanyId = (staff: StaffRecord): string =>
    toText(staff.company_id) || toText(staff.company_name);

  const getProjectId = (staff: StaffRecord): string =>
    toText(staff.project_id) || toText(staff.project_name);

  const getCompanyLabel = (staff: StaffRecord): string =>
    toText(staff.company_name) || getCompanyId(staff);

  const getProjectLabel = (staff: StaffRecord): string =>
    toText(staff.project_name) || getProjectId(staff);

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

  const buildCompanyOptions = (records: StaffRecord[]): Option[] => {
    const map = new Map<string, string>();
    records.forEach((staff) => {
      const id = getCompanyId(staff);
      const label = getCompanyLabel(staff);
      if (!id || !label || map.has(id)) return;
      map.set(id, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  };

  const buildProjectOptions = (
    records: StaffRecord[],
    companyId: string
  ): Option[] => {
    const scoped = companyId
      ? records.filter((staff) => getCompanyId(staff) === companyId)
      : records;

    const map = new Map<string, string>();
    scoped.forEach((staff) => {
      const id = getProjectId(staff);
      const label = getProjectLabel(staff);
      if (!id || !label || map.has(id)) return;
      map.set(id, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  };

  /* ============================
     LOAD MASTER DATA
  --------------------------- */

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

    const companies = buildCompanyOptions(staff);
    setCompanyOptions(companies);
    setSelectedCompanyId((prev) => {
      if (prev && companies.some((option) => option.value === prev)) {
        return prev;
      }
      return companies[0]?.value ?? "";
    });
  }, [staffCreationQuery.data, staffTemplatesQuery.data]);

  useEffect(() => {
    const projects = buildProjectOptions(staffRecords, selectedCompanyId);
    setProjectOptions(projects);
    setSelectedProjectId((prev) => {
      if (prev && projects.some((option) => option.value === prev)) {
        return prev;
      }
      return projects[0]?.value ?? "";
    });
  }, [selectedCompanyId, staffRecords]);

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
     EDIT MODE – API ONLY
  ============================ */
  useEffect(() => {
    if (!isEdit || !id || staffRecords.length === 0) return;

    setLoading(true);
    const rec: any = alternativeTemplateQuery.data;
    if (!rec) {
      return;
    }

    templateSelectedByUser.current = false;

    setFormData({
      staff_template: String(rec.staff_template),
      effective_date: rec.effective_date,
      driver: String(rec.driver),
      operator: String(rec.operator),
      extra_operator: Array.isArray(rec.extra_operator)
        ? rec.extra_operator.map(String)
        : [],
      change_reason: rec.change_reason ?? "",
      change_remarks: rec.change_remarks ?? "",
      approval_status: rec.approval_status,
      display_code: rec.display_code,
    });

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

    setLoading(false);
  }, [alternativeTemplateQuery.data, id, isEdit, staffRecords]);

  useEffect(() => {
    if (!alternativeTemplateQuery.isError) {
      return;
    }

    Swal.fire(t("common.error"), t("common.load_failed"), "error");
    setLoading(false);
  }, [alternativeTemplateQuery.isError, t]);

  /* ---------------------------
     AUTO FILL FROM TEMPLATE
  --------------------------- */

  useEffect(() => {
    if (!templateSelectedByUser.current || !formData.staff_template) return;
    const tpl: any = selectedStaffTemplateQuery.data;
    if (!tpl) {
      return;
    }

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

  useEffect(() => {
    setFormData((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      const isDriverValid = driverOptions.some(
        (option) => String(option.value) === prev.driver
      );
      if (prev.driver && !isDriverValid) {
        next.driver = "";
        hasChanges = true;
      }

      const isOperatorValid = operatorOptions.some(
        (option) => String(option.value) === prev.operator
      );
      if (prev.operator && !isOperatorValid) {
        next.operator = "";
        hasChanges = true;
      }

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

      return hasChanges ? next : prev;
    });
  }, [driverOptions, operatorOptions]);
  
  /* =====================================================
   EXTRA OPERATOR HELPERS (REQUIRED FOR UI)
===================================================== */

  const availableExtraOperatorOptions = operatorOptions.filter((option) => {
    const value = option.value;

    if (value === formData.driver) return false;
    if (value === formData.operator) return false;

    return !formData.extra_operator.includes(value);
  });

  const resolveOperatorLabel = (value: string) => {
    const match = operatorOptions.find((o) => o.value === value);
    return match?.label ?? value;
  };

  const handleAddExtraOperator = (value: string) => {
    if (!value) return;

    setFormData((prev) => ({
      ...prev,
      extra_operator: [...prev.extra_operator, value],
    }));

    setExtraOperatorPick("");
  };

  const handleRemoveExtraOperator = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      extra_operator: prev.extra_operator.filter((v) => v !== value),
    }));
  };

  /* ---------------------------
     SUBMIT
  --------------------------- */

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

  /* ---------------------------
     RENDER
  --------------------------- */

  const filteredOperatorOptions = operatorOptions.filter(
    (o) => o.value !== formData.driver
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

            <div>
              <Label>Staff Template</Label>
              <Select
                value={formData.staff_template}
                options={staffTemplateOptions}
                disabled={isEdit}
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
                setFormData((p) => ({
                  ...p,
                  effective_date: e.target.value,
                }))
              }
              required
            />
          </div>

          {/* COMPANY */}
          <div>
            <Label>{t("admin.nav.company")}</Label>
            <Select
              value={selectedCompanyId}
              placeholder={t("common.select_option")}
              options={companyOptions}
              onChange={(value) => {
                setSelectedCompanyId(value);
                setSelectedProjectId("");
              }}
            />
          </div>

          {/* PROJECT */}
          <div>
            <Label>{t("admin.nav.project")}</Label>
            <Select
              value={selectedProjectId}
              placeholder={t("common.select_option")}
              options={projectOptions}
              onChange={(value) => setSelectedProjectId(value)}
              disabled={projectOptions.length === 0}
            />
          </div>

            <div>
              <Label>Driver</Label>
              <Select
                value={formData.driver}
                options={driverOptions}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, driver: v }))
                }
                required
              />
            </div>

            <div>
              <Label>Operator</Label>
              <Select
                value={formData.operator}
                options={filteredOperatorOptions}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, operator: v }))
                }
                required
              />
            </div>

            <div>
              <Label>Extra Operator</Label>
              <Select
                value={extraOperatorPick}
                options={availableExtraOperatorOptions}
                onChange={handleAddExtraOperator}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {formData.extra_operator.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                  >
                    {resolveOperatorLabel(value)}
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraOperator(value)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Change Reason</Label>
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
          </div>

          <div>
            <Label>Remarks</Label>
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
