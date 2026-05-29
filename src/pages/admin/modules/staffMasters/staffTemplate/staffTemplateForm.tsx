import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { staffCreationApi, staffTemplateApi, companyApi, projectApi } from "@/helpers/admin";

import { useFormCompanyProjectSync } from "@/hooks/useFormCompanyProjectSync";

/* ================= TYPES ================= */

type Option = {
  value: string;
  label: string;
};

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

type StaffTemplateFormData = {
  driver_id: string;
  operator_id: string;
  extra_operator_id: string[];
  status: "ACTIVE" | "INACTIVE";
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  approved_by: string;
};

/* ================= INITIAL STATE ================= */

const initialFormData: StaffTemplateFormData = {
  driver_id: "",
  operator_id: "",
  extra_operator_id: [],
  status: "ACTIVE",
  approval_status: "PENDING",
  approved_by: "",
};

const STAFF_TEMPLATE_FIELDS: Record<string, string[]> = {
  company_id: ["company_id", "company"],
  project_id: ["project_id", "project"],
  driver_id: ["driver_id", "primary_driver", "driver"],
  operator_id: ["operator_id", "primary_operator", "operator"],
  extra_operator_id: ["extra_operator_id", "extra_staff", "extra_operator"],
  status: ["status", "active_status"],
  approval_status: ["approval_status"],
  approved_by: ["approved_by", "approver"],
};

/* ================= COMPONENT ================= */

