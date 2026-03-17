import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
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
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

import { encryptSegment } from "@/utils/routeCrypto";

import {
  userScreenActionApi
} from "@/helpers/admin";

const firstErrorMessage = (value: unknown): string | undefined => {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
};

/* ------------------------------
    ROUTES
------------------------------ */
const encAdmins = encryptSegment("admins");
const encUserScreenAction = encryptSegment("userscreen-action");
const ENC_LIST_PATH = `/${encAdmins}/${encUserScreenAction}`;

/* ==========================================================
    COMPONENT START
========================================================== */
export default function UserScreenActionForm() {
  const { t } = useTranslation();
  const [actionName, setActionName] = useState("");
  const [variableName, setVariableName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const {
    companyUniqueId,
    projectId,
    companies,
    projects,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  /* ==========================================================
      FETCH EDIT DATA
  ========================================================== */
  useEffect(() => {
    if (!isEdit || !id) return;

    (async () => {
      try {
        const data = await userScreenActionApi.get(id);

        applyCompanyProjectFromRecord(data as Record<string, unknown>);
        setActionName(data.action_name || "");
        setVariableName(data.variable_name || "");
        setIsActive(Boolean(data.is_active));
      } catch {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      }
    })();
  }, [id, isEdit, applyCompanyProjectFromRecord, t]);

  /* ==========================================================
      SUBMIT HANDLER
  ========================================================== */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!companyUniqueId || !projectId || !actionName.trim() || !variableName.trim()) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    setLoading(true);

    const payload = {
      company_id: companyUniqueId,
      project_id: projectId,
      action_name: actionName.trim(),
      variable_name: variableName.trim(),
      is_active: isActive,
    };

    try {
      if (isEdit && id) {
        await userScreenActionApi.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await userScreenActionApi.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (err: unknown) {
      const errorData =
        (err as { response?: { data?: Record<string, unknown> } })?.response
          ?.data ?? {};

      const message =
        firstErrorMessage(errorData.company_id) ||
        firstErrorMessage(errorData.project_id) ||
        firstErrorMessage(errorData.action_name) ||
        firstErrorMessage(errorData.variable_name) ||
        firstErrorMessage(errorData.detail) ||
        t("common.unexpected_error");

      Swal.fire(t("common.save_failed"), message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
      JSX
  ========================================================== */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.user_screen_action") })
          : t("common.add_item", { item: t("admin.nav.user_screen_action") })
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company */}
          <div>
            <Label>{t("admin.nav.company")} *</Label>
            <Select
              value={companyUniqueId}
              onValueChange={onCompanyChange}
              disabled={
                Boolean(loggedInCompanyUniqueId) ||
                (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                companies.length === 0
              }
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.company"),
                  })}
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
          </div>

          {/* Project */}
          <div>
            <Label>{t("admin.nav.project")} *</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={!companyUniqueId || projects.length === 0}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.project"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Name */}
          <div>
            <Label>{t("common.action_name")} *</Label>
            <Input
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              placeholder={t("admin.user_screen_action.action_placeholder")}
              required
              className="input-validate w-full"
            />
          </div>

          {/* Variable Name */}
          <div>
            <Label>{t("common.variable_name")} *</Label>
            <Input
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              placeholder={t("admin.user_screen_action.variable_placeholder")}
              required
              className="input-validate w-full"
            />
          </div>

          {/* Status */}
          <div>
            <Label>{t("common.status")} *</Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setIsActive(v === "true")}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={loading}>
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
