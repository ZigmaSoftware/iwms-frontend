/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import {
  panchayatApi,
  stateApi,
  districtApi,
  cityApi,
  areaTypeApi,
  hierarchyApi,
  projectApi,
  companyApi,
} from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { usePanchayatQuery, useCreatePanchayatMutation, useUpdatePanchayatMutation, useAreaTypesQuery, useHierarchiesQuery } from "@/tanstack/admin";
import { getCurrentCompanyUniqueId } from "@/utils/projectContext";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";
import type { SelectOption } from "@/types";
import type { LoginProfile } from "./types";

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

const toStringId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as { unique_id?: unknown; id?: unknown };
    return toStringId(record.unique_id ?? record.id);
  }
  return String(value);
};

const readLoginProfile = (): LoginProfile | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("profile");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginProfile;
  } catch {
    return null;
  }
};

const sameId = (left: unknown, right: unknown): boolean =>
  toStringId(left) !== "" && toStringId(left) === toStringId(right);

const normalizeApiList = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const normalizeText = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

const getRelationLabel = (
  relation: unknown,
  labelKeys: string[] = ["name"]
): string => {
  if (relation === null || relation === undefined) return "";
  if (typeof relation !== "object") return String(relation);

  const record = relation as Record<string, unknown>;
  for (const key of labelKeys) {
    if (record[key] !== undefined && record[key] !== null) {
      return String(record[key]);
    }
  }
  return "";
};

const toMasterOptions = (
  rows: any[],
  labelKeys: string[]
): SelectOption[] =>
  rows
    .map((row: any) => {
      const value = toStringId(row?.unique_id ?? row?.id);
      const label =
        labelKeys
          .map((key) => row?.[key])
          .find((item) => item !== undefined && item !== null && item !== "") ??
        value;
      return { value, label: String(label) };
    })
    .filter((option) => option.value);

const ensureOption = (
  options: SelectOption[],
  value: string,
  label: string
): SelectOption[] => {
  if (!value || options.some((option) => sameId(option.value, value))) {
    return options;
  }
  return [{ value, label: label || value }, ...options];
};

const resolveSelectedValue = (
  options: SelectOption[],
  rawId: unknown,
  rawRelation: unknown,
  rawLabel: unknown,
  relationLabelKeys: string[]
): string => {
  const idCandidates = [toStringId(rawId), toStringId(rawRelation)].filter(Boolean);

  for (const candidate of idCandidates) {
    const matchedById = options.find((option) => sameId(option.value, candidate));
    if (matchedById) return matchedById.value;
  }

  const labelCandidates = [
    String(rawLabel ?? ""),
    getRelationLabel(rawRelation, relationLabelKeys),
    typeof rawId === "string" ? rawId : "",
  ].filter(Boolean);

  for (const candidate of labelCandidates) {
    const matchedByLabel = options.find(
      (option) => normalizeText(option.label) === normalizeText(candidate)
    );
    if (matchedByLabel) return matchedByLabel.value;
  }

  return toStringId(rawId) || toStringId(rawRelation);
};

