import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  useTripDefinitionQuery,
  useCreateTripDefinitionMutation,
  useUpdateTripDefinitionMutation,
} from "@/tanstack/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string };

type TripDefinitionRecord = {
  routeplan_id?: string;
  staff_template_id?: string;
  property_id?: string;
  sub_property_id?: string;
  company_id?: string;
  project_id?: string;
  routeplan?: { unique_id?: string; display_code?: string };
  staff_template?: { unique_id?: string; display_code?: string };
  property?: { unique_id?: string; property_name?: string };
  sub_property?: { unique_id?: string; sub_property_name?: string };
  trip_trigger_weight_kg?: number | string;
  max_vehicle_capacity_kg?: number | string;
  approval_status?: string;
  status?: string;
};

type TripDefinitionFormState = {
  routeplan_id: string;
  staff_template_id: string;
  property_id: string;
  sub_property_id: string;
  trip_trigger_weight_kg: string;
  max_vehicle_capacity_kg: string;
  approval_status: string;
  status: string;
};

// ─── Static options ───────────────────────────────────────────────────────────

const statusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

// ─── Helpers (unchanged from original) ───────────────────────────────────────

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.results ?? [];

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const filterByCompanyProject = (
  items: any[],
  companyId: string,
  projectId: string
) => {
  const hasContextFields = items.some((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    return Boolean(rowCompanyId || rowProjectId);
  });

  if (!hasContextFields) return items;

  return items.filter((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    const companyMatches = !companyId || rowCompanyId === companyId;
    const projectMatches = !projectId || rowProjectId === projectId;
    return companyMatches && projectMatches;
  });
};

const buildSelectOptions = (items: any[], labelKey: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.unique_id ?? ""),
      label: String(
        item?.[labelKey] ?? item?.display_code ?? item?.unique_id ?? ""
      ),
    }))
    .filter((option) => option.value);

const getSubPropertyOptions = (
  subProperties: any[],
  propertyUniqueId?: string
): SelectOption[] =>
  subProperties
    .filter(
      (item) =>
        !propertyUniqueId ||
        String(item?.property_id ?? "") === propertyUniqueId
    )
    .map((item) => ({
      value: String(item?.unique_id ?? ""),
      label: String(item?.sub_property_name ?? item?.unique_id ?? ""),
    }))
    .filter((option) => option.value);

