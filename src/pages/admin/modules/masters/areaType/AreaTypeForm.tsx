import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
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
import ComponentCard from "@/components/common/ComponentCard";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  type AreaTypePayload,
  useAreaTypeQuery,
  useCreateAreaTypeMutation,
  useUpdateAreaTypeMutation,
  useStatesQuery,
  useDistrictsQuery,
  useCitiesQuery,
} from "@/tanstack/admin";

const { encMasters, encAreaTypes } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encAreaTypes}`;

type SelectOption = { value: string; label: string };

type StateMeta = {
  id: string;
  name: string;
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

type AreaTypeRecord = {
  name?: string;
  area_type_name?: string;
  is_active?: boolean;
  company_unique_id?: string | number | null;
  company_id?: string | number | null;
  project_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
};

const normalizeNullable = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  return String(v);
};

export default function AreaTypeForm() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const areaTypeQuery = useAreaTypeQuery(id);
  const createAreaTypeMutation = useCreateAreaTypeMutation();
  const updateAreaTypeMutation = useUpdateAreaTypeMutation();
  const statesQuery = useStatesQuery();
  const districtsQuery = useDistrictsQuery();
  const citiesQuery = useCitiesQuery();
  const isSubmitting =
    createAreaTypeMutation.isPending || updateAreaTypeMutation.isPending;

  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");

  const [pendingState, setPendingState] = useState("");
  const [pendingDistrict, setPendingDistrict] = useState("");
  const [pendingCity, setPendingCity] = useState("");

  const [allStates, setAllStates] = useState<StateMeta[]>([]);
  const [filteredStates, setFilteredStates] = useState<SelectOption[]>([]);

  const [allDistricts, setAllDistricts] = useState<DistrictMeta[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<SelectOption[]>([]);

  const [allCities, setAllCities] = useState<CityMeta[]>([]);
  const [filteredCities, setFilteredCities] = useState<SelectOption[]>([]);

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

  const extractErr = (e: unknown): string => {
    const data = (e as { response?: { data?: unknown } })?.response?.data;

    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.join(", ");
    if (data && typeof data === "object") {
      return Object.entries(data as Record<string, unknown>)
        .map(([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
        )
        .join("\n");
    }

    if (e instanceof Error && e.message) return e.message;
    return t("common.unexpected_error");
  };

  useEffect(() => {
    if (!statesQuery.data) return;

    setAllStates(
      statesQuery.data.map((s) => ({
        id: String(s.unique_id),
        name: s.name,
        isActive: Boolean(s.is_active),
      }))
    );
  }, [statesQuery.data]);

  useEffect(() => {
    if (!districtsQuery.data) return;

    setAllDistricts(
      districtsQuery.data.map((d) => ({
        id: String(d.unique_id),
        name: d.name,
        stateId: normalizeNullable(d.state_id),
        isActive: Boolean(d.is_active),
      }))
    );
  }, [districtsQuery.data]);

  useEffect(() => {
    if (!citiesQuery.data) return;

    setAllCities(
      citiesQuery.data.map((c) => ({
        id: String(c.unique_id),
        name: c.name,
        districtId: normalizeNullable(c.district_id ?? c.district),
        isActive: Boolean(c.is_active),
      }))
    );
  }, [citiesQuery.data]);

  useEffect(() => {
    const queryError =
      statesQuery.error || districtsQuery.error || citiesQuery.error;
    const hasError =
      statesQuery.isError || districtsQuery.isError || citiesQuery.isError;

    if (!hasError || !queryError) return;

    Swal.fire(t("common.error"), extractErr(queryError), "error");
  }, [
    citiesQuery.error,
    citiesQuery.isError,
    districtsQuery.error,
    districtsQuery.isError,
    statesQuery.error,
    statesQuery.isError,
    t,
  ]);

  useEffect(() => {
    const filt = allStates
      .filter((s) => s.isActive)
      .map((s) => ({ value: s.id, label: s.name }));

    if (pendingState && !filt.some((o) => o.value === pendingState)) {
      const found = allStates.find((s) => s.id === pendingState);
      if (found) filt.push({ value: found.id, label: found.name });
    }

    setFilteredStates(filt);
  }, [allStates, pendingState]);

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
    if (!areaTypeQuery.data) return;

    const record = areaTypeQuery.data as AreaTypeRecord;
    setName(record.name ?? record.area_type_name ?? "");
    setIsActive(Boolean(record.is_active));

    const ste = normalizeNullable(record.state_id);
    const dis = normalizeNullable(record.district_id);
    const cty = normalizeNullable(record.city_id);

    ste && setPendingState(ste);
    dis && setPendingDistrict(dis);
    cty && setPendingCity(cty);

    applyCompanyProjectFromRecord(
      record as unknown as Record<string, unknown>
    );
  }, [applyCompanyProjectFromRecord, areaTypeQuery.data]);

  useEffect(() => {
    if (!areaTypeQuery.isError) return;

    Swal.fire({
      icon: "error",
      title: t("common.error"),
      text: extractErr(areaTypeQuery.error),
    });
  }, [areaTypeQuery.error, areaTypeQuery.isError, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: t("common.missing_fields"),
      });
      return;
    }

    if (!stateId || !districtId || !cityId) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning"),
        text: "State, District, and City are required",
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
      setLoading(true);

      const basePayload: AreaTypePayload = {
        name: name.trim(),
        is_active: isActive,
        company_id: companyUniqueId,
        project_id: projectId,
        state_id: stateId,
        district_id: districtId,
        city_id: cityId,
      };

      if (isEdit) {
        await updateAreaTypeMutation.mutateAsync({
          id: id as string,
          payload: basePayload,
        });
        Swal.fire({
          icon: "success",
          title: t("common.updated_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createAreaTypeMutation.mutateAsync(basePayload);
        Swal.fire({
          icon: "success",
          title: t("common.added_success"),
          timer: 1500,
          showConfirmButton: false,
        });
      }

      navigate(ENC_LIST_PATH);
    } catch (error: unknown) {
      Swal.fire({
        icon: "error",
        title: t("common.save_failed"),
        text: extractErr(error) || t("common.save_failed_desc"),
      });
    } finally {
      setLoading(false);
    }
  };

  if (isEdit && areaTypeQuery.isPending && !areaTypeQuery.data) {
    return (
      <ComponentCard
        title={t("common.edit_item", { item: t("admin.nav.area_type") })}
      >
        <div className="p-6 text-sm text-gray-500">{t("common.loading")}</div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.area_type") })
          : t("common.add_item", { item: t("admin.nav.area_type") })
      }
    >
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
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

        <div>
          <Label htmlFor="state">
            State <span className="text-red-500">*</span>
          </Label>
          <Select value={stateId} onValueChange={setStateId}>
            <SelectTrigger id="state">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              {filteredStates.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="district">
            District <span className="text-red-500">*</span>
          </Label>
          <Select
            value={districtId}
            onValueChange={setDistrictId}
            disabled={!stateId || filteredDistricts.length === 0}
          >
            <SelectTrigger id="district">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              {filteredDistricts.map((district) => (
                <SelectItem key={district.value} value={district.value}>
                  {district.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stateId && filteredDistricts.length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              No districts found for this state.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="city">
            City <span className="text-red-500">*</span>
          </Label>
          <Select
            value={cityId}
            onValueChange={setCityId}
            disabled={!districtId || filteredCities.length === 0}
          >
            <SelectTrigger id="city">
              <SelectValue placeholder="Select City" />
            </SelectTrigger>
            <SelectContent>
              {filteredCities.map((city) => (
                <SelectItem key={city.value} value={city.value}>
                  {city.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {districtId && filteredCities.length === 0 && (
            <p className="mt-1 text-xs text-red-500">
              No cities found for this district.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="name">
            {t("common.item_name", { item: t("admin.nav.area_type") })}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("common.enter_item_name", {
              item: t("admin.nav.area_type"),
            })}
            required
          />
        </div>

        <div>
          <Label htmlFor="isActive">
            {t("common.status")} <span className="text-red-500">*</span>
          </Label>
          <Select
            value={isActive ? "true" : "false"}
            onValueChange={(value) => setIsActive(value === "true")}
          >
            <SelectTrigger id="isActive">
              <SelectValue placeholder={t("common.select_status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.active")}</SelectItem>
              <SelectItem value="false">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={loading || isSubmitting}>
            {loading
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