const matchesParent = (
  parentValue: unknown,
  selectedId: string,
  selectedLabel: string
): boolean =>
  sameId(parentValue, selectedId) ||
  normalizeText(getRelationLabel(parentValue, ["name", "state_name", "district_name"])) ===
    normalizeText(selectedLabel);

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

  const { applyCompanyProjectFromRecord } = useCompanyProjectSelection({ isEdit });

  const [panchayatName, setPanchayatName] = useState("");
  const [companyUniqueId, setCompanyUniqueId] = useState(
    () => (!isEdit && routeState?.companyUniqueId) || (getCurrentCompanyUniqueId() ?? "")
  );
  const [projectId, setProjectId] = useState((!isEdit && routeState?.projectId) || "");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [areaTypeId, setAreaTypeId] = useState("");
  const [hierarchyId, setHierarchyId] = useState("");
  const [agreedWeightKg, setAgreedWeightKg] = useState("0");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geofencingType, setGeofencingType] = useState("polygon");
  const [isActive, setIsActive] = useState(true);

  const [apiCompanies, setApiCompanies] = useState<SelectOption[]>([]);
  const [projects, setProjects] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [districts, setDistricts] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<SelectOption[]>([]);
  const [areaTypes, setAreaTypes] = useState<SelectOption[]>([]);
  const [hierarchies, setHierarchies] = useState<SelectOption[]>([]);

  const profile = useMemo(() => readLoginProfile(), []);
  const loggedInCompanyUniqueId = useMemo(() => getCurrentCompanyUniqueId(), []);
  const isSuperAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;

    const roleFromStorage = normalizeRole(
      localStorage.getItem(USER_ROLE_STORAGE_KEY)
    );
    const roleFromProfile = normalizeRole(profile?.role);
    return (roleFromStorage ?? roleFromProfile) === "superadmin";
  }, [profile]);
  const loggedInCompanyLabel = useMemo(() => {
    const directName =
      typeof profile?.company_name === "string"
        ? profile.company_name.trim()
        : "";
    const nestedName =
      typeof profile?.company?.name === "string"
        ? profile.company.name.trim()
        : "";

    return directName || nestedName || loggedInCompanyUniqueId || "";
  }, [profile, loggedInCompanyUniqueId]);
  const companies = useMemo<SelectOption[]>(() => {
    if (loggedInCompanyUniqueId) {
      return [
        {
          value: loggedInCompanyUniqueId,
          label: loggedInCompanyLabel,
        },
      ];
    }

    if (!isSuperAdmin) {
      return [];
    }

    return apiCompanies;
  }, [
    apiCompanies,
    isSuperAdmin,
    loggedInCompanyLabel,
    loggedInCompanyUniqueId,
  ]);

  const encMasters = encryptSegment("masters");
  const encPanchayat = encryptSegment("panchayats");
  const LIST_PATH = `/${encMasters}/${encPanchayat}`;

  /* =============================
      LOAD MASTER DATA
  ==============================*/
  useEffect(() => {
    stateApi
      .list()
      .then((res: any) => {
        setStates(toMasterOptions(normalizeApiList(res), ["name", "state_name"]));
      })
      .catch(() => setStates([]));
  }, []);

  const areaTypesQuery = useAreaTypesQuery();
  const hierarchiesQuery = useHierarchiesQuery();

  const createPanchayatMutation = useCreatePanchayatMutation();
  const updatePanchayatMutation = useUpdatePanchayatMutation();

  useEffect(() => {
    const res: any = areaTypesQuery.data ?? [];
    const list = Array.isArray(res) ? res : (res?.results ?? []);
    setAreaTypes(list.map((x: any) => ({ value: x.unique_id, label: x.name })));
  }, [areaTypesQuery.data]);

  useEffect(() => {
    const res: any = hierarchiesQuery.data ?? [];
    const list = Array.isArray(res) ? res : (res?.results ?? []);
    setHierarchies(list.map((x: any) => ({ value: x.unique_id, label: x.level_name })));
  }, [hierarchiesQuery.data]);

  useEffect(() => {
    if (loggedInCompanyUniqueId || !isSuperAdmin) {
      return;
    }

    companyApi
      .list()
      .then((res: any) => {
        const options: SelectOption[] = res.map((x: any) => ({
          value: toStringId(x.unique_id),
          label: x.name,
        }));
        setApiCompanies(options);
        if (!isEdit && options.length > 0) {
          setCompanyUniqueId((prev) => prev || options[0].value);
        }
      })
      .catch(() => {
        setApiCompanies([]);
      });
  }, [isEdit, isSuperAdmin, loggedInCompanyUniqueId]);

  useEffect(() => {
    if (!companyUniqueId) return;

    projectApi
      .list({ params: { company_unique_id: companyUniqueId } })
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.results ?? []);
        const options: SelectOption[] = list.map((x: any) => ({
          value: x.unique_id,
          label: x.name,
        }));

        setProjects(options);

        if (options.length === 0) {
          setProjectId("");
          return;
        }

        setProjectId((prev) => {
          if (prev && options.some((option) => option.value === prev)) {
            return prev;
          }
          return options[0].value;
        });
      })
      .catch(() => {
        setProjects([]);
        setProjectId("");
      });
  }, [companyUniqueId]);

  // Load dependent dropdowns only when the user changes the selection.
  // Do not use stateId/districtId effects here, because those effects run during
  // edit population and overwrite the already selected District and City options.
  const handleStateChange = async (value: string) => {
    setStateId(value);
    setDistrictId("");
    setCityId("");
    setDistricts([]);
    setCities([]);

    const selectedStateLabel =
      states.find((option) => sameId(option.value, value))?.label ?? "";

    try {
      const rows = normalizeApiList(await districtApi.list()).filter(
        (district: any) =>
          matchesParent(
            district.state_id ??
              district.state_unique_id ??
              district.state?.unique_id ??
              district.state?.id ??
              district.state,
            value,
            selectedStateLabel
          )
      );

      setDistricts(toMasterOptions(rows, ["name", "district_name"]));
    } catch {
      setDistricts([]);
    }
  };

  const handleDistrictChange = async (value: string) => {
    setDistrictId(value);
    setCityId("");
    setCities([]);

    const selectedDistrictLabel =
      districts.find((option) => sameId(option.value, value))?.label ?? "";

    try {
      const rows = normalizeApiList(await cityApi.list()).filter(
        (city: any) =>
          matchesParent(
            city.district_id ??
              city.district_unique_id ??
              city.district?.unique_id ??
              city.district?.id ??
              city.district,
            value,
            selectedDistrictLabel
          )
      );

      setCities(toMasterOptions(rows, ["name", "city_name"]));
    } catch {
      setCities([]);
    }
  };

  /* =============================
      EDIT MODE
  ==============================*/
  const panchayatQuery = usePanchayatQuery(id);

  useEffect(() => {
    if (!isEdit || !panchayatQuery.data) return;

    let cancelled = false;
    const data = panchayatQuery.data as any;

    const populateEditForm = async () => {
      try {
        setPanchayatName(data.panchayat_name ?? data.name ?? "");

        const recordCompanyId =
          data.company_unique_id ?? data.company_id ?? data.company?.unique_id;
        if (recordCompanyId && !loggedInCompanyUniqueId) {
          setCompanyUniqueId(toStringId(recordCompanyId));
        }

        setProjectId(
          toStringId(data.project_id ?? data.project_unique_id ?? data.project)
        );
        setAreaTypeId(toStringId(data.area_type_id ?? data.area_type));
        setHierarchyId(toStringId(data.hierarchy_id ?? data.hierarchy));
        setAgreedWeightKg(toStringId(data.agreed_weight_kg ?? "0"));
        setWeightUnit(data.weight_unit ?? "kg");
        setEffectiveFrom(data.effective_from ?? "");
        setLatitude(data.latitude ?? "");
        setLongitude(data.longitude ?? "");
        setGeofencingType(data.geofencing_type ?? "polygon");
        setIsActive(data.is_active === undefined ? true : Boolean(data.is_active));

        applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);

        // 1. Resolve saved State to the master State Select value.
        const stateRows = normalizeApiList(await stateApi.list());
        if (cancelled) return;

        let stateOptions = toMasterOptions(stateRows, ["name", "state_name"]);
        const selectedStateId = resolveSelectedValue(
          stateOptions,
          data.state_id ??
            data.state_unique_id ??
            data.state?.unique_id ??
            data.state?.id,
          data.state,
          data.state_name,
          ["name", "state_name"]
        );
        const selectedStateLabel =
          stateOptions.find((option) => sameId(option.value, selectedStateId))
            ?.label ??
          String(
            data.state_name ??
              getRelationLabel(data.state, ["name", "state_name"]) ??
              selectedStateId
          );

        stateOptions = ensureOption(
          stateOptions,
          selectedStateId,
          selectedStateLabel
        );
        setStates(stateOptions);
        setStateId(selectedStateId);

        // 2. Load districts for resolved State, then resolve saved District.
        const districtRows = normalizeApiList(await districtApi.list()).filter(
          (district: any) =>
            matchesParent(
              district.state_id ??
                district.state_unique_id ??
                district.state?.unique_id ??
                district.state?.id ??
                district.state,
              selectedStateId,
              selectedStateLabel
            )
        );
        if (cancelled) return;

        let districtOptions = toMasterOptions(districtRows, [
          "name",
          "district_name",
        ]);
        const selectedDistrictId = resolveSelectedValue(
          districtOptions,
          data.district_id ??
            data.district_unique_id ??
            data.district?.unique_id ??
            data.district?.id,
          data.district,
          data.district_name,
          ["name", "district_name"]
        );
        const selectedDistrictLabel =
          districtOptions.find((option) =>
            sameId(option.value, selectedDistrictId)
          )?.label ??
          String(
            data.district_name ??
              getRelationLabel(data.district, ["name", "district_name"]) ??
              selectedDistrictId
          );

        districtOptions = ensureOption(
          districtOptions,
          selectedDistrictId,
          selectedDistrictLabel
        );
        setDistricts(districtOptions);
        setDistrictId(selectedDistrictId);

        // 3. Load cities for resolved District, then resolve saved City.
        const cityRows = normalizeApiList(await cityApi.list()).filter(
          (city: any) =>
            matchesParent(
              city.district_id ??
                city.district_unique_id ??
                city.district?.unique_id ??
                city.district?.id ??
                city.district,
              selectedDistrictId,
              selectedDistrictLabel
            )
        );
        if (cancelled) return;

        let cityOptions = toMasterOptions(cityRows, ["name", "city_name"]);
        const selectedCityId = resolveSelectedValue(
          cityOptions,
          data.city_id ??
            data.city_unique_id ??
            data.city?.unique_id ??
            data.city?.id,
          data.city,
          data.city_name,
          ["name", "city_name"]
        );
        const selectedCityLabel =
          cityOptions.find((option) => sameId(option.value, selectedCityId))
            ?.label ??
          String(
            data.city_name ??
              getRelationLabel(data.city, ["name", "city_name"]) ??
              selectedCityId
          );

        cityOptions = ensureOption(
          cityOptions,
          selectedCityId,
          selectedCityLabel
        );
        setCities(cityOptions);
        setCityId(selectedCityId);
      } catch {
        if (!cancelled) {
          Swal.fire("Error", "Unable to load state, district and city details", "error");
        }
      }
    };

    populateEditForm();

    return () => {
      cancelled = true;
    };
  }, [
    isEdit,
    panchayatQuery.data,
    loggedInCompanyUniqueId,
    applyCompanyProjectFromRecord,
  ]);

  /* =============================
      SUBMIT
  ==============================*/
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
      area_type_id: areaTypeId,
      hierarchy_id: hierarchyId,
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

        <div>
          <Label>Company *</Label>
          <Select
            value={companyUniqueId}
            onValueChange={(value) => {
              setCompanyUniqueId(value);
              setProjects([]);
              setProjectId("");
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

        {showField("state_id") && (
          <div>
            <Label>State *</Label>
            <Select
              value={stateId}
              onValueChange={handleStateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showField("district_id") && (
          <div>
            <Label>District *</Label>
            <Select
              value={districtId}
              onValueChange={handleDistrictChange}
              disabled={!stateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showField("city_id") && (
          <div>
            <Label>City *</Label>
            <Select value={cityId} onValueChange={setCityId} disabled={!districtId}>
              <SelectTrigger>
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* <div>
          <Label>Area Type *</Label>
          <Select value={areaTypeId} onValueChange={setAreaTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Area Type" />
            </SelectTrigger>
            <SelectContent>
              {areaTypes.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Hierarchy *</Label>
          <Select value={hierarchyId} onValueChange={setHierarchyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Hierarchy" />
            </SelectTrigger>
            <SelectContent>
              {hierarchies.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}

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
          <Button type="submit" disabled={createPanchayatMutation.isPending || updatePanchayatMutation.isPending}>{isEdit ? "Update" : "Save"}</Button>
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