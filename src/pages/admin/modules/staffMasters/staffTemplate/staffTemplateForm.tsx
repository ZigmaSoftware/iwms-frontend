import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { staffTemplateApi, userCreationApi } from "@/helpers/admin";

/* ================= TYPES ================= */

type Option = {
  value: string;
  label: string;
};

type StaffTemplateFormData = {
  driver_id: string;
  operator_id: string;
  extra_operator_id: string[];
  status: "ACTIVE" | "INACTIVE";
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  created_by: string;
  updated_by: string;
  approved_by: string;
};

/* ================= INITIAL STATE ================= */

const initialFormData: StaffTemplateFormData = {
  driver_id: "",
  operator_id: "",
  extra_operator_id: [],
  status: "ACTIVE",
  approval_status: "PENDING",
  created_by: "",
  updated_by: "",
  approved_by: "",
};

/* ================= COMPONENT ================= */

export default function StaffTemplateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] =
    useState<StaffTemplateFormData>(initialFormData);

  const [driverOptions, setDriverOptions] = useState<Option[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);
  const [adminOptions, setAdminOptions] = useState<Option[]>([]);
  const [supervisorOptions, setSupervisorOptions] = useState<Option[]>([]);
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

  /* ================= LOAD STAFF OPTIONS ================= */

  useEffect(() => {
    userCreationApi
      .list({ params: { active_status: 1 } })
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data ?? [];

        const staffOnly = data.filter(
          (u: any) =>
            u.user_type_name === "Staff" &&
            u.is_active === true &&
            u.is_deleted === false &&
            u.unique_id
        );
        const lookup: Record<string, string> = {};

        staffOnly.forEach((u: any) => {
          lookup[String(u.unique_id)] = u.staff_name;
        });

        setUserLookup(lookup);


        const normalizeRole = (value: unknown) =>
          String(value ?? "").trim().toLowerCase();

        const drivers: Option[] = staffOnly
          .filter((s: any) => normalizeRole(s.staffusertype_name) === "driver")
          .map((s: any) => ({
            value: s.unique_id,
            label: s.staff_name,
          }));

        const operators: Option[] = staffOnly
          .filter((s: any) => normalizeRole(s.staffusertype_name) === "operator")
          .map((s: any) => ({
            value: s.unique_id,
            label: s.staff_name,
          }));

        const admins: Option[] = staffOnly
          .filter((s: any) => normalizeRole(s.staffusertype_name) === "admin")
          .map((s: any) => ({
            value: s.unique_id,
            label: s.staff_name,
          }));

        const supervisors: Option[] = staffOnly
          .filter((s: any) => normalizeRole(s.staffusertype_name) === "supervisor")
          .map((s: any) => ({
            value: s.unique_id,
            label: s.staff_name,
          }));

        setDriverOptions(drivers);
        setOperatorOptions(operators);
        setAdminOptions(admins);
        setSupervisorOptions(supervisors);

        const currentUserId = localStorage.getItem("unique_id") || "";
        const isAdmin = admins.some((option) => String(option.value) === currentUserId);
        const isSupervisor = supervisors.some(
          (option) => String(option.value) === currentUserId
        );
        setFormData((prev) => ({
          ...prev,
          created_by: currentUserId,
          updated_by: isSupervisor ? currentUserId : prev.updated_by,
          approved_by: isAdmin ? currentUserId : prev.approved_by,
        }));
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });
  }, [t]);

  /* ================= LOAD TEMPLATE (EDIT) ================= */
  // ⚠️ Loads ONLY after options exist

  useEffect(() => {
    if (
      !isEdit ||
      !id ||
      driverOptions.length === 0 ||
      operatorOptions.length === 0
    )
      return;

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
          created_by: tpl.created_by ?? "",
          updated_by: tpl.updated_by ?? "",
          approved_by: tpl.approved_by ?? "",
        });
      })
      .catch((error) => {
        const message = extractError(error);
        setFormError(message);
        Swal.fire(t("common.error"), message, "error");
      })
      .finally(() => setFetching(false));
  }, [id, isEdit, driverOptions.length, operatorOptions.length, t]);

  useEffect(() => {
    setFormData((prev) => {
      const filtered = prev.extra_operator_id.filter(
        (item) => item !== prev.driver_id && item !== prev.operator_id
      );
      if (filtered.length === prev.extra_operator_id.length) {
        return prev;
      }
      return { ...prev, extra_operator_id: filtered };
    });
  }, [formData.driver_id, formData.operator_id]);

  const availableExtraOperatorOptions = operatorOptions.filter((option) => {
    const value = String(option.value);
    if (!value) return false;
    if (value === formData.driver_id || value === formData.operator_id) {
      return false;
    }
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

    // Business rule
    if (
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
      const payload = {
        driver_id: formData.driver_id,
        operator_id: formData.operator_id,
        extra_operator_id: formData.extra_operator_id,
        status: formData.status,
        approval_status: formData.approval_status,
        created_by: formData.created_by,
        updated_by: formData.updated_by || formData.created_by,
        approved_by: formData.approved_by || null,
      };

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

      navigate(ENC_LIST_PATH);
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
            {/* DRIVER */}
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

            {/* OPERATOR */}
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

            {/* EXTRA OPERATORS */}
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

            {/* STATUS */}
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

            {/* APPROVAL STATUS */}
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

            {/* APPROVER */}
            <div>
              <Label>{t("admin.staff_template.approved_by")}</Label>
              <Select
                value={formData.approved_by}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, approved_by: v }))
                }
                options={adminOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
              />
            </div>

            {/* CREATED BY */}
            <div>
              <Label>{t("admin.staff_template.created_by")}</Label>
              <input
                className="w-full rounded border border-gray-200 bg-gray-100 p-2 text-sm"
                value={resolveUserName(formData.created_by)}
                readOnly
              />

            </div>

            {/* UPDATED BY */}
            <div>
              <Label>{t("admin.staff_template.updated_by")}</Label>
              <Select
                value={formData.updated_by}
                onChange={(v) =>
                  setFormData((p) => ({ ...p, updated_by: v }))
                }
                options={supervisorOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
              />
            </div>
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
              onClick={() => navigate(ENC_LIST_PATH)}
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
