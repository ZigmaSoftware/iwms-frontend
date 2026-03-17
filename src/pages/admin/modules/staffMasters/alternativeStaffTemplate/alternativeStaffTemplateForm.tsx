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

  const templateSelectedByUser = useRef(false);

  const { encStaffMasters, encAlternativeStaffTemplate } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encAlternativeStaffTemplate}`;

  /* ---------------------------
     LOAD MASTER DATA
  --------------------------- */

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
          u.is_deleted === false
      );

      const toOption = (u: any) => ({
        value: String(u.unique_id),
        label: u.staff_name || u.employee_name || u.username,
      });

      setDriverOptions(
        staff
          .filter(
            (s: any) =>
              String(s.staffusertype_name).toLowerCase() === "driver"
          )
          .map(toOption)
      );

      setOperatorOptions(
        staff
          .filter(
            (s: any) =>
              String(s.staffusertype_name).toLowerCase() === "operator"
          )
          .map(toOption)
      );
    });
  }, []);

  /* ---------------------------
     EDIT MODE
  --------------------------- */

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
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /* ---------------------------
     AUTO FILL FROM TEMPLATE
  --------------------------- */

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
    });
  }, [formData.staff_template]);

  /* ---------------------------
     EXTRA OPERATOR HELPERS
  --------------------------- */

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
    };

    setLoading(true);

    try {
      if (isEdit && id) {
        await alternativeStaffTemplateApi.update(id, payload);
      } else {
        await alternativeStaffTemplateApi.create(payload);
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

            <div>
              <Label>Effective Date</Label>
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