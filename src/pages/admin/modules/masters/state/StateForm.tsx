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
  useStateQuery,
  useCreateStateMutation,
  useUpdateStateMutation,
} from "@/tanstack/admin";


const { encMasters, encStates } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encStates}`;

type SelectOption = {
  value: string;
  label: string;
};

type CountryMeta = {
  id: string;
  name: string;
  continentId: string | null;
  isActive: boolean;
};

type StateRecord = {
  name: string;
  label: string;
  is_active: boolean;
  country_id: string | number;
  continent_id: string | number;
};


type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};


const normalizeNullableId = (
  value: string | number | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

function StateForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [continentId, setContinentId] = useState<string>("");
  const [countryId, setCountryId] = useState<string>("");
  const [continents, setContinents] = useState<SelectOption[]>([]);

  
  const [pendingCountryId, setPendingCountryId] = useState<string>("");
  const [allCountries, setAllCountries] = useState<CountryMeta[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<SelectOption[]>([]);

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

  const extractErrorMessage = (error: unknown) => {
    if (!error) {
      return t("common.request_failed");
    }

    if (typeof error === "string") {
      return error;
    }

    const withResponse = error as ErrorWithResponse;
    const data = withResponse.response?.data;

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.join(", ");
    }

    if (data && typeof data === "object") {
      return Object.entries(data as Record<string, unknown>)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(", ")}`;
          }
          return `${key}: ${String(value)}`;
        })
        .join("\n");
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return t("common.request_failed");
  };

  const continentsQuery = useContinentsQuery();

  useEffect(() => {
    if (continentsQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(continentsQuery.error) });
      return;
    }

    const res = continentsQuery.data ?? [];
    const activeContinents = res
      .filter((continent) => continent.is_active)
      .map((continent) => ({ value: String(continent.unique_id), label: continent.name }));

    setContinents(activeContinents);
  }, [continentsQuery.data, continentsQuery.isError]);

  const countriesQuery = useCountriesQuery();

  useEffect(() => {
    if (countriesQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(countriesQuery.error) });
      return;
    }

    const data = countriesQuery.data ?? [];
    const normalized: CountryMeta[] = data.map((country) => ({
      id: String(country.unique_id),
      name: country.name,
      continentId: normalizeNullableId(country.continent_id ?? country.continent),
      isActive: Boolean(country.is_active),
    }));

    setAllCountries(normalized);
  }, [countriesQuery.data, countriesQuery.isError]);

  useEffect(() => {
    if (!continentId) {
      setFilteredCountries([]);
      if (!pendingCountryId) {
        setCountryId("");
      }
      return;
    }

    const filtered = allCountries
      .filter(
        (country) => country.isActive && country.continentId === continentId
      )
      .map<SelectOption>((country) => ({
        value: country.id,
        label: country.name,
      }));

    setFilteredCountries(filtered);
    setCountryId((prev) =>
      filtered.some((option) => option.value === prev) ? prev : ""
    );
  }, [continentId, allCountries, pendingCountryId]);

  // EDIT MODE → FETCH DATA
  const stateQuery = useStateQuery(id);

  useEffect(() => {
    if (!stateQuery.data) return;
    const data = stateQuery.data;

    setName(data.name ?? "");
    setLabel(data.label ?? "");
    setIsActive(Boolean(data.is_active));

    const cId = String(data.country_id);
    const contId = String(data.continent_id);

    setContinentId(contId);
    setPendingCountryId(cId);
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [stateQuery.data, applyCompanyProjectFromRecord]);


  // NEW IMPORTANT EFFECT → Set country AFTER filtering
  useEffect(() => {
    if (!pendingCountryId) return;
    if (filteredCountries.length === 0) return;

    const exists = filteredCountries.some(
      (c) => c.value === pendingCountryId
    );

    if (exists) setCountryId(pendingCountryId);
  }, [filteredCountries, pendingCountryId]);

  const createStateMutation = useCreateStateMutation();
  const updateStateMutation = useUpdateStateMutation();
  const isSubmitting = createStateMutation.isPending || updateStateMutation.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!continentId || !countryId || !name.trim() || !label.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.missing_fields"),
      });
      return;
    }

    // if (!companyUniqueId) {
    //   Swal.fire(
    //     "Error",
    //     !loggedInCompanyUniqueId && !isSuperAdmin
    //       ? "Company is not mapped to this login. Only super admin can choose a company."
    //       : "Company is required",
    //     "error"
    //   );
    //   return;
    // }

    // if (!projectId) {
    //   Swal.fire("Error", "Project is required", "error");
    //   return;
    // }

    const payload = {
      name: name.trim(),
      label: label.trim(),
      country_id: countryId,
      continent_id: continentId,
      is_active: isActive,
    };

    try {
      if (isEdit && id) {
        await updateStateMutation.mutateAsync({ id, payload });
        Swal.fire({ icon: "success", title: t("common.updated_success") });
      } else {
        await createStateMutation.mutateAsync(payload);
        Swal.fire({ icon: "success", title: t("common.added_success") });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      console.error("Failed to save state:", error);
      Swal.fire({ icon: "error", title: t("common.save_failed"), text: extractErrorMessage(error) });
    } finally {
      // mutation hooks provide loading state
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.state") })
          : t("common.add_item", { item: t("admin.nav.state") })
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* <div>
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
          </div> */}

          <div>
            <Label htmlFor="continent">
              {t("admin.nav.continent")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={continentId}
              onValueChange={(value) => setContinentId(value)}
            >
              <SelectTrigger className="input-validate w-full" id="continent">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.continent"),
                  })}
                />
              </SelectTrigger>

              <SelectContent>
                {continents.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="country">
              {t("admin.nav.country")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={countryId}
              disabled={!continentId || filteredCountries.length === 0}
              onValueChange={(value) => setCountryId(value)}
            >
              <SelectTrigger className="input-validate w-full" id="country">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.country"),
                  })}
                />
              </SelectTrigger>

              <SelectContent>
                {filteredCountries.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="stateName">
              {t("common.item_name", { item: t("admin.nav.state") })}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.state"),
              })}
            />
          </div>

          <div>
            <Label htmlFor="stateLabel">
              {t("common.label")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stateLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("common.enter_label")}
            />
          </div>

          <div>
            <Label htmlFor="stateStatus">
              {t("common.status")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setIsActive(v === "true")}
            >
              <SelectTrigger className="input-validate w-full" id="stateStatus">
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
              ? t("common.saving")
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

export default StateForm;
