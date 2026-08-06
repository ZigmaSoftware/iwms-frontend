import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { MultiSelect, type MultiSelectOption } from "@/components/form/MultiSelect";
import { stateApi, districtApi, cityApi, panchayatApi, zoneApi, wardApi } from "@/helpers/admin";
import { useCascadingSelection } from "./useCascadingSelection";
import { useZonePanchayatVisibility } from "@/hooks/useZonePanchayatVisibility";

import type {
  DataScopeForm,
  SelectOption,
  UnknownRecord,
  WardOption,
  WithCityIdOption,
  WithDistrictIdOption,
  WithStateIdOption,
  ZoneOption,
} from "./types";

export type LocationScopeOptions = {
  states: SelectOption[];
  districts: SelectOption[];
  cities: SelectOption[];
  zones: SelectOption[];
  panchayats: SelectOption[];
  wards: SelectOption[];
};

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
  /** Current scope selections (arrays). */
  value: DataScopeForm;
  /** Called whenever any level changes; the caller should merge into its scope state. */
  onChange: (next: DataScopeForm) => void;
  /** Scope the district/city/zone/panchayat/ward lookups to a company + the selected projects. */
  companyUniqueId?: string;
  projectIds?: string[];
  disabled?: boolean;
  /** True once it's safe to auto-select newly-eligible descendants (own
   * option data has loaded). */
  readyForReconcile?: boolean;
  /** Edit mode: show the saved record exactly as saved when the form opens
   * (a deliberately empty level means "unrestricted", not "select everything")
   * — auto-select-all only kicks in once the admin changes a parent field
   * during this session. */
  isEdit?: boolean;
  /** Reports the currently-loaded option lists (value+label) so the caller
   * can resolve saved ids to display names without refetching. */
  onOptionsResolved?: (options: LocationScopeOptions) => void;
};

/**
 * Cascading State → District → City → (Zone and/or Panchayat) → Ward
 * multi-select. Every level is filtered by the union of currently-selected
 * ids in the levels above it (and by the selected projects). Whenever a
 * shallower level's selection changes, newly-eligible options in the levels
 * below are auto-checked while manual deselections of options that remain
 * eligible are preserved.
 */
