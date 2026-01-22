import { useEffect, useState } from "react";
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

type ZonePropertyLoadTrackerFormState = {
  zone_id: string;
  vehicle_id: string;
  property_id: string;
  sub_property_id: string;
  current_weight_kg: string;
};

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const toOptions = (items: any[], valueKey: string, labelKey: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(item?.[labelKey] ?? item?.[valueKey] ?? ""),
    }))
    .filter((option) => option.value);

export default function ZonePropertyLoadTrackerForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isEdit = Boolean(id);

  const zonePropertyLoadTrackerApi = adminApi.zonePropertyLoadTrackers;
  const zoneApi = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [zones, setZones] = useState<SelectOption[]>([]);
  const [vehicles, setVehicles] = useState<SelectOption[]>([]);
  const [properties, setProperties] = useState<SelectOption[]>([]);
  const [subProperties, setSubProperties] = useState<SelectOption[]>([]);

  const [formData, setFormData] = useState<ZonePropertyLoadTrackerFormState>({
    zone_id: "",
    vehicle_id: "",
    property_id: "",
    sub_property_id: "",
    current_weight_kg: "",
  });

  const { encTransportMaster, encZonePropertyLoadTracker } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encZonePropertyLoadTracker}`;
  const stateRecord = (location.state as { record?: Partial<ZonePropertyLoadTrackerFormState> } | null)?.record;

  useEffect(() => {
    setFetching(true);
    Promise.all([
      zoneApi.list(),
      vehicleApi.list(),
      propertyApi.list(),
      subPropertyApi.list(),
    ])
      .then(([zoneRes, vehicleRes, propertyRes, subPropertyRes]) => {
        setZones(toOptions(normalizeList(zoneRes), "unique_id", "name"));
        setVehicles(toOptions(normalizeList(vehicleRes), "unique_id", "vehicle_no"));
        setProperties(toOptions(normalizeList(propertyRes), "unique_id", "property_name"));
        setSubProperties(toOptions(normalizeList(subPropertyRes), "unique_id", "sub_property_name"));
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      })
      .finally(() => setFetching(false));
  }, [propertyApi, subPropertyApi, t, vehicleApi, zoneApi]);

  useEffect(() => {
    if (!isEdit || !stateRecord) return;

    setFormData({
      zone_id: stateRecord?.zone_id ?? "",
      vehicle_id: stateRecord?.vehicle_id ?? "",
      property_id: stateRecord?.property_id ?? "",
      sub_property_id: stateRecord?.sub_property_id ?? "",
      current_weight_kg:
        stateRecord?.current_weight_kg !== undefined && stateRecord?.current_weight_kg !== null
          ? String(stateRecord.current_weight_kg)
          : "",
    });
  }, [isEdit, stateRecord]);

  useEffect(() => {
  if (!isEdit || !id) return;

  zonePropertyLoadTrackerApi
    .get(id)
    .then((res: any) => {
      console.log("ZonePropertyLoadTracker API response:", res);

      console.log("Resolved names:", {
        zone_name: res?.zone_details?.name,
        vehicle_no: res?.vehicle_details?.vehicle_no,
        property_name: res?.property_details?.property_name,
        sub_property_name: res?.sub_property_details?.sub_property_name,
      });

      setFormData({
        zone_id: res?.zone_details?.unique_id ?? "",
        vehicle_id: res?.vehicle_details?.unique_id ?? "",
        property_id: res?.property_details?.unique_id ?? "",
        sub_property_id: res?.sub_property_details?.unique_id ?? "",
        current_weight_kg:
          res?.current_weight_kg !== undefined && res?.current_weight_kg !== null
            ? String(res.current_weight_kg)
            : "",
      });
    })
    .catch(() => {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
    });
}, [id, isEdit, t, zonePropertyLoadTrackerApi]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !formData.zone_id ||
      !formData.vehicle_id ||
      !formData.property_id ||
      !formData.sub_property_id ||
      formData.current_weight_kg === ""
    ) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        zone_id: formData.zone_id,
        vehicle_id: formData.vehicle_id,
        property_id: formData.property_id,
        sub_property_id: formData.sub_property_id,
        current_weight_kg: Number(formData.current_weight_kg),
      };

      if (isEdit && id) {
        await zonePropertyLoadTrackerApi.update(id, payload);
      } else {
        await zonePropertyLoadTrackerApi.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
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
        title={
          isEdit
            ? t("admin.zone_property_load_tracker.title_edit")
            : t("admin.zone_property_load_tracker.title_add")
        }
        desc={t("admin.zone_property_load_tracker.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label>{t("admin.zone_property_load_tracker.zone")}</Label>
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
              <Label>{t("admin.zone_property_load_tracker.vehicle")}</Label>
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
              <Label>{t("admin.zone_property_load_tracker.property")}</Label>
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
              <Label>{t("admin.zone_property_load_tracker.sub_property")}</Label>
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
              <Label>{t("admin.zone_property_load_tracker.current_weight")}</Label>
              <Input
                type="number"
                min={0}
                value={formData.current_weight_kg}
                onChange={(e) => setFormData((prev) => ({ ...prev, current_weight_kg: e.target.value }))}
                placeholder={t("admin.zone_property_load_tracker.current_weight")}
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
