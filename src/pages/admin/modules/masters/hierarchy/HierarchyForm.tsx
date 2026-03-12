import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ComponentCard from "@/components/common/ComponentCard";
import { getEncryptedRoute } from "@/utils/routeCache";
import { hierarchyApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

const { encMasters, encHierarchies } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encHierarchies}`;

type ApiError = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

export default function HierarchyForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
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
  } = useCompanyProjectSelection({ isEdit });

  useEffect(() => {
    if (!isEdit) return;

    hierarchyApi
      .get(id as string)
      .then((res: unknown) => {
        const record = (res ?? {}) as {
          level_name?: string;
          is_active?: boolean;
          company_unique_id?: string | number | null;
          company_id?: string | number | null;
          company?: { unique_id?: string | number | null };
          project_id?: string | number | null;
          project_unique_id?: string | number | null;
          project?: { unique_id?: string | number | null };
        };
        setName(record.level_name ?? "");
        setIsActive(Boolean(record.is_active));
        applyCompanyProjectFromRecord(
          record as unknown as Record<string, unknown>
        );
      })
      .catch((err: unknown) => {
        const message =
          (err as ApiError)?.response?.data?.detail || t("common.load_failed");
        console.error("Error fetching hierarchy:", err);
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: message,
        });
      });
  }, [applyCompanyProjectFromRecord, id, isEdit, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.missing_fields"),
      });
      return;
    }

    if (!companyUniqueId) {
      Swal.fire(
        "Error",
        !loggedInCompanyUniqueId && !isSuperAdmin
          ? "Company is not mapped to this login. Only super admin can choose a company."
          : "Company is required",
        "error"
      );
      return;
    }

    if (!projectId) {
      Swal.fire("Error", "Project is required", "error");
      return;
    }

    setLoading(true);
    try {
      const basePayload = {
        level_name: name.trim(),
        is_active: isActive,
        company_id: companyUniqueId,
        project_id: projectId,
      };
      if (isEdit) {
        await hierarchyApi.update(id as string, basePayload);
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await hierarchyApi.create(basePayload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate(ENC_LIST_PATH);
    } catch (error: unknown) {
      const message =
        (error as ApiError)?.response?.data?.detail ||
        t("common.save_failed_desc");
      console.error("Failed to save hierarchy:", error);
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.hierarchy") })
          : t("common.add_item", { item: t("admin.nav.hierarchy") })
      }
    >
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
          <div>
            <Label>Company *</Label>
            <Select
              value={companyUniqueId}
              onValueChange={onCompanyChange}
              disabled={
                Boolean(loggedInCompanyUniqueId) ||
                (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                companies.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loggedInCompanyUniqueId
                      ? "Company from logged-in profile"
                      : isSuperAdmin
                        ? "Select Company"
                        : "Only super admin can select company"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loggedInCompanyUniqueId && !isSuperAdmin && (
              <p className="mt-1 text-xs text-red-500">
                Company is not mapped to this login. Only super admin can view
                all companies.
              </p>
            )}
            {isSuperAdmin && !loggedInCompanyUniqueId && companies.length === 0 && (
              <p className="mt-1 text-xs text-red-500">No companies found.</p>
            )}
          </div>

          <div>
            <Label>Project *</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={!companyUniqueId || projects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companyUniqueId && projects.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No projects found for this company.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="name">
              {t("common.item_name", { item: t("admin.nav.hierarchy") })}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.hierarchy"),
              })}
              required
            />
          </div>

          <div>
            <Label htmlFor="isActive">
              {t("common.status")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(value) => setIsActive(value === "true")}
            >
              <SelectTrigger id="isActive">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading
              ? isEdit
                ? t("common.updating")
                : t("common.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate(ENC_LIST_PATH)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
