import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select, { type SelectOption } from "@/components/form/Select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { normalizeList } from "@/utils/forms";
import {
  useCreateRoutePlanMutation,
  useRoutePlanQuery,
  useUpdateRoutePlanMutation,
} from "@/tanstack/admin/queries/masters/routePlan";

type RelatedOption = SelectOption & {
  districtId?: string;
  cityId?: string;
};

// Helper to extract ID from a value that could be a string, number, or object
const extractId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    return value.unique_id ?? value.id ?? "";
  }
  return String(value);
};

export default function RoutePlanForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const districtApi = adminApi.districts;
  const cityApi = adminApi.cities;
  const zoneApi = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const userApi = adminApi.usersCreation;

  const [districts, setDistricts] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<RelatedOption[]>([]);
  const [zones, setZones] = useState<RelatedOption[]>([]);
  const [vehicles, setVehicles] = useState<RelatedOption[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  const [form, setForm] = useState({
    district_id: "",
    city_id: "",
    zone_id: "",
    vehicle_id: "",
    supervisor_id: "",
  });

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encRoutePlans}`;

  const routePlanQuery = useRoutePlanQuery(id);
  const createMutation = useCreateRoutePlanMutation();
  const updateMutation = useUpdateRoutePlanMutation();

  const toOptions = (items: any[], valueKey: string, labelKey: string): SelectOption[] =>
    items
      .map((item) => ({
        value: item?.[valueKey],
        label: item?.[labelKey] ?? item?.[valueKey],
      }))
      .filter((option) => option.value !== undefined && option.value !== null);

  const toRelatedOptions = (items: any[], valueKey: string, labelKey: string): RelatedOption[] =>
    items
      .map((item) => ({
        value: item?.[valueKey],
        label: item?.[labelKey] ?? item?.name ?? item?.[valueKey],
        districtId: extractId(item?.district_id ?? item?.district),
        cityId: extractId(item?.city_id ?? item?.city),
      }))
      .filter((option) => option.value !== undefined && option.value !== null);

  // Filter supervisors - only users with supervisor staff user type
  const toSupervisorOptions = (items: any[]): SelectOption[] =>
    items
      .filter((item) => {
        // Check staffusertype_name field (from API response)
        const roleName = (item?.staffusertype_name || "").toLowerCase();
        return roleName === "supervisor";
      })
      .map((item) => ({
        value: item?.unique_id,
        label: item?.staff_name ?? item?.unique_id,
      }))
      .filter((option) => option.value !== undefined && option.value !== null);

  const districtsQuery = useQuery({
    queryKey: ["masters", "districts"],
    queryFn: () => districtApi.list(),
  });
  const citiesQuery = useQuery({
    queryKey: ["masters", "cities"],
    queryFn: () => cityApi.list(),
  });
  const zonesQuery = useQuery({
    queryKey: ["masters", "zone"],
    queryFn: () => zoneApi.list(),
  });
  const vehiclesQuery = useQuery({
    queryKey: ["transport masters", "vehicle creation"],
    queryFn: () => vehicleApi.list(),
  });
  const usersQuery = useQuery({
    queryKey: ["masters", "users"],
    queryFn: () => userApi.list(),
  });

  // Load dropdown options first
  useEffect(() => {
    setFetching(
      districtsQuery.isLoading ||
        citiesQuery.isLoading ||
        zonesQuery.isLoading ||
        vehiclesQuery.isLoading ||
        usersQuery.isLoading
    );

    if (
      districtsQuery.isError ||
      citiesQuery.isError ||
      zonesQuery.isError ||
      vehiclesQuery.isError ||
      usersQuery.isError
    ) {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
      return;
    }

    setDistricts(toOptions(normalizeList(districtsQuery.data), "unique_id", "name"));
    setCities(toRelatedOptions(normalizeList(citiesQuery.data), "unique_id", "name"));
    setZones(toRelatedOptions(normalizeList(zonesQuery.data), "unique_id", "zone_name"));
    setVehicles(toRelatedOptions(normalizeList(vehiclesQuery.data), "unique_id", "vehicle_no"));
    setSupervisors(toSupervisorOptions(normalizeList(usersQuery.data)));
    setOptionsLoaded(true);
  }, [
    citiesQuery.data,
    citiesQuery.isError,
    citiesQuery.isLoading,
    districtsQuery.data,
    districtsQuery.isError,
    districtsQuery.isLoading,
    t,
    usersQuery.data,
    usersQuery.isError,
    usersQuery.isLoading,
    vehiclesQuery.data,
    vehiclesQuery.isError,
    vehiclesQuery.isLoading,
    zonesQuery.data,
    zonesQuery.isError,
    zonesQuery.isLoading,
  ]);

  // Fetch route plan data after options are loaded (for edit mode)
  useEffect(() => {
    if (optionsLoaded && isEdit && routePlanQuery.data) {
      const res: any = routePlanQuery.data;
      setForm({
        district_id: extractId(res?.district_id),
        city_id: extractId(res?.city_id),
        zone_id: extractId(res?.zone_id),
        vehicle_id: extractId(res?.vehicle_id),
        supervisor_id: extractId(res?.supervisor_id),
      });
    }
  }, [isEdit, optionsLoaded, routePlanQuery.data]);

  const cityOptions = cities.filter((city) => !form.district_id || !city.districtId || city.districtId === form.district_id);

  const zoneOptions = zones.filter(
    (zone) =>
      (!form.district_id || !zone.districtId || zone.districtId === form.district_id) &&
      (!form.city_id || !zone.cityId || zone.cityId === form.city_id)
  );

  const vehicleOptions = vehicles.filter(
    (vehicle) =>
      (!form.district_id || !vehicle.districtId || vehicle.districtId === form.district_id) &&
      (!form.city_id || !vehicle.cityId || vehicle.cityId === form.city_id)
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.district_id || !form.city_id || !form.zone_id || !form.vehicle_id || !form.supervisor_id) {
      Swal.fire(t("common.error"), t("common.missing_fields"), "warning");
      return;
    }

    const payload = {
      district_id: form.district_id,
      city_id: form.city_id,
      zone_id: form.zone_id,
      vehicle_id: form.vehicle_id,
      supervisor_id: form.supervisor_id,
    };

    setSubmitting(true);
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
    } catch {
      Swal.fire(t("common.error"), t("common.save_failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard title={t("admin.route_plan.title")} desc={t("admin.route_plan.subtitle")}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label>{t("admin.route_plan.district")}</Label>
              <Select
                value={form.district_id}
                onChange={(value) => setForm((prev) => ({ ...prev, district_id: value, city_id: "", zone_id: "" }))}
                options={districts}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("common.city")}</Label>
              <Select
                value={form.city_id}
                onChange={(value) => setForm((prev) => ({ ...prev, city_id: value, zone_id: "" }))}
                options={cityOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !form.district_id}
                required
              />
            </div>

            <div>
              <Label>{t("admin.route_plan.zone")}</Label>
              <Select
                value={form.zone_id}
                onChange={(value) => setForm((prev) => ({ ...prev, zone_id: value }))}
                options={zoneOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !form.city_id}
                required
              />
            </div>

            <div>
              <Label>{t("admin.route_plan.vehicle")}</Label>
              <Select
                value={form.vehicle_id}
                onChange={(value) => setForm((prev) => ({ ...prev, vehicle_id: value }))}
                options={vehicleOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            <div>
              <Label>{t("admin.route_plan.supervisor")}</Label>
              <Select
                value={form.supervisor_id}
                onChange={(value) => setForm((prev) => ({ ...prev, supervisor_id: value }))}
                options={supervisors}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting
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
