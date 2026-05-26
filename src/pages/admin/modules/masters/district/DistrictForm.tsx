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
import type { CountryMeta, DistrictFormRecord, StateMeta } from "./types";
import type { DistrictListRecord } from "./types";


import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";

const DISTRICT_FORM_FIELDS: Record<string, string[]> = {
  continent_id: ["continent_id"],
  country_id:   ["country_id"],
  state_id:     ["state_id"],
  name:         ["name"],
  is_active:    ["is_active"],
};
import {
  useContinentsQuery,
  useCountriesQuery,
  useStatesQuery,
  useDistrictQuery,
  useCreateDistrictMutation,
  useUpdateDistrictMutation,
} from "@/tanstack/admin";


const { encMasters, encDistricts } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encDistricts}`;



const normalize = (
  v:
    | string
    | number
    | { unique_id?: string | number; id?: string | number }
    | null
    | undefined
): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") return normalize(v.unique_id ?? v.id);
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

type DistrictWithProject = Omit<
  DistrictFormRecord,
  "continent_id" | "country_id" | "state_id"
> & {
  company?: { unique_id?: string | number; id?: string | number } | string | number | null;
  project?: { unique_id?: string | number; id?: string | number } | string | number | null;
  continent?: { unique_id?: string | number; id?: string | number } | string | number | null;
  country?: { unique_id?: string | number; id?: string | number } | string | number | null;
  state?: { unique_id?: string | number; id?: string | number } | string | number | null;
  company_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  project_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  country_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  state_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  company_unique_id?: string | number | null;
  project_unique_id?: string | number | null;
  continent_unique_id?: string | number | null;
  country_unique_id?: string | number | null;
  state_unique_id?: string | number | null;
  company_name?: string | null;
  project_name?: string | null;
  continent_name?: string | null;
  country_name?: string | null;
  state_name?: string | null;
};

type DistrictRouteState = {
  district?: Partial<DistrictListRecord>;
  companyUniqueId?: string | number | null;
  projectId?: string | number | null;
};

export default function DistrictForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } = useFieldVisibility(
    "masters",
    "districts",
    DISTRICT_FORM_FIELDS,
  );
  const [districtName, setDistrictName] = useState("");
  const [continentId, setContinentId] = useState<string>("");
  const [countryId, setCountryId] = useState<string>("");
  const [stateId, setStateId] = useState<string>("");

  const [pendingCountryId, setPendingCountryId] = useState<string>("");
  const [pendingStateId, setPendingStateId] = useState<string>("");

  const [continents, setContinents] = useState<SelectOption[]>([]);
  const [allCountries, setAllCountries] = useState<CountryMeta[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<SelectOption[]>([]);
  const [allStates, setAllStates] = useState<StateMeta[]>([]);
  const [filteredStates, setFilteredStates] = useState<SelectOption[]>([]);
  const [isActive, setIsActive] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const routeState = location.state as DistrictRouteState | null;
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

  const continentsQuery = useContinentsQuery();
  const countriesQuery = useCountriesQuery();
  const statesQuery = useStatesQuery();
  const districtQuery = useDistrictQuery(id);

  useEffect(() => {
    routeStateAppliedRef.current = false;
  }, [id, location.key]);

  useEffect(() => {
    if (!routeState) return;
    if (routeStateAppliedRef.current) return;

    const routeCompanyId = normalize(routeState.companyUniqueId);
    const routeProjectId = normalize(routeState.projectId);
    let applied = false;

    if (routeCompanyId && routeCompanyId !== companyUniqueId) {
      onCompanyChange(routeCompanyId);
      applied = true;
    }

    if (routeProjectId && routeProjectId !== projectId) {
      setProjectId(routeProjectId);
      applied = true;
    }

    if (!districtQuery.data && routeState.district?.name) {
      setDistrictName(String(routeState.district.name));
      applied = true;
    }

    if (applied || routeCompanyId || routeProjectId || routeState.district?.name) {
      routeStateAppliedRef.current = true;
    }
  }, [
    companyUniqueId,
    districtQuery.data,
    onCompanyChange,
    projectId,
    routeState,
    setProjectId,
  ]);

  useEffect(() => {
    if (continentsQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: String(continentsQuery.error) });
      return;
    }

    const data = continentsQuery.data ?? [];
    const activeContinents = data
      .filter((c) => c.is_active)
      .map((c) => ({ value: String(c.unique_id), label: c.name }));
    const district = districtQuery.data as DistrictWithProject | undefined;
    const recordContinentId = normalize(
      district?.continent_id ?? district?.continent_unique_id ?? district?.continent
    );
    const resolvedContinentId = resolveOptionValue(
      activeContinents,
      recordContinentId,
      district?.continent_name
    );

    if (
      resolvedContinentId &&
      district?.continent_name &&
      !activeContinents.some((c) => c.value === resolvedContinentId)
    ) {
      setContinents([
        ...activeContinents,
        { value: resolvedContinentId, label: district.continent_name },
      ]);
      return;
    }

    setContinents(activeContinents);
  }, [continentsQuery.data, continentsQuery.isError, districtQuery.data]);

  useEffect(() => {
    if (countriesQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: String(countriesQuery.error) });
      return;
    }

    const district = districtQuery.data as DistrictWithProject | undefined;
    const recordContinentId = normalize(
      district?.continent_id ?? district?.continent_unique_id ?? district?.continent
    );
    const resolvedContinentId = resolveOptionValue(
      continents,
      recordContinentId,
      district?.continent_name
    );
    const data = countriesQuery.data ?? [];
    setAllCountries(
      data.map((x) => ({
        id: String(x.unique_id),
        name: x.name,
        continentId:
          normalize(x.continent_id ?? x.continent) === recordContinentId &&
          resolvedContinentId
            ? resolvedContinentId
            : normalize(x.continent_id ?? x.continent),
        isActive: Boolean(x.is_active),
      }))
    );
  }, [countriesQuery.data, countriesQuery.isError, districtQuery.data, continents]);

  useEffect(() => {
    if (statesQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: String(statesQuery.error) });
      return;
    }

    const data = statesQuery.data ?? [];
    setAllStates(
      data.map((x) => ({ id: String(x.unique_id), name: x.name, countryId: normalize(x.country_id ?? x.country), isActive: Boolean(x.is_active) }))
    );
  }, [statesQuery.data, statesQuery.isError]);

  /* ------------------------------
     Filter Countries on Continent change
  ------------------------------ */
  useEffect(() => {
    if (!continentId) {
      setFilteredCountries([]);
      return;
    }

    const filtered = allCountries
      .filter(
        (c) => c.isActive && c.continentId === continentId
      )
      .map((c) => ({
        value: c.id,
        label: c.name,
      }));
    const district = districtQuery.data as DistrictWithProject | undefined;
    const resolvedCountryId = resolveOptionValue(
      filtered,
      pendingCountryId,
      district?.country_name
    );

    // Inject pending edit value if missing
    if (
      resolvedCountryId &&
      !filtered.some((o) => o.value === resolvedCountryId)
    ) {
      const found = allCountries.find((c) => c.id === resolvedCountryId);
      if (found) {
        filtered.push({ value: found.id, label: found.name });
      } else if (district?.country_name) {
        filtered.push({ value: resolvedCountryId, label: district.country_name });
      }
    }

    setFilteredCountries(filtered);
  }, [continentId, allCountries, pendingCountryId, districtQuery.data]);

  /* ------------------------------
     Filter States on Country change
  ------------------------------ */
  useEffect(() => {
    if (!countryId) {
      setFilteredStates([]);
      return;
    }

    const filtered = allStates
      .filter(
        (s) => s.isActive && s.countryId === countryId
      )
      .map((s) => ({
        value: s.id,
        label: s.name,
      }));
    const district = districtQuery.data as DistrictWithProject | undefined;
    const resolvedStateId = resolveOptionValue(
      filtered,
      pendingStateId,
      district?.state_name
    );

    if (
      resolvedStateId &&
      !filtered.some((o) => o.value === resolvedStateId)
    ) {
      const found = allStates.find((s) => s.id === resolvedStateId);
      if (found) {
        filtered.push({ value: found.id, label: found.name });
      } else if (district?.state_name) {
        filtered.push({ value: resolvedStateId, label: district.state_name });
      }
    }

    setFilteredStates(filtered);
  }, [countryId, allStates, pendingStateId, districtQuery.data]);

  useEffect(() => {
    if (!districtQuery.data) return;
    const data = districtQuery.data as DistrictWithProject;

    setDistrictName(data.name ?? "");
    setIsActive(Boolean(data.is_active));

    const rawContinentId = normalize(
      data.continent_id ?? data.continent_unique_id ?? data.continent
    );
    const rawCountryId = normalize(
      data.country_id ?? data.country_unique_id ?? data.country
    );
    const rawStateId = normalize(
      data.state_id ?? data.state_unique_id ?? data.state
    );
    const cont = resolveOptionValue(continents, rawContinentId, data.continent_name);

    setContinentId(cont ?? "");
    setPendingCountryId(rawCountryId ?? "");
    setPendingStateId(rawStateId ?? "");
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [districtQuery.data, applyCompanyProjectFromRecord, continents]);

  useEffect(() => {
    if (!districtQuery.data || projects.length === 0) return;

    const data = districtQuery.data as DistrictWithProject;
    const recordProjectId = normalize(
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
  }, [districtQuery.data, projectId, projects, setProjectId]);

  /* ------------------------------
     Auto-resolve missing continent from pending country
  ------------------------------ */
  useEffect(() => {
    if (!continentId && pendingCountryId) {
      const found = allCountries.find((c) => c.id === pendingCountryId);
      if (found?.continentId) {
        setContinentId(found.continentId);
      }
    }
  }, [pendingCountryId, continentId, allCountries]);

  /* ------------------------------
     When filteredCountries are ready, apply pending selection
  ------------------------------ */
  useEffect(() => {
    if (
      pendingCountryId &&
      filteredCountries.some((o) => o.value === pendingCountryId)
    ) {
      setCountryId(pendingCountryId);
      setPendingCountryId(""); // clear
      return;
    }

    if (!pendingCountryId) {
      return;
    }

    const district = districtQuery.data as DistrictWithProject | undefined;
    const resolvedCountryId = resolveOptionValue(
      filteredCountries,
      pendingCountryId,
      district?.country_name
    );

    if (
      resolvedCountryId &&
      filteredCountries.some((o) => o.value === resolvedCountryId)
    ) {
      setCountryId(resolvedCountryId);
      setPendingCountryId("");
    }
  }, [filteredCountries, pendingCountryId, districtQuery.data]);

  /* ------------------------------
     When filteredStates are ready, apply pending selection
  ------------------------------ */
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

    const district = districtQuery.data as DistrictWithProject | undefined;
    const resolvedStateId = resolveOptionValue(
      filteredStates,
      pendingStateId,
      district?.state_name
    );

    if (
      resolvedStateId &&
      filteredStates.some((o) => o.value === resolvedStateId)
    ) {
      setStateId(resolvedStateId);
      setPendingStateId("");
    }
  }, [filteredStates, pendingStateId, districtQuery.data]);

  /* ------------------------------
     Submit
  ------------------------------ */
  const createDistrictMutation = useCreateDistrictMutation();
  const updateDistrictMutation = useUpdateDistrictMutation();
  const isSubmitting = createDistrictMutation.isPending || updateDistrictMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fieldValues: Record<string, unknown> = {
      continent_id: continentId,
      country_id: countryId,
      state_id: stateId,
      name: districtName.trim(),
    };
    const missingFields = getMissingRequiredFields(
      ["continent_id", "country_id", "state_id", "name"],
      (fieldKey) => fieldValues[fieldKey],
    );

    if (missingFields.length > 0) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.all_fields_required"),
      });
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
        name: districtName.trim(),
        continent_id: continentId,
        country_id: countryId,
        state_id: stateId,
        is_active: isActive,
        company_id: companyUniqueId,
        project_id: projectId,
      };
      const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

      if (isEdit && id) {
        await updateDistrictMutation.mutateAsync({ id, payload });
        Swal.fire({ icon: "success", title: t("common.updated_success") });
      } else {
        await createDistrictMutation.mutateAsync(payload);
        Swal.fire({ icon: "success", title: t("common.added_success") });
      }

      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: unknown } }).response?.data;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : t("common.unexpected_error");
      Swal.fire({ icon: "error", title: t("common.save_failed"), text: errorMessage });
    }
  };

  /* ------------------------------
     JSX
  ------------------------------ */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.district") })
          : t("common.add_item", { item: t("admin.nav.district") })
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
                setPendingCountryId("");
                setPendingStateId("");
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.continent") })} />
              </SelectTrigger>
              <SelectContent>
                {continents.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* Country */}
          {showField("country_id") && (
          <div>
            <Label>{t("admin.nav.country")} *</Label>
            <Select value={countryId} onValueChange={(val) => { setCountryId(val); setStateId(""); setPendingStateId(""); }} disabled={!continentId}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.country") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {continentId ? t("common.no_items_found", { item: t("admin.nav.country") }) : t("common.select_item_first", { item: t("admin.nav.continent") })}
                  </div>
                ) : filteredCountries.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* State */}
          {showField("state_id") && (
          <div>
            <Label>{t("admin.nav.state")} *</Label>
            <Select value={stateId} onValueChange={setStateId} disabled={!countryId}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.state") })} />
              </SelectTrigger>
              <SelectContent>
                {filteredStates.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {countryId ? t("common.no_items_found", { item: t("admin.nav.state") }) : t("common.select_item_first", { item: t("admin.nav.country") })}
                  </div>
                ) : filteredStates.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}

          {/* District Name */}
          {showField("name") && (
          <div>
            <Label>{t("common.item_name", { item: t("admin.nav.district") })} *</Label>
            <Input
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder={t("common.enter_item_name", { item: t("admin.nav.district") })}
              className="input-validate w-full"
              required
            />
          </div>
          )}

          {/* Active */}
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
