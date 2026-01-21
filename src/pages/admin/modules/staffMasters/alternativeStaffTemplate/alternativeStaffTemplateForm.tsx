import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import InputField from "@/components/form/input/InputField";

import { getEncryptedRoute } from "@/utils/routeCache";
import {
  alternativeStaffTemplateApi,
  staffTemplateApi,
  userCreationApi,
} from "@/helpers/admin";

type Option = { value: string; label: string };

type FormState = {
  staff_template: string;
  effective_date: string;
  driver: string;
  operator: string;
  extra_operator: string[];
  change_reason: string;
  change_remarks: string;
  approval_status?: string;
};

type AlternativeStaffTemplateRecord = FormState & {
  driver_id?: string;
  operator_id?: string;
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
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [extraOperatorPick, setExtraOperatorPick] = useState("");

  const [staffTemplateOptions, setStaffTemplateOptions] = useState<Option[]>([]);
  const [driverOptions, setDriverOptions] = useState<Option[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<Option[]>([]);

  // tracks if template was chosen by user (not programmatic)
  const templateSelectedByUser = useRef(false);

  const { encStaffMasters, encAlternativeStaffTemplate } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encAlternativeStaffTemplate}`;
  const stateRecord = (
    location.state as { record?: AlternativeStaffTemplateRecord & { approval_status?: string } } | null
  )?.record;

  /* =====================================================
     HARD RESET ON EVERY CREATE PAGE ENTRY
  ===================================================== */
  useEffect(() => {
    if (!isEdit) {
      setFormData(initialFormState);
      templateSelectedByUser.current = false;
    }
  }, [location.key, isEdit]);

  /* =====================================================
     LOAD MASTER DATA
  ===================================================== */
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

    userCreationApi.list({ params: { active_status: 1 } }).then((res: any) => {
      const data = Array.isArray(res) ? res : res?.data ?? [];

      const staff = data.filter(
        (u: any) =>
          u.user_type_name === "Staff" &&
          u.is_active === true &&
          u.is_deleted === false &&
          u.unique_id
      );

      const toOption = (u: any) => ({
        value: String(u.unique_id),
        label: u.staff_name || u.employee_name || u.username,
      });

      setDriverOptions(
        staff
          .filter(
            (s: any) =>
              String(s.staffusertype_name || "").toLowerCase() === "driver"
          )
          .map(toOption)
      );

      setOperatorOptions(
        staff
          .filter(
            (s: any) =>
              String(s.staffusertype_name || "").toLowerCase() === "operator"
          )
          .map(toOption)
      );
    });
  }, []);

  /* =====================================================
     EDIT MODE LOAD
  ===================================================== */
  useEffect(() => {
    if (!isEdit || !stateRecord) return;
    templateSelectedByUser.current = false;
    setFormData({
      staff_template: String(stateRecord.staff_template ?? ""),
      effective_date: stateRecord.effective_date ?? "",
      driver: String(stateRecord.driver_id ?? stateRecord.driver ?? ""),
      operator: String(stateRecord.operator_id ?? stateRecord.operator ?? ""),
      extra_operator: Array.isArray(stateRecord.extra_operator)
        ? stateRecord.extra_operator.map(String)
        : stateRecord.extra_operator
        ? [String(stateRecord.extra_operator)]
        : [],
      change_reason: stateRecord.change_reason ?? "",
      change_remarks: stateRecord.change_remarks ?? "",
      approval_status: stateRecord.approval_status ?? "",
    });
  }, [isEdit, stateRecord]);

  useEffect(() => {
    if (!isEdit || !id) return;

    setLoading(true);
    alternativeStaffTemplateApi
      .get(id)
      .then((rec: any) => {
        templateSelectedByUser.current = false;
        setFormData({
          staff_template: String(rec.staff_template),
          effective_date: rec.effective_date,
          driver: String(rec.driver_id ?? rec.driver),
          operator: String(rec.operator_id ?? rec.operator),
          extra_operator: Array.isArray(rec.extra_operator)
            ? rec.extra_operator.map(String)
            : rec.extra_operator
            ? [String(rec.extra_operator)]
            : [],
          change_reason: rec.change_reason ?? "",
          change_remarks: rec.change_remarks ?? "",
          approval_status: rec.approval_status ?? "",
        });
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, t]);

  /* =====================================================
     CLEAR DEPENDENT FIELDS WHEN TEMPLATE CLEARS
  ===================================================== */
  useEffect(() => {
    if (formData.staff_template !== "") return;

    setFormData((prev) => ({
      ...prev,
      driver: "",
      operator: "",
      extra_operator: [],
    }));
  }, [formData.staff_template]);

  /* =====================================================
     AUTO-FILL ONLY AFTER USER SELECTS TEMPLATE
  ===================================================== */
  useEffect(() => {
    if (!templateSelectedByUser.current) return;
    if (!formData.staff_template) return;

    staffTemplateApi.get(formData.staff_template).then((tpl: any) => {
      setFormData((prev) => ({
        ...prev,
        driver: tpl.driver_id ?? tpl.driver?.unique_id ?? "",
        operator: tpl.operator_id ?? tpl.operator?.unique_id ?? "",
        extra_operator: Array.isArray(tpl.extra_operator_id)
          ? tpl.extra_operator_id.map(String)
          : [],
      }));
    });
  }, [formData.staff_template]);

  useEffect(() => {
    setFormData((prev) => {
      const filtered = prev.extra_operator.filter(
        (item) => item !== prev.driver && item !== prev.operator
      );
      if (filtered.length === prev.extra_operator.length) {
        return prev;
      }
      return { ...prev, extra_operator: filtered };
    });
  }, [formData.driver, formData.operator]);

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

  /* =====================================================
     SUBMIT
  ===================================================== */
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

    if (
      !isEdit &&
      (
        !formData.staff_template ||
        !formData.effective_date ||
        !formData.driver ||
        !formData.operator ||
        !formData.change_reason
      )
    ) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    if (formData.driver && formData.driver === formData.operator) {
      Swal.fire(
        t("common.error"),
        t("admin.alternative_staff_template.error_same_driver_operator"),
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
      if (isEdit && id) {
        const updatePayload = Object.fromEntries(
          Object.entries(payload).filter(([key, value]) => {
            if (key === "extra_operator") {
              return true;
            }
            if (key === "change_remarks") {
              return true;
            }
            return value !== "";
          })
        );
        await alternativeStaffTemplateApi.update(id, updatePayload);
      } else {
        await alternativeStaffTemplateApi.create(payload);
      }
      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const data = error?.response?.data;
      let message =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        t("common.save_failed_desc");

      if (data && typeof data === "object") {
        const firstKey = Object.keys(data)[0];
        const value = data[firstKey];
        if (Array.isArray(value) && value.length > 0) {
          message = value[0];
        } else if (typeof value === "string") {
          message = value;
        }
      }

      Swal.fire(t("common.save_failed"), message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */
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
          <div className="grid md:grid-cols-2 gap-5">
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

            <div>
              <Label>{t("admin.alternative_staff_template.driver")}</Label>
              <Select
                value={formData.driver}
                placeholder={t("common.select_option")}
                options={driverOptions}
                onChange={(v) => setFormData((p) => ({ ...p, driver: v }))}
                required
              />
            </div>

            <div>
              <Label>{t("admin.alternative_staff_template.operator")}</Label>
              <Select
                value={formData.operator}
                placeholder={t("common.select_option")}
                options={operatorOptions}
                onChange={(v) => setFormData((p) => ({ ...p, operator: v }))}
                required
              />
            </div>

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
                        aria-label={t("common.remove")}
                      >
                        x
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

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
