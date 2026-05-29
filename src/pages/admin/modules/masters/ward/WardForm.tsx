/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { adminApi } from "@/helpers/admin/registry";

const WARD_FORM_FIELDS: Record<string, string[]> = {
  continent_id: ["continent_id"],
  country_id:   ["country_id"],
  state_id:     ["state_id"],
  district_id:  ["district_id"],
  city_id:      ["city_id"],
  zone_id:      ["zone_id"],
  ward_name:    ["ward_name"],
  is_active:    ["is_active"],
  description:  ["description"],
};
import type { SelectOption } from "@/types";
import type { CityMeta, CountryMeta, DistrictMeta, StateMeta, ZoneMeta } from "./types";


/* ------------------------------
    TYPES
------------------------------ */
/* ------------------------------
  UTILITIES
------------------------------ */
const normalizeNullable = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") return normalizeNullable(v.unique_id ?? v.id);
  return String(v);
};

const normalizeLabel = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const resolveMetaId = <T extends { id: string; name: string }>(
  items: T[],
  id: string | null,
  name: string | null | undefined
) => {
  if (id && items.some((item) => item.id === id)) {
    return id;
  }

  const normalizedName = normalizeLabel(name);
  if (!normalizedName) {
    return id;
  }

  return (
    items.find((item) => normalizeLabel(item.name) === normalizedName)?.id ?? id
  );
};

type WardRouteState = {
  companyUniqueId?: string | number | null;
  projectId?: string | number | null;
};

type WardWithRelations = {
  ward_name?: string | null;
  name?: string | null;
  description?: string | null;
  remarks?: string | null;
  notes?: string | null;
  is_active?: boolean;
  continent_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  country_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  state_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  district_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  city_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  zone_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent?: string | number | { unique_id?: string | number; id?: string | number } | null;
  country?: string | number | { unique_id?: string | number; id?: string | number } | null;
  state?: string | number | { unique_id?: string | number; id?: string | number } | null;
  district?: string | number | { unique_id?: string | number; id?: string | number } | null;
  city?: string | number | { unique_id?: string | number; id?: string | number } | null;
  zone?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent_name?: string | null;
  country_name?: string | null;
  state_name?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  zone_name?: string | null;
};

type WardCityMeta = CityMeta & {
  continentId?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  continentName?: string | null;
  countryName?: string | null;
  stateName?: string | null;
  districtName?: string | null;
};

type WardZoneMeta = ZoneMeta & {
  continentId?: string | null;
  countryId?: string | null;
  stateId?: string | null;
  districtId?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  stateName?: string | null;
};

type WardStateMeta = StateMeta & {
  continentId?: string | null;
  countryName?: string | null;
};

type WardDistrictMeta = DistrictMeta & {
  continentId?: string | null;
  countryId?: string | null;
  stateName?: string | null;
  countryName?: string | null;
  continentName?: string | null;
};

const firstNonEmpty = (...values: Array<string | null | undefined>) =>
  values.find((value) => Boolean(value)) ?? null;

const resolveOptionId = <T extends { id: string; name: string }>(
  items: T[],
  value: string | null | undefined,
  ...names: Array<string | null | undefined>
) =>
  resolveMetaId(
    items,
    value ?? null,
    names.find((name) => Boolean(name)) ?? value ?? null
  );

