import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { getEncryptedRoute } from "@/utils/routeCache";
import {
  useVehicleTypeQuery,
  useCreateVehicleTypeMutation,
  useUpdateVehicleTypeMutation,
} from "@/tanstack/admin";

const { encTransportMaster, encVehicleType } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encTransportMaster}/${encVehicleType}`;

const toStr = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function VehicleTypeCreationForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // ── Company / Project selection (same hook used across all forms) ──────────
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

  // ── TanStack queries & mutations ──────────────────────────────────────────
  const vehicleTypeQuery = useVehicleTypeQuery(id);
  const createMutation = useCreateVehicleTypeMutation();
  const updateMutation = useUpdateVehicleTypeMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Local form state ──────────────────────────────────────────────────────
  const [vehicleTypeName, setVehicleTypeName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // ── Error extractor (mirrors WasteTypeForm pattern) ───────────────────────
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
              : `${key}: ${String(value)}`
          )
          .join("\n");
      }
      if (err.message) return err.message;
      return t("common.unexpected_error");
    },
    [t]
  );

  // ── Populate form when editing ────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !vehicleTypeQuery.data) return;

    const data = vehicleTypeQuery.data as Record<string, unknown>;
    setVehicleTypeName(toStr(data.vehicleType));
    setDescription(toStr(data.description));
    setIsActive(Boolean(data.is_active));
    applyCompanyProjectFromRecord(data);
  }, [applyCompanyProjectFromRecord, isEdit, vehicleTypeQuery.data]);

  // ── Show error if fetch fails in edit mode ────────────────────────────────
  useEffect(() => {
    if (!isEdit || !vehicleTypeQuery.isError) return;
    Swal.fire(
      t("admin.vehicle_type.load_failed_title"),
      extractErr(vehicleTypeQuery.error),
      "error"
    );
  }, [extractErr, isEdit, vehicleTypeQuery.error, vehicleTypeQuery.isError, t]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
    if (!vehicleTypeName.trim())
      missingFields.push(t("admin.vehicle_type.label"));

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        `${t("common.please_fill")}: ${missingFields.join(", ")}`,
        "warning"
      );
      return;
    }

    const payload = {
      vehicleType: vehicleTypeName.trim(),
      description: description.trim() || null,
      is_active: isActive,
      company_id_input: companyUniqueId,
      project_id_input: projectId,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload });
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createMutation.mutateAsync(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire(t("common.save_failed"), extractErr(error), "error");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ComponentCard
      title={
        isEdit
          ? t("admin.vehicle_type.title_edit")
          : t("admin.vehicle_type.title_add")
      }
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        noValidate
      >
        {/* Company */}
        <div>
          <Label>
            {t("admin.nav.company")} <span className="text-red-500">*</span>
          </Label>
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
                    ? t("common.company_from_profile")
                    : t("common.select_item_placeholder", {
                        item: t("admin.nav.company"),
                      })
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

        {/* Project */}
        <div>
          <Label>
            {t("admin.nav.project")} <span className="text-red-500">*</span>
          </Label>
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

        {/* Vehicle Type Name */}
        <div>
          <Label>
            {t("admin.vehicle_type.label")}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            value={vehicleTypeName}
            onChange={(e) => setVehicleTypeName(e.target.value)}
            placeholder={t("admin.vehicle_type.placeholder")}
            required
          />
        </div>

        {/* Status */}
        <div>
          <Label>
            {t("common.status")} <span className="text-red-500">*</span>
          </Label>
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

        {/* Description */}
        <div className="md:col-span-2">
          <Label>{t("common.description")}</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("common.description_optional")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
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