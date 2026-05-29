import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import type { CountryMeta, ErrorWithResponse } from "./types";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { adminApi } from "@/helpers/admin/registry";


const { encMasters, encStates } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encStates}`;

const STATE_FIELDS: Record<string, string[]> = {
  continent_id: ["continent_id"],
  country_id: ["country_id"],
  name: ["name"],
  label: ["label"],
  is_active: ["is_active"],
};

const normalizeNullableId = (
  value: string | number | { unique_id?: string | number; id?: string | number } | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "object") {
    return normalizeNullableId(value.unique_id ?? value.id);
  }

  return String(value);
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

type StateWithRelations = {
  name?: string | null;
  label?: string | null;
  is_active?: boolean | number | string | null;
  country_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent_id?: string | number | { unique_id?: string | number; id?: string | number } | null;
  country?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent?: string | number | { unique_id?: string | number; id?: string | number } | null;
  country_name?: string | null;
  continent_name?: string | null;
  country_unique_id?: string | number | null;
  continent_unique_id?: string | number | null;
};

function StateForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } =
    useFieldVisibility("masters", "states", STATE_FIELDS);
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
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  const [recordData, setRecordData] = useState<StateWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const extractErrorMessage = useCallback((error: unknown) => {
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
  }, [t]);

  // Fetch continents list
  useEffect(() => {
    let cancelled = false;
    adminApi.continents.list()
      .then((res: any) => {
        if (cancelled) return;
        const data: any[] = Array.isArray(res) ? res : [];
        const selectedContinentId = normalizeNullableId(
          recordData?.continent_id ??
            recordData?.continent_unique_id ??
            recordData?.continent
        );
        const selectedContinentName = recordData?.continent_name;
        const activeContinents = data
          .filter((continent) => continent.is_active)
          .map((continent) => ({ value: String(continent.unique_id), label: continent.name }));
        const resolvedContinentId = resolveOptionValue(
          activeContinents,
          selectedContinentId,
          selectedContinentName
        );

        if (
          resolvedContinentId &&
          selectedContinentName &&
          !activeContinents.some((continent) => continent.value === resolvedContinentId)
        ) {
          setContinents([
            ...activeContinents,
            { value: resolvedContinentId, label: selectedContinentName },
          ]);
          if (continentId !== resolvedContinentId) {
            setContinentId(resolvedContinentId);
          }
          return;
        }

        setContinents(activeContinents);
        if (resolvedContinentId && continentId !== resolvedContinentId) {
          setContinentId(resolvedContinentId);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(err) });
      });
    return () => { cancelled = true; };
  }, [recordData, t, extractErrorMessage]);

  // Fetch countries list
  useEffect(() => {
    let cancelled = false;
    adminApi.countries.list()
      .then((res: any) => {
        if (cancelled) return;
        const data: any[] = Array.isArray(res) ? res : [];
        const normalized: CountryMeta[] = data.map((country) => ({
          id: String(country.unique_id),
          name: country.name,
          continentId: normalizeNullableId(country.continent_id ?? country.continent),
          isActive: Boolean(country.is_active),
        }));
        setAllCountries(normalized);
      })
      .catch((err: any) => {
        if (cancelled) return;
        Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(err) });
      });
    return () => { cancelled = true; };
  }, [t, extractErrorMessage]);

  // Fetch state record in edit mode
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    adminApi.states.get(id)
      .then((res: any) => {
        if (cancelled) return;
        const data = res as StateWithRelations;
        setRecordData(data);

        setName(data.name ?? "");
        setLabel(data.label ?? "");
        setIsActive(Boolean(data.is_active));

        const cId = normalizeNullableId(
          data.country_id ?? data.country_unique_id ?? data.country
        );
        const contId = normalizeNullableId(
          data.continent_id ?? data.continent_unique_id ?? data.continent
        );

        const resolvedContinentId = resolveOptionValue(
          continents,
          contId,
          data.continent_name
        );

        setContinentId(resolvedContinentId ?? "");
        setPendingCountryId(cId ?? "");
        applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
      })
      .catch((err: any) => {
        if (cancelled) return;
        Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(err, ) });
      });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  useEffect(() => {
    if (!continentId) {
      setFilteredCountries([]);
      if (!pendingCountryId) {
        setCountryId("");
      }
      return;
    }

    const selectedCountryId = normalizeNullableId(
      recordData?.country_id ??
        recordData?.country_unique_id ??
        recordData?.country
    );
    const selectedCountryName = recordData?.country_name;

    const filtered = allCountries
      .filter(
        (country) => country.isActive && country.continentId === continentId
      )
      .map<SelectOption>((country) => ({
        value: country.id,
        label: country.name,
      }));
    const resolvedCountryId = resolveOptionValue(
      filtered,
      selectedCountryId,
      selectedCountryName
    );

    if (
      resolvedCountryId &&
      selectedCountryName &&
      !filtered.some((country) => country.value === resolvedCountryId)
    ) {
      filtered.push({ value: resolvedCountryId, label: selectedCountryName });
    }

    setFilteredCountries(filtered);
    setCountryId((prev) =>
      filtered.some((option) => option.value === prev)
        ? prev
        : resolvedCountryId ?? ""
    );
  }, [continentId, allCountries, pendingCountryId, recordData]);

  // NEW IMPORTANT EFFECT → Set country AFTER filtering
  useEffect(() => {
    if (!pendingCountryId) return;
    if (filteredCountries.length === 0) return;

    const exists = filteredCountries.some(
      (c) => c.value === pendingCountryId
    );

    if (exists) {
      setCountryId(pendingCountryId);
      return;
    }

    const resolvedCountryId = resolveOptionValue(
      filteredCountries,
      pendingCountryId,
      recordData?.country_name
    );

    if (resolvedCountryId) {
      setCountryId(resolvedCountryId);
    }
  }, [filteredCountries, pendingCountryId, recordData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fieldValues: Record<string, unknown> = {
      continent_id: continentId,
      country_id: countryId,
      name: name.trim(),
      label: label.trim(),
    };

    if (
      getMissingRequiredFields(
        ["continent_id", "country_id", "name", "label"],
        (fieldKey) => fieldValues[fieldKey],
      ).length > 0
    ) {
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

    const rawPayload = {
      name: name.trim(),
      label: label.trim(),
      country_id: countryId,
      continent_id: continentId,
      is_active: isActive,
    };
    const payload = filterPayload(rawPayload) as typeof rawPayload;

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.states.update(id, payload);
        Swal.fire({ icon: "success", title: t("common.updated_success") });
      } else {
        await adminApi.states.create(payload);
        Swal.fire({ icon: "success", title: t("common.added_success") });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      console.error("Failed to save state:", error);
      Swal.fire({ icon: "error", title: t("common.save_failed"), text: extractErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
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

          {showField("continent_id") && (
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
          )}

          {showField("country_id") && (
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
          )}

          {showField("name") && (
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
          )}

          {showField("label") && (
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
          )}

          {showField("is_active") && (
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
          )}
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
