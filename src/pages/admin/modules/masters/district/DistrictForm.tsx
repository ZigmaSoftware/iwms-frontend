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
import type { SelectOption } from "@/types";
import type { CountryMeta, DistrictFormRecord, StateMeta } from "./types";


import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
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



const normalize = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  return String(v);
};

export default function DistrictForm() {
  const { t } = useTranslation();
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

  const continentsQuery = useContinentsQuery();
  const countriesQuery = useCountriesQuery();
  const statesQuery = useStatesQuery();

  useEffect(() => {
    if (continentsQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: String(continentsQuery.error) });
      return;
    }

    const data = continentsQuery.data ?? [];
    setContinents(data.filter((c) => c.is_active).map((c) => ({ value: String(c.unique_id), label: c.name })));
  }, [continentsQuery.data, continentsQuery.isError]);

  useEffect(() => {
    if (countriesQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: String(countriesQuery.error) });
      return;
    }

    const data = countriesQuery.data ?? [];
    setAllCountries(
      data.map((x) => ({ id: String(x.unique_id), name: x.name, continentId: normalize(x.continent_id ?? x.continent), isActive: Boolean(x.is_active) }))
    );
  }, [countriesQuery.data, countriesQuery.isError]);

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

    // Inject pending edit value if missing
    if (
      pendingCountryId &&
      !filtered.some((o) => o.value === pendingCountryId)
    ) {
      const found = allCountries.find((c) => c.id === pendingCountryId);
      if (found) {
        filtered.push({ value: found.id, label: found.name });
      }
    }

    setFilteredCountries(filtered);
  }, [continentId, allCountries, pendingCountryId]);

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

    if (
      pendingStateId &&
      !filtered.some((o) => o.value === pendingStateId)
    ) {
      const found = allStates.find((s) => s.id === pendingStateId);
      if (found) {
        filtered.push({ value: found.id, label: found.name });
      }
    }

    setFilteredStates(filtered);
  }, [countryId, allStates, pendingStateId]);

  const districtQuery = useDistrictQuery(id);

  useEffect(() => {
    if (!districtQuery.data) return;
    const data = districtQuery.data as DistrictFormRecord;

    setDistrictName(data.name ?? "");
    setIsActive(Boolean(data.is_active));

    const cont = normalize(data.continent_id);
    const ctr = normalize(data.country_id);
    const ste = normalize(data.state_id);

    setContinentId(cont ?? "");
    setPendingCountryId(ctr ?? "");
    setPendingStateId(ste ?? "");
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [districtQuery.data, applyCompanyProjectFromRecord]);

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
    }
  }, [filteredCountries, pendingCountryId]);

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
    }
  }, [filteredStates, pendingStateId]);

  /* ------------------------------
     Submit
  ------------------------------ */
  const createDistrictMutation = useCreateDistrictMutation();
  const updateDistrictMutation = useUpdateDistrictMutation();
  const isSubmitting = createDistrictMutation.isPending || updateDistrictMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!continentId || !countryId || !stateId || !districtName.trim()) {
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
      const payload = {
        name: districtName.trim(),
        continent_id: continentId,
        country_id: countryId,
        state_id: stateId,
        is_active: isActive,
        company_id: companyUniqueId,
        project_id: projectId,
      };

      if (isEdit && id) {
        await updateDistrictMutation.mutateAsync({ id, payload });
        Swal.fire({ icon: "success", title: t("common.updated_success") });
      } else {
        await createDistrictMutation.mutateAsync(payload);
        Swal.fire({ icon: "success", title: t("common.added_success") });
      }

      navigate(ENC_LIST_PATH);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: t("common.save_failed"), text: err?.response?.data || t("common.unexpected_error") });
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
                setPendingStateId("");
              }}
              disabled={!continentId}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.country"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCountries.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {continentId
                      ? t("common.no_items_found", {
                          item: t("admin.nav.country"),
                        })
                      : t("common.select_item_first", {
                          item: t("admin.nav.continent"),
                        })}
                  </div>
                ) : (
                  filteredCountries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))
                )}
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
              }}
              disabled={!countryId}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.state"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredStates.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {countryId
                      ? t("common.no_items_found", {
                          item: t("admin.nav.state"),
                        })
                      : t("common.select_item_first", {
                          item: t("admin.nav.country"),
                        })}
                  </div>
                ) : (
                  filteredStates.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* District */}
          <div>
            <Label>
              {t("common.item_name", { item: t("admin.nav.district") })} *
            </Label>
            <Input
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.district"),
              })}
              className="input-validate w-full"
              required
            />
          </div>

          {/* Active */}
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
            onClick={() => navigate(ENC_LIST_PATH)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
