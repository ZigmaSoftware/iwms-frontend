import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select, { type SelectOption } from "@/components/form/Select";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";

type SupervisorZoneMapPayload = {
  supervisor_id: string;
  district_id: string;
  city_id: string;
  status: "ACTIVE" | "INACTIVE";
};

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const toOptions = (items: any[], valueKey: string, labelKey: string): SelectOption[] =>
  items
    .map((item) => ({
      value: item?.[valueKey],
      label: item?.[labelKey] ?? item?.[valueKey],
    }))
    .filter((option) => option.value !== undefined && option.value !== null);

export default function SupervisorZoneMapForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const supervisorZoneMapApi = adminApi.supervisorZoneMap;
  const districtApi = adminApi.districts;
  const cityApi = adminApi.cities;
  const zoneApi = adminApi.zones;
  const userCreationApi = adminApi.usersCreation;

  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedZone, setSelectedZone] = useState("");
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");

  const [districts, setDistricts] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [zones, setZones] = useState<SelectOption[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);

  const [form, setForm] = useState<SupervisorZoneMapPayload>({
    supervisor_id: "",
    district_id: "",
    city_id: "",
    status: "ACTIVE",
  });

  const { encStaffMasters, encSupervisorZoneMap } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encSupervisorZoneMap}`;

  const statusOptions: SelectOption[] = [
    { value: "ACTIVE", label: t("common.active") },
    { value: "INACTIVE", label: t("common.inactive") },
  ];

  const zoneLabels = useMemo(
    () =>
      zones.reduce<Record<string, string>>((acc, zone) => {
        acc[String(zone.value)] = String(zone.label);
        return acc;
      }, {}),
    [zones]
  );

  const extractError = (error: any): string => {
    const data = error?.response?.data;
    if (!data) return error?.message ?? t("common.unexpected_error");
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    if (typeof data === "object") {
      const messages = Object.entries(data).flatMap(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((item) => `${key}: ${item}`);
        }
        if (value === null || value === undefined) {
          return [];
        }
        if (typeof value === "string") {
          return [`${key}: ${value}`];
        }
        return [`${key}: ${JSON.stringify(value)}`];
      });
      if (messages.length) return messages.join("\n");
    }
    return t("common.unexpected_error");
  };

  useEffect(() => {
    setFetching(true);
    Promise.all([
      districtApi.list(),
      cityApi.list(),
      zoneApi.list(),
      userCreationApi.list(),
    ])
      .then(([districtRes, cityRes, zoneRes, userRes]) => {
        setDistricts(toOptions(normalizeList(districtRes), "unique_id", "name"));
        setCities(toOptions(normalizeList(cityRes), "unique_id", "name"));
        setZones(toOptions(normalizeList(zoneRes), "unique_id", "name"));

        const staffUsers = normalizeList(userRes).filter(
          (u: any) => u?.user_type_name?.toLowerCase() === "staff"
        );
        const supervisors = staffUsers.filter(
          (u: any) => String(u?.staffusertype_name ?? "").trim().toLowerCase() === "supervisor"
        );
        setSupervisors(toOptions(supervisors, "unique_id", "staff_name"));
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      })
      .finally(() => setFetching(false));

    if (!id) return;

    supervisorZoneMapApi
      .get(id)
      .then((res: any) => {
        setForm({
          supervisor_id: res?.supervisor_id ?? "",
          district_id: res?.district_id ? String(res.district_id) : "",
          city_id: res?.city_id ? String(res.city_id) : "",
          status: res?.status ?? "ACTIVE",
        });

        const incomingZones = Array.isArray(res?.zone_ids)
          ? res.zone_ids.map((zoneId: any) => String(zoneId)).filter(Boolean)
          : [];
        setZoneIds(incomingZones);
      })
      .catch(() => {
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      });
  }, [cityApi, districtApi, id, supervisorZoneMapApi, t, userCreationApi, zoneApi]);

  const handleZonePick = (value: string) => {
    if (!value) return;
    setZoneIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setSelectedZone("");
  };

  const removeZone = (zoneId: string) => {
    setZoneIds((prev) => prev.filter((item) => item !== zoneId));
  };

  const handleSave = async () => {
    if (!form.supervisor_id || !form.district_id || !form.city_id || zoneIds.length === 0) {
      Swal.fire(t("common.error"), t("common.missing_fields"), "warning");
      return;
    }
    setFormError(null);

    const payload = {
      supervisor_id: form.supervisor_id,
      district_id: form.district_id,
      city_id: form.city_id,
      zone_ids: zoneIds,
      status: form.status,
      remarks: remarks.trim(),
    };

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await supervisorZoneMapApi.update(id, payload);
      } else {
        await supervisorZoneMapApi.create(payload);
      }
      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(ENC_LIST_PATH);
    } catch (error) {
      const message = extractError(error);
      setFormError(message);
      Swal.fire(t("common.error"), message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard
        title={t("admin.supervisor_zone_map.title")}
        desc={t("admin.supervisor_zone_map.subtitle")}
      >
        {formError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-semibold">{t("common.error")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {formError.split("\n").map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label>{t("admin.supervisor_zone_map.supervisor")}</Label>
            <Select
              value={form.supervisor_id}
              onChange={(value) => setForm((prev) => ({ ...prev, supervisor_id: value }))}
              options={supervisors}
              placeholder={t("common.select_option")}
              disabled={fetching}
              required
            />
          </div>

          <div>
            <Label>{t("admin.supervisor_zone_map.district")}</Label>
            <Select
              value={form.district_id}
              onChange={(value) => setForm((prev) => ({ ...prev, district_id: value }))}
              options={districts}
              placeholder={t("common.select_option")}
              disabled={fetching}
              required
            />
          </div>

          <div>
            <Label>{t("admin.supervisor_zone_map.city")}</Label>
            <Select
              value={form.city_id}
              onChange={(value) => setForm((prev) => ({ ...prev, city_id: value }))}
              options={cities}
              placeholder={t("common.select_option")}
              disabled={fetching}
              required
            />
          </div>

          <div>
            <Label>{t("admin.supervisor_zone_map.status")}</Label>
            <Select
              value={form.status}
              onChange={(value) => setForm((prev) => ({ ...prev, status: value as SupervisorZoneMapPayload["status"] }))}
              options={statusOptions}
              placeholder={t("common.select_status")}
              disabled={fetching}
              required
            />
          </div>
        </div>

        <div>
          <Label>{t("admin.supervisor_zone_map.zones")}</Label>
          <div className="flex gap-3">
            <div className="flex-1">
              <Select
                value={selectedZone}
                onChange={handleZonePick}
                options={zones}
                placeholder={t("common.select_option")}
                disabled={fetching}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {zoneIds.length === 0 ? (
              <span className="text-sm text-gray-500">{t("admin.supervisor_zone_map.no_zones")}</span>
            ) : (
              zoneIds.map((zoneId) => (
                <span
                  key={zoneId}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700"
                >
                  {zoneLabels[String(zoneId)] ?? zoneId}
                  <button
                    type="button"
                    onClick={() => removeZone(zoneId)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <Label>{t("admin.supervisor_zone_map.remarks")}</Label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 p-2 text-sm"
            rows={3}
            placeholder={t("common.optional")}
            disabled={fetching}
          />
        </div>

        {isEdit && (
          <p className="text-xs text-gray-500">
            {t("admin.supervisor_zone_map.update_hint")}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={submitting || fetching}
            onClick={handleSave}
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
      </ComponentCard>
    </div>
  );
}
