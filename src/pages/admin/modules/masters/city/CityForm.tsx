/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState, type FormEvent } from "react";
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
import type { SelectOption } from "@/types";
import type { CityRecord as QueryCityRecord } from "@/tanstack/admin";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";

const CITY_FORM_FIELDS: Record<string, string[]> = {
  continent_id: ["continent_id"],
  country_id:   ["country_id"],
  state_id:     ["state_id"],
  district_id:  ["district_id"],
  name:         ["name"],
  is_active:    ["is_active"],
};
import type { CityRecord, CountryMeta, DistrictMeta, StateMeta } from "./types";
import {
  useContinentsQuery,
  useCountriesQuery,
  useStatesQuery,
  useDistrictsQuery,
  useCityQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
} from "@/tanstack/admin";

/* ------------------------------
    TYPES
------------------------------ */

/* ------------------------------
    UTILITIES
------------------------------ */
const normalizeNullable = (
  v:
    | string
    | number
    | { unique_id?: string | number; id?: string | number }
    | null
    | undefined
): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") return normalizeNullable(v.unique_id ?? v.id);
  return String(v);
};

const normalizeLabel = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const resolveOptionValue = (
  options: SelectOption[],
  id: string | null,
  label: string | null | undefined
) => {
  if (id && options.some((option) => option.value === id)) {
    return id;
  }

  const normalizedLabel = normalizeLabel(label);
  if (!normalizedLabel) {
    return id;
  }

  return (
    options.find((option) => normalizeLabel(option.label) === normalizedLabel)
      ?.value ?? id
  );
};

const extractError = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (data) return String(data);
  if (error instanceof Error && error.message) return error.message;
  return "Unexpected error!";
};

type CityWithRelations = CityRecord & {
  company?: { unique_id?: string | number; id?: string | number } | string | number | null;
  project?: { unique_id?: string | number; id?: string | number } | string | number | null;
  company_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  project_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  country_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  state_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  district_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  company_unique_id?: string | number | null;
  project_unique_id?: string | number | null;
  continent_unique_id?: string | number | null;
  country_unique_id?: string | number | null;
  state_unique_id?: string | number | null;
  district_unique_id?: string | number | null;
  company_name?: string | null;
  project_name?: string | null;
  continent_name?: string | null;
  country_name?: string | null;
  state_name?: string | null;
  district_name?: string | null;
};

type CityRouteState = {
  city?: Partial<QueryCityRecord & CityWithRelations>;
  companyUniqueId?: string | number | null;
  projectId?: string | number | null;
};

