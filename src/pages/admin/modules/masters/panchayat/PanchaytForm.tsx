/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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

import { encryptSegment } from "@/utils/routeCrypto";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  usePanchayatQuery,
  useCreatePanchayatMutation,
  useUpdatePanchayatMutation,
  useStatesQuery,
  useDistrictsQuery,
  useCitiesQuery,
} from "@/tanstack/admin";
import type { SelectOption } from "@/types";

const PANCHAYAT_FIELDS: Record<string, string[]> = {
  state_id: ["state_id", "state"],
  district_id: ["district_id", "district"],
  city_id: ["city_id", "city"],
  panchayat_name: ["panchayat_name", "name"],
  agreed_weight_kg: ["agreed_weight_kg"],
  weight_unit: ["weight_unit"],
  effective_from: ["effective_from"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  geofencing_type: ["geofencing_type"],
  is_active: ["is_active"],
};

const normalizeNullable = (v: any): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "object") return normalizeNullable(v.unique_id ?? v.id);
  return String(v);
};

const normalizeLabel = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase();

/** Try to match by id first; fall back to name match */
const resolveId = (
  items: SelectOption[],
  id: string | null,
  name?: string | null
): string | null => {
  if (id && items.some((x) => x.value === id)) return id;
  if (!name) return id;
  return (
    items.find((x) => normalizeLabel(x.label) === normalizeLabel(name))
      ?.value ?? id
  );
};

