import { useEffect, useMemo, useState } from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stateApi, districtApi, cityApi, panchayatApi, zoneApi, wardApi } from "@/helpers/admin";

import type {
  DataScopeForm,
  UnknownRecord,
  WardOption,
  WithCityIdOption,
  WithDistrictIdOption,
  WithStateIdOption,
  ZoneOption,
} from "./types";

const normalizeIdValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.unique_id ?? obj.id ?? obj.value ?? "").trim();
  }
  return String(value).trim();
};

const toStringOrEmpty = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const toRecordList = (value: unknown): UnknownRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is UnknownRecord =>
        !!item && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (value && typeof value === "object") {
    const maybeResults = (value as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults.filter(
        (item): item is UnknownRecord =>
          !!item && typeof item === "object" && !Array.isArray(item)
      );
    }
  }
  return [];
};

export type LocationScopeSelectorProps = {
  /** Current scope selections. */
  value: DataScopeForm;
  /** Called whenever any level changes; the caller should replace its whole scope state. */
  onChange: (next: DataScopeForm) => void;
  /** Scope the district/city/zone/panchayat/ward lookups to a company+project, like CollectionPointForm does. */
  companyUniqueId?: string;
  projectId?: string;
  disabled?: boolean;
};

/**
 * Cascading State → District → City → (Zone or Panchayat, mutually exclusive) → Ward
 * selector. All levels are optional/clearable. Mirrors the pattern used in
 * CollectionPointForm.tsx (schedule-masters/collection-points).
 */
