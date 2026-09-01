import type { DistrictLeaderOption } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import PasswordInput from "@/components/form/input/PasswordInput";
import { getEncryptedRoute } from "@/utils/routeCache";
import { districtLeaderApi, districtApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { buildDistrictLeaderSchema } from "@/schemas/masters/leaderManagement/districtLeader.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

const initialForm = {
  username: "",
  password: "",
  leader_name: "",
  district_id: "",
  email: "",
  is_active: "1",
};

const activeOptions = [
  { value: "1", label: "Active" },
  { value: "0", label: "Inactive" },
];

export default function DistrictLeaderForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encMasters, encDistrictLeaders } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encMasters, encDistrictLeaders);

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const [formData, setFormData] = useState(initialForm);
  const [districtOptions, setDistrictOptions] = useState<DistrictLeaderOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [pendingDistrictId, setPendingDistrictId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;

    districtApi
      .readAll(Object.keys(params).length ? { params } : undefined)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setDistrictOptions(
          list
            .filter((item: any) => item?.is_active !== false && item?.is_deleted !== true)
            .map((item: any) => ({ value: String(item.unique_id ?? ""), label: item.name ?? item.unique_id }))
        );
      })
      .catch(() => setDistrictOptions([]));
  }, [companyUniqueId, projectId]);

  useEffect(() => {
    if (!pendingDistrictId || districtOptions.length === 0) return;
    const match = districtOptions.find((o) => o.value === pendingDistrictId);
    if (match) {
      setFormData((prev) => ({ ...prev, district_id: pendingDistrictId }));
      setPendingDistrictId(null);
    }
  }, [pendingDistrictId, districtOptions]);

  useEffect(() => {
    if (!isEdit || !id) return;
    setFetching(true);
    districtLeaderApi.read(id)
      .then((record: any) => {
        setFormData({
          username: record.username ?? "",
          password: "",
          leader_name: record.leader_name ?? "",
          district_id: "",
          email: record.email ?? "",
          is_active: (record.is_active ?? record.active_status) ? "1" : "0",
        });

        if (record.district_id) {
          setPendingDistrictId(String(record.district_id));
        }

        applyCompanyProjectFromRecord(record as unknown as Record<string, unknown>);
      })
      .catch(() => Swal.fire("Error", "Failed to load district leader details.", "error"))
      .finally(() => setFetching(false));
  }, [id, isEdit, applyCompanyProjectFromRecord]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id: fieldId, value } = e.target;
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setFieldErrors((prev) => (prev[fieldId] ? { ...prev, [fieldId]: "" } : prev));
  };

  const handleSelectChange = (field: keyof typeof initialForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: "" } : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!companyUniqueId) {
      Swal.fire(
        "Error",
        !loggedInCompanyUniqueId && !isSuperAdmin
          ? "Company is not mapped to this login. Only super admin can choose a company."
          : "Company is required.",
        "error"
      );
      return;
    }

    if (!projectId) {
      Swal.fire("Error", "Project is required.", "error");
      return;
    }

    const schema = buildDistrictLeaderSchema(isEdit);
    const validation = parseWithSchema(schema, formData);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      Swal.fire("Validation", firstError ?? "Please fill in all required fields.", "warning");
      return;
    }
    setFieldErrors({});

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      username: formData.username.trim(),
      leader_name: formData.leader_name.trim() || null,
      district_id: formData.district_id,
      email: formData.email.trim() || null,
      is_active: formData.is_active === "1",
      company_id: companyUniqueId,
      project_id: projectId,
    };

    if (formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    try {
      if (isEdit && id) {
        await districtLeaderApi.update(id, payload);
        Swal.fire("Success", "District leader updated successfully.", "success");
      } else {
        await districtLeaderApi.create(payload);
        Swal.fire("Success", "District leader created successfully.", "success");
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (error: any) {
      const errData = error?.response?.data;
      const message =
        typeof errData === "string"
          ? errData
          : errData?.errors
            ? Object.entries(errData.errors as Record<string, string[]>)
                .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
                .join("\n")
            : errData?.detail ?? "Failed to save. Please try again.";

      Swal.fire("Save Failed", message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const companyOptions = companies.map((c) => ({ value: c.value, label: c.label }));
  const projectOptions = projects.map((p) => ({ value: p.value, label: p.label }));

  return (
    <div className="p-3">
      <ComponentCard
        title={isEdit ? "Edit District Leader" : "Add District Leader"}
        desc="Create and maintain district leader login credentials."
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="company_id">
                Company <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                id="company_id"
                value={companyUniqueId}
                onChange={(value) => {
                  onCompanyChange(value);
                  setFormData((prev) => ({ ...prev, district_id: "" }));
                }}
                options={companyOptions}
                placeholder={
                  loggedInCompanyUniqueId
                    ? "Company from logged-in profile"
                    : isSuperAdmin
                      ? "Select Company"
                      : "Only super admin can select company"
                }
                disabled={
                  Boolean(loggedInCompanyUniqueId) ||
                  (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                  companies.length === 0 ||
                  fetching
                }
              />
              {!loggedInCompanyUniqueId && !isSuperAdmin && (
                <p className="mt-1 text-xs text-red-500">
                  Company is not mapped to this login.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="project_id">
                Project <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                id="project_id"
                value={projectId}
                onChange={(value) => {
                  setProjectId(value);
                  setFormData((prev) => ({ ...prev, district_id: "" }));
                }}
                options={projectOptions}
                placeholder="Select Project"
                disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0 || fetching}
              />
            </div>

            <div>
              <Label htmlFor="district_id">
                District <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                id="district_id"
                value={formData.district_id}
                onChange={(value) => handleSelectChange("district_id", value)}
                options={districtOptions}
                placeholder="Select District"
                disabled={!companyUniqueId || !projectId || districtOptions.length === 0 || fetching}
              />
              <FieldError message={fieldErrors.district_id} />
            </div>

            <div>
              <Label htmlFor="username">
                Username <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input id="username" value={formData.username} onChange={handleInputChange} placeholder="Enter username" />
              <FieldError message={fieldErrors.username} />
            </div>

            <div>
              <Label htmlFor="leader_name">
                Leader Name
              </Label>
              <Input id="leader_name" value={formData.leader_name} onChange={handleInputChange} placeholder="Enter district leader name" />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={formData.email} onChange={handleInputChange} placeholder="Enter email" />
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <Label htmlFor="password">
                Password {isEdit ? "(leave blank to keep current)" : <span className="text-red-500 ml-1">*</span>}
              </Label>
              <PasswordInput id="password" value={formData.password} onChange={handleInputChange} placeholder="Enter password" />
              <FieldError message={fieldErrors.password} />
            </div>

            <div>
              <Label htmlFor="is_active">Status</Label>
              <Select
                id="is_active"
                value={formData.is_active}
                onChange={(value) => handleSelectChange("is_active", value)}
                options={activeOptions}
                placeholder="Select status"
                disabled={fetching}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