export default function StaffTemplateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { showField, filterPayload } = useFieldVisibility(
    "staff-masters",
    "staff-template",
    STAFF_TEMPLATE_FIELDS
  );

  const [formData, setFormData] =
    useState<StaffTemplateFormData>(initialFormData);

  const [driverOptions, setDriverOptions] = useState<Option[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
  const [adminOptions, setAdminOptions] = useState<Option[]>([]);
  const [supervisorOptions, setSupervisorOptions] = useState<Option[]>([]);
  const [staffRecords, setStaffRecords] = useState<StaffRecord[]>([]);
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const { handleCompanyChange, handleProjectChange, globalCompanyId, globalProjectId } = useFormCompanyProjectSync({
    selectedCompanyId,
    setSelectedCompanyId,
    selectedProjectId,
    setSelectedProjectId,
  });
  const [userLookup, setUserLookup] = useState<Record<string, string>>({});
  const [extraOperatorPick, setExtraOperatorPick] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { encStaffMasters, encStaffTemplate } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encStaffTemplate}`;

  const statusOptions = [
    { value: "ACTIVE", label: t("common.active") },
    { value: "INACTIVE", label: t("common.inactive") },
  ];
  const approvalStatusOptions = [
    { value: "PENDING", label: t("common.pending") },
    { value: "APPROVED", label: t("common.approved") },
    { value: "REJECTED", label: t("common.rejected") },
  ];

  const normalizeRole = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");

  const normalizeActiveStatus = (
    value: StaffRecord["active_status"]
  ): boolean => {
    if (typeof value === "boolean") return value;
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "active";
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

  const toStaffOption = (staff: StaffRecord): Option => {
    const baseLabel = getStaffDisplayName(staff);
    const companyProject = getCompanyProjectLabel(staff);
    return {
      value: String(staff.unique_id ?? ""),
      label: companyProject ? `${baseLabel} (${companyProject})` : baseLabel,
    };
  };

  const extractError = (error: any): string => {
    const data = error?.response?.data;
    if (!data) return error?.message ?? t("common.unexpected_error");
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    if (typeof data === "object") {
      const messages = Object.entries(data).flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${key}: ${item}`);
        }
        if (value === null || value === undefined) {
          return [];
        }
        if (typeof value === "string") {
          return [`${key}: ${value}`];
        }
        return [`${key}: ${JSON.stringify(value)}`];
      });
      if (messages.length) return messages.join("\n");
    }
    return t("common.unexpected_error");
  };

  /* ================= LOAD STAFF + COMPANY + PROJECT ================= */

  useEffect(() => {
    Promise.all([
      staffCreationApi.list({ params: { active_status: 1 } }) as Promise<any>,
      companyApi.list() as Promise<any>,
      projectApi.list() as Promise<any>,
    ])
      .then(([staffRes, companiesRes, projectsRes]: [any, any, any]) => {
        // ---- Staff ----
        const staffData = Array.isArray(staffRes)
          ? staffRes
          : Array.isArray(staffRes?.results)
            ? staffRes.results
            : Array.isArray(staffRes?.data?.results)
              ? staffRes.data.results
              : Array.isArray(staffRes?.data)
                ? staffRes.data
                : [];

        const staffOnly = staffData.filter(
          (u: StaffRecord) => isStaffRow(u) && isActiveStaff(u) && u.unique_id
        );

        const lookup: Record<string, string> = {};
        staffOnly.forEach((u: StaffRecord) => {
          lookup[String(u.unique_id)] = getStaffDisplayName(u);
        });

        setStaffRecords(staffOnly);
        setUserLookup(lookup);

        // ---- Companies ----
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
          .filter((option: Option) => option.value && option.label);

        setCompanyOptions(normalizedCompanies);
        setSelectedCompanyId((prev) => {
          if (prev && normalizedCompanies.some((option: Option) => option.value === prev)) {
            return prev;
          }
          if (globalCompanyId && normalizedCompanies.some((option: Option) => option.value === globalCompanyId)) {
            return globalCompanyId;
          }
          return normalizedCompanies[0]?.value ?? "";
        });

        // ---- Projects ----
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
          .filter((option: any) => option.value && option.label);

        setAllProjects(normalizedProjects);

        const firstCompanyId = normalizedCompanies[0]?.value ?? "";
        const initialCompanyId = globalCompanyId && normalizedCompanies.some((opt: Option) => opt.value === globalCompanyId)
          ? globalCompanyId
          : firstCompanyId;
        const initialProjects = initialCompanyId
          ? normalizedProjects.filter(
              (p: any) => !p.company_id || p.company_id === firstCompanyId
            )
          : normalizedProjects;
        setProjectOptions(initialProjects);

        // Pre-fill approved_by if current user is an admin
        const currentUserId = localStorage.getItem("unique_id") || "";
        const isAdmin = staffOnly
          .filter((s: StaffRecord) => getStaffRole(s) === "admin")
          .some((s: StaffRecord) => String(s.unique_id) === currentUserId);

        setFormData((prev) => ({
          ...prev,
          approved_by: isAdmin ? currentUserId : prev.approved_by,
        }));
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });
  }, [t]);

  /* ================= FILTER PROJECTS BY COMPANY ================= */

  useEffect(() => {
    const filteredProjects = selectedCompanyId
      ? allProjects.filter(
          (p: any) => !p.company_id || p.company_id === selectedCompanyId
        )
      : allProjects;

    setProjectOptions(filteredProjects);
    setSelectedProjectId((prev) => {
      if (prev && filteredProjects.some((option: any) => option.value === prev)) {
        return prev;
      }
      return filteredProjects[0]?.value ?? "";
    });
  }, [selectedCompanyId, allProjects]);

  /* ================= SCOPE DRIVERS / OPERATORS / APPROVERS BY COMPANY + PROJECT ================= */

  useEffect(() => {
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

    // ✅ Approvers scoped to selected company + project
    const scopedAdmins = scopedStaff
      .filter((s) => getStaffRole(s) === "admin")
      .map((s) => toStaffOption(s));

    const scopedSupervisors = scopedStaff
      .filter((s) => { const role = getStaffRole(s); return role === "company supervisor" || role === "contractor supervisor"; })
      .map((s) => toStaffOption(s));

    setAdminOptions(scopedAdmins);
    setSupervisorOptions(scopedSupervisors);

    // Reset approved_by if it no longer belongs to the scoped staff
    const allApproverIds = new Set([
      ...scopedAdmins.map((o) => o.value),
      ...scopedSupervisors.map((o) => o.value),
    ]);

    setFormData((prev) => {
      if (prev.approved_by && !allApproverIds.has(prev.approved_by)) {
        return { ...prev, approved_by: "" };
      }
      return prev;
    });
  }, [selectedCompanyId, selectedProjectId, staffRecords]);

  /* ================= LOAD TEMPLATE (EDIT) ================= */

  useEffect(() => {
    if (!isEdit || !id || staffRecords.length === 0) return;

    setFetching(true);

    staffTemplateApi
      .get(id)
      .then((tpl: any) => {
        setFormError(null);
        const extraIds = Array.isArray(tpl.extra_operator_id)
          ? tpl.extra_operator_id.map(String)
          : typeof tpl.extra_operator_id === "string"
            ? tpl.extra_operator_id
              .split(",")
              .map((item: string) => item.trim())
              .filter(Boolean)
            : [];

        setFormData({
          driver_id: tpl.driver_id ?? "",
          operator_id: tpl.operator_id ?? "",
          extra_operator_id: extraIds,
          status: tpl.status ?? "ACTIVE",
          approval_status: tpl.approval_status ?? "PENDING",
          approved_by: tpl.approved_by ?? "",
        });

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
      })
      .catch((error) => {
        const message = extractError(error);
        setFormError(message);
        Swal.fire(t("common.error"), message, "error");
      })
      .finally(() => setFetching(false));
  }, [id, isEdit, staffRecords, t]);

  /* ================= CLEAR INVALID DRIVER / OPERATOR / EXTRA WHEN OPTIONS CHANGE ================= */

  useEffect(() => {
    // Do not clear selections while the edit record is being fetched.
    // The edit-fetch effect sets formData and company/project simultaneously;
    // the scoping effect then updates driverOptions/operatorOptions.  Without
    // this guard that re-render would immediately wipe the just-prefilled IDs.
    if (fetching) return;

    setFormData((prev) => {
      let hasChanges = false;
      const next = { ...prev };

      const isDriverValid = driverOptions.some(
        (option) => String(option.value) === prev.driver_id
      );
      if (prev.driver_id && !isDriverValid) {
        next.driver_id = "";
        hasChanges = true;
      }

      const isOperatorValid = operatorOptions.some(
        (option) => String(option.value) === prev.operator_id
      );
      if (prev.operator_id && !isOperatorValid) {
        next.operator_id = "";
        hasChanges = true;
      }

      const validOperatorIds = new Set(
        operatorOptions.map((option) => String(option.value))
      );
      const filteredExtras = next.extra_operator_id.filter(
        (value) =>
          validOperatorIds.has(value) &&
          value !== next.driver_id &&
          value !== next.operator_id
      );

      if (filteredExtras.length !== next.extra_operator_id.length) {
        next.extra_operator_id = filteredExtras;
        hasChanges = true;
      }

      return hasChanges ? next : prev;
    });
  }, [driverOptions, operatorOptions]);

  useEffect(() => {
    setFormData((prev) => {
      const filtered = prev.extra_operator_id.filter(
        (item) => item !== prev.driver_id && item !== prev.operator_id
      );
      if (filtered.length === prev.extra_operator_id.length) return prev;
      return { ...prev, extra_operator_id: filtered };
    });
  }, [formData.driver_id, formData.operator_id]);

  /* ================= DERIVED ================= */

  const availableExtraOperatorOptions = operatorOptions.filter((option) => {
    const value = String(option.value);
    if (!value) return false;
    if (value === formData.driver_id || value === formData.operator_id) return false;
    return !formData.extra_operator_id.includes(value);
  });

  const resolveOperatorLabel = (value: string) => {
    const match = operatorOptions.find(
      (option) => String(option.value) === value
    );
    return match?.label ?? value;
  };

  const resolveUserName = (userId?: string) => {
    if (!userId) return "-";
    return userLookup[userId] || userId;
  };

  /* ================= EXTRA OPERATOR HANDLERS ================= */

  const handleAddExtraOperator = (value: string) => {
    if (!value) return;
    if (
      value === formData.driver_id ||
      value === formData.operator_id ||
      formData.extra_operator_id.includes(value)
    ) {
      setExtraOperatorPick("");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      extra_operator_id: [...prev.extra_operator_id, value],
    }));
    setExtraOperatorPick("");
  };

  const handleRemoveExtraOperator = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      extra_operator_id: prev.extra_operator_id.filter((item) => item !== value),
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (
      showField("driver_id") &&
      showField("operator_id") &&
      formData.driver_id &&
      formData.driver_id === formData.operator_id
    ) {
      Swal.fire(
        t("common.error"),
        t("admin.staff_template.error_primary_role_duplicate"),
        "warning"
      );
      return;
    }

    setSubmitting(true);

    try {
      const rawPayload = {
        driver_id: formData.driver_id,
        operator_id: formData.operator_id,
        extra_operator_id: formData.extra_operator_id,
        status: formData.status,
        approval_status: formData.approval_status,
        approved_by: formData.approved_by || null,
        company_id: selectedCompanyId,
        project_id: selectedProjectId,
      };
      const payload = filterPayload(rawPayload, ["company_id", "project_id"]);

      if (isEdit && id) {
        await staffTemplateApi.update(id, payload);
      } else {
        await staffTemplateApi.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );

      const listQuery = new URLSearchParams();
      if (selectedCompanyId) {
        listQuery.set("company_unique_id", selectedCompanyId);
      }
      if (selectedProjectId) {
        listQuery.set("project_id", selectedProjectId);
      }

      navigate(
        `${ENC_LIST_PATH}${listQuery.toString() ? `?${listQuery.toString()}` : ""}`
      );
    } catch (error) {
      const message = extractError(error);
      setFormError(message);
      Swal.fire(t("common.save_failed"), message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <div className="p-6">
      <ComponentCard
        title={
          isEdit
            ? t("admin.staff_template.title_edit")
            : t("admin.staff_template.title_add")
        }
        desc={t("admin.staff_template.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-semibold">{t("common.error")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {formError.split("\n").map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* COMPANY */}
            {showField("company_id") && (
              <div>
                <Label htmlFor="company_id">
                  {t("admin.nav.company") || "Company"}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  id="company_id"
                  value={selectedCompanyId}
                  onChange={(value) => handleCompanyChange(value)}
                  options={companyOptions}
                  placeholder={t("admin.nav.company_placeholder") || "Select company"}
                  disabled={fetching}
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
                  onChange={(value) => handleProjectChange(value)}
                  options={projectOptions}
                  placeholder={t("admin.nav.project_placeholder") || "Select project"}
                  disabled={fetching}
                />
              </div>
            )}

            {/* DRIVER */}
            {showField("driver_id") && (
              <div>
                <Label>{t("admin.staff_template.primary_driver")}</Label>
                <Select
                  value={formData.driver_id}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, driver_id: v }))
                  }
                  options={driverOptions}
                  placeholder={t("common.select_option")}
                  required
                  disabled={fetching}
                />
              </div>
            )}

            {/* OPERATOR */}
            {showField("operator_id") && (
              <div>
                <Label>{t("admin.staff_template.primary_operator")}</Label>
                <Select
                  value={formData.operator_id}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, operator_id: v }))
                  }
                  options={operatorOptions}
                  placeholder={t("common.select_option")}
                  required
                  disabled={fetching}
                />
              </div>
            )}

            {/* EXTRA OPERATORS */}
            {showField("extra_operator_id") && (
              <div>
                <Label>{t("admin.staff_template.extra_staff")}</Label>
                <Select
                  value={extraOperatorPick}
                  onChange={handleAddExtraOperator}
                  options={availableExtraOperatorOptions}
                  placeholder={t("common.select_option")}
                  disabled={fetching}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.extra_operator_id.length === 0 ? (
                    <span className="text-xs text-gray-500">
                      {t("common.no_items_found", {
                        item: t("admin.staff_template.extra_staff"),
                      })}
                    </span>
                  ) : (
                    formData.extra_operator_id.map((value) => (
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
                          aria-label={t("common.remove")}
                        >
                          x
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* STATUS */}
            {showField("status") && (
              <div>
                <Label>{t("common.status")}</Label>
                <Select
                  value={formData.status}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, status: v as any }))
                  }
                  options={statusOptions}
                  placeholder={t("common.select_status")}
                  required
                  disabled={fetching}
                />
              </div>
            )}

            {/* APPROVAL STATUS */}
            {showField("approval_status") && (
              <div>
                <Label>{t("admin.staff_template.approval_status")}</Label>
                <Select
                  value={formData.approval_status}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, approval_status: v as any }))
                  }
                  options={approvalStatusOptions}
                  placeholder={t("common.select_status")}
                  required
                  disabled={fetching}
                />
              </div>
            )}

            {/* APPROVER — scoped to selected company + project */}
            {showField("approved_by") && (
              <div>
                <Label>{t("admin.staff_template.approved_by")}</Label>
                <Select
                  value={formData.approved_by}
                  onChange={(v) =>
                    setFormData((p) => ({ ...p, approved_by: v }))
                  }
                  options={[...adminOptions, ...supervisorOptions]}
                  placeholder={t("common.select_option")}
                  disabled={fetching}
                />
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting
                ? t("common.saving")
                : isEdit
                  ? t("common.update")
                  : t("common.save")}
            </button>

            <button
              type="button"
              onClick={() => {
                const listQuery = new URLSearchParams();
                if (selectedCompanyId) {
                  listQuery.set("company_unique_id", selectedCompanyId);
                }
                if (selectedProjectId) {
                  listQuery.set("project_id", selectedProjectId);
                }

                navigate(
                  `${ENC_LIST_PATH}${
                    listQuery.toString() ? `?${listQuery.toString()}` : ""
                  }`
                );
              }}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}