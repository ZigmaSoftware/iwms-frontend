import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select, { type SelectOption } from "@/components/form/Select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { normalizeList } from "@/utils/forms";

type RelatedOption = SelectOption & {
  districtId?: string;
  cityId?: string;
};

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

  const [districts, setDistricts] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<RelatedOption[]>([]);
  const [zones, setZones] = useState<RelatedOption[]>([]);
  const [vehicles, setVehicles] = useState<RelatedOption[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Holds the raw API record until dropdown options are loaded, then flushes into form state
  const [pendingRecord, setPendingRecord] = useState<{
    district_id: string;
    city_id: string;
    zone_id: string;
    vehicle_id: string;
    supervisor_id: string;
  } | null>(null);

  const [form, setForm] = useState({
    district_id: "",
    city_id: "",
    zone_id: "",
    vehicle_id: "",
    supervisor_id: "",
  });

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encRoutePlans}`;

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

  const toSupervisorOptions = (items: any[]): SelectOption[] =>
    items
      .filter((item) => {
        const roleName = (item?.staffusertype_name || "").toLowerCase();
        return roleName === "supervisor";
      })
      .map((item) => ({
        value: item?.unique_id,
        label: item?.staff_name ?? item?.unique_id,
      }))
      .filter((option) => option.value !== undefined && option.value !== null);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);

    Promise.all([
      adminApi.districts.list(),
      adminApi.cities.list(),
      adminApi.zones.list(),
      adminApi.vehicleCreations.list(),
      adminApi.usersCreation.list(),
    ])
      .then(([districtsData, citiesData, zonesData, vehiclesData, usersData]) => {
        if (cancelled) return;
        setDistricts(toOptions(normalizeList(districtsData), "unique_id", "name"));
        setCities(toRelatedOptions(normalizeList(citiesData), "unique_id", "name"));
        setZones(toRelatedOptions(normalizeList(zonesData), "unique_id", "zone_name"));
        setVehicles(toRelatedOptions(normalizeList(vehiclesData), "unique_id", "vehicle_no"));
        setSupervisors(toSupervisorOptions(normalizeList(usersData)));
        setFetching(false);
        // fetching flag is now false — if a pendingRecord arrived before options were
        // ready the flush effect below will fire on the next render
      })
      .catch(() => {
        if (cancelled) return;
        setFetching(false);
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the edit record and store it as pending — the flush effect below
  // applies it once dropdown options have finished loading.
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;

    adminApi.routePlans.get(id)
      .then((res: any) => {
        if (cancelled) return;
        setPendingRecord({
          district_id: extractId(res?.district_id),
          city_id: extractId(res?.city_id),
          zone_id: extractId(res?.zone_id),
          vehicle_id: extractId(res?.vehicle_id),
          supervisor_id: extractId(res?.supervisor_id),
        });
      })
      .catch(() => {
        if (cancelled) return;
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  // Flush pendingRecord into form state once dropdown options are ready.
  // This prevents the selects rendering with a value that has no matching option
  // when the record API responds faster than the options APIs.
  useEffect(() => {
    if (!pendingRecord) return;
    if (fetching) return; // options not ready yet — wait for the options effect to finish

    setForm(pendingRecord);
    setPendingRecord(null);
  }, [pendingRecord, fetching]);

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
        await adminApi.routePlans.update(id, payload);
      } else {
        await adminApi.routePlans.create(payload);
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
