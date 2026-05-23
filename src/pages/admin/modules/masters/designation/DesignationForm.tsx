import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import { Input } from "@/components/ui/input";
import Select from "@/components/form/Select";
import { departmentApi, designationApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";

const { encMasters, encDesignations } = getEncryptedRoute();
const LIST_PATH = `/${encMasters}/${encDesignations}`;

export default function DesignationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [form, setForm] = useState({
    designation_name: "",
    department_id: "",
    description: "",
    status: "active",
  });

  useEffect(() => {
    departmentApi.list({ params: { status: "active" } }).then((res: any) => {
      const list = Array.isArray(res) ? res : res?.data?.results ?? res?.data ?? [];
      setDepartmentOptions(
        list
          .filter((d: any) => d?.is_active !== false && d?.is_deleted !== true)
          .map((d: any) => ({
            value: String(d.unique_id ?? d.id ?? ""),
            label: d.department_code
              ? `${d.department_name} (${d.department_code})`
              : d.department_name,
          })),
      );
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    designationApi.get(id).then((record: any) => {
      setForm({
        designation_name: record.designation_name ?? "",
        department_id: record.department_id
          ? String(record.department_id)
          : "",
        description: record.description ?? "",
        status: record.is_active === false ? "inactive" : "active",
      });
    });
  }, [id]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.designation_name.trim()) {
      Swal.fire(t("common.error"), "Designation name is required", "error");
      return;
    }
    if (!form.department_id) {
      Swal.fire(t("common.error"), "Department is required", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        designation_name: form.designation_name,
        department_id: form.department_id,
        description: form.description,
        status: form.status,
      };
      if (isEdit && id) {
        await designationApi.update(id, payload);
      } else {
        await designationApi.create(payload);
      }
      Swal.fire(t("common.success"), "Designation saved successfully", "success");
      navigate(LIST_PATH);
    } catch (error: any) {
      Swal.fire(
        t("common.error"),
        error?.response?.data ? JSON.stringify(error.response.data) : "Save failed",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ComponentCard
      title={isEdit ? "Edit Designation" : "Add Designation"}
      desc="Designation Master"
    >
      <form onSubmit={save} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="designation_name">Designation Name</Label>
          <Input
            id="designation_name"
            value={form.designation_name}
            onChange={(e) => setForm((prev) => ({ ...prev, designation_name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="department_id">
            Department <span className="text-red-500 ml-1">*</span>
          </Label>
          <Select
            id="department_id"
            value={form.department_id}
            onChange={(value) => setForm((prev) => ({ ...prev, department_id: value }))}
            options={departmentOptions}
            placeholder="Select Department"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            options={[
              { value: "active", label: t("common.active") },
              { value: "inactive", label: t("common.inactive") },
            ]}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3">
          <button type="button" className="rounded border px-4 py-2" onClick={() => navigate(LIST_PATH)}>
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving} className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60">
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
