import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

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

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";

const { encMasters, encWasteTypes } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encWasteTypes}`;

const toStringOrEmpty = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const WASTE_TYPE_FIELDS: Record<string, string[]> = {
  waste_type_name: ["waste_type_name", "name"],
  is_active: ["is_active"],
};

export default function WasteTypeForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } =
    useFieldVisibility("masters", "waste-types", WASTE_TYPE_FIELDS);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
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
  } = useCompanyProjectSelection({ isEdit, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

  const [recordData, setRecordData] = useState<any>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractErr = useCallback(
    (error: unknown): string => {
      const err = error as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;

      if (typeof data === "string") return data;
      if (data && typeof data === "object") {
        return Object.entries(data as Record<string, unknown>)
          .map(([key, value]) =>
            Array.isArray(value)
              ? `${key}: ${value.join(", ")}`
              : `${key}: ${String(value)}`,
          )
          .join("\n");
      }

      if (err.message) return err.message;
      return t("common.unexpected_error");
    },
    [t],
  );

  const [wasteTypeName, setWasteTypeName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch waste type record in edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    adminApi.wasteTypes.get(id)
      .then((res: any) => {
        if (cancelled) return;
        const data = res as Record<string, unknown>;
        setRecordData(data);
        setLoadingRecord(false);
        setWasteTypeName(
          toStringOrEmpty(data.waste_type_name ?? data.name ?? data.property_name),
        );
        setIsActive(Boolean(data.is_active));
        applyCompanyProjectFromRecord(data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoadingRecord(false);
        Swal.fire(t("common.error"), extractErr(err), "error");
      });
    return () => { cancelled = true; };
  }, [id, isEdit, applyCompanyProjectFromRecord]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
    if (
      getMissingRequiredFields(
        ["waste_type_name"],
        (fieldKey) =>
          ({ waste_type_name: wasteTypeName.trim() })[fieldKey as "waste_type_name"],
      ).length > 0
    ) {
      missingFields.push(
        t("common.item_name", { item: t("common.waste_type") }),
      );
    }

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
        "warning",
      );
      return;
    }

    setLoading(true);
    setIsSubmitting(true);
    const rawPayload = {
      company_id: companyUniqueId,
      project_id: projectId,
      waste_type_name: wasteTypeName.trim(),
      is_active: isActive,
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

    try {
      if (isEdit && id) {
        await adminApi.wasteTypes.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await adminApi.wasteTypes.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (error) {
      Swal.fire(t("common.save_failed"), extractErr(error), "error");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("common.waste_type") })
          : t("common.add_item", { item: t("common.waste_type") })
      }
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        noValidate
      >
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
                placeholder={
                  loggedInCompanyUniqueId
                    ? "Company from logged-in profile"
                    : "Select Company"
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
        </div>

        <div>
          <Label>{t("admin.nav.project")} *</Label>
          <Select
            value={projectId}
            onValueChange={setProjectId}
            disabled={!companyUniqueId || projects.length === 0}
          >
            <SelectTrigger className="input-validate w-full">
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
        </div>

        {showField("waste_type_name") && (
          <div>
            <Label>
              {t("common.item_name", { item: t("common.waste_type") })} *
            </Label>
            <Input
              value={wasteTypeName}
              onChange={(e) => setWasteTypeName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("common.waste_type"),
              })}
              required
            />
          </div>
        )}

        {showField("is_active") && (
          <div>
            <Label>{t("common.status")} *</Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(value) => setIsActive(value === "true")}
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
        )}

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={loading || isSubmitting}>
            {loading || isSubmitting
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
            onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } })}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