const extractErrorMessage = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TripDefinitionForm() {
  const { t } = useTranslation();

  const approvalStatusOptions: SelectOption[] = [
    { value: "PENDING", label: t("common.pending") },
    { value: "APPROVED", label: t("common.approved") },
    { value: "REJECTED", label: t("common.rejected") },
  ];

  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
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

  // ── API instances (unchanged) ─────────────────────────────────────────────
  const routePlanApi = adminApi.routePlans;
  const staffTemplateApi = adminApi.staffTemplateCreation;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  // ── TanStack mutations ────────────────────────────────────────────────────
  const tripDefinitionQuery = useTripDefinitionQuery(id);
  const createMutation = useCreateTripDefinitionMutation();
  const updateMutation = useUpdateTripDefinitionMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Local state (dropdown data — stays local, not in TanStack cache) ──────
  const [fetching, setFetching] = useState(false);
  const [routePlans, setRoutePlans] = useState<SelectOption[]>([]);
  const [staffTemplates, setStaffTemplates] = useState<SelectOption[]>([]);
  const [properties, setProperties] = useState<SelectOption[]>([]);
  const [subPropertyCache, setSubPropertyCache] = useState<any[]>([]);

  const [formData, setFormData] = useState<TripDefinitionFormState>({
    routeplan_id: "",
    staff_template_id: "",
    property_id: "",
    sub_property_id: "",
    trip_trigger_weight_kg: "",
    max_vehicle_capacity_kg: "",
    approval_status: "PENDING",
    status: "ACTIVE",
  });

  const { encTransportMaster, encTripDefinition } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encTripDefinition}`;

  const stateRecord = (
    location.state as { record?: TripDefinitionRecord } | null
  )?.record;

  const normalizeNumber = (value: any): string =>
    value !== undefined && value !== null ? String(value) : "";

  const populateFormFromRecord = (record: TripDefinitionRecord) => {
    setFormData((prev) => ({
      ...prev,
      routeplan_id:
        record.routeplan_id ?? record.routeplan?.unique_id ?? "",
      staff_template_id:
        record.staff_template_id ?? record.staff_template?.unique_id ?? "",
      property_id:
        record.property_id ?? record.property?.unique_id ?? "",
      sub_property_id:
        record.sub_property_id ?? record.sub_property?.unique_id ?? "",
      trip_trigger_weight_kg: normalizeNumber(record.trip_trigger_weight_kg),
      max_vehicle_capacity_kg: normalizeNumber(record.max_vehicle_capacity_kg),
      approval_status: record.approval_status ?? "PENDING",
      status: record.status ?? "ACTIVE",
    }));
  };

  // ── Fetch dropdown data when company/project changes ─────────────────────
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setRoutePlans([]);
      setStaffTemplates([]);
      setProperties([]);
      setSubPropertyCache([]);
      return;
    }

    setFetching(true);
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;

    Promise.all([
      routePlanApi.list({ params }),
      staffTemplateApi.list({ params }),
      propertyApi.list({ params }),
      subPropertyApi.list({ params }),
    ])
      .then(([routeRes, staffRes, propertyRes, subPropertyRes]) => {
        const normalizedRoutes = filterByCompanyProject(
          normalizeList(routeRes),
          companyUniqueId,
          projectId
        );
        const normalizedStaff = filterByCompanyProject(
          normalizeList(staffRes),
          companyUniqueId,
          projectId
        );
        const normalizedProperties = filterByCompanyProject(
          normalizeList(propertyRes),
          companyUniqueId,
          projectId
        );
        const normalizedSubProperties = filterByCompanyProject(
          normalizeList(subPropertyRes),
          companyUniqueId,
          projectId
        );

        setRoutePlans(buildSelectOptions(normalizedRoutes, "display_code"));
        setStaffTemplates(buildSelectOptions(normalizedStaff, "display_code"));
        setProperties(
          buildSelectOptions(normalizedProperties, "property_name")
        );
        setSubPropertyCache(normalizedSubProperties);
      })
      .catch((error: any) => {
        const message =
          extractErrorMessage(error) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      })
      .finally(() => setFetching(false));
  }, [companyUniqueId, projectId, t]);

  // ── Populate from router state (fast path — no extra API call) ────────────
  useEffect(() => {
    if (!isEdit || !stateRecord) return;
    applyCompanyProjectFromRecord(
      stateRecord as unknown as Record<string, unknown>
    );
    populateFormFromRecord(stateRecord);
  }, [applyCompanyProjectFromRecord, isEdit, stateRecord]);

  // ── Populate from TanStack query (edit mode — when no router state) ───────
  useEffect(() => {
    if (!isEdit || !tripDefinitionQuery.data) return;

    const res = tripDefinitionQuery.data;
    applyCompanyProjectFromRecord(res as unknown as Record<string, unknown>);
    populateFormFromRecord({
      routeplan_id: res.routeplan?.unique_id ?? res.routeplan_id ?? "",
      staff_template_id:
        res.staff_template?.unique_id ?? res.staff_template_id ?? "",
      property_id: res.property?.unique_id ?? res.property_id ?? "",
      sub_property_id:
        res.sub_property?.unique_id ?? res.sub_property_id ?? "",
      company_id: String(res.company_id ?? ""),
      project_id: String(res.project_id ?? ""),
      trip_trigger_weight_kg: res.trip_trigger_weight_kg,
      max_vehicle_capacity_kg: res.max_vehicle_capacity_kg,
      approval_status: res.approval_status ?? "",
      status: res.status ?? "ACTIVE",
    });
  }, [applyCompanyProjectFromRecord, isEdit, tripDefinitionQuery.data]);

  // ── Show fetch error ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !tripDefinitionQuery.isError) return;
    const message =
      extractErrorMessage(tripDefinitionQuery.error) ?? t("common.load_failed");
    Swal.fire(t("common.error"), message, "error");
  }, [isEdit, tripDefinitionQuery.isError, tripDefinitionQuery.error, t]);

  // ── Sub-property derived options ──────────────────────────────────────────
  const subProperties = useMemo(
    () => getSubPropertyOptions(subPropertyCache, formData.property_id),
    [formData.property_id, subPropertyCache]
  );

  // Reset sub_property_id when it no longer belongs to selected property
  useEffect(() => {
    if (!formData.sub_property_id) return;
    const isValid = subProperties.some(
      (option) => option.value === formData.sub_property_id
    );
    if (!isValid) {
      setFormData((prev) => ({ ...prev, sub_property_id: "" }));
    }
  }, [formData.sub_property_id, subProperties]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !companyUniqueId ||
      !projectId ||
      !formData.routeplan_id ||
      !formData.staff_template_id ||
      !formData.property_id ||
      !formData.sub_property_id ||
      !formData.trip_trigger_weight_kg ||
      !formData.max_vehicle_capacity_kg
    ) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    const triggerWeight = Number(formData.trip_trigger_weight_kg);
    const maxCapacity = Number(formData.max_vehicle_capacity_kg);

    if (!Number.isFinite(triggerWeight) || !Number.isFinite(maxCapacity)) {
      Swal.fire(t("common.warning"), t("common.invalid_data"), "warning");
      return;
    }

    if (triggerWeight >= maxCapacity) {
      Swal.fire(
        t("common.warning"),
        t("admin.trip_definition.validation_trigger"),
        "warning"
      );
      return;
    }

    const payload = {
      company_id_input: companyUniqueId,
      project_id_input: projectId,
      routeplan_id: formData.routeplan_id,
      staff_template_id: formData.staff_template_id,
      property_id: formData.property_id,
      sub_property_id: formData.sub_property_id,
      trip_trigger_weight_kg: triggerWeight,
      max_vehicle_capacity_kg: maxCapacity,
      approval_status: formData.approval_status,
      status: formData.status,
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const message =
        extractErrorMessage(error) ?? t("common.save_failed_desc");
      Swal.fire(t("common.save_failed"), message, "error");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <ComponentCard
        title={
          isEdit
            ? t("admin.trip_definition.title_edit")
            : t("admin.trip_definition.title_add")
        }
        desc={t("admin.trip_definition.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Company */}
            <div>
              <Label>{t("admin.nav.company")}</Label>
              <select
                value={companyUniqueId}
                onChange={(e) => onCompanyChange(e.target.value)}
                disabled={
                  Boolean(loggedInCompanyUniqueId) ||
                  (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                  companies.length === 0
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loggedInCompanyUniqueId
                    ? t("common.company_from_profile")
                    : t("common.select_item_placeholder", {
                        item: t("admin.nav.company"),
                      })}
                </option>
                {companies.map((company) => (
                  <option key={company.value} value={company.value}>
                    {company.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <Label>{t("admin.nav.project")}</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={!companyUniqueId || projects.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {companyUniqueId
                    ? t("common.select_item_placeholder", {
                        item: t("admin.nav.project"),
                      })
                    : t("common.select_company_first", {
                        defaultValue: "Select a company first",
                      })}
                </option>
                {projects.map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Route Plan */}
            <div>
              <Label>{t("admin.trip_definition.route_plan")}</Label>
              <Select
                value={formData.routeplan_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, routeplan_id: value }))
                }
                options={routePlans}
                placeholder={t("common.select_option")}
                disabled={fetching || !projectId}
                required
              />
            </div>

            {/* Staff Template */}
            <div>
              <Label>{t("admin.trip_definition.staff_template")}</Label>
              <Select
                value={formData.staff_template_id}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    staff_template_id: value,
                  }))
                }
                options={staffTemplates}
                placeholder={t("common.select_option")}
                disabled={fetching || !projectId}
                required
              />
            </div>

            {/* Property */}
            <div>
              <Label>{t("admin.trip_definition.property")}</Label>
              <Select
                value={formData.property_id}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    property_id: value,
                    sub_property_id:
                      prev.property_id === value ? prev.sub_property_id : "",
                  }))
                }
                options={properties}
                placeholder={t("common.select_option")}
                disabled={fetching || !projectId}
                required
              />
            </div>

            {/* Sub Property */}
            <div>
              <Label>{t("admin.trip_definition.sub_property")}</Label>
              <Select
                value={formData.sub_property_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, sub_property_id: value }))
                }
                options={subProperties}
                placeholder={t("common.select_option")}
                disabled={fetching || !formData.property_id}
                required
              />
            </div>

            {/* Trigger Weight */}
            <div>
              <Label>{t("admin.trip_definition.trigger_weight")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.trip_trigger_weight_kg}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trip_trigger_weight_kg: e.target.value,
                  }))
                }
                placeholder={t("admin.trip_definition.trigger_weight")}
              />
            </div>

            {/* Max Capacity */}
            <div>
              <Label>{t("admin.trip_definition.max_capacity")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.max_vehicle_capacity_kg}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_vehicle_capacity_kg: e.target.value,
                  }))
                }
                placeholder={t("admin.trip_definition.max_capacity")}
              />
            </div>

            {/* Status */}
            <div>
              <Label>{t("admin.trip_definition.status")}</Label>
              <Select
                value={formData.status}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
                options={statusOptions}
                placeholder={t("common.select_status")}
                disabled={fetching}
              />
            </div>

            {/* Approval Status */}
            <div>
              <Label>{t("admin.trip_definition.approval_status")}</Label>
              <Select
                value={formData.approval_status}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, approval_status: value }))
                }
                options={approvalStatusOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting
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