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

type TripInstanceFormState = {
  trip_definition_id: string;
  staff_template_id: string;
  alternative_staff_template_id: string;
  zone_id: string;
  vehicle_id: string;
  property_id: string;
  sub_property_id: string;
  trigger_weight_kg: string;
  max_capacity_kg: string;
  current_load_kg: string;
  start_load_kg: string;
  end_load_kg: string;
  trip_start_time: string;
  trip_end_time: string;
  status: string;
};

const statusOptions: SelectOption[] = [
  { value: "WAITING_FOR_LOAD", label: "Waiting for Load" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const toOptions = (items: any[], valueKey: string, labelKey: string, fallbackKey?: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(item?.[labelKey] ?? item?.[fallbackKey ?? ""] ?? item?.[valueKey] ?? ""),
    }))
    .filter((option) => option.value);

const toDateTimeLocal = (value?: string | null) =>
  value ? String(value).slice(0, 16) : "";

export default function TripInstanceForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isEdit = Boolean(id);

  const tripInstanceApi = adminApi.tripInstances;
  const tripDefinitionApi = adminApi.tripDefinitions;
  const staffTemplateApi = adminApi.staffTemplateCreation;
  const altStaffTemplateApi = adminApi.alternativeStaffTemplate;
  const zoneApi = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [tripDefinitions, setTripDefinitions] = useState<SelectOption[]>([]);
  const [staffTemplates, setStaffTemplates] = useState<SelectOption[]>([]);
  const [altStaffTemplates, setAltStaffTemplates] = useState<SelectOption[]>([]);
  const [zones, setZones] = useState<SelectOption[]>([]);
  const [vehicles, setVehicles] = useState<SelectOption[]>([]);
  const [properties, setProperties] = useState<SelectOption[]>([]);
  const [subProperties, setSubProperties] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState<TripInstanceFormState>({
    trip_definition_id: "",
    staff_template_id: "",
    alternative_staff_template_id: "",
    zone_id: "",
    vehicle_id: "",
    property_id: "",
    sub_property_id: "",
    trigger_weight_kg: "",
    max_capacity_kg: "",
    current_load_kg: "",
    start_load_kg: "",
    end_load_kg: "",
    trip_start_time: "",
    trip_end_time: "",
    status: "WAITING_FOR_LOAD",
  });

  const { encTransportMaster, encTripInstance } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encTripInstance}`;
  const stateRecord = (location.state as { record?: Partial<TripInstanceFormState> } | null)?.record;

  useEffect(() => {
    setFetching(true);
    Promise.all([
      tripDefinitionApi.list(),
      staffTemplateApi.list(),
      altStaffTemplateApi.list(),
      zoneApi.list(),
      vehicleApi.list(),
      propertyApi.list(),
      subPropertyApi.list(),
    ])
      .then(([tripDefRes, staffRes, altStaffRes, zoneRes, vehicleRes, propertyRes, subPropertyRes]) => {
        setTripDefinitions(toOptions(normalizeList(tripDefRes), "unique_id", "unique_id"));
        setStaffTemplates(
          toOptions(normalizeList(staffRes), "unique_id", "display_code", "unique_id")
        );
        setAltStaffTemplates(toOptions(normalizeList(altStaffRes), "unique_id", "unique_id"));
        setZones(toOptions(normalizeList(zoneRes), "unique_id", "name"));
        setVehicles(toOptions(normalizeList(vehicleRes), "unique_id", "vehicle_no"));
        setProperties(toOptions(normalizeList(propertyRes), "unique_id", "property_name"));
        setSubProperties(toOptions(normalizeList(subPropertyRes), "unique_id", "sub_property_name"));
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      })
      .finally(() => setFetching(false));
  }, [
    altStaffTemplateApi,
    propertyApi,
    staffTemplateApi,
    subPropertyApi,
    t,
    tripDefinitionApi,
    vehicleApi,
    zoneApi,
  ]);

  useEffect(() => {
    if (!isEdit || !stateRecord) return;

    setFormData({
      trip_definition_id: stateRecord?.trip_definition_id ?? "",
      staff_template_id: stateRecord?.staff_template_id ?? "",
      alternative_staff_template_id: stateRecord?.alternative_staff_template_id ?? "",
      zone_id: stateRecord?.zone_id ?? "",
      vehicle_id: stateRecord?.vehicle_id ?? "",
      property_id: stateRecord?.property_id ?? "",
      sub_property_id: stateRecord?.sub_property_id ?? "",
      trigger_weight_kg:
        stateRecord?.trigger_weight_kg !== undefined && stateRecord?.trigger_weight_kg !== null
          ? String(stateRecord.trigger_weight_kg)
          : "",
      max_capacity_kg:
        stateRecord?.max_capacity_kg !== undefined && stateRecord?.max_capacity_kg !== null
          ? String(stateRecord.max_capacity_kg)
          : "",
      current_load_kg:
        stateRecord?.current_load_kg !== undefined && stateRecord?.current_load_kg !== null
          ? String(stateRecord.current_load_kg)
          : "",
      start_load_kg:
        stateRecord?.start_load_kg !== undefined && stateRecord?.start_load_kg !== null
          ? String(stateRecord.start_load_kg)
          : "",
      end_load_kg:
        stateRecord?.end_load_kg !== undefined && stateRecord?.end_load_kg !== null
          ? String(stateRecord.end_load_kg)
          : "",
      trip_start_time: toDateTimeLocal(stateRecord?.trip_start_time),
      trip_end_time: toDateTimeLocal(stateRecord?.trip_end_time),
      status: stateRecord?.status ?? "WAITING_FOR_LOAD",
    });
  }, [isEdit, stateRecord]);

  useEffect(() => {
    if (!isEdit || !id) return;

    tripInstanceApi
      .get(id)
      .then((res: any) => {
        setFormData({
          trip_definition_id: res?.trip_definition_id ?? "",
          staff_template_id: res?.staff_template_id ?? "",
          alternative_staff_template_id: res?.alternative_staff_template_id ?? "",
          zone_id: res?.zone_id ?? "",
          vehicle_id: res?.vehicle_id ?? "",
          property_id: res?.property_id ?? "",
          sub_property_id: res?.sub_property_id ?? "",
          trigger_weight_kg:
            res?.trigger_weight_kg !== undefined && res?.trigger_weight_kg !== null
              ? String(res.trigger_weight_kg)
              : "",
          max_capacity_kg:
            res?.max_capacity_kg !== undefined && res?.max_capacity_kg !== null
              ? String(res.max_capacity_kg)
              : "",
          current_load_kg:
            res?.current_load_kg !== undefined && res?.current_load_kg !== null
              ? String(res.current_load_kg)
              : "",
          start_load_kg:
            res?.start_load_kg !== undefined && res?.start_load_kg !== null
              ? String(res.start_load_kg)
              : "",
          end_load_kg:
            res?.end_load_kg !== undefined && res?.end_load_kg !== null
              ? String(res.end_load_kg)
              : "",
          trip_start_time: toDateTimeLocal(res?.trip_start_time),
          trip_end_time: toDateTimeLocal(res?.trip_end_time),
          status: res?.status ?? "WAITING_FOR_LOAD",
        });
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });
  }, [id, isEdit, t, tripInstanceApi]);

  const requiresCreate = useMemo(() => !isEdit, [isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (requiresCreate) {
      Swal.fire(t("common.warning"), t("admin.trip_instance.create_not_allowed"), "warning");
      return;
    }

    if (
      !formData.trip_definition_id ||
      !formData.staff_template_id ||
      !formData.zone_id ||
      !formData.vehicle_id ||
      !formData.property_id ||
      !formData.sub_property_id ||
      formData.trigger_weight_kg === "" ||
      formData.max_capacity_kg === "" ||
      formData.current_load_kg === "" ||
      formData.start_load_kg === "" ||
      formData.end_load_kg === "" ||
      !formData.status
    ) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        trip_definition_id: formData.trip_definition_id,
        staff_template_id: formData.staff_template_id,
        alternative_staff_template_id: formData.alternative_staff_template_id || null,
        zone_id: formData.zone_id,
        vehicle_id: formData.vehicle_id,
        property_id: formData.property_id,
        sub_property_id: formData.sub_property_id,
        trigger_weight_kg: Number(formData.trigger_weight_kg),
        max_capacity_kg: Number(formData.max_capacity_kg),
        current_load_kg: Number(formData.current_load_kg),
        start_load_kg: Number(formData.start_load_kg),
        end_load_kg: Number(formData.end_load_kg),
        trip_start_time: formData.trip_start_time || null,
        trip_end_time: formData.trip_end_time || null,
        status: formData.status,
      };

      if (isEdit && id) {
        await tripInstanceApi.update(id, payload);
      }

      Swal.fire(t("common.success"), t("common.updated_success"), "success");
      navigate(ENC_LIST_PATH);
    } catch {
      Swal.fire(t("common.save_failed"), t("common.save_failed_desc"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard
        title={t("admin.trip_instance.title_edit")}
        desc={t("admin.trip_instance.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label>{t("admin.trip_instance.trip_definition")}</Label>
              <Select
                value={formData.trip_definition_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, trip_definition_id: value }))}
                options={tripDefinitions}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.staff_template")}</Label>
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
              <Label>{t("admin.trip_instance.alt_staff_template")}</Label>
              <Select
                value={formData.alternative_staff_template_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, alternative_staff_template_id: value }))
                }
                options={altStaffTemplates}
                placeholder={t("common.select_option")}
                disabled={fetching}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.zone")}</Label>
              <Select
                value={formData.zone_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, zone_id: value }))}
                options={zones}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.vehicle")}</Label>
              <Select
                value={formData.vehicle_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, vehicle_id: value }))}
                options={vehicles}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.property")}</Label>
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
              <Label>{t("admin.trip_instance.sub_property")}</Label>
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
              <Label>{t("admin.trip_instance.trigger_weight")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.trigger_weight_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, trigger_weight_kg: e.target.value }))}
                placeholder={t("admin.trip_instance.trigger_weight")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.max_capacity")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.max_capacity_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, max_capacity_kg: e.target.value }))}
                placeholder={t("admin.trip_instance.max_capacity")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.current_load")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.current_load_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, current_load_kg: e.target.value }))}
                placeholder={t("admin.trip_instance.current_load")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.start_load")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.start_load_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, start_load_kg: e.target.value }))}
                placeholder={t("admin.trip_instance.start_load")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.end_load")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.end_load_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, end_load_kg: e.target.value }))}
                placeholder={t("admin.trip_instance.end_load")}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.trip_start_time")}</Label>
              <Input
                type="datetime-local"
                value={formData.trip_start_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, trip_start_time: e.target.value }))}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.trip_end_time")}</Label>
              <Input
                type="datetime-local"
                value={formData.trip_end_time}
                onChange={(e) => setFormData((prev) => ({ ...prev, trip_end_time: e.target.value }))}
              />
            </div>

            <div>
              <Label>{t("admin.trip_instance.status")}</Label>
              <Select
                value={formData.status}
                onChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                options={statusOptions}
                placeholder={t("common.select_status")}
                disabled={fetching}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? t("common.saving") : t("common.update")}
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
