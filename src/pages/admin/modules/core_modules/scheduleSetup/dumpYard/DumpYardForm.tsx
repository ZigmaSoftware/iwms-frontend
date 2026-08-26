import { createCrudRoutePaths } from "@/utils/routePaths";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
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
import { AutoDetectLocationButton } from "@/components/common/AutoDetectLocationButton";
import { dumpYardApi } from "@/helpers/admin";
import { dumpYardSchema } from "@/schemas/core_modules/scheduleSetup/dumpYard.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

const toStringOrEmpty = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
};

const { encScheduleSetup, encDumpYards } = getEncryptedRoute();
const { listPath: ENC_LIST_PATH } = createCrudRoutePaths(encScheduleSetup, encDumpYards);

export default function DumpYardForm() {
  const { t } = useTranslation();
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
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const extractErr = useCallback(
    (error: unknown): string => {
      const err = error as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;

      if (typeof data === "string") return data;
      if (data && typeof data === "object") {
        return Object.entries(data as Record<string, unknown>)
          .map(([key, value]) => (Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${String(value)}`))
          .join("\n");
      }

      if (err.message) return err.message;
      return t("common.unexpected_error");
    },
    [t],
  );

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingProjectCandidates, setPendingProjectCandidates] = useState<{
    projectUniqueId: string;
    projectId: string;
    projectName: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    dumpYardApi
      .read(id)
      .then((data: unknown) => {
        if (cancelled) return;
        const record = data as Record<string, unknown>;
        setName(toStringOrEmpty(record.name));
        setLatitude(toStringOrEmpty(record.latitude));
        setLongitude(toStringOrEmpty(record.longitude));
        setIsActive(toBoolean(record.is_active, true));

        applyCompanyProjectFromRecord(record);
        const project = record.project as Record<string, unknown> | undefined;
        setPendingProjectCandidates({
          projectUniqueId: toStringOrEmpty(record.project_unique_id ?? project?.unique_id ?? ""),
          projectId: toStringOrEmpty(record.project_id ?? ""),
          projectName: toStringOrEmpty(record.project_name ?? ""),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        Swal.fire(t("common.error"), extractErr(err), "error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingProjectCandidates || projects.length === 0) return;
    const { projectUniqueId, projectId: rawId, projectName } = pendingProjectCandidates;
    let match = projects.find((p) => projectUniqueId && p.value === projectUniqueId);
    if (!match) match = projects.find((p) => rawId && p.value === rawId);
    if (!match && projectName) match = projects.find((p) => p.label.toLowerCase() === projectName.toLowerCase());
    if (match) setProjectId(match.value);
    setPendingProjectCandidates(null);
  }, [projects, pendingProjectCandidates, setProjectId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));

    const validation = parseWithSchema(dumpYardSchema, {
      name: name.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
    });
    if (!validation.success) {
      setFieldErrors(validation.errors);
    } else {
      setFieldErrors({});
    }

    if (missingFields.length > 0 || !validation.success) {
      const schemaMessages = !validation.success ? Object.values(validation.errors) : [];
      Swal.fire(
        t("common.warning"),
        [...missingFields, ...schemaMessages].join(", "),
        "warning",
      );
      return;
    }

    const parsedLatitude = Number.parseFloat(latitude);
    const parsedLongitude = Number.parseFloat(longitude);

    const payload = {
      company_id: companyUniqueId,
      project_id: projectId,
      name: name.trim(),
      latitude: parsedLatitude.toFixed(6),
      longitude: parsedLongitude.toFixed(6),
      is_active: isActive,
    };

    try {
      setIsSubmitting(true);
      if (isEdit && id) {
        await dumpYardApi.update(id, payload);
      } else {
        await dumpYardApi.create(payload);
      }

      Swal.fire(t("common.success"), isEdit ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (error) {
      Swal.fire(t("common.save_failed"), extractErr(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Dump Yard" : "Add Dump Yard"}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>
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
              <SelectValue placeholder={loggedInCompanyUniqueId ? "Company from logged-in profile" : "Select Company"} />
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
          <Select value={projectId} onValueChange={setProjectId} disabled={!companyUniqueId || projects.length === 0}>
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
          <p className="mt-1 text-xs text-gray-500">Each project can have only one dump yard.</p>
        </div>

        <div>
          <Label>Dump Yard Name *</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Municipal Waste Processing Yard"
            required
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div>
          <Label>{t("common.latitude")} *</Label>
          <Input
            type="number"
            step="0.000001"
            value={latitude}
            onChange={(e) => {
              setLatitude(e.target.value);
              setFieldErrors((prev) => ({ ...prev, latitude: "" }));
            }}
            placeholder="13.083000"
            required
          />
          <FieldError message={fieldErrors.latitude} />
        </div>

        <div>
          <Label>{t("common.longitude")} *</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => {
                setLongitude(e.target.value);
                setFieldErrors((prev) => ({ ...prev, longitude: "" }));
              }}
              placeholder="80.271000"
              required
            />
            <AutoDetectLocationButton
              onDetected={({ latitude: lat, longitude: lng }) => {
                setLatitude(String(lat));
                setLongitude(String(lng));
                setFieldErrors((prev) => ({ ...prev, latitude: "", longitude: "" }));
              }}
            />
          </div>
          <FieldError message={fieldErrors.longitude} />
        </div>

        <div>
          <Label>{t("common.status")}</Label>
          <Select value={isActive ? "true" : "false"} onValueChange={(value) => setIsActive(value === "true")}>
            <SelectTrigger className="input-validate w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.active")}</SelectItem>
              <SelectItem value="false">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (isEdit ? t("common.updating") : t("common.saving")) : isEdit ? t("common.update") : t("common.save")}
          </Button>
          <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } })}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