export default function LocationScopeSelector({
  value,
  onChange,
  companyUniqueId,
  projectIds = [],
  disabled = false,
  readyForReconcile = true,
  isEdit = false,
  onOptionsResolved,
}: LocationScopeSelectorProps) {
  const { t } = useTranslation();
  const { showZone, showPanchayat } = useZonePanchayatVisibility();

  const [states, setStates] = useState<WithStateIdOption[]>([]);
  const [statesLoaded, setStatesLoaded] = useState(false);
  const [districts, setDistricts] = useState<WithStateIdOption[]>([]);
  const [cities, setCities] = useState<WithDistrictIdOption[]>([]);
  const [panchayats, setPanchayats] = useState<WithCityIdOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([]);
  const [wards, setWards] = useState<WardOption[]>([]);
  const [scopedOptionsLoaded, setScopedOptionsLoaded] = useState(false);

  const stateIds = useMemo(() => value.state_ids ?? [], [value.state_ids]);
  const districtIds = useMemo(() => value.district_ids ?? [], [value.district_ids]);
  const cityIds = useMemo(() => value.city_ids ?? [], [value.city_ids]);
  const panchayatIds = useMemo(() => value.panchayat_ids ?? [], [value.panchayat_ids]);
  const zoneIds = useMemo(() => value.zone_ids ?? [], [value.zone_ids]);
  const wardIds = useMemo(() => value.ward_ids ?? [], [value.ward_ids]);

  const projectIdSet = useMemo(() => new Set(projectIds), [projectIds]);
  const stateIdSet = useMemo(() => new Set(stateIds), [stateIds]);
  const districtIdSet = useMemo(() => new Set(districtIds), [districtIds]);
  const cityIdSet = useMemo(() => new Set(cityIds), [cityIds]);

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

  /* ── Load company-scoped districts/cities/panchayats/zones/wards (all projects for the company; narrowed to selected projects client-side below) ── */
  useEffect(() => {
    if (!companyUniqueId) {
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
    const params = { company_id: companyUniqueId };

    // Promise.allSettled — not all() — because an operator whose own Staff
    // Access Configuration has no Zone (or Panchayat) access 403s that one
    // call at the module-permission middleware; that must not block them
    // from configuring District/City/Panchayat/Ward for someone else. Zone/
    // Panchayat are additionally skipped entirely up front when the
    // login-scoped data shows the operator has no access to that resource.
    Promise.allSettled([
      districtApi.readAll({ params }),
      cityApi.readAll({ params }),
      showPanchayat ? panchayatApi.readAll({ params }) : Promise.resolve([]),
      showZone ? zoneApi.readAll({ params }) : Promise.resolve([]),
      wardApi.readAll({ params }),
    ])
      .then(([distR, cityR, panR, zoneR, wardR]) => {
        if (cancelled) return;

        const settled = (result: PromiseSettledResult<unknown>): unknown =>
          result.status === "fulfilled" ? result.value : [];

        const distData = settled(distR);
        const cityData = settled(cityR);
        const panData = settled(panR);
        const zoneData = settled(zoneR);
        const wardData = settled(wardR);

        setDistricts(
          toRecordList(distData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
              projectId: normalizeIdValue(item.project_id),
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
              projectId: normalizeIdValue(item.project_id),
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
              projectId: normalizeIdValue(item.project_id),
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
              projectId: normalizeIdValue(item.project_id),
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
              projectId: normalizeIdValue(item.project_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id ?? item.district),
              cityId: normalizeIdValue(item.city_id ?? item.city),
              panchayatId: normalizeIdValue(item.panchayat_id ?? item.panchayat),
              zoneId: normalizeIdValue(item.zone_id ?? item.zone),
            }))
            .filter((item) => item.value && item.label)
        );
      })
      .finally(() => {
        if (!cancelled) setScopedOptionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, showZone, showPanchayat]);

  /* ── Eligible id sets per level (narrowed by project + parent-level selections) ── */

  const eligibleDistricts = useMemo(
    () => (projectIds.length ? districts.filter((d) => !d.projectId || projectIdSet.has(d.projectId)) : []),
    [districts, projectIdSet, projectIds.length]
  );
  const eligibleCities = useMemo(
    () =>
      (projectIds.length ? cities.filter((c) => !c.projectId || projectIdSet.has(c.projectId)) : [])
        .filter((c) => stateIds.length === 0 || !c.stateId || stateIdSet.has(c.stateId))
        .filter((c) => districtIds.length === 0 || !c.districtId || districtIdSet.has(c.districtId)),
    [cities, projectIdSet, projectIds.length, stateIds.length, stateIdSet, districtIds.length, districtIdSet]
  );
  const eligiblePanchayats = useMemo(
    () =>
      (projectIds.length ? panchayats.filter((p) => !p.projectId || projectIdSet.has(p.projectId)) : [])
        .filter((p) => stateIds.length === 0 || !p.stateId || stateIdSet.has(p.stateId))
        .filter((p) => districtIds.length === 0 || !p.districtId || districtIdSet.has(p.districtId))
        .filter((p) => cityIds.length === 0 || !p.cityId || cityIdSet.has(p.cityId)),
    [panchayats, projectIdSet, projectIds.length, stateIds.length, stateIdSet, districtIds.length, districtIdSet, cityIds.length, cityIdSet]
  );
  const eligibleZones = useMemo(
    () =>
      (projectIds.length ? zoneOptions.filter((z) => !z.projectId || projectIdSet.has(z.projectId)) : [])
        .filter((z) => stateIds.length === 0 || !z.stateId || stateIdSet.has(z.stateId))
        .filter((z) => districtIds.length === 0 || !z.districtId || districtIdSet.has(z.districtId))
        .filter((z) => cityIds.length === 0 || !z.cityId || cityIdSet.has(z.cityId)),
    [zoneOptions, projectIdSet, projectIds.length, stateIds.length, stateIdSet, districtIds.length, districtIdSet, cityIds.length, cityIdSet]
  );

  const zoneIdSet = useMemo(() => new Set(zoneIds), [zoneIds]);
  const panchayatIdSet = useMemo(() => new Set(panchayatIds), [panchayatIds]);

  const eligibleWards = useMemo(() => {
    if (zoneIds.length === 0 && panchayatIds.length === 0) return [];
    return (projectIds.length ? wards.filter((w) => !w.projectId || projectIdSet.has(w.projectId)) : []).filter(
      (w) => (w.zoneId && zoneIdSet.has(w.zoneId)) || (w.panchayatId && panchayatIdSet.has(w.panchayatId))
    );
  }, [wards, projectIdSet, projectIds.length, zoneIds.length, panchayatIds.length, zoneIdSet, panchayatIdSet]);

  const eligibleStateIds = useMemo(() => {
    // No project selected => no state should be selectable either (State is
    // gated behind Project just like every other level here).
    if (!projectIds.length) return new Set<string>();
    const ids = new Set<string>();
    [...eligibleDistricts, ...eligibleCities, ...eligiblePanchayats, ...eligibleZones].forEach((item) => {
      if (item.stateId) ids.add(item.stateId);
    });
    return ids;
  }, [projectIds.length, eligibleDistricts, eligibleCities, eligiblePanchayats, eligibleZones]);

  const stateOptions = useMemo(
    () => states.filter((s) => eligibleStateIds.has(s.value)),
    [states, eligibleStateIds]
  );

  const toOptions = (list: { value: string; label: string }[]): MultiSelectOption[] =>
    list.map((item) => ({ value: item.value, label: item.label }));

  useEffect(() => {
    onOptionsResolved?.({
      states: toOptions(states),
      districts: toOptions(districts),
      cities: toOptions(cities),
      zones: toOptions(zoneOptions),
      panchayats: toOptions(panchayats),
      wards: toOptions(wards),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, districts, cities, zoneOptions, panchayats, wards]);

  /* ── Auto-select newly-eligible descendants; keep manual unchecks for options that stay eligible ── */

  const optionsLoaded = statesLoaded && (!companyUniqueId || scopedOptionsLoaded);
  const canReconcile = readyForReconcile && optionsLoaded;
  const cascadeOptions = { canReconcile, skipFirstReconcile: isEdit };

  const eligibleDistrictIds = useMemo(() => new Set(eligibleDistricts.map((d) => d.value)), [eligibleDistricts]);
  const eligibleCityIds = useMemo(() => new Set(eligibleCities.map((c) => c.value)), [eligibleCities]);
  const eligiblePanchayatIds = useMemo(() => new Set(eligiblePanchayats.map((p) => p.value)), [eligiblePanchayats]);
  const eligibleZoneIds = useMemo(() => new Set(eligibleZones.map((z) => z.value)), [eligibleZones]);
  const eligibleWardIds = useMemo(() => new Set(eligibleWards.map((w) => w.value)), [eligibleWards]);

  useCascadingSelection(stateIds, eligibleStateIds, (next) => onChange({ state_ids: next }), cascadeOptions);
  useCascadingSelection(districtIds, eligibleDistrictIds, (next) => onChange({ district_ids: next }), cascadeOptions);
  useCascadingSelection(cityIds, eligibleCityIds, (next) => onChange({ city_ids: next }), cascadeOptions);
  useCascadingSelection(panchayatIds, eligiblePanchayatIds, (next) => onChange({ panchayat_ids: next }), cascadeOptions);
  useCascadingSelection(zoneIds, eligibleZoneIds, (next) => onChange({ zone_ids: next }), cascadeOptions);
  useCascadingSelection(wardIds, eligibleWardIds, (next) => onChange({ ward_ids: next }), cascadeOptions);

  // Wait for the state list and (when a company scope is known) the
  // scoped district/city/panchayat/zone/ward lists before mounting the
  // interactive selects, so saved values resolve to real labels immediately.
  const optionsReady = statesLoaded && (!companyUniqueId || scopedOptionsLoaded);

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

  const noProjectSelected = projectIds.length === 0;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <div>
        <Label>{t("common.state")}</Label>
        <MultiSelect
          value={stateIds}
          onChange={(next) => onChange({ state_ids: next })}
          options={toOptions(stateOptions)}
          placeholder={t("common.select_item_placeholder", { item: t("common.state") })}
          disabled={disabled || noProjectSelected}
        />
      </div>

      <div>
        <Label>{t("common.district")}</Label>
        <MultiSelect
          value={districtIds}
          onChange={(next) => onChange({ district_ids: next })}
          options={toOptions(eligibleDistricts)}
          placeholder={t("common.select_item_placeholder", { item: t("common.district") })}
          disabled={disabled || noProjectSelected}
        />
      </div>

      <div>
        <Label>{t("common.city")}</Label>
        <MultiSelect
          value={cityIds}
          onChange={(next) => onChange({ city_ids: next })}
          options={toOptions(eligibleCities)}
          placeholder={t("common.select_item_placeholder", { item: t("common.city") })}
          disabled={disabled || noProjectSelected}
        />
      </div>

      {showZone && (
      <div>
        <Label>{t("admin.nav.zone")}</Label>
        <MultiSelect
          value={zoneIds}
          onChange={(next) => onChange({ zone_ids: next })}
          options={toOptions(eligibleZones)}
          placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") })}
          disabled={disabled || noProjectSelected}
        />
      </div>
      )}

      {showPanchayat && (
      <div>
        <Label>{t("admin.nav.panchayat")}</Label>
        <MultiSelect
          value={panchayatIds}
          onChange={(next) => onChange({ panchayat_ids: next })}
          options={toOptions(eligiblePanchayats)}
          placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })}
          disabled={disabled || noProjectSelected}
        />
      </div>
      )}

      <div>
        <Label>{t("admin.nav.ward")}</Label>
        <MultiSelect
          value={wardIds}
          onChange={(next) => onChange({ ward_ids: next })}
          options={toOptions(eligibleWards)}
          placeholder={t("common.select_item_placeholder", { item: t("admin.nav.ward") })}
          disabled={disabled || (zoneIds.length === 0 && panchayatIds.length === 0)}
        />
      </div>
    </div>
  );
}
