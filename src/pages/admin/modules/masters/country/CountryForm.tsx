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
import type { ErrorWithResponse } from "./types";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  type CountryPayload,
  useCountryQuery,
  useCreateCountryMutation,
  useUpdateCountryMutation,
  useContinentsQuery,
} from "@/tanstack/admin";


const { encMasters, encCountries } = getEncryptedRoute();

const ENC_LIST_PATH = `/${encMasters}/${encCountries}`;

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

type CountryWithContinent = CountryPayload & {
  continent?: string | number | { unique_id?: string | number; id?: string | number } | null;
  continent_name?: string | null;
  continent_unique_id?: string | number | null;
};

function CountryForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [mobCode, setMobCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [continentId, setContinentId] = useState("");
  const [continents, setContinents] = useState<SelectOption[]>([]);
  const [isActive, setIsActive] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const {
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  const extractErrorMessage = useCallback((error: unknown) => {
    if (!error) return t("common.request_failed");
    if (typeof error === "string") return error;

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

  const continentsQuery = useContinentsQuery();
  const countryQuery = useCountryQuery(id);

  useEffect(() => {
    if (continentsQuery.isError) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractErrorMessage(continentsQuery.error) });
      return;
    }

    const selectedCountry = countryQuery.data as CountryWithContinent | undefined;
    const selectedContinentId = normalizeNullableId(
      selectedCountry?.continent_id ??
        selectedCountry?.continent_unique_id ??
        selectedCountry?.continent
    );
    const selectedContinentName = selectedCountry?.continent_name;
    const data = continentsQuery.data ?? [];
    const active = data
      .filter((continent) => continent.is_active)
      .map<SelectOption>((continent) => ({ value: String(continent.unique_id), label: continent.name }));

    if (
      selectedContinentId &&
      selectedContinentName &&
      !active.some((continent) => continent.value === selectedContinentId)
    ) {
      setContinents([
        ...active,
        { value: selectedContinentId, label: selectedContinentName },
      ]);
      return;
    }

    setContinents(active);
  }, [
    continentsQuery.data,
    continentsQuery.error,
    continentsQuery.isError,
    countryQuery.data,
    extractErrorMessage,
    t,
  ]);

  const createCountryMutation = useCreateCountryMutation();
  const updateCountryMutation = useUpdateCountryMutation();
  const isSubmitting = createCountryMutation.isPending || updateCountryMutation.isPending;

  useEffect(() => {
    if (!countryQuery.data) return;
    const data = countryQuery.data as CountryWithContinent;

    setName(data.name ?? "");
    setIsActive(Boolean(data.is_active));
    setMobCode(data.mob_code ?? "");
    setCurrency(data.currency ?? "");

    const resolvedContinentId = normalizeNullableId(
      data.continent_id ?? data.continent_unique_id ?? data.continent
    );
    setContinentId(resolvedContinentId ?? "");
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [countryQuery.data, applyCompanyProjectFromRecord]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !continentId) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.missing_fields"),
        confirmButtonColor: "#3085d6",
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

    // mutations are declared at component top-level

    try {
      const payload: CountryPayload = {
        name: name.trim(),
        continent_id: continentId,
        is_active: isActive,
        mob_code: mobCode.trim(),
        currency: currency.trim(),
      };

      if (isEdit && id) {
        await updateCountryMutation.mutateAsync({ id, payload });
        Swal.fire({ icon: "success", title: t("common.updated_success"), timer: 1500, showConfirmButton: false });
      } else {
        await createCountryMutation.mutateAsync(payload);
        Swal.fire({ icon: "success", title: t("common.added_success"), timer: 1500, showConfirmButton: false });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      console.error("Failed to save:", error);
      Swal.fire({ icon: "error", title: t("common.save_failed"), text: extractErrorMessage(error) });
    } finally {
      // no-op: mutation hook loading state drives UI
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.country") })
          : t("common.add_item", { item: t("admin.nav.country") })
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

          {/* Continent Dropdown */}
          <div>
            <Label htmlFor="continent">
              {t("common.item_name", { item: t("admin.nav.continent") })}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Select
              value={continentId || undefined}
              onValueChange={(val) => setContinentId(val)}
            >
              <SelectTrigger className="input-validate w-full" id="continent">
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

          {/*  Country Name */}
          <div>
            <Label htmlFor="countryName">
              {t("common.item_name", { item: t("admin.nav.country") })}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="countryName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.country"),
              })}
              className="input-validate w-full"
              required
            />
          </div>
          {/*  Mobile Code */}
          <div>
            <Label htmlFor="mobile_code">
              {t("common.mobile_code")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mobile_code"
              type="number"
              value={mobCode}
              onChange={(e) => setMobCode(e.target.value)}
              placeholder={t("common.mobile_code_placeholder")}
              className="input-validate w-full"
              required
            />
          </div>
          {/*  Currency Name */}
          <div>
            <Label htmlFor="currency">
              {t("common.currency")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder={t("common.currency_placeholder")}
              className="input-validate w-full"
              required
            />
          </div>

          {/*  Active Status */}
          <div>
            <Label htmlFor="isActive">
              {t("common.status")} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(val) => setIsActive(val === "true")}
            >
              <SelectTrigger className="input-validate w-full" id="isActive">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/*  Buttons */}
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
          <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default CountryForm;