/* ------------------------------
    ROUTES
------------------------------ */
const { encMasters, encCities } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encCities}`;


/* ==========================================================
    COMPONENT STARTS
========================================================== */
export default function CityForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } = useFieldVisibility(
    "masters",
    "cities",
    CITY_FORM_FIELDS,
  );
  /* FIELD STATES */
  const [cityName, setCityName] = useState("");
  const [continentId, setContinentId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");

  /* PENDING STATES */
  const [pendingCountryId, setPendingCountryId] = useState("");
  const [pendingStateId, setPendingStateId] = useState("");
  const [pendingDistrictId, setPendingDistrictId] = useState("");

  /* MASTER DATA */
  const [continents, setContinents] = useState<SelectOption[]>([]);
  const [allCountries, setAllCountries] = useState<CountryMeta[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<SelectOption[]>([]);

  const [allStates, setAllStates] = useState<StateMeta[]>([]);
  const [filteredStates, setFilteredStates] = useState<SelectOption[]>([]);

  const [allDistricts, setAllDistricts] = useState<DistrictMeta[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<SelectOption[]>([]);

  const [isActive, setIsActive] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const routeState = location.state as CityRouteState | null;
  const routeStateAppliedRef = useRef(false);
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

  /* ==========================================================
      LOAD MASTER DATA
  ========================================================== */
  const continentsQuery = useContinentsQuery();
  const countriesQuery = useCountriesQuery();
  const statesQuery = useStatesQuery();
  const districtsQuery = useDistrictsQuery();
  const cityQuery = useCityQuery(id);

  useEffect(() => {
    routeStateAppliedRef.current = false;
  }, [id, location.key]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const routeCompanyId = normalizeNullable(
      routeState?.companyUniqueId ?? searchParams.get("company_unique_id")
    );
    const routeProjectId = normalizeNullable(
      routeState?.projectId ?? searchParams.get("project_id")
    );

    if (!routeCompanyId && !routeProjectId && !routeState?.city?.name) return;

    if (!isEdit) {
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

      return;
    }

    if (routeStateAppliedRef.current) return;

    let applied = false;

    if (routeCompanyId && routeCompanyId !== companyUniqueId) {
      onCompanyChange(routeCompanyId);
      applied = true;
    }

    if (routeProjectId && routeProjectId !== projectId) {
      setProjectId(routeProjectId);
      applied = true;
    }

    if (!cityQuery.data && routeState?.city?.name) {
      setCityName(String(routeState.city.name));
      applied = true;
    }

    if (applied || routeCompanyId || routeProjectId || routeState?.city?.name) {
      routeStateAppliedRef.current = true;
    }
  }, [
    cityQuery.data,
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
    if (continentsQuery.isError) {
      Swal.fire(t("common.error"), String(continentsQuery.error), "error");
      return;
    }

    const city = cityQuery.data as CityWithRelations | undefined;
    const recordContinentId = normalizeNullable(
      city?.continent_id ?? city?.continent_unique_id ?? city?.continent
    );
    const res = continentsQuery.data ?? [];
    const activeContinents = res
      .filter((x) => x.is_active)
      .map((x) => ({ value: String(x.unique_id), label: x.name }));
    const resolvedContinentId = resolveOptionValue(
      activeContinents,
      recordContinentId,
      city?.continent_name
    );

    if (
      resolvedContinentId &&
      city?.continent_name &&
      !activeContinents.some((x) => x.value === resolvedContinentId)
    ) {
      setContinents([
        ...activeContinents,
        { value: resolvedContinentId, label: city.continent_name },
      ]);
      return;
    }

    setContinents(activeContinents);
  }, [continentsQuery.data, continentsQuery.error, continentsQuery.isError, cityQuery.data, t]);

  useEffect(() => {
    if (countriesQuery.isError) {
      Swal.fire(t("common.error"), String(countriesQuery.error), "error");
      return;
    }

    const city = cityQuery.data as CityWithRelations | undefined;
    const recordContinentId = normalizeNullable(
      city?.continent_id ?? city?.continent_unique_id ?? city?.continent
    );
    const resolvedContinentId = resolveOptionValue(
      continents,
      recordContinentId,
      city?.continent_name
    );
    const res = countriesQuery.data ?? [];
    const mapped = res.map((c) => ({
      id: String(c.unique_id),
      name: c.name,
      continentId:
        normalizeNullable(c.continent_id ?? c.continent) === recordContinentId &&
        resolvedContinentId
          ? resolvedContinentId
          : normalizeNullable(c.continent_id ?? c.continent),
      isActive: Boolean(c.is_active),
    }));
    setAllCountries(mapped);
  }, [countriesQuery.data, countriesQuery.error, countriesQuery.isError, cityQuery.data, continents, t]);

  useEffect(() => {
    if (statesQuery.isError) {
      Swal.fire(t("common.error"), String(statesQuery.error), "error");
      return;
    }

    const res = statesQuery.data ?? [];
    const mapped = res.map((s) => ({ id: String(s.unique_id), name: s.name, countryId: normalizeNullable(s.country_id ?? s.country), isActive: Boolean(s.is_active) }));
    setAllStates(mapped);
  }, [statesQuery.data, statesQuery.error, statesQuery.isError, t]);

  useEffect(() => {
    if (districtsQuery.isError) {
      Swal.fire(t("common.error"), String(districtsQuery.error), "error");
      return;
    }

    const res = districtsQuery.data ?? [];
    const mapped = res.map((d) => {
      const district = d as typeof d & { state?: string | number | null };
      return { id: String(district.unique_id), name: district.name, stateId: normalizeNullable(district.state_id ?? district.state), isActive: Boolean(district.is_active) };
    });
    setAllDistricts(mapped);
  }, [districtsQuery.data, districtsQuery.error, districtsQuery.isError, t]);

  /* ==========================================================
      FILTER COUNTRIES BASED ON SELECTED CONTINENT
  ========================================================== */
  useEffect(() => {
    if (!continentId) {
      setFilteredCountries([]);
      return;
    }

    const filt = allCountries
      .filter((c) => c.isActive && c.continentId === continentId)
      .map((c) => ({ value: c.id, label: c.name }));
    const city = cityQuery.data as CityWithRelations | undefined;
    const resolvedCountryId = resolveOptionValue(
      filt,
      pendingCountryId,
      city?.country_name
    );

    if (
      resolvedCountryId &&
      !filt.some((o) => o.value === resolvedCountryId)
    ) {
      const found = allCountries.find((c) => c.id === resolvedCountryId);
      if (found) {
        filt.push({ value: found.id, label: found.name });
      } else if (city?.country_name) {
        filt.push({ value: resolvedCountryId, label: city.country_name });
      }
    }

    setFilteredCountries(filt);
  }, [continentId, allCountries, pendingCountryId, cityQuery.data]);

  /* ==========================================================
      FILTER STATES BASED ON SELECTED COUNTRY
  ========================================================== */
  useEffect(() => {
    if (!countryId) {
      setFilteredStates([]);
      return;
    }

    const filt = allStates
      .filter((s) => s.isActive && s.countryId === countryId)
      .map((s) => ({ value: s.id, label: s.name }));
    const city = cityQuery.data as CityWithRelations | undefined;
    const resolvedStateId = resolveOptionValue(
      filt,
      pendingStateId,
      city?.state_name
    );

    if (
      resolvedStateId &&
      !filt.some((o) => o.value === resolvedStateId)
    ) {
      const found = allStates.find((s) => s.id === resolvedStateId);
      if (found) {
        filt.push({ value: found.id, label: found.name });
      } else if (city?.state_name) {
        filt.push({ value: resolvedStateId, label: city.state_name });
      }
    }

    setFilteredStates(filt);
  }, [countryId, allStates, pendingStateId, cityQuery.data]);

  /* ==========================================================
      FILTER DISTRICTS BY STATE
  ========================================================== */
  useEffect(() => {
    if (!stateId) {
      setFilteredDistricts([]);
      return;
    }

    const filt = allDistricts
      .filter((d) => d.isActive && d.stateId === stateId)
      .map((d) => ({ value: d.id, label: d.name }));
    const city = cityQuery.data as CityWithRelations | undefined;
    const resolvedDistrictId = resolveOptionValue(
      filt,
      pendingDistrictId,
      city?.district_name
    );

    if (
      resolvedDistrictId &&
      !filt.some((o) => o.value === resolvedDistrictId)
    ) {
      const found = allDistricts.find((d) => d.id === resolvedDistrictId);
      if (found) {
        filt.push({ value: found.id, label: found.name });
      } else if (city?.district_name) {
        filt.push({ value: resolvedDistrictId, label: city.district_name });
      }
    }

    setFilteredDistricts(filt);
  }, [stateId, allDistricts, pendingDistrictId, cityQuery.data]);

  /* ==========================================================
      APPLY PENDING COUNTRY WHEN FILTER READY
  ========================================================== */
  useEffect(() => {
    if (
      pendingCountryId &&
      filteredCountries.some((o) => o.value === pendingCountryId)
    ) {
      setCountryId(pendingCountryId);
      setPendingCountryId("");
      return;
    }

    if (!pendingCountryId) {
      return;
    }

    const city = cityQuery.data as CityWithRelations | undefined;
    const resolvedCountryId = resolveOptionValue(
      filteredCountries,
      pendingCountryId,
      city?.country_name
    );

    if (
      resolvedCountryId &&
      filteredCountries.some((o) => o.value === resolvedCountryId)
    ) {
      setCountryId(resolvedCountryId);
      setPendingCountryId("");
    }
  }, [filteredCountries, pendingCountryId, cityQuery.data]);

  /* ==========================================================
      APPLY PENDING STATE WHEN FILTER READY
  ========================================================== */
  useEffect(() => {
    if (
      pendingStateId &&
      filteredStates.some((o) => o.value === pendingStateId)
    ) {
      setStateId(pendingStateId);
      setPendingStateId("");
      return;
    }

    if (!pendingStateId) {
      return;
    }

    const city = cityQuery.data as CityWithRelations | undefined;
    const resolvedStateId = resolveOptionValue(
      filteredStates,
      pendingStateId,
      city?.state_name
    );

    if (
      resolvedStateId &&
      filteredStates.some((o) => o.value === resolvedStateId)
    ) {
      setStateId(resolvedStateId);
      setPendingStateId("");
    }
  }, [filteredStates, pendingStateId, cityQuery.data]);

  /* ==========================================================
      APPLY PENDING DISTRICT WHEN FILTER READY
  ========================================================== */
  useEffect(() => {
    if (
      pendingDistrictId &&
      filteredDistricts.some((o) => o.value === pendingDistrictId)
    ) {
      setDistrictId(pendingDistrictId);
      setPendingDistrictId("");
      return;
    }

    if (!pendingDistrictId) {
      return;
    }

    const city = cityQuery.data as CityWithRelations | undefined;
    const resolvedDistrictId = resolveOptionValue(
      filteredDistricts,
      pendingDistrictId,
      city?.district_name
    );

    if (
      resolvedDistrictId &&
      filteredDistricts.some((o) => o.value === resolvedDistrictId)
    ) {
      setDistrictId(resolvedDistrictId);
      setPendingDistrictId("");
    }
  }, [filteredDistricts, pendingDistrictId, cityQuery.data]);

  /* ==========================================================
      AUTO-RESOLVE CHAINS
  ========================================================== */

  // If only pendingCountry exists → set continent
  useEffect(() => {
    if (!continentId && pendingCountryId) {
      const found = allCountries.find((c) => c.id === pendingCountryId);
      if (found?.continentId) {
        setContinentId(found.continentId);
      }
    }
  }, [pendingCountryId, continentId, allCountries]);

  // If only pendingState exists → get country
  useEffect(() => {
    if (!countryId && pendingStateId) {
      const found = allStates.find((s) => s.id === pendingStateId);
      if (found?.countryId) {
        setCountryId(found.countryId);
        setPendingCountryId(found.countryId);
      }
    }
  }, [pendingStateId, countryId, allStates]);

  // If only pendingDistrict exists → get state
  useEffect(() => {
    if (!stateId && pendingDistrictId) {
      const found = allDistricts.find((d) => d.id === pendingDistrictId);
      if (found?.stateId) {
        setStateId(found.stateId);
        setPendingStateId(found.stateId);
      }
    }
  }, [pendingDistrictId, stateId, allDistricts]);

  /* ==========================================================
      EDIT MODE — LOAD EXISTING CITY
  ========================================================== */
  useEffect(() => {
    if (!cityQuery.data) return;
    const data = cityQuery.data as CityWithRelations;

    setCityName(data.name ?? "");
    setIsActive(Boolean(data.is_active));

    const rawContinentId = normalizeNullable(
      data.continent_id ?? data.continent_unique_id ?? data.continent
    );
    const rawCountryId = normalizeNullable(
      data.country_id ?? data.country_unique_id ?? data.country
    );
    const rawStateId = normalizeNullable(
      data.state_id ?? data.state_unique_id ?? data.state
    );
    const rawDistrictId = normalizeNullable(
      data.district_id ?? data.district_unique_id ?? data.district
    );
    const cont = resolveOptionValue(continents, rawContinentId, data.continent_name);
    const country = resolveOptionValue(
      allCountries.map((item) => ({ value: item.id, label: item.name })),
      rawCountryId,
      data.country_name
    );
    const state = resolveOptionValue(
      allStates.map((item) => ({ value: item.id, label: item.name })),
      rawStateId,
      data.state_name
    );
    const district = resolveOptionValue(
      allDistricts.map((item) => ({ value: item.id, label: item.name })),
      rawDistrictId,
      data.district_name
    );

    setContinentId(cont ?? "");
    setPendingCountryId(country ?? "");
    setPendingStateId(state ?? "");
    setPendingDistrictId(district ?? "");
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [
    cityQuery.data,
    applyCompanyProjectFromRecord,
    continents,
    allCountries,
    allStates,
    allDistricts,
  ]);

  useEffect(() => {
    if (!cityQuery.data || projects.length === 0) return;

    const data = cityQuery.data as CityWithRelations;
    const recordProjectId = normalizeNullable(
      data.project_id ?? data.project_unique_id ?? data.project
    );
    const resolvedProjectId = resolveOptionValue(
      projects,
      recordProjectId,
      data.project_name
    );

    if (resolvedProjectId && resolvedProjectId !== projectId) {
      setProjectId(resolvedProjectId);
    }
  }, [cityQuery.data, projectId, projects, setProjectId]);

  /* ==========================================================
      SUBMIT
  ========================================================== */
  const createCityMutation = useCreateCityMutation();
  const updateCityMutation = useUpdateCityMutation();
  const isSubmitting = createCityMutation.isPending || updateCityMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fieldValues: Record<string, unknown> = {
      continent_id: continentId,
      country_id: countryId,
      state_id: stateId,
      district_id: districtId,
      name: cityName.trim(),
    };
    const missingFields = getMissingRequiredFields(
      ["continent_id", "country_id", "state_id", "district_id", "name"],
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

    try {
      const rawPayload = {
        name: cityName.trim(),
        continent_id: continentId,
        country_id: countryId,
        state_id: stateId,
        district_id: districtId,
        is_active: isActive,
        company_id: companyUniqueId,
        project_id: projectId,
      };
      const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

      if (isEdit && id) {
        await updateCityMutation.mutateAsync({ id, payload });
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await createCityMutation.mutateAsync(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err) {
      Swal.fire(t("common.save_failed"), extractError(err), "error");
    }
  };

  /* ==========================================================
      JSX
  ========================================================== */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.city") })
          : t("common.add_item", { item: t("admin.nav.city") })
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
            <Select
              value={continentId}
              onValueChange={(val) => {
                setContinentId(val);
                setCountryId("");
                setStateId("");
                setDistrictId("");
                setPendingCountryId("");
                setPendingStateId("");
                setPendingDistrictId("");
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.continent"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {continents.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Country */}
          {showField("country_id") && (
          <div>
            <Label>{t("admin.nav.country")} *</Label>
            <Select value={countryId} onValueChange={(val) => { setCountryId(val); setStateId(""); setDistrictId(""); setPendingStateId(""); setPendingDistrictId(""); }} disabled={!continentId}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.country") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {continentId ? t("common.no_items_found", { item: t("admin.nav.country") }) : t("common.select_item_first", { item: t("admin.nav.continent") })}
                  </div>
                ) : filteredCountries.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* State */}
          {showField("state_id") && (
          <div>
            <Label>{t("admin.nav.state")} *</Label>
            <Select value={stateId} onValueChange={(val) => { setStateId(val); setDistrictId(""); setPendingDistrictId(""); }} disabled={!countryId}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.state") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredStates.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {countryId ? t("common.no_items_found", { item: t("admin.nav.state") }) : t("common.select_item_first", { item: t("admin.nav.country") })}
                  </div>
                ) : filteredStates.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* District */}
          {showField("district_id") && (
          <div>
            <Label>{t("admin.nav.district")} *</Label>
            <Select value={districtId} onValueChange={setDistrictId} disabled={!stateId}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.district") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredDistricts.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {stateId ? t("common.no_items_found", { item: t("admin.nav.district") }) : t("common.select_item_first", { item: t("admin.nav.state") })}
                  </div>
                ) : filteredDistricts.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* City Name */}
          {showField("name") && (
          <div>
            <Label>{t("common.item_name", { item: t("admin.nav.city") })} *</Label>
            <Input value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder={t("common.enter_item_name", { item: t("admin.nav.city") })} className="input-validate w-full" required />
          </div>
          )}

          {/* Status */}
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

        </div>

        {/* Actions */}
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
