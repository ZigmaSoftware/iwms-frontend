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
  alternativeStaffTemplateApi,
  staffCreationApi,
  staffTemplateApi,
} from "@/helpers/admin";

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
  ============================ */
  useEffect(() => {
    staffTemplateApi.list().then((res: any) => {
      const data = Array.isArray(res) ? res : res?.data ?? [];
      setStaffTemplateOptions(
        data.map((tpl: any) => ({
          value: String(tpl.unique_id),
          label: tpl.display_code ?? tpl.unique_id,
        }))
      );
    });

    staffCreationApi.list({ params: { active_status: 1 } }).then((res: any) => {
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.results)
          ? res.results
          : Array.isArray(res?.data?.results)
            ? res.data.results
            : Array.isArray(res?.data)
              ? res.data
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
    });
  }, []);

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
        .filter((staff) => getStaffRole(staff) === "driver")
        .map((staff) => toStaffOption(staff))
    );

    setOperatorOptions(
      scopedStaff
        .filter((staff) => getStaffRole(staff) === "operator")
        .map((staff) => toStaffOption(staff))
    );
  }, [selectedCompanyId, selectedProjectId, staffRecords]);

  /* ============================
     EDIT MODE – API ONLY
  ============================ */
  useEffect(() => {
    if (!isEdit || !id || staffRecords.length === 0) return;

    setLoading(true);
    alternativeStaffTemplateApi
      .get(id)
      .then((rec: any) => {
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
      })
      .catch(() =>
        Swal.fire(t("common.error"), t("common.load_failed"), "error")
      )
      .finally(() => setLoading(false));
  }, [id, isEdit, staffRecords, t]);

  /* ============================
     AUTO-FILL FROM TEMPLATE
  ============================ */
  useEffect(() => {
    if (!templateSelectedByUser.current || !formData.staff_template) return;

    staffTemplateApi.get(formData.staff_template).then((tpl: any) => {
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
    });
  }, [formData.staff_template, staffRecords]);

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
  const value = String(option.value);
  if (!value) return false;
  if (value === formData.driver || value === formData.operator) {
    return false;
  }
  return !formData.extra_operator.includes(value);
});

const resolveOperatorLabel = (value: string) => {
  const match = operatorOptions.find(
    (option) => String(option.value) === value
  );
  return match?.label ?? value;
};

const handleAddExtraOperator = (value: string) => {
  if (!value) return;

  if (
    value === formData.driver ||
    value === formData.operator ||
    formData.extra_operator.includes(value)
  ) {
    setExtraOperatorPick("");
    return;
  }

  setFormData((prev) => ({
    ...prev,
    extra_operator: [...prev.extra_operator, value],
  }));

  setExtraOperatorPick("");
};

const handleRemoveExtraOperator = (value: string) => {
  setFormData((prev) => ({
    ...prev,
    extra_operator: prev.extra_operator.filter((item) => item !== value),
  }));
};


  /* ============================
     SUBMIT
  ============================ */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isEdit && formData.approval_status === "APPROVED") {
      Swal.fire(
        t("common.warning"),
        t("admin.alternative_staff_template.approved_locked"),
        "warning"
      );
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
    };

    setLoading(true);
    try {
      isEdit && id
        ? await alternativeStaffTemplateApi.update(id, payload)
        : await alternativeStaffTemplateApi.create(payload);

      Swal.fire(t("common.success"), t("common.saved_success"), "success");
      navigate(ENC_LIST_PATH);
    } catch (err: any) {
      Swal.fire(
        t("common.save_failed"),
        err?.response?.data?.detail ?? t("common.error"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================
     RENDER
  ============================ */
 return (
  <div className="p-6">
    <ComponentCard
      title={
        isEdit
          ? t("admin.alternative_staff_template.title_edit")
          : t("admin.alternative_staff_template.title_add")
      }
      desc={t("admin.alternative_staff_template.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Display Code (Read-only in Edit Mode) */}
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
            <Label>{t("admin.alternative_staff_template.staff_template")}</Label>
            <Select
              value={formData.staff_template}
              placeholder={t("common.select_option")}
              options={staffTemplateOptions}
              onChange={(v) => {
                templateSelectedByUser.current = true;
                setFormData((p) => ({ ...p, staff_template: v }));
              }}
              required
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

          {/* DRIVER */}
          <div>
            <Label>{t("admin.alternative_staff_template.driver")}</Label>
            <Select
              value={formData.driver}
              placeholder={t("common.select_option")}
              options={driverOptions}
              onChange={(v) =>
                setFormData((p) => ({ ...p, driver: v }))
              }
              required
            />
          </div>

          {/* OPERATOR */}
          <div>
            <Label>{t("admin.alternative_staff_template.operator")}</Label>
            <Select
              value={formData.operator}
              placeholder={t("common.select_option")}
              options={operatorOptions}
              onChange={(v) =>
                setFormData((p) => ({ ...p, operator: v }))
              }
              required
            />
          </div>

          {/* EXTRA OPERATOR */}
          <div>
            <Label>{t("admin.alternative_staff_template.extra_operator")}</Label>
            <Select
              value={extraOperatorPick}
              placeholder={t("common.select_option")}
              options={availableExtraOperatorOptions}
              onChange={handleAddExtraOperator}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.extra_operator.length === 0 ? (
                <span className="text-xs text-gray-500">
                  {t("common.no_items_found", {
                    item: t("admin.alternative_staff_template.extra_operator"),
                  })}
                </span>
              ) : (
                formData.extra_operator.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                  >
                    <span className="max-w-[160px] truncate">
                      {resolveOperatorLabel(value)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraOperator(value)}
                      className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 hover:text-gray-800"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* CHANGE REASON */}
          <div>
            <Label>{t("admin.alternative_staff_template.change_reason")}</Label>
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

        {/* CHANGE REMARKS */}
        <div>
          <Label>{t("admin.alternative_staff_template.change_remarks")}</Label>
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

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="bg-green-custom text-white px-5 py-2 rounded-lg"
            disabled={loading}
          >
            {t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate(ENC_LIST_PATH)}
            className="border px-5 py-2 rounded-lg"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  </div>
);
}