/* ------------------------------
  ROUTES
------------------------------ */
const { encMasters, encWards } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encWards}`;

/* ==========================================================
      COMPONENT
========================================================== */
export default function WardForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } = useFieldVisibility(
    "masters",
    "wards",
    WARD_FORM_FIELDS,
  );
  /* FORM FIELDS */
  const [wardName, setWardName] = useState("");
  const [continentId, setContinentId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  /* PENDING CHAINS (Edit Support) */
  const [pendingContinent, setPendingContinent] = useState("");
  const [pendingCountry, setPendingCountry] = useState("");
  const [pendingState, setPendingState] = useState("");
  const [pendingDistrict, setPendingDistrict] = useState("");
  const [pendingCity, setPendingCity] = useState("");
  const [pendingZone, setPendingZone] = useState("");

  /* MASTER DATA */
  const [continents, setContinents] = useState<SelectOption[]>([]);
  const [allCountries, setAllCountries] = useState<CountryMeta[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<SelectOption[]>([]);

  const [allStates, setAllStates] = useState<WardStateMeta[]>([]);
  const [filteredStates, setFilteredStates] = useState<SelectOption[]>([]);

  const [allDistricts, setAllDistricts] = useState<WardDistrictMeta[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<SelectOption[]>([]);

  const [allCities, setAllCities] = useState<WardCityMeta[]>([]);
  const [filteredCities, setFilteredCities] = useState<SelectOption[]>([]);

  const [allZones, setAllZones] = useState<WardZoneMeta[]>([]);
  const [filteredZones, setFilteredZones] = useState<SelectOption[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const routeState = location.state as WardRouteState | null;
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
  } = useCompanyProjectSelection({ isEdit });

  const extractErr = (e: any): string => {
    if (e?.response?.data) return String(e.response.data);
    if (e?.message) return e.message;
    return t("common.unexpected_error");
  };

  /* ==========================================================
      SINGLE-RECORD FETCH (edit mode)
  ========================================================== */
  const [wardRecordData, setWardRecordData] = useState<WardWithRelations | null>(null);
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    adminApi.wards.get(id)
      .then((res: any) => {
        if (cancelled) return;
        setWardRecordData(res);
      })
      .catch((err: any) => {
        if (cancelled) return;
        Swal.fire({ icon: "error", title: t("common.error"), text: String(err?.response?.data ?? err?.message ?? t("common.load_failed")) });
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  /* Selected city fetch (for geographic chain resolution in edit mode) */
  const [selectedCityData, setSelectedCityData] = useState<any>(null);
  const selectedCityId = isEdit ? (cityId || pendingCity) : null;
  useEffect(() => {
    if (!selectedCityId) { setSelectedCityData(null); return; }
    let cancelled = false;
    adminApi.cities.get(selectedCityId)
      .then((res: any) => { if (cancelled) return; setSelectedCityData(res); })
      .catch(() => { if (!cancelled) setSelectedCityData(null); });
    return () => { cancelled = true; };
  }, [selectedCityId]);

  /* ==========================================================
      LOAD MASTER DATA
  ========================================================== */
  useEffect(() => {
    if (isEdit) return;

    const searchParams = new URLSearchParams(location.search);
    const storedCompanyId =
      typeof window === "undefined"
        ? null
        : localStorage.getItem("selected_company_unique_id");
    const storedProjectId =
      typeof window === "undefined"
        ? null
        : localStorage.getItem("selected_project_id");
    const routeCompanyId = normalizeNullable(
      routeState?.companyUniqueId ??
        searchParams.get("company_unique_id") ??
        storedCompanyId
    );
    const routeProjectId = normalizeNullable(
      routeState?.projectId ?? searchParams.get("project_id") ?? storedProjectId
    );

    if (routeCompanyId && routeCompanyId !== companyUniqueId) {
      onCompanyChange(routeCompanyId);
      return;
    }

    const routeProjectReady =
      routeProjectId &&
      (!routeCompanyId || routeCompanyId === companyUniqueId) &&
      projects.some((project) => project.value === routeProjectId);

    if (routeProjectReady && routeProjectId !== projectId) {
      setProjectId(routeProjectId);
    }
  }, [
    companyUniqueId,
    isEdit,
    location.search,
    onCompanyChange,
    projectId,
    projects,
    routeState,
    setProjectId,
  ]);

  useEffect(() => {
    let cancelled = false;
    adminApi.continents.list()
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setContinents(list.filter((x: any) => x.is_active).map((x: any) => ({ value: String(x.unique_id), label: x.name })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminApi.countries.list()
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setAllCountries(list.map((c: any) => ({
          id: String(c.unique_id),
          name: c.name,
          continentId: normalizeNullable(c.continent_id ?? c.continent_unique_id ?? c.continent),
          isActive: Boolean(c.is_active),
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminApi.states.list()
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setAllStates(list.map((s: any) => ({
          id: String(s.unique_id),
          name: s.name,
          countryId: normalizeNullable(s.country_id ?? s.country_unique_id ?? s.country),
          continentId: normalizeNullable(s.continent_id ?? s.continent_unique_id ?? s.continent),
          countryName: s.country_name ?? null,
          isActive: Boolean(s.is_active),
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminApi.districts.list()
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setAllDistricts(list.map((d: any) => ({
          id: String(d.unique_id),
          name: d.name,
          stateId: normalizeNullable(d.state_id ?? d.state_unique_id ?? d.state),
          countryId: normalizeNullable(d.country_id ?? d.country_unique_id ?? d.country),
          continentId: normalizeNullable(d.continent_id ?? d.continent_unique_id ?? d.continent),
          stateName: d.state_name ?? null,
          countryName: d.country_name ?? null,
          continentName: d.continent_name ?? null,
          isActive: Boolean(d.is_active),
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminApi.cities.list()
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setAllCities(list.map((c: any) => ({
          id: String(c.unique_id),
          name: c.name ?? c.city_name,
          continentId: normalizeNullable(c.continent_id ?? c.continent_unique_id ?? c.continent),
          countryId: normalizeNullable(c.country_id ?? c.country_unique_id ?? c.country),
          stateId: normalizeNullable(c.state_id ?? c.state_unique_id ?? c.state),
          districtId: normalizeNullable(c.district_id ?? c.district_unique_id ?? c.district),
          continentName: c.continent_name ?? null,
          countryName: c.country_name ?? null,
          stateName: c.state_name ?? null,
          districtName: c.district_name ?? null,
          isActive: Boolean(c.is_active),
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    adminApi.zones.list()
      .then((res: any) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        setAllZones(list.map((z: any) => ({
          id: String(z.unique_id),
          name: z.zone_name,
          continentId: normalizeNullable(z.continent_id ?? z.continent_unique_id ?? z.continent),
          countryId: normalizeNullable(z.country_id ?? z.country_unique_id ?? z.country),
          stateId: normalizeNullable(z.state_id ?? z.state_unique_id ?? z.state),
          districtId: normalizeNullable(z.district_id ?? z.district_unique_id ?? z.district),
          cityId: normalizeNullable(z.city_id ?? z.city_unique_id ?? z.city),
          cityName: z.city_name ?? null,
          districtName: z.district_name ?? null,
          stateName: z.state_name ?? null,
          isActive: Boolean(z.is_active),
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ==========================================================
        FILTER CHAINS
  ========================================================== */
  useEffect(() => {
    if (!continentId) {
      setFilteredCountries([]);
      return;
    }

    const filt = allCountries
      .filter((c) => c.isActive && c.continentId === continentId)
      .map((c) => ({ value: c.id, label: c.name }));

    if (pendingCountry && !filt.some((o) => o.value === pendingCountry)) {
      const found = allCountries.find((c) => c.id === pendingCountry);
      if (found) filt.push({ value: found.id, label: found.name });
    }

    setFilteredCountries(filt);
  }, [continentId, allCountries, pendingCountry]);

  useEffect(() => {
    if (!countryId) {
      setFilteredStates([]);
      return;
    }

    const filt = allStates
      .filter((s) => s.isActive && s.countryId === countryId)
      .map((s) => ({ value: s.id, label: s.name }));

    if (pendingState && !filt.some((o) => o.value === pendingState)) {
      const found = allStates.find((s) => s.id === pendingState);
      if (found) filt.push({ value: found.id, label: found.name });
    }

    setFilteredStates(filt);
  }, [countryId, allStates, pendingState]);

  useEffect(() => {
    if (!stateId) {
      setFilteredDistricts([]);
      return;
    }

    const filt = allDistricts
      .filter((d) => d.isActive && d.stateId === stateId)
      .map((d) => ({ value: d.id, label: d.name }));

    if (pendingDistrict && !filt.some((o) => o.value === pendingDistrict)) {
      const found = allDistricts.find((d) => d.id === pendingDistrict);
      if (found) filt.push({ value: found.id, label: found.name });
    }

    setFilteredDistricts(filt);
  }, [stateId, allDistricts, pendingDistrict]);

  useEffect(() => {
    if (!districtId) {
      setFilteredCities([]);
      return;
    }

    const filt = allCities
      .filter((c) => c.isActive && c.districtId === districtId)
      .map((c) => ({ value: c.id, label: c.name }));

    if (pendingCity && !filt.some((o) => o.value === pendingCity)) {
      const found = allCities.find((c) => c.id === pendingCity);
      if (found) filt.push({ value: found.id, label: found.name });
    }

    setFilteredCities(filt);
  }, [districtId, allCities, pendingCity]);

  useEffect(() => {
    if (!cityId) {
      setFilteredZones([]);
      return;
    }

    const filt = allZones
      .filter((z) => z.isActive && z.cityId === cityId)
      .map((z) => ({ value: z.id, label: z.name }));

    if (pendingZone && !filt.some((o) => o.value === pendingZone)) {
      const found = allZones.find((z) => z.id === pendingZone);
      if (found) filt.push({ value: found.id, label: found.name });
    }

    setFilteredZones(filt);
  }, [cityId, allZones, pendingZone]);

  /* ==========================================================
        EDIT MODE
  ========================================================== */
  useEffect(() => {
    if (!wardRecordData) return;
    const data = wardRecordData as WardWithRelations;

    setWardName(data.ward_name ?? data.name ?? "");
    setIsActive(Boolean(data.is_active));
    setDescription(data.description ?? data.remarks ?? data.notes ?? "");

    let cont = resolveMetaId(
      continents.map((continent) => ({
        id: continent.value,
        name: continent.label,
      })),
      normalizeNullable(data.continent_id ?? data.continent),
      data.continent_name
    );
    let ctr = resolveMetaId(
      allCountries,
      normalizeNullable(data.country_id ?? data.country),
      data.country_name
    );
    let ste = resolveMetaId(
      allStates,
      normalizeNullable(data.state_id ?? data.state),
      data.state_name
    );
    let dis = resolveMetaId(
      allDistricts,
      normalizeNullable(data.district_id ?? data.district),
      data.district_name
    );
    let cty = resolveMetaId(
      allCities,
      normalizeNullable(data.city_id ?? data.city),
      data.city_name
    );
    const zne = resolveMetaId(
      allZones,
      normalizeNullable(data.zone_id ?? data.zone),
      data.zone_name
    );
    const selectedZone = zne ? allZones.find((zone) => zone.id === zne) : undefined;

    cty = resolveOptionId(
      allCities,
      cty || selectedZone?.cityId || null,
      data.city_name,
      selectedZone?.cityName
    );
    const resolvedCity = cty
      ? allCities.find((city) => city.id === cty) ??
        allCities.find((city) => normalizeLabel(city.name) === normalizeLabel(data.city_name))
      : selectedZone?.cityName
        ? allCities.find((city) => normalizeLabel(city.name) === normalizeLabel(selectedZone.cityName))
        : undefined;

    cty = cty || resolvedCity?.id || null;
    dis = resolveOptionId(
      allDistricts,
      firstNonEmpty(resolvedCity?.districtId, dis, selectedZone?.districtId),
      resolvedCity?.districtName,
      data.district_name,
      selectedZone?.districtName
    );

    const resolvedDistrict = dis
      ? allDistricts.find((district) => district.id === dis) ??
        allDistricts.find(
          (district) =>
            normalizeLabel(district.name) ===
            normalizeLabel(data.district_name ?? resolvedCity?.districtName)
        )
      : selectedZone?.districtName || resolvedCity?.districtName
        ? allDistricts.find(
            (district) =>
              normalizeLabel(district.name) ===
              normalizeLabel(selectedZone?.districtName ?? resolvedCity?.districtName)
          )
        : undefined;

    dis = dis || resolvedDistrict?.id || null;
    ste = resolveOptionId(
      allStates,
      firstNonEmpty(
        resolvedCity?.stateId,
        resolvedDistrict?.stateId,
        ste,
        selectedZone?.stateId
      ),
      resolvedCity?.stateName,
      resolvedDistrict?.stateName,
      data.state_name,
      selectedZone?.stateName
    );

    const resolvedState = ste
      ? allStates.find((state) => state.id === ste) ??
        allStates.find((state) => normalizeLabel(state.name) === normalizeLabel(data.state_name))
      : selectedZone?.stateName || resolvedCity?.stateName || resolvedDistrict?.stateName
        ? allStates.find(
            (state) =>
              normalizeLabel(state.name) ===
              normalizeLabel(
                selectedZone?.stateName ??
                  resolvedCity?.stateName ??
                  resolvedDistrict?.stateName
              )
          )
        : undefined;

    ste = ste || resolvedState?.id || null;
    ctr = resolveOptionId(
      allCountries,
      firstNonEmpty(
        resolvedCity?.countryId,
        resolvedDistrict?.countryId,
        resolvedState?.countryId,
        ctr,
        selectedZone?.countryId
      ),
      resolvedCity?.countryName,
      resolvedDistrict?.countryName,
      resolvedState?.countryName,
      data.country_name
    );

    const resolvedCountry = ctr
      ? allCountries.find((country) => country.id === ctr) ??
        allCountries.find((country) => normalizeLabel(country.name) === normalizeLabel(data.country_name))
      : resolvedCity?.countryName || resolvedDistrict?.countryName || resolvedState?.countryName
        ? allCountries.find(
            (country) =>
              normalizeLabel(country.name) ===
              normalizeLabel(
                resolvedCity?.countryName ??
                  resolvedDistrict?.countryName ??
                  resolvedState?.countryName
              )
          )
        : undefined;

    ctr = ctr || resolvedCountry?.id || null;
    cont = resolveOptionId(
      continents.map((continent) => ({
        id: continent.value,
        name: continent.label,
      })),
      firstNonEmpty(
        resolvedCity?.continentId,
        resolvedDistrict?.continentId,
        resolvedState?.continentId,
        resolvedCountry?.continentId,
        cont,
        selectedZone?.continentId
      ),
      resolvedCity?.continentName,
      resolvedDistrict?.continentName,
      data.continent_name
    );

    if (cont) {
      setContinentId(cont);
      setPendingContinent(cont);
    }
    if (ctr) {
      setCountryId(ctr);
      setPendingCountry(ctr);
    }
    if (ste) {
      setStateId(ste);
      setPendingState(ste);
    }
    if (dis) {
      setDistrictId(dis);
      setPendingDistrict(dis);
    }
    if (cty) {
      setCityId(cty);
      setPendingCity(cty);
    }
    if (zne) {
      setZoneId(zne);
      setPendingZone(zne);
    }
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [
    wardRecordData,
    applyCompanyProjectFromRecord,
    continents,
    allCountries,
    allStates,
    allDistricts,
    allCities,
    allZones,
  ]);

  useEffect(() => {
    if (!isEdit || !selectedCityData) return;
    const city = selectedCityData as any;

    const cont = resolveOptionId(
      continents.map((continent) => ({
        id: continent.value,
        name: continent.label,
      })),
      normalizeNullable(city.continent_id ?? city.continent),
      city.continent_name
    );
    const ctr = resolveOptionId(
      allCountries,
      normalizeNullable(city.country_id ?? city.country),
      city.country_name
    );
    const ste = resolveOptionId(
      allStates,
      normalizeNullable(city.state_id ?? city.state),
      city.state_name
    );
    const dis = resolveOptionId(
      allDistricts,
      normalizeNullable(city.district_id ?? city.district),
      city.district_name
    );

    if (cont) {
      setContinentId(cont);
      setPendingContinent(cont);
    }
    if (ctr) {
      setCountryId(ctr);
      setPendingCountry(ctr);
    }
    if (ste) {
      setStateId(ste);
      setPendingState(ste);
    }
    if (dis) {
      setDistrictId(dis);
      setPendingDistrict(dis);
    }
  }, [
    isEdit,
    selectedCityData,
    continents,
    allCountries,
    allStates,
    allDistricts,
  ]);

  /* ==========================================================
        AUTO-INFER CHAINS
  ========================================================== */
  useEffect(() => {
    if (
      pendingContinent &&
      continents.length > 0 &&
      continents.some((c) => c.value === pendingContinent)
    ) {
      setContinentId(pendingContinent);
      setPendingContinent("");
    }
  }, [pendingContinent, continents]);

  useEffect(() => {
    if (
      pendingCountry &&
      filteredCountries.length > 0 &&
      filteredCountries.some((o) => o.value === pendingCountry)
    ) {
      setCountryId(pendingCountry);
      setPendingCountry("");
    }
  }, [pendingCountry, filteredCountries]);

  useEffect(() => {
    if (
      pendingState &&
      filteredStates.length > 0 &&
      filteredStates.some((o) => o.value === pendingState)
    ) {
      setStateId(pendingState);
      setPendingState("");
    }
  }, [pendingState, filteredStates]);

  useEffect(() => {
    if (
      pendingDistrict &&
      filteredDistricts.length > 0 &&
      filteredDistricts.some((o) => o.value === pendingDistrict)
    ) {
      setDistrictId(pendingDistrict);
      setPendingDistrict("");
    }
  }, [pendingDistrict, filteredDistricts]);

  useEffect(() => {
    if (
      pendingCity &&
      filteredCities.length > 0 &&
      filteredCities.some((o) => o.value === pendingCity)
    ) {
      setCityId(pendingCity);
      setPendingCity("");
    }
  }, [pendingCity, filteredCities]);

  useEffect(() => {
    if (
      pendingZone &&
      filteredZones.length > 0 &&
      filteredZones.some((o) => o.value === pendingZone)
    ) {
      setZoneId(pendingZone);
      setPendingZone("");
    }
  }, [pendingZone, filteredZones]);

    /* ==========================================================
      FORM SUBMIT
    ========================================================== */
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fieldValues: Record<string, unknown> = {
      continent_id: continentId,
      country_id: countryId,
      state_id: stateId,
      ward_name: wardName.trim(),
    };
    const missingFields = getMissingRequiredFields(
      ["continent_id", "country_id", "state_id", "ward_name"],
      (fieldKey) => fieldValues[fieldKey],
    );

    if (missingFields.length > 0) {
      Swal.fire(t("common.warning"), t("common.all_fields_required"), "warning");
      return;
    }

    if (!companyUniqueId) {
      Swal.fire(
        "Error",
        !loggedInCompanyUniqueId && !isSuperAdmin
          ? "Company is not mapped to this login. Only super admin can choose a company."
          : "Company is required",
        "error"
      );
      return;
    }

    if (!projectId) {
      Swal.fire("Error", "Project is required", "error");
      return;
    }

    const rawPayload = {
      ward_name: wardName.trim(),
      continent_id: continentId,
      country_id: countryId,
      state_id: stateId,
      district_id: districtId || null,
      city_id: cityId || null,
      zone_id: zoneId || null,
      description,
      is_active: isActive,
      company_id: companyUniqueId,
      project_id: projectId,
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.wards.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await adminApi.wards.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }
      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err) {
      Swal.fire(t("common.save_failed"), extractErr(err), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ==========================================================
        JSX
  ========================================================== */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.ward") })
          : t("common.add_item", { item: t("admin.nav.ward") })
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Company *</Label>
            <Select
              value={companyUniqueId}
              onValueChange={onCompanyChange}
              disabled={
                Boolean(loggedInCompanyUniqueId) ||
                (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                companies.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loggedInCompanyUniqueId
                      ? "Company from logged-in profile"
                      : isSuperAdmin
                        ? "Select Company"
                        : "Only super admin can select company"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loggedInCompanyUniqueId && !isSuperAdmin && (
              <p className="mt-1 text-xs text-red-500">
                Company is not mapped to this login. Only super admin can view
                all companies.
              </p>
            )}
            {isSuperAdmin && !loggedInCompanyUniqueId && companies.length === 0 && (
              <p className="mt-1 text-xs text-red-500">No companies found.</p>
            )}
          </div>

          <div>
            <Label>Project *</Label>
            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={!companyUniqueId || projects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companyUniqueId && projects.length === 0 && (
              <p className="mt-1 text-xs text-red-500">
                No projects found for this company.
              </p>
            )}
          </div>

          {/* Continent */}
          {showField("continent_id") && (
          <div>
            <Label>{t("admin.nav.continent")} *</Label>
            <Select value={continentId} onValueChange={(val) => { setContinentId(val); setCountryId(""); setStateId(""); setDistrictId(""); setCityId(""); setZoneId(""); setPendingCountry(""); setPendingState(""); setPendingDistrict(""); setPendingCity(""); setPendingZone(""); }}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.continent") })} />
              </SelectTrigger>
              <SelectContent>
                {continents.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Country */}
          {showField("country_id") && (
          <div>
            <Label>{t("admin.nav.country")} *</Label>
            <Select value={countryId} onValueChange={(val) => { setCountryId(val); setStateId(""); setDistrictId(""); setCityId(""); setZoneId(""); setPendingState(""); setPendingDistrict(""); setPendingCity(""); setPendingZone(""); }}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.country") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredCountries.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* State */}
          {showField("state_id") && (
          <div>
            <Label>{t("admin.nav.state")} *</Label>
            <Select value={stateId} onValueChange={(val) => { setStateId(val); setDistrictId(""); setCityId(""); setZoneId(""); setPendingDistrict(""); setPendingCity(""); setPendingZone(""); }}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.state") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredStates.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* District */}
          {showField("district_id") && (
          <div>
            <Label>{t("admin.nav.district")}</Label>
            <Select value={districtId} onValueChange={(val) => { setDistrictId(val); setCityId(""); setZoneId(""); setPendingCity(""); setPendingZone(""); }}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.district") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredDistricts.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* City */}
          {showField("city_id") && (
          <div>
            <Label>{t("admin.nav.city")}</Label>
            <Select value={cityId} onValueChange={(val) => { setCityId(val); setZoneId(""); setPendingZone(""); }}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.city") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredCities.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Zone */}
          {showField("zone_id") && (
          <div>
            <Label>{t("admin.nav.zone")}</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredZones.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Ward Name */}
          {showField("ward_name") && (
          <div>
            <Label>{t("common.item_name", { item: t("admin.nav.ward") })} *</Label>
            <Input value={wardName} onChange={(e) => setWardName(e.target.value)} placeholder={t("common.enter_item_name", { item: t("admin.nav.ward") })} required />
          </div>
          )}

          {/* Active Status */}
          {showField("is_active") && (
          <div>
            <Label>{t("common.status")} *</Label>
            <Select value={isActive ? "true" : "false"} onValueChange={(v) => setIsActive(v === "true")}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Description */}
          {showField("description") && (
          <div className="md:col-span-2">
            <Label>{t("common.description")}</Label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("common.description_optional")} className="w-full border rounded-md p-2 focus:ring focus:ring-green-200 outline-none" rows={3} />
          </div>
          )}
        </div>

        {/* BUTTONS */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? t("common.updating")
                : t("common.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } })}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
