import { useEffect, useMemo, useRef, useState } from "react";
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
import { normalizeList } from "@/utils/forms";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  const routeState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
    record?: TripDefinitionRecord;
  } | null;

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

  // ── API instances (unchanged) ─────────────────────────────────────────────
  const routePlanApi = adminApi.routePlans;
  const staffTemplateApi = adminApi.staffTemplateCreation;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  // ── Record fetch ──────────────────────────────────────────────────────────
  const [recordData, setRecordData] = useState<TripDefinitionRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    adminApi.tripDefinitions.get(id)
      .then((res: any) => {
        if (cancelled) return;
        setRecordData(res);
        setLoadingRecord(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoadingRecord(false);
        const message = extractErrorMessage(err) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  // ── Submitting state ──────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const stateRecord = routeState?.record;

  const normalizeNumber = (value: any): string =>
    value !== undefined && value !== null ? String(value) : "";

  const populateFormFromRecord = (record: TripDefinitionRecord) => {
    const rpId = record.routeplan_id ?? record.routeplan?.unique_id ?? "";
    const stId = record.staff_template_id ?? record.staff_template?.unique_id ?? "";
    const propId = record.property_id ?? record.property?.unique_id ?? "";
    const subPropId = record.sub_property_id ?? record.sub_property?.unique_id ?? "";

    setFormData((prev) => ({
      ...prev,
      // Preserve existing non-empty values so a stale response
      // doesn't overwrite what stateRecord already set correctly.
      routeplan_id: rpId || prev.routeplan_id,
      staff_template_id: stId || prev.staff_template_id,
      property_id: propId || prev.property_id,
      sub_property_id: subPropId || prev.sub_property_id,
      trip_trigger_weight_kg: normalizeNumber(record.trip_trigger_weight_kg),
      max_vehicle_capacity_kg: normalizeNumber(record.max_vehicle_capacity_kg),
      approval_status: record.approval_status ?? "PENDING",
      status: record.status ?? "ACTIVE",
    }));

    // Seed the selected option even when the current selection belongs to
    // another project and is missing from the project-filtered dropdown API.
    // If a cached partial record supplied only an ID first, a later full detail
    // response upgrades its label from the ID to the actual display name.
// Keep the already selected values available in the dropdown.
// This is required when the selected linked value is not returned
// by the currently selected company/project API filter.
if (rpId) {
  setRoutePlans((prev) =>
    prev.some((o) => o.value === rpId)
      ? prev
      : [
          {
            value: rpId,
            label: record.routeplan?.display_code ?? rpId,
          },
          ...prev,
        ]
  );
}

if (stId) {
  setStaffTemplates((prev) =>
    prev.some((o) => o.value === stId)
      ? prev
      : [
          {
            value: stId,
            label: record.staff_template?.display_code ?? stId,
          },
          ...prev,
        ]
  );
}

if (propId) {
  setProperties((prev) =>
    prev.some((o) => o.value === propId)
      ? prev
      : [
          {
            value: propId,
            label: record.property?.property_name ?? propId,
          },
          ...prev,
        ]
  );
}

if (subPropId && propId) {
  setSubPropertyCache((prev) =>
    prev.some((o) => String(o.unique_id ?? "") === subPropId)
      ? prev
      : [
          ...prev,
          {
            unique_id: subPropId,
            sub_property_name:
              record.sub_property?.sub_property_name ?? subPropId,
            property_id: propId,
          },
        ]
  );
}

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
    if (projectId) params.project = projectId;

    Promise.all([
      routePlanApi.list({ params }),
      staffTemplateApi.list({ params }),
      propertyApi.list({ params }),
      subPropertyApi.list({ params }),
    ])
      .then(([routeRes, staffRes, propertyRes, subPropertyRes]) => {
        // Merge API results with any pre-seeded current values that may be from
        // a different company/project (e.g. cross-project linked records).
        // The pre-seeded items are prepended by populateFormFromRecord so the
        // currently-selected value always appears in the dropdown.
        const mergeSelectOptions = (
          fresh: SelectOption[],
          prev: SelectOption[]
        ): SelectOption[] => {
          const freshValues = new Set(fresh.map((o) => o.value));
          return [...fresh, ...prev.filter((o) => !freshValues.has(o.value))];
        };

        setRoutePlans((prev) =>
          mergeSelectOptions(
            buildSelectOptions(normalizeList(routeRes), "display_code"),
            prev
          )
        );
        setStaffTemplates((prev) =>
          mergeSelectOptions(
            buildSelectOptions(normalizeList(staffRes), "display_code"),
            prev
          )
        );
        setProperties((prev) =>
          mergeSelectOptions(
            buildSelectOptions(normalizeList(propertyRes), "property_name"),
            prev
          )
        );
        setSubPropertyCache((prev) => {
          const fresh = normalizeList(subPropertyRes);
          const freshIds = new Set(
            fresh.map((i: any) => String(i.unique_id ?? ""))
          );
          return [...fresh, ...prev.filter((o) => !freshIds.has(String(o.unique_id ?? "")))];
        });
      })
      .catch((error: any) => {
        const message =
          extractErrorMessage(error) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      })
      .finally(() => setFetching(false));
  }, [companyUniqueId, projectId, t]);

  // ── Edit-mode populate ────────────────────────────────────────────────────
  // hasPopulated guards against re-populating the form when a background
  // refetch completes and changes recordData a second time — which would wipe
  // any changes the user made after load.
  //
  // Priority:
  //   1. Direct API detail data (authoritative — includes full nested objects
  //      from the server, even on second edit).
  //   2. stateRecord only as a fallback while the detail fetch is in flight
  //      (first edit). We do NOT mark hasPopulated in this path so the
  //      definitive API data can still upgrade it when it arrives.
  const hasPopulated = useRef(false);

  useEffect(() => {
    if (!isEdit) return;
    if (hasPopulated.current) return;

    if (recordData) {
      applyCompanyProjectFromRecord(recordData as unknown as Record<string, unknown>);
      populateFormFromRecord(recordData);
      hasPopulated.current = true;
      return;
    }

    // Cold load (first edit): use stateRecord immediately so the user sees
    // values before the network fetch completes.  hasPopulated stays false
    // so the API response will upgrade this when it arrives.
    if (stateRecord) {
      applyCompanyProjectFromRecord(
        stateRecord as unknown as Record<string, unknown>
      );
      populateFormFromRecord(stateRecord);
    }
  }, [applyCompanyProjectFromRecord, isEdit, stateRecord, recordData]);

  // ── Sub-property derived options ──────────────────────────────────────────
  const subProperties = useMemo(
    () => getSubPropertyOptions(subPropertyCache, formData.property_id),
    [formData.property_id, subPropertyCache]
  );

  // Reset sub_property_id when it no longer belongs to the selected property.
  // Guard with `fetching` to avoid resetting during the initial API load when
  // subPropertyCache is still empty but sub_property_id is already set from
  // the record (would incorrectly clear the value and disable the field).
  useEffect(() => {
    if (fetching) return;
    if (!formData.sub_property_id) return;
    const isValid = subProperties.some(
      (option) => option.value === formData.sub_property_id
    );
    if (!isValid) {
      setFormData((prev) => ({ ...prev, sub_property_id: "" }));
    }
  }, [fetching, formData.sub_property_id, subProperties]);

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

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.tripDefinitions.update(id, payload);
      } else {
        await adminApi.tripDefinitions.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (error: any) {
      const message =
        extractErrorMessage(error) ?? t("common.save_failed_desc");
      Swal.fire(t("common.save_failed"), message, "error");
    } finally {
      setIsSubmitting(false);
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
              disabled={isSubmitting || fetching || loadingRecord}
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
              onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } })}
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