export default function LocationScopeSelector({
  value,
  onChange,
  companyUniqueId,
  projectId,
  disabled = false,
}: LocationScopeSelectorProps) {
  const { t } = useTranslation();

  const [states, setStates] = useState<WithStateIdOption[]>([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [districts, setDistricts] = useState<WithStateIdOption[]>([]);
  const [cities, setCities] = useState<WithDistrictIdOption[]>([]);
  const [panchayats, setPanchayats] = useState<WithCityIdOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([]);
  const [wards, setWards] = useState<WardOption[]>([]);
  const [scopedOptionsLoaded, setScopedOptionsLoaded] = useState(false);

  const stateId = value.state_id ?? "";
  const districtId = value.district_id ?? "";
  const cityId = value.city_id ?? "";
  const panchayatId = value.panchayat_id ?? "";
  const zoneId = value.zone_id ?? "";
  const wardId = value.ward_id ?? "";

  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);

  /* ── Load states (global) ── */
  useEffect(() => {
    let cancelled = false;
    stateApi
      .readAll()
      .then((data: unknown) => {
        if (cancelled) return;
        setStates(
          toRecordList(data)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
            }))
            .filter((item) => item.value && item.label)
            .sort((a, b) => a.label.localeCompare(b.label))
        );
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      })
      .finally(() => {
        if (!cancelled) setStatesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Load tenant-filtered districts/cities/panchayats/zones/wards ── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setDistricts([]);
      setCities([]);
      setPanchayats([]);
      setZoneOptions([]);
      setWards([]);
      setScopedOptionsLoaded(false);
      return;
    }

    let cancelled = false;
    setScopedOptionsLoaded(false);
    const params = { company_id: companyUniqueId, project_id: projectId };

    Promise.all([
      districtApi.readAll({ params }),
      cityApi.readAll({ params }),
      panchayatApi.readAll({ params }),
      zoneApi.readAll({ params }),
      wardApi.readAll({ params }),
    ])
      .then(([distData, cityData, panData, zoneData, wardData]) => {
        if (cancelled) return;

        setDistricts(
          toRecordList(distData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
            }))
            .filter((item) => item.value && item.label)
        );

        setCities(
          toRecordList(cityData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id ?? item.district),
            }))
            .filter((item) => item.value && item.label)
        );

        setPanchayats(
          toRecordList(panData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.panchayat_name ?? item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id),
              cityId: normalizeIdValue(item.city_id),
            }))
            .filter((item) => item.value && item.label)
        );

        setZoneOptions(
          toRecordList(zoneData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.zone_name ?? item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id),
              cityId: normalizeIdValue(item.city_id),
            }))
            .filter((item) => item.value && item.label)
        );

        setWards(
          toRecordList(wardData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.ward_name ?? item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id ?? item.district),
              cityId: normalizeIdValue(item.city_id ?? item.city),
              panchayatId: normalizeIdValue(item.panchayat_id ?? item.panchayat),
              zoneId: normalizeIdValue(item.zone_id ?? item.zone),
            }))
            .filter((item) => item.value && item.label)
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          (err as { response?: { data?: unknown }; message?: string })?.message ||
          t("common.load_failed");
        Swal.fire(t("common.error"), String(message), "error");
      })
      .finally(() => {
        if (!cancelled) setScopedOptionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId]);

  const districtOptions = useMemo(
    () => districts.filter((option) => !stateId || !option.stateId || option.stateId === stateId),
    [districts, stateId]
  );

  const cityOptions = useMemo(
    () =>
      cities.filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        return true;
      }),
    [cities, districtId, stateId]
  );

  const panchayatOptions = useMemo(
    () =>
      panchayats.filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        return true;
      }),
    [cityId, districtId, panchayats, stateId]
  );

  const filteredZoneOptions = useMemo(
    () =>
      zoneOptions.filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        return true;
      }),
    [cityId, districtId, stateId, zoneOptions]
  );

  const wardOptions = useMemo(
    () =>
      wards.filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        // XOR filter: show zone-wards when zone selected, panchayat-wards when panchayat selected
        if (zoneId) return option.zoneId === zoneId;
        if (panchayatId) return option.panchayatId === panchayatId;
        return true;
      }),
    [cityId, districtId, panchayatId, stateId, wards, zoneId]
  );

  const NONE = "__none__";

  // Wait for the state list and (when a company+project scope is known) the
  // scoped district/city/panchayat/zone/ward lists before mounting the real,
  // interactive Selects. Radix Select only registers an item's label for the
  // trigger's display if that item already exists in the tree at the moment
  // the Select first mounts with that value — mounting early with a saved
  // value but empty option lists leaves the field looking blank.
  const optionsReady = statesLoaded && (!companyUniqueId || !projectId || scopedOptionsLoaded);

  if (!optionsReady) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {["State", "District", "City", "Zone"].map((label) => (
          <div key={label}>
            <Label>{label}</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
              Loading…
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <div>
        <Label>{t("common.state")}</Label>
        <Select
          value={stateId || NONE}
          onValueChange={(v) => {
            const next = v === NONE ? "" : v;
            onChange({ state_id: next || undefined });
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.state") })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
            {states.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("common.district")}</Label>
        <Select
          value={districtId || NONE}
          onValueChange={(v) => {
            const next = v === NONE ? "" : v;
            onChange({
              state_id: stateId || undefined,
              district_id: next || undefined,
            });
          }}
          disabled={disabled || !stateId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.district") })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
            {districtOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{t("common.city")}</Label>
        <Select
          value={cityId || NONE}
          onValueChange={(v) => {
            const next = v === NONE ? "" : v;
            onChange({
              state_id: stateId || undefined,
              district_id: districtId || undefined,
              city_id: next || undefined,
            });
          }}
          disabled={disabled || !districtId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.city") })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
            {cityOptions.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Panchayat — hidden when Zone is selected */}
      {!isZoneSelected && (
        <div>
          <Label>{t("admin.nav.panchayat")}</Label>
          <Select
            value={panchayatId || NONE}
            onValueChange={(v) => {
              const next = v === NONE ? "" : v;
              onChange({
                state_id: stateId || undefined,
                district_id: districtId || undefined,
                city_id: cityId || undefined,
                panchayat_id: next || undefined,
                zone_id: undefined,
                ward_id: undefined,
              });
            }}
            disabled={disabled || !cityId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
              {panchayatOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Zone — hidden when Panchayat is selected */}
      {!isPanchayatSelected && (
        <div>
          <Label>{t("admin.nav.zone")}</Label>
          <Select
            value={zoneId || NONE}
            onValueChange={(v) => {
              const next = v === NONE ? "" : v;
              onChange({
                state_id: stateId || undefined,
                district_id: districtId || undefined,
                city_id: cityId || undefined,
                zone_id: next || undefined,
                panchayat_id: undefined,
                ward_id: undefined,
              });
            }}
            disabled={disabled || !cityId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
              {filteredZoneOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Ward — visible only when zone or panchayat is chosen */}
      {(isZoneSelected || isPanchayatSelected) && (
        <div>
          <Label>{t("admin.nav.ward")}</Label>
          <Select
            value={wardId || NONE}
            onValueChange={(v) => {
              const next = v === NONE ? "" : v;
              onChange({
                state_id: stateId || undefined,
                district_id: districtId || undefined,
                city_id: cityId || undefined,
                panchayat_id: panchayatId || undefined,
                zone_id: zoneId || undefined,
                ward_id: next || undefined,
              });
            }}
            disabled={disabled || wardOptions.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.ward") })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("common.not_available")}</SelectItem>
              {wardOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
