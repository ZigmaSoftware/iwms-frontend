import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { usePanchayatQuery, useCreatePanchayatMutation, useUpdatePanchayatMutation, useAreaTypesQuery, useHierarchiesQuery } from "@/tanstack/admin";
import { getCurrentCompanyUniqueId } from "@/utils/projectContext";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";

type Option = { value: string; label: string };
type LoginProfile = {
  role?: string;
  company_name?: string;
  company?: {
    name?: string;
  };
};

const toStringId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
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

export default function PanchayatForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { applyCompanyProjectFromRecord } = useCompanyProjectSelection({ isEdit });

  const [panchayatName, setPanchayatName] = useState("");
  const [companyUniqueId, setCompanyUniqueId] = useState(
    () => getCurrentCompanyUniqueId() ?? ""
  );
  const [projectId, setProjectId] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [areaTypeId, setAreaTypeId] = useState("");
  const [hierarchyId, setHierarchyId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geofencingType, setGeofencingType] = useState("polygon");
  const [isActive, setIsActive] = useState(true);

  const [apiCompanies, setApiCompanies] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [areaTypes, setAreaTypes] = useState<Option[]>([]);
  const [hierarchies, setHierarchies] = useState<Option[]>([]);

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
  const companies = useMemo<Option[]>(() => {
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
    stateApi.list().then((res: any) =>
      setStates(
        res.map((x: any) => ({
          value: x.unique_id,
          label: x.name,
        }))
      )
    );
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
        const options: Option[] = res.map((x: any) => ({
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
        const options: Option[] = list.map((x: any) => ({
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

  useEffect(() => {
    if (!stateId) return;
    districtApi.list().then((res: any) =>
      setDistricts(
        res
          .filter((d: any) => d.state_id === stateId)
          .map((d: any) => ({
            value: d.unique_id,
            label: d.name,
          }))
      )
    );
  }, [stateId]);

  useEffect(() => {
    if (!districtId) return;
    cityApi.list().then((res: any) =>
      setCities(
        res
          .filter((c: any) => c.district_id === districtId)
          .map((c: any) => ({
            value: c.unique_id,
            label: c.name,
          }))
      )
    );
  }, [districtId]);

  /* =============================
      EDIT MODE
  ==============================*/
  const panchayatQuery = usePanchayatQuery(id);

  useEffect(() => {
    if (!panchayatQuery.data) return;
    const data = panchayatQuery.data as any;
    setPanchayatName(data.panchayat_name ?? "");
    const recordCompanyId = data.company_unique_id ?? data.company_id ?? data.company?.unique_id;
    if (recordCompanyId && !loggedInCompanyUniqueId) {
      setCompanyUniqueId(toStringId(recordCompanyId));
    }
    setProjectId(toStringId(data.project_id ?? data.project_unique_id ?? data.project?.unique_id));
    setStateId(toStringId(data.state_id));
    setDistrictId(toStringId(data.district_id));
    setCityId(toStringId(data.city_id));
    setAreaTypeId(toStringId(data.area_type_id));
    setHierarchyId(toStringId(data.hierarchy_id));
    setLatitude(data.latitude ?? "");
    setLongitude(data.longitude ?? "");
    setGeofencingType(data.geofencing_type ?? "polygon");
    setIsActive(Boolean(data.is_active));
    applyCompanyProjectFromRecord(data as unknown as Record<string, unknown>);
  }, [panchayatQuery.data, loggedInCompanyUniqueId, applyCompanyProjectFromRecord]);

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

    const basePayload = {
      panchayat_name: panchayatName,
      company_id: companyUniqueId,
      project_id: projectId,
      state_id: stateId,
      district_id: districtId,
      city_id: cityId,
      area_type_id: areaTypeId,
      hierarchy_id: hierarchyId,
      latitude,
      longitude,
      geofencing_type: geofencingType,
      is_active: isActive,
    };

    try {
      if (isEdit && id) {
        await updatePanchayatMutation.mutateAsync({ id, payload: basePayload });
        Swal.fire("Success", "Updated successfully", "success");
      } else {
        await createPanchayatMutation.mutateAsync(basePayload);
        Swal.fire("Success", "Created successfully", "success");
      }

      navigate(LIST_PATH);
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

        <div>
          <Label>State *</Label>
          <Select
            value={stateId}
            onValueChange={(value) => {
              setStateId(value);
              setDistrictId("");
              setCityId("");
              setDistricts([]);
              setCities([]);
            }}
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

        <div>
          <Label>District *</Label>
          <Select
            value={districtId}
            onValueChange={(value) => {
              setDistrictId(value);
              setCityId("");
              setCities([]);
            }}
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

        <div>
          <Label>Panchayat Name *</Label>
          <Input
            value={panchayatName}
            onChange={(e) => setPanchayatName(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Latitude *</Label>
          <Input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Longitude *</Label>
          <Input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
          />
        </div>

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

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={createPanchayatMutation.isPending || updatePanchayatMutation.isPending}>{isEdit ? "Update" : "Save"}</Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate(LIST_PATH)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
