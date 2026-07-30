import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  stateApi,
  districtApi,
  cityApi,
  zoneApi,
  wardApi,
  panchayatApi,
} from "@/helpers/admin";

import type { LocationScope } from "./types";

/** Sentinel used to represent "not selected" inside shadcn Select (which cannot bind "") */
const NONE = "__none__";

const toId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeParentId = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const raw = record[key];
    if (raw && typeof raw === "object") {
      const nested = toId((raw as Record<string, unknown>).unique_id);
      if (nested) return nested;
    }
    const id = toId(raw);
    if (id) return id;
  }
  return "";
};

const toList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === "object"
    );
  }
  if (value && typeof value === "object") {
    const results = (value as { results?: unknown }).results;
    if (Array.isArray(results)) {
      return results.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === "object"
      );
    }
  }
  return [];
};

type Props = {
  value: LocationScope;
  onChange: (scope: LocationScope) => void;
  disabled?: boolean;
};

/**
 * Cascading State -> District -> City -> (Zone | Panchayat) -> Ward selector.
 * All levels are optional; clearing a level clears everything below it.
 * Zone and Panchayat are mutually exclusive siblings under City (matches the
 * pattern used in customerCreationForm.tsx).
 */
export default function LocationScopeSelector({ value, onChange, disabled }: Props) {
  const { t } = useTranslation();

  const [rawStates, setRawStates] = useState<Record<string, unknown>[]>([]);
  const [rawDistricts, setRawDistricts] = useState<Record<string, unknown>[]>([]);
  const [rawCities, setRawCities] = useState<Record<string, unknown>[]>([]);
  const [rawZones, setRawZones] = useState<Record<string, unknown>[]>([]);
  const [rawPanchayats, setRawPanchayats] = useState<Record<string, unknown>[]>([]);
  const [rawWards, setRawWards] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      stateApi.readAll(),
      districtApi.readAll(),
      cityApi.readAll(),
      zoneApi.readAll(),
      panchayatApi.readAll(),
      wardApi.readAll(),
    ]).then(([states, districts, cities, zones, panchayats, wards]) => {
      if (cancelled) return;
      setRawStates(toList(states));
      setRawDistricts(toList(districts));
      setRawCities(toList(cities));
      setRawZones(toList(zones));
      setRawPanchayats(toList(panchayats));
      setRawWards(toList(wards));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDistricts = useMemo(
    () =>
      rawDistricts.filter(
        (d) => !value.state_id || normalizeParentId(d, ["state_id", "state"]) === value.state_id
      ),
    [rawDistricts, value.state_id]
  );

  const filteredCities = useMemo(
    () =>
      rawCities.filter(
        (c) =>
          !value.district_id ||
          normalizeParentId(c, ["district_id", "district"]) === value.district_id
      ),
    [rawCities, value.district_id]
  );

  const filteredZones = useMemo(
    () =>
      rawZones.filter(
        (z) => !value.city_id || normalizeParentId(z, ["city_id", "city"]) === value.city_id
      ),
    [rawZones, value.city_id]
  );

  const filteredPanchayats = useMemo(
    () =>
      rawPanchayats.filter(
        (p) => !value.city_id || normalizeParentId(p, ["city_id", "city"]) === value.city_id
      ),
    [rawPanchayats, value.city_id]
  );

  const filteredWards = useMemo(
    () =>
      rawWards.filter((w) => {
        if (value.zone_id) return normalizeParentId(w, ["zone_id", "zone"]) === value.zone_id;
        if (value.panchayat_id)
          return normalizeParentId(w, ["panchayat_id", "panchayat"]) === value.panchayat_id;
        return false;
      }),
    [rawWards, value.zone_id, value.panchayat_id]
  );

  const isZoneSelected = Boolean(value.zone_id);
  const isPanchayatSelected = Boolean(value.panchayat_id);

  const nameOf = (record?: Record<string, unknown>, ...keys: string[]): string => {
    if (!record) return "";
    for (const key of keys) {
      const v = record[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const stateOptions = rawStates.map((s) => ({ value: toId(s.unique_id), label: nameOf(s, "name") }));
  const districtOptions = filteredDistricts.map((d) => ({ value: toId(d.unique_id), label: nameOf(d, "name") }));
  const cityOptions = filteredCities.map((c) => ({ value: toId(c.unique_id), label: nameOf(c, "name") }));
  const zoneOptions = filteredZones.map((z) => ({ value: toId(z.unique_id), label: nameOf(z, "zone_name", "name") }));
  const panchayatOptions = filteredPanchayats.map((p) => ({
    value: toId(p.unique_id),
    label: nameOf(p, "panchayat_name", "name"),
  }));
  const wardOptions = filteredWards.map((w) => ({ value: toId(w.unique_id), label: nameOf(w, "ward_name", "name") }));

  const handleStateChange = (v: string) => {
    const next = v === NONE ? "" : v;
    onChange({
      state_id: next,
      district_id: "",
      city_id: "",
      zone_id: "",
      panchayat_id: "",
      ward_id: "",
    });
  };

  const handleDistrictChange = (v: string) => {
    const next = v === NONE ? "" : v;
    onChange({
      ...value,
      district_id: next,
      city_id: "",
      zone_id: "",
      panchayat_id: "",
      ward_id: "",
    });
  };

  const handleCityChange = (v: string) => {
    const next = v === NONE ? "" : v;
    onChange({
      ...value,
      city_id: next,
      zone_id: "",
      panchayat_id: "",
      ward_id: "",
    });
  };

  const handleZoneChange = (v: string) => {
    const next = v === NONE ? "" : v;
    onChange({
      ...value,
      zone_id: next,
      panchayat_id: "",
      ward_id: "",
    });
  };

  const handlePanchayatChange = (v: string) => {
    const next = v === NONE ? "" : v;
    onChange({
      ...value,
      panchayat_id: next,
      zone_id: "",
      ward_id: "",
    });
  };

  const handleWardChange = (v: string) => {
    const next = v === NONE ? "" : v;
    onChange({ ...value, ward_id: next });
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <Label>{t("common.state")}</Label>
        <Select value={value.state_id || NONE} onValueChange={handleStateChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.state") })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
            {stateOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("common.district")}</Label>
        <Select
          value={value.district_id || NONE}
          onValueChange={handleDistrictChange}
          disabled={disabled || !value.state_id}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.district") })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
            {districtOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("common.city")}</Label>
        <Select
          value={value.city_id || NONE}
          onValueChange={handleCityChange}
          disabled={disabled || !value.district_id}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.city") })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
            {cityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isPanchayatSelected && (
        <div>
          <Label>{t("common.zone")}</Label>
          <Select
            value={value.zone_id || NONE}
            onValueChange={handleZoneChange}
            disabled={disabled || !value.city_id}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.zone") })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
              {zoneOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isZoneSelected && (
        <div>
          <Label>{t("admin.nav.panchayat")}</Label>
          <Select
            value={value.panchayat_id || NONE}
            onValueChange={handlePanchayatChange}
            disabled={disabled || !value.city_id}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
              {panchayatOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(isZoneSelected || isPanchayatSelected) && (
        <div>
          <Label>{t("common.ward")}</Label>
          <Select value={value.ward_id || NONE} onValueChange={handleWardChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.ward") })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
              {wardOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
