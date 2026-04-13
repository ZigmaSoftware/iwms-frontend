import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  useContinentsQuery,
  useCountriesQuery,
  useStatesQuery,
  useDistrictsQuery,
  useCitiesQuery,
  useZonesQuery,
  useWardQuery,
  useCreateWardMutation,
  useUpdateWardMutation,
} from "@/tanstack/admin";


/* ------------------------------
    TYPES
------------------------------ */
type SelectOption = { value: string; label: string };

type CountryMeta = {
  id: string;
  name: string;
  continentId: string | null;
  isActive: boolean;
};

type StateMeta = {
  id: string;
  name: string;
  countryId: string | null;
  isActive: boolean;
};

type DistrictMeta = {
  id: string;
  name: string;
  stateId: string | null;
  isActive: boolean;
};

type CityMeta = {
  id: string;
  name: string;
  districtId: string | null;
  isActive: boolean;
};

type ZoneMeta = {
  id: string;
  name: string;
  cityId: string | null;
  isActive: boolean;
};

type WardRecord = {
  name?: string;
  is_active?: boolean;
  description?: string;

  continent_id?: string | number | null;
  country_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  zone_id?: string | number | null;

  continent?: string | number | null;
  country?: string | number | null;
  state?: string | number | null;
  district?: string | number | null;
  city?: string | number | null;
  zone?: string | number | null;
};

