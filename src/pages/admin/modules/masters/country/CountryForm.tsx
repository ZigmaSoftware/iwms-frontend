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

import { continentApi, countryApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";


const { encMasters, encCountries } = getEncryptedRoute();

const ENC_LIST_PATH = `/${encMasters}/${encCountries}`;

type ContinentRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
};

type CountryRecord = {
  name: string;
  mob_code: string;
  currency: string;
  continent_id?: string | number | null;
  continent?: string | number | null;
  is_active: boolean;
};

type SelectOption = {
  value: string;
  label: string;
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

function CountryForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [mobCode, setMobCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [continentId, setContinentId] = useState("");
  const [continents, setContinents] = useState<SelectOption[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
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
  };

  useEffect(() => {
    const fetchContinents = async () => {
      try {
        const data = (await continentApi.list()) as ContinentRecord[];
        const active = data
          .filter((continent) => continent.is_active)
          .map<SelectOption>((continent) => ({
            value: String(continent.unique_id),
            label: continent.name,
          }));

        setContinents(active);
      } catch (error) {
        console.error("Error fetching continents:", error);
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: extractErrorMessage(error),
        });
      }
    };

    void fetchContinents();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    const fetchCountry = async () => {
      try {
        const data = (await countryApi.get(id)) as CountryRecord;

        setName(data.name ?? "");
        setIsActive(Boolean(data.is_active));
        setMobCode(data.mob_code ?? "");
        setCurrency(data.currency ?? "");

        const resolvedContinentId = normalizeNullableId(
          data.continent_id ?? data.continent
        );
        setContinentId(resolvedContinentId ?? "");
        applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
      } catch (error) {
        console.error("Error fetching country:", error);
        Swal.fire({
          icon: "error",
          title: t("common.error"),
          text: extractErrorMessage(error),
        });
      }
    };

    void fetchCountry();
  }, [applyCompanyProjectFromRecord, id, isEdit]);

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

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        continent_id: continentId,
        is_active: isActive,
        mob_code: mobCode.trim(),
        currency: currency.trim(),
        company_unique_id: companyUniqueId,
        project_id: projectId,
      };

      if (isEdit && id) {
        await countryApi.update(id, payload);
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await countryApi.create(payload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      console.error("Failed to save:", error);
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: extractErrorMessage(error),
      });
    } finally {
      setLoading(false);
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
          <Button type="submit" disabled={loading}>
            {loading
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
