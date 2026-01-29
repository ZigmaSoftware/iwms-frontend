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

type SelectOption = { value: string; label: string };

type TripDefinitionRecord = {
  routeplan_id?: string;
  staff_template_id?: string;
  property_id?: string;
  sub_property_id?: string;
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

const statusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const buildSelectOptions = (items: any[], labelKey: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.unique_id ?? ""),
      label: String(item?.[labelKey] ?? item?.display_code ?? item?.unique_id ?? ""),
    }))
    .filter((option) => option.value);

const toOptions = (items: any[], valueKey: string, labelKey: string, fallbackKey?: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(item?.[labelKey] ?? item?.[fallbackKey ?? ""] ?? item?.[valueKey] ?? ""),
    }))
    .filter((option) => option.value);

const getSubPropertyOptions = (
  subProperties: any[],
  propertyUniqueId?: string,
  propertyIdToPk?: Record<string, any>
): SelectOption[] => {
  if (!propertyUniqueId || !propertyIdToPk) {
    return toOptions(subProperties, "unique_id", "sub_property_name");
  }

  const propertyPk = propertyIdToPk[propertyUniqueId];

  const filtered = subProperties.filter(
    (sp) => sp.property_id === propertyPk
  );

  return toOptions(filtered, "unique_id", "sub_property_name");
};