/* ------------------------------
  UTILITIES
------------------------------ */
const normalizeNullable = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  return String(v);
};

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

  const [allStates, setAllStates] = useState<StateMeta[]>([]);
  const [filteredStates, setFilteredStates] = useState<SelectOption[]>([]);

  const [allDistricts, setAllDistricts] = useState<DistrictMeta[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<SelectOption[]>([]);

  const [allCities, setAllCities] = useState<CityMeta[]>([]);
  const [filteredCities, setFilteredCities] = useState<SelectOption[]>([]);

  const [allZones, setAllZones] = useState<ZoneMeta[]>([]);
  const [filteredZones, setFilteredZones] = useState<SelectOption[]>([]);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
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
      LOAD MASTER DATA
  ========================================================== */
  const continentsQuery = useContinentsQuery();
  const countriesQuery = useCountriesQuery();
  const statesQuery = useStatesQuery();
  const districtsQuery = useDistrictsQuery();
  const citiesQuery = useCitiesQuery();
  const zonesQuery = useZonesQuery();

  useEffect(() => {
    if (continentsQuery.isError) {
      Swal.fire(t("common.error"), String(continentsQuery.error), "error");
      return;
    }
    const res = continentsQuery.data ?? [];
    setContinents(res.filter((x: any) => x.is_active).map((x: any) => ({ value: String(x.unique_id), label: x.name })));
  }, [continentsQuery.data, continentsQuery.isError]);

  useEffect(() => {
    if (countriesQuery.isError) {
      Swal.fire(t("common.error"), String(countriesQuery.error), "error");
      return;
    }
    const res = countriesQuery.data ?? [];
    setAllCountries(res.map((c: any) => ({ id: String(c.unique_id), name: c.name, continentId: normalizeNullable(c.continent_id ?? c.continent), isActive: Boolean(c.is_active) })));
  }, [countriesQuery.data, countriesQuery.isError]);

  useEffect(() => {
    if (statesQuery.isError) {
      Swal.fire(t("common.error"), String(statesQuery.error), "error");
      return;
    }
    const res = statesQuery.data ?? [];
    setAllStates(res.map((s: any) => ({ id: String(s.unique_id), name: s.name, countryId: normalizeNullable(s.country_id ?? s.country), isActive: Boolean(s.is_active) })));
  }, [statesQuery.data, statesQuery.isError]);

  useEffect(() => {
    if (districtsQuery.isError) {
      Swal.fire(t("common.error"), String(districtsQuery.error), "error");
      return;
    }
    const res = districtsQuery.data ?? [];
    setAllDistricts(res.map((d: any) => ({ id: String(d.unique_id), name: d.name, stateId: normalizeNullable(d.state_id ?? d.state), isActive: Boolean(d.is_active) })));
  }, [districtsQuery.data, districtsQuery.isError]);

  useEffect(() => {
    if (citiesQuery.isError) {
      Swal.fire(t("common.error"), String(citiesQuery.error), "error");
      return;
    }
    const res = citiesQuery.data ?? [];
    setAllCities(res.map((c: any) => ({ id: String(c.unique_id), name: c.name, districtId: normalizeNullable(c.district_id ?? c.district), isActive: Boolean(c.is_active) })));
  }, [citiesQuery.data, citiesQuery.isError]);

  useEffect(() => {
    if (zonesQuery.isError) {
      Swal.fire(t("common.error"), String(zonesQuery.error), "error");
      return;
    }
    const res = zonesQuery.data ?? [];
    setAllZones(res.map((z: any) => ({ id: String(z.unique_id), name: z.zone_name, cityId: normalizeNullable(z.city_id ?? z.city), isActive: Boolean(z.is_active) })));
  }, [zonesQuery.data, zonesQuery.isError]);

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
  const wardQuery = useWardQuery(id);

  useEffect(() => {
    if (!wardQuery.data) return;
    const data = wardQuery.data;

    setWardName(data.name ?? "");
    setIsActive(Boolean(data.is_active));
    setDescription(data.description ?? "");

    const cont = normalizeNullable(data.continent_id);
    const ctr = normalizeNullable(data.country_id);
    const ste = normalizeNullable(data.state_id);
    const dis = normalizeNullable(data.district_id);
    const cty = normalizeNullable(data.city_id);
    const zne = normalizeNullable(data.zone_id);

    cont && setPendingContinent(cont);
    ctr && setPendingCountry(ctr);
    ste && setPendingState(ste);
    dis && setPendingDistrict(dis);
    cty && setPendingCity(cty);
    zne && setPendingZone(zne);
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [wardQuery.data, applyCompanyProjectFromRecord]);

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
    const createWardMutation = useCreateWardMutation();
    const updateWardMutation = useUpdateWardMutation();
    const isSubmitting = createWardMutation.isPending || updateWardMutation.isPending;

    const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!continentId || !countryId || !stateId || !wardName.trim()) {
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
      const payload = {
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

      if (isEdit && id) {
        await updateWardMutation.mutateAsync({ id, payload });
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await createWardMutation.mutateAsync(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (err) {
      Swal.fire(t("common.save_failed"), extractErr(err), "error");
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
          <div>
            <Label>{t("admin.nav.continent")} *</Label>
            <Select
              value={continentId}
              onValueChange={(val) => {
                setContinentId(val);
                setCountryId("");
                setStateId("");
                setDistrictId("");
                setCityId("");
                setZoneId("");

                setPendingCountry("");
                setPendingState("");
                setPendingDistrict("");
                setPendingCity("");
                setPendingZone("");
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

          {/* Country */}
          <div>
            <Label>{t("admin.nav.country")} *</Label>
            <Select
              value={countryId}
              onValueChange={(val) => {
                setCountryId(val);
                setStateId("");
                setDistrictId("");
                setCityId("");
                setZoneId("");

                setPendingState("");
                setPendingDistrict("");
                setPendingCity("");
                setPendingZone("");
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.country"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCountries.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div>
            <Label>{t("admin.nav.state")} *</Label>
            <Select
              value={stateId}
              onValueChange={(val) => {
                setStateId(val);
                setDistrictId("");
                setCityId("");
                setZoneId("");

                setPendingDistrict("");
                setPendingCity("");
                setPendingZone("");
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.state"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredStates.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div>
            <Label>{t("admin.nav.district")}</Label>
            <Select
              value={districtId}
              onValueChange={(val) => {
                setDistrictId(val);
                setCityId("");
                setZoneId("");

                setPendingCity("");
                setPendingZone("");
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.district"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredDistricts.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div>
            <Label>{t("admin.nav.city")}</Label>
            <Select
              value={cityId}
              onValueChange={(val) => {
                setCityId(val);
                setZoneId("");
                setPendingZone("");
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.city"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCities.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone */}
          <div>
            <Label>{t("admin.nav.zone")}</Label>
            <Select
              value={zoneId}
              onValueChange={(val) => setZoneId(val)}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.zone"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredZones.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ward Name */}
          <div>
            <Label>
              {t("common.item_name", { item: t("admin.nav.ward") })} *
            </Label>
            <Input
              value={wardName}
              onChange={(e) => setWardName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.ward"),
              })}
              required
            />
          </div>

          {/* Active Status */}
          <div>
            <Label>{t("common.status")} *</Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setIsActive(v === "true")}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label>{t("common.description")}</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("common.description_optional")}
              className="w-full border rounded-md p-2 focus:ring focus:ring-green-200 outline-none"
              rows={3}
            />
          </div>
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
            onClick={() => navigate(ENC_LIST_PATH)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