export default function PanchayatForm() {
  const { showField, filterPayload } = useFieldVisibility(
    "masters",
    "panchayats",
    PANCHAYAT_FIELDS,
  );
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
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
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  /* ── form fields ── */
  const [panchayatName, setPanchayatName] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [agreedWeightKg, setAgreedWeightKg] = useState("0");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geofencingType, setGeofencingType] = useState("polygon");
  const [isActive, setIsActive] = useState(true);

  /* ── pending IDs for edit-mode cascade (applied once list loads) ── */
  const [pendingState, setPendingState] = useState("");
  const [pendingDistrict, setPendingDistrict] = useState("");
  const [pendingCity, setPendingCity] = useState("");

  /* ── filtered lists ── */
  const [allStates, setAllStates] = useState<SelectOption[]>([]);
  const [allDistricts, setAllDistricts] = useState<SelectOption[]>([]);
  const [allCities, setAllCities] = useState<SelectOption[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<SelectOption[]>([]);
  const [filteredCities, setFilteredCities] = useState<SelectOption[]>([]);

  const encMasters = encryptSegment("masters");
  const encPanchayat = encryptSegment("panchayats");
  const LIST_PATH = `/${encMasters}/${encPanchayat}`;

  /* ── load master data ── */
  const statesQuery = useStatesQuery();
  const districtsQuery = useDistrictsQuery();
  const citiesQuery = useCitiesQuery();
  const createPanchayatMutation = useCreatePanchayatMutation();
  const updatePanchayatMutation = useUpdatePanchayatMutation();

  useEffect(() => {
    const res: any = statesQuery.data ?? [];
    const list = Array.isArray(res) ? res : (res?.results ?? []);
    setAllStates(
      list.map((x: any) => ({ value: String(x.unique_id), label: x.name ?? "" }))
    );
  }, [statesQuery.data]);

  useEffect(() => {
    const res: any = districtsQuery.data ?? [];
    const list = Array.isArray(res) ? res : (res?.results ?? []);
    setAllDistricts(
      list.map((x: any) => ({
        value: String(x.unique_id),
        label: x.name ?? "",
        stateId: normalizeNullable(x.state_id ?? x.state),
      } as SelectOption & { stateId: string | null }))
    );
  }, [districtsQuery.data]);

  useEffect(() => {
    const res: any = citiesQuery.data ?? [];
    const list = Array.isArray(res) ? res : (res?.results ?? []);
    setAllCities(
      list.map((x: any) => ({
        value: String(x.unique_id),
        label: x.name ?? x.city_name ?? "",
        districtId: normalizeNullable(x.district_id ?? x.district),
      } as SelectOption & { districtId: string | null }))
    );
  }, [citiesQuery.data]);

  /* ── cascade: districts filtered by state ── */
  useEffect(() => {
    if (!stateId) { setFilteredDistricts([]); return; }
    const filt = (allDistricts as any[]).filter((d) => d.stateId === stateId).map(
      (d) => ({ value: d.value, label: d.label })
    );
    if (pendingDistrict && !filt.some((d) => d.value === pendingDistrict)) {
      const found = allDistricts.find((d) => d.value === pendingDistrict);
      if (found) filt.push(found);
    }
    setFilteredDistricts(filt);
  }, [stateId, allDistricts, pendingDistrict]);

  /* ── cascade: cities filtered by district ── */
  useEffect(() => {
    if (!districtId) { setFilteredCities([]); return; }
    const filt = (allCities as any[]).filter((c) => c.districtId === districtId).map(
      (c) => ({ value: c.value, label: c.label })
    );
    if (pendingCity && !filt.some((c) => c.value === pendingCity)) {
      const found = allCities.find((c) => c.value === pendingCity);
      if (found) filt.push(found);
    }
    setFilteredCities(filt);
  }, [districtId, allCities, pendingCity]);

  /* ── apply pending state once list loads ── */
  useEffect(() => {
    if (pendingState && allStates.length > 0 && allStates.some((s) => s.value === pendingState)) {
      setStateId(pendingState);
      setPendingState("");
    }
  }, [pendingState, allStates]);

  /* ── apply pending district once filtered list loads ── */
  useEffect(() => {
    if (pendingDistrict && filteredDistricts.length > 0 && filteredDistricts.some((d) => d.value === pendingDistrict)) {
      setDistrictId(pendingDistrict);
      setPendingDistrict("");
    }
  }, [pendingDistrict, filteredDistricts]);

  /* ── apply pending city once filtered list loads ── */
  useEffect(() => {
    if (pendingCity && filteredCities.length > 0 && filteredCities.some((c) => c.value === pendingCity)) {
      setCityId(pendingCity);
      setPendingCity("");
    }
  }, [pendingCity, filteredCities]);

  /* ── edit mode: prefill ── */
  const panchayatQuery = usePanchayatQuery(id);

  useEffect(() => {
    if (!panchayatQuery.data) return;
    const data = panchayatQuery.data as any;

    setPanchayatName(data.panchayat_name ?? "");
    setAgreedWeightKg(String(data.agreed_weight_kg ?? "0"));
    setWeightUnit(data.weight_unit ?? "kg");
    setEffectiveFrom(data.effective_from ?? "");
    setLatitude(data.latitude ?? "");
    setLongitude(data.longitude ?? "");
    setGeofencingType(data.geofencing_type ?? "polygon");
    setIsActive(Boolean(data.is_active));

    /* company + project via hook (handles locked/superadmin correctly) */
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);

    /* state_id / district_id / city_id from API are integer PKs;
       resolve by name against unique_id-based option lists */
    const rawStateId = normalizeNullable(data.state_id ?? data.state);
    const stateName = data.state_name ?? null;
    const resolvedState = resolveId(allStates, rawStateId, stateName);

    const rawDistrictId = normalizeNullable(data.district_id ?? data.district);
    const districtName = data.district_name ?? null;
    const resolvedDistrict = resolveId(allDistricts, rawDistrictId, districtName);

    const rawCityId = normalizeNullable(data.city_id ?? data.city);
    const cityName = data.city_name ?? null;
    const resolvedCity = resolveId(allCities, rawCityId, cityName);

    if (resolvedState) { setStateId(resolvedState); setPendingState(resolvedState); }
    if (resolvedDistrict) { setDistrictId(resolvedDistrict); setPendingDistrict(resolvedDistrict); }
    if (resolvedCity) { setCityId(resolvedCity); setPendingCity(resolvedCity); }
  }, [panchayatQuery.data, applyCompanyProjectFromRecord, allStates, allDistricts, allCities]);

  /* ── submit ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

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
      panchayat_name: panchayatName,
      company_id: companyUniqueId,
      project_id: projectId,
      state_id: stateId,
      district_id: districtId,
      city_id: cityId,
      agreed_weight_kg: agreedWeightKg || "0",
      weight_unit: weightUnit || "kg",
      effective_from: effectiveFrom || null,
      latitude,
      longitude,
      geofencing_type: geofencingType,
      is_active: isActive,
    };
    const basePayload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

    try {
      if (isEdit && id) {
        await updatePanchayatMutation.mutateAsync({ id, payload: basePayload });
        Swal.fire("Success", "Updated successfully", "success");
      } else {
        await createPanchayatMutation.mutateAsync(basePayload);
        Swal.fire("Success", "Created successfully", "success");
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch {
      Swal.fire("Error", "Something went wrong", "error");
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit Panchayat" : "Add Panchayat"}>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">

        {/* Company */}
        <div>
          <Label>Company *</Label>
          <Select
            value={companyUniqueId}
            onValueChange={(value) => {
              onCompanyChange(value);
              setStateId("");
              setDistrictId("");
              setCityId("");
              setFilteredDistricts([]);
              setFilteredCities([]);
            }}
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
              Company is not mapped to this login. Only super admin can view all companies.
            </p>
          )}
          {isSuperAdmin && !loggedInCompanyUniqueId && companies.length === 0 && (
            <p className="mt-1 text-xs text-red-500">No companies found.</p>
          )}
        </div>

        {/* Project */}
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
            <p className="mt-1 text-xs text-red-500">No projects found for this company.</p>
          )}
        </div>

        {/* State */}
        {showField("state_id") && (
          <div>
            <Label>State *</Label>
            <Select
              value={stateId}
              onValueChange={(value) => {
                setStateId(value);
                setDistrictId("");
                setCityId("");
                setFilteredDistricts([]);
                setFilteredCities([]);
                setPendingDistrict("");
                setPendingCity("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {allStates.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* District */}
        {showField("district_id") && (
          <div>
            <Label>District *</Label>
            <Select
              value={districtId}
              onValueChange={(value) => {
                setDistrictId(value);
                setCityId("");
                setFilteredCities([]);
                setPendingCity("");
              }}
              disabled={!stateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {filteredDistricts.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* City */}
        {showField("city_id") && (
          <div>
            <Label>City *</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={!districtId}>
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {filteredCities.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Panchayat Name */}
        {showField("panchayat_name") && (
          <div>
            <Label>Panchayat Name *</Label>
            <Input
              value={panchayatName}
              onChange={(e) => setPanchayatName(e.target.value)}
              required
            />
          </div>
        )}

        {/* Agreed Weight */}
        {showField("agreed_weight_kg") && (
          <div>
            <Label>Agreed Weight *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={agreedWeightKg}
              onChange={(e) => setAgreedWeightKg(e.target.value)}
              required
            />
          </div>
        )}

        {/* Weight Unit */}
        {showField("weight_unit") && (
          <div>
            <Label>Weight Unit *</Label>
            <Select value={weightUnit} onValueChange={setWeightUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="tonne">Tonne</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Effective From */}
        {showField("effective_from") && (
          <div>
            <Label>Effective From</Label>
            <Input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
        )}

        {/* Latitude */}
        {showField("latitude") && (
          <div>
            <Label>Latitude *</Label>
            <Input
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              required
            />
          </div>
        )}

        {/* Longitude */}
        {showField("longitude") && (
          <div>
            <Label>Longitude *</Label>
            <Input
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              required
            />
          </div>
        )}

        {/* GeoFencing Type */}
        {showField("geofencing_type") && (
          <div>
            <Label>GeoFencing Type *</Label>
            <Select value={geofencingType} onValueChange={setGeofencingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status */}
        {showField("is_active") && (
          <div>
            <Label>Status</Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setIsActive(v === "true")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button
            type="submit"
            disabled={createPanchayatMutation.isPending || updatePanchayatMutation.isPending}
          >
            {isEdit ? "Update" : "Save"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
          >
            Cancel
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