const parseForeignKeyValue = (value: string): string | number => {
  if (!value) return value;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : value;
};

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

  const tripDefinitionApi = adminApi.tripDefinitions;
  const routePlanApi = adminApi.routePlans;
  const staffTemplateApi = adminApi.staffTemplate;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [routePlans, setRoutePlans] = useState<SelectOption[]>([]);
  const [staffTemplates, setStaffTemplates] = useState<SelectOption[]>([]);
  const [properties, setProperties] = useState<SelectOption[]>([]);
  const [subProperties, setSubProperties] = useState<SelectOption[]>([]);
  const [subPropertyCache, setSubPropertyCache] = useState<any[]>([]);
  const [propertyCache, setPropertyCache] = useState<any[]>([]);

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
  const stateRecord = (location.state as { record?: TripDefinitionRecord } | null)?.record;

  const normalizeNumber = (value: any): string =>
    value !== undefined && value !== null ? String(value) : "";

  const propertyIdToPk = useMemo(() =>
    propertyCache.reduce((acc, prop) => {
      acc[prop.unique_id] = prop.id;
      return acc;
    }, {} as Record<string, any>),
    [propertyCache]
  );


  const populateFormFromRecord = (record: TripDefinitionRecord) => {
    setFormData((prev) => ({
      ...prev,
      routeplan_id: record.routeplan_id ?? record.routeplan?.unique_id ?? "",
      staff_template_id: record.staff_template_id ?? record.staff_template?.unique_id ?? "",
      property_id: record.property_id ?? record.property?.unique_id ?? "",
      sub_property_id: record.sub_property_id ?? record.sub_property?.unique_id ?? "",
      trip_trigger_weight_kg: normalizeNumber(record.trip_trigger_weight_kg),
      max_vehicle_capacity_kg: normalizeNumber(record.max_vehicle_capacity_kg),
      approval_status: record.approval_status ?? "PENDING",
      status: record.status ?? "ACTIVE",
    }));
  };

  useEffect(() => {
    setFetching(true);
    Promise.all([
      routePlanApi.list(),
      staffTemplateApi.list(),
      propertyApi.list(),
      subPropertyApi.list(),
    ])
      .then(([routeRes, staffRes, propertyRes, subPropertyRes]) => {
        const normalizedRoutes = normalizeList(routeRes);
        const normalizedStaff = normalizeList(staffRes);

        setRoutePlans(buildSelectOptions(normalizedRoutes, "display_code"));
        setStaffTemplates(buildSelectOptions(normalizedStaff, "display_code"));
        const normalizedProperties = normalizeList(propertyRes);
        setPropertyCache(normalizedProperties);
        setProperties(toOptions(normalizedProperties, "unique_id", "property_name"));
        const normalizedSubProperties = normalizeList(subPropertyRes);
        setSubPropertyCache(normalizedSubProperties);
        setSubProperties(getSubPropertyOptions(normalizedSubProperties));
      })
      .catch((error: any) => {
        const message = extractErrorMessage(error) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      })
      .finally(() => setFetching(false));
  }, [propertyApi, routePlanApi, staffTemplateApi, subPropertyApi, t]);

  useEffect(() => {
    if (!isEdit || !stateRecord) return;

    populateFormFromRecord(stateRecord);
  }, [isEdit, stateRecord]);

  useEffect(() => {
    if (!isEdit || !id) return;

    tripDefinitionApi
      .get(id)
      .then((res: any) => {
        populateFormFromRecord({
          routeplan_id: res?.routeplan?.unique_id ?? "",
          staff_template_id: res?.staff_template?.unique_id ?? "",
          property_id: res?.property?.unique_id ?? "",
          sub_property_id: res?.sub_property?.unique_id ?? "",
          trip_trigger_weight_kg: res?.trip_trigger_weight_kg ?? "",
          max_vehicle_capacity_kg: res?.max_vehicle_capacity_kg ?? "",
          approval_status: res?.approval_status ?? "",
          status: res?.status ?? "ACTIVE",
        });
      })
      .catch((error: any) => {
        const message = extractErrorMessage(error) ?? t("common.load_failed");
        Swal.fire(t("common.error"), message, "error");
      });
  }, [id, isEdit, t, tripDefinitionApi]);
  useEffect(() => {
  if (!isEdit || !formData.property_id || !subPropertyCache.length) return;

  const options = getSubPropertyOptions(
    subPropertyCache,
    formData.property_id
  );

  setSubProperties(options);
}, [isEdit, formData.property_id, subPropertyCache]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
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
      Swal.fire(t("common.warning"), t("admin.trip_definition.validation_trigger"), "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        routeplan_id: parseForeignKeyValue(formData.routeplan_id),
        staff_template_id: parseForeignKeyValue(formData.staff_template_id),
        property_id: propertyIdToPk[formData.property_id] || formData.property_id,
        sub_property_id: formData.sub_property_id,
        trip_trigger_weight_kg: triggerWeight,
        max_vehicle_capacity_kg: maxCapacity,
        approval_status: formData.approval_status,
        status: formData.status,
      };

      if (isEdit && id) {
        await tripDefinitionApi.update(id, payload);
      } else {
        await tripDefinitionApi.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch (error: any) {
      const message = extractErrorMessage(error) ?? t("common.save_failed_desc");
      Swal.fire(t("common.save_failed"), message, "error");
    } finally {
      setLoading(false);
    }
  };

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
            <div>
              <Label>{t("admin.trip_definition.route_plan")}</Label>
              <Select
                value={formData.routeplan_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, routeplan_id: value }))}
                options={routePlans}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.staff_template")}</Label>
              <Select
                value={formData.staff_template_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, staff_template_id: value }))}
                options={staffTemplates}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.property")}</Label>
              <Select
                value={formData.property_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, property_id: value }))}
                options={properties}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.sub_property")}</Label>
              <Select
                value={formData.sub_property_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, sub_property_id: value }))}
                options={subProperties}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.trigger_weight")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.trip_trigger_weight_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, trip_trigger_weight_kg: e.target.value }))}
                placeholder={t("admin.trip_definition.trigger_weight")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.max_capacity")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.max_vehicle_capacity_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, max_vehicle_capacity_kg: e.target.value }))}
                placeholder={t("admin.trip_definition.max_capacity")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.status")}</Label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                placeholder={t("common.select_status")}
                disabled={fetching}
              />
            </div>

            <div>
              <Label>{t("admin.trip_definition.approval_status")}</Label>
              <Select
                value={formData.approval_status}
                onChange={(value) => setFormData((prev) => ({ ...prev, approval_status: value }))}
                options={approvalStatusOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
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
