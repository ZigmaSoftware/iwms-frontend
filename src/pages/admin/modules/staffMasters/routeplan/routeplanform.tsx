import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select, { type SelectOption } from "@/components/form/Select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { companyApi, projectApi, staffCreationApi } from "@/helpers/admin";
import { normalizeList } from "@/utils/forms";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFormCompanyProjectSync } from "@/hooks/useFormCompanyProjectSync";

// Sentinel value for "Not Applicable" selection
const NA_VALUE = "N/A";
const NA_OPTION: SelectOption = { value: NA_VALUE, label: "N/A" };

/* ─── Types ─────────────────────────────────────────────── */

type RelatedOption = SelectOption & {
  districtId?: string;
  cityId?: string;
  companyId?: string;
  projectId?: string;
};

type StaffRecord = {
  unique_id?: string;
  staff_name?: string;
  employee_name?: string;
  username?: string;
  staffusertype_name?: string;
  contractorusertype_name?: string;
  designation?: string;
  company_id?: unknown;
  company_name?: string;
  project_id?: unknown;
  project_name?: string;
  is_active?: boolean;
  is_deleted?: boolean;
  active_status?: boolean | number | string | null;
  [key: string]: unknown;
};

type StaffTemplateRecord = {
  unique_id?: string;
  display_code?: string;
  driver_id?: string;
  [key: string]: unknown;
};

/* ─── Helpers (mirrors staffTemplateForm) ────────────────── */

const toText = (value: unknown): string => String(value ?? "").trim();

const extractId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.unique_id ?? obj.id ?? "");
  }
  return String(value);
};

// Use the same approach as staffTemplateForm — try company_id first, fall back to company_name
const getStaffCompanyId = (staff: StaffRecord): string =>
  toText(staff.company_id) || toText(staff.company_name);

const getStaffProjectId = (staff: StaffRecord): string =>
  toText(staff.project_id) || toText(staff.project_name);

const getStaffDisplayName = (staff: StaffRecord): string =>
  toText(staff.employee_name ?? staff.staff_name ?? staff.username ?? staff.unique_id);

const normalizeRole = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const getStaffRole = (staff: StaffRecord): string =>
  normalizeRole(staff.staffusertype_name ?? staff.contractorusertype_name ?? staff.designation);

const isDriverRole = (staff: StaffRecord): boolean => {
  const role = getStaffRole(staff);
  return role === "driver" || role === "company driver" || role === "contractor driver";
};

const isSupervisorRole = (staff: StaffRecord): boolean => {
  const role = getStaffRole(staff);
  return role === "supervisor" || role === "company supervisor" || role === "contractor supervisor";
};

const toStaffOption = (staff: StaffRecord): SelectOption => ({
  value: toText(staff.unique_id),
  label: getStaffDisplayName(staff),
});

/* ─── Component ──────────────────────────────────────────── */

function RoutePlanEditor({ id, initialPayload, isEdit }: { id?: string; initialPayload: Record<string, unknown>; isEdit: boolean; }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  

  const districtApi = adminApi.districts;
  const cityApi    = adminApi.cities;
  const zoneApi    = adminApi.zones;
  const vehicleApi = adminApi.vehicleCreations;
  const panchayatApiInst      = adminApi.panchayats;
  const staffTemplateApiInst  = adminApi.staffTemplateCreation;

  // Raw data stores
  const [staffRecords,        setStaffRecords]        = useState<StaffRecord[]>([]);
  const [allDistricts,        setAllDistricts]        = useState<(SelectOption & { companyId?: string; projectId?: string })[]>([]);
  const [allCities,           setAllCities]           = useState<RelatedOption[]>([]);
  const [zones,               setZones]               = useState<RelatedOption[]>([]);
  const [vehicles,            setVehicles]            = useState<RelatedOption[]>([]);
  const [panchayats,          setPanchayats]          = useState<RelatedOption[]>([]);
  const [staffTemplateRecords,setStaffTemplateRecords]= useState<StaffTemplateRecord[]>([]);
  const [staffTemplates,      setStaffTemplates]      = useState<SelectOption[]>([]);

  // Scoped options — recomputed when company/project changes
  const [driverOptions,     setDriverOptions]     = useState<SelectOption[]>([]);
  const [supervisorOptions, setSupervisorOptions] = useState<SelectOption[]>([]);

  // Company / Project
  const [companyOptions,  setCompanyOptions]  = useState<SelectOption[]>([]);
  const [projectOptions,  setProjectOptions]  = useState<SelectOption[]>([]);
  const [allProjects,     setAllProjects]     = useState<(SelectOption & { company_id?: string })[]>([]);
  const [createCompanyId, setCreateCompanyId] = useState("");
  const [createProjectId, setCreateProjectId] = useState("");

  const [fetching,       setFetching]       = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const [optionsLoaded,  setOptionsLoaded]  = useState(false);
  const [restoreRecord,  setRestoreRecord]  = useState<Record<string, unknown> | null>(null);

  const {
    handleCompanyChange: createHandleCompanyChange,
    handleProjectChange: createHandleProjectChange,
    globalCompanyId,
    globalProjectId,
  } = useFormCompanyProjectSync({
    selectedCompanyId: createCompanyId,
    setSelectedCompanyId: setCreateCompanyId,
    selectedProjectId: createProjectId,
    setSelectedProjectId: setCreateProjectId,
  });

  const editSelection = useCompanyProjectSelection({
    isEdit: isEdit,
    initialCompanyId: String(initialPayload.company_id ?? ""),
    initialProjectId: String(initialPayload.project_id ?? ""),
  });

  const selectedCompanyId = isEdit ? editSelection.companyUniqueId : createCompanyId;
  const selectedProjectId = isEdit ? editSelection.projectId : createProjectId;

  const currentCompanyOptions = isEdit ? editSelection.companies : companyOptions;
  const currentProjectOptions = isEdit ? editSelection.projects : projectOptions;

  const handleCompanyChange = isEdit ? editSelection.onCompanyChange : createHandleCompanyChange;
  const handleProjectChange = isEdit ? editSelection.setProjectId : createHandleProjectChange;

  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  const qsCompany = qs.get("company_unique_id") ?? "";
  const qsProject = qs.get("project_id") ?? "";

  const [form, setForm] = useState({
    district_id:      "",
    city_id:          "",
    zone_id:          "",
    panchayat_id:     "",
    vehicle_id:       "",
    supervisor_id:    "",
    staff_template_id:"",
    driver_id:        "",
  });

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encStaffMasters}/${encRoutePlans}`;

  /* ── Option converters ─────────────────────────────────── */

  const toOptions = (
    items: unknown[],
    valueKey: string,
    labelKey: string,
  ): (SelectOption & { companyId?: string; projectId?: string })[] =>
    (items as Record<string, unknown>[])
      .map((item) => ({
        value:     item?.[valueKey] as string,
        label:     (item?.[labelKey] ?? item?.[valueKey]) as string,
        companyId: extractId(item?.company_id ?? item?.company_unique_id),
        projectId: extractId(item?.project_id ?? item?.project_unique_id),
      }))
      .filter((opt) => opt.value != null && opt.value !== "");

  const toRelatedOptions = (items: unknown[], valueKey: string, labelKey: string): RelatedOption[] =>
    (items as Record<string, unknown>[])
      .map((item) => ({
        value:      item?.[valueKey] as string,
        label:      (item?.[labelKey] ?? item?.["name"] ?? item?.[valueKey]) as string,
        districtId: extractId(item?.district_id ?? item?.district),
        cityId:     extractId(item?.city_id     ?? item?.city),
        companyId:  extractId(item?.company_id  ?? item?.company_unique_id),
        projectId:  extractId(item?.project_id  ?? item?.project_unique_id),
      }))
      .filter((opt) => opt.value != null && opt.value !== "");

  /* ── Queries ───────────────────────────────────────────── */

  const companiesQuery      = useQuery({ queryKey: ["superadmin", "companies"],              queryFn: () => companyApi.list() });
  const projectsQuery       = useQuery({ queryKey: ["superadmin", "projects"],               queryFn: () => projectApi.list() });
  const staffQuery          = useQuery({ queryKey: ["user creations", "staff creations"],    queryFn: () => staffCreationApi.list({ params: { active_status: 1 } }) });
  const districtsQuery      = useQuery({ queryKey: ["masters", "districts"],                 queryFn: () => districtApi.list() });
  const citiesQuery         = useQuery({ queryKey: ["masters", "cities"],                    queryFn: () => cityApi.list() });
  const zonesQuery          = useQuery({ queryKey: ["masters", "zone"],                      queryFn: () => zoneApi.list() });
  const vehiclesQuery       = useQuery({ queryKey: ["transport masters", "vehicle creation"],queryFn: () => vehicleApi.list() });
  const panchayatsQuery     = useQuery({ queryKey: ["masters", "panchayats"],                queryFn: () => panchayatApiInst.list() });
  const staffTemplatesQuery = useQuery({ queryKey: ["user creations", "staff template"],     queryFn: () => staffTemplateApiInst.list() });

  /* ── Load static option data ───────────────────────────── */

  useEffect(() => {
    setFetching(
      companiesQuery.isLoading  || projectsQuery.isLoading  ||
      staffQuery.isLoading      || districtsQuery.isLoading ||
      citiesQuery.isLoading     || zonesQuery.isLoading     ||
      vehiclesQuery.isLoading   || panchayatsQuery.isLoading||
      staffTemplatesQuery.isLoading,
    );

    if (
      companiesQuery.isError  || projectsQuery.isError  ||
      staffQuery.isError      || districtsQuery.isError ||
      citiesQuery.isError     || zonesQuery.isError     ||
      vehiclesQuery.isError   || panchayatsQuery.isError||
      staffTemplatesQuery.isError
    ) {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
      return;
    }

    // Companies
    const companiesData = normalizeList(companiesQuery.data) as Record<string, unknown>[];
    const normalizedCompanies = companiesData
      .filter((c) => c?.is_active !== false && c?.is_deleted !== true)
      .map((c) => ({ value: toText(c?.unique_id ?? c?.id), label: toText(c?.name) }))
      .filter((o) => o.value && o.label);
    setCompanyOptions(normalizedCompanies);

    setSelectedCompanyId((prev) => {
      if (prev && normalizedCompanies.some((o) => o.value === prev)) return prev;
      if (globalCompanyId && normalizedCompanies.some((o) => o.value === globalCompanyId)) return globalCompanyId;
      return normalizedCompanies[0]?.value ?? "";
    });

    // Projects
    const projectsData = normalizeList(projectsQuery.data) as Record<string, unknown>[];
    const normalizedProjects = projectsData
      .filter((p) => p?.is_active !== false && p?.is_deleted !== true)
      .map((p) => ({
        value:      toText(p?.unique_id ?? p?.id),
        label:      toText(p?.name),
        company_id: toText(p?.company_unique_id ?? p?.company_id),
      }))
      .filter((o) => o.value && o.label);
    setAllProjects(normalizedProjects);

    // Staff (for driver + supervisor options — scoped later by company/project)
    const rawStaff = normalizeList(staffQuery.data) as StaffRecord[];
    setStaffRecords(rawStaff.filter((s) => s.unique_id && s.is_deleted !== true));

    // Geography
    setAllDistricts(toOptions(normalizeList(districtsQuery.data), "unique_id", "name"));
    setAllCities(toRelatedOptions(normalizeList(citiesQuery.data), "unique_id", "name"));
    setZones(toRelatedOptions(normalizeList(zonesQuery.data), "unique_id", "zone_name"));
    setVehicles(toRelatedOptions(normalizeList(vehiclesQuery.data), "unique_id", "vehicle_no"));
    setPanchayats(toRelatedOptions(normalizeList(panchayatsQuery.data), "unique_id", "panchayat_name"));

    // Staff templates
    const templateRecords = normalizeList(staffTemplatesQuery.data) as StaffTemplateRecord[];
    setStaffTemplateRecords(templateRecords);
    setStaffTemplates(
      templateRecords
        .map((r) => ({ value: r?.unique_id ?? "", label: r?.display_code ?? r?.unique_id ?? "" }))
        .filter((o) => o.value),
    );

    setOptionsLoaded(true);
  }, [
    companiesQuery.data,  companiesQuery.isError,  companiesQuery.isLoading,
    projectsQuery.data,   projectsQuery.isError,   projectsQuery.isLoading,
    staffQuery.data,      staffQuery.isError,      staffQuery.isLoading,
    districtsQuery.data,  districtsQuery.isError,  districtsQuery.isLoading,
    citiesQuery.data,     citiesQuery.isError,     citiesQuery.isLoading,
    zonesQuery.data,      zonesQuery.isError,      zonesQuery.isLoading,
    vehiclesQuery.data,   vehiclesQuery.isError,   vehiclesQuery.isLoading,
    panchayatsQuery.data, panchayatsQuery.isError, panchayatsQuery.isLoading,
    staffTemplatesQuery.data, staffTemplatesQuery.isError, staffTemplatesQuery.isLoading,
    globalCompanyId, t,
  ]);

  /* ── Filter projects by selected company ───────────────── */

  useEffect(() => {
    const filtered = selectedCompanyId
      ? allProjects.filter((p) => !p.company_id || p.company_id === selectedCompanyId)
      : allProjects;
    setProjectOptions(filtered);
    setSelectedProjectId((prev) => {
      if (prev && filtered.some((o) => o.value === prev)) return prev;
      if (globalProjectId && filtered.some((o) => o.value === globalProjectId)) return globalProjectId;
      return filtered[0]?.value ?? "";
    });
  }, [selectedCompanyId, allProjects, globalProjectId]);

  /* ── Scope drivers + supervisors by company + project ───── */

  useEffect(() => {
    const scoped = staffRecords.filter((s) => {
      const companyMatch = !selectedCompanyId || getStaffCompanyId(s) === selectedCompanyId;
      const projectMatch = !selectedProjectId || getStaffProjectId(s) === selectedProjectId;
      return companyMatch && projectMatch;
    });

    setDriverOptions(scoped.filter(isDriverRole).map(toStaffOption).filter((o) => o.value));
    setSupervisorOptions(scoped.filter(isSupervisorRole).map(toStaffOption).filter((o) => o.value));

    // Clear driver/supervisor if they no longer belong to the scoped list
    setForm((prev) => {
      const scopedIds = new Set(scoped.map((s) => toText(s.unique_id)));
      return {
        ...prev,
        driver_id:    prev.driver_id    && !scopedIds.has(prev.driver_id)    ? "" : prev.driver_id,
        supervisor_id:prev.supervisor_id && !scopedIds.has(prev.supervisor_id)? "" : prev.supervisor_id,
      };
    });
  }, [selectedCompanyId, selectedProjectId, staffRecords]);

  /* ── Derived geography options ─────────────────────────── */

  const districtOptions = useMemo(
    () =>
      allDistricts.filter((d) => {
        const cm = !selectedCompanyId || !d.companyId || d.companyId === selectedCompanyId;
        const pm = !selectedProjectId || !d.projectId || d.projectId === selectedProjectId;
        return cm && pm;
      }),
    [allDistricts, selectedCompanyId, selectedProjectId],
  );

  const cityOptions = useMemo(
    () =>
      allCities.filter((c) => {
        const cm = !selectedCompanyId || !c.companyId || c.companyId === selectedCompanyId;
        const pm = !selectedProjectId || !c.projectId || c.projectId === selectedProjectId;
        const dm = !form.district_id  || !c.districtId|| c.districtId === form.district_id;
        return cm && pm && dm;
      }),
    [allCities, selectedCompanyId, selectedProjectId, form.district_id],
  );

  const zoneOptions: SelectOption[] = [
    NA_OPTION,
    ...zones.filter(
      (z) =>
        (!form.district_id || !z.districtId || z.districtId === form.district_id) &&
        (!form.city_id     || !z.cityId     || z.cityId     === form.city_id),
    ),
  ];

  const panchayatOptions: SelectOption[] = [
    NA_OPTION,
    ...panchayats.filter(
      (p) =>
        (!form.district_id || !p.districtId || p.districtId === form.district_id) &&
        (!form.city_id     || !p.cityId     || p.cityId     === form.city_id),
    ),
  ];

  const vehicleOptions = vehicles.filter(
    (v) =>
      (!form.district_id || !v.districtId || v.districtId === form.district_id) &&
      (!form.city_id     || !v.cityId     || v.cityId     === form.city_id),
  );

  /* ── Company / Project change handlers ─────────────────── */

  const onCompanyChange = (value: string) => {
    handleCompanyChange(value);
    setForm((prev) => ({ ...prev, district_id: "", city_id: "", zone_id: "", panchayat_id: "" }));
  };

  const onProjectChange = (value: string) => {
    handleProjectChange(value);
    setForm((prev) => ({ ...prev, district_id: "", city_id: "", zone_id: "", panchayat_id: "" }));
  };

  /* ── Zone / Panchayat mutual-exclusion handlers ─────────── */

  const zoneDisabled      = fetching || !form.city_id || (Boolean(form.panchayat_id) && form.panchayat_id !== NA_VALUE);
  const panchayatDisabled = fetching || !form.city_id || (Boolean(form.zone_id)      && form.zone_id      !== NA_VALUE);

  const handleZoneChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      zone_id:      value,
      panchayat_id: value && value !== NA_VALUE ? "" : prev.panchayat_id,
    }));

  const handlePanchayatChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      panchayat_id: value,
      zone_id:      value && value !== NA_VALUE ? "" : prev.zone_id,
    }));

  /* Edit-mode restore handled by wrapper via initialPayload */

  // When options are ready and we have a pending record to restore, populate the form
  useEffect(() => {
    if (!optionsLoaded || !restoreRecord) return;
    const res = restoreRecord;
    setForm({
      district_id:       extractId(res?.district_id),
      city_id:           extractId(res?.city_id),
      zone_id:           extractId(res?.zone_id)      || "",
      panchayat_id:      extractId(res?.panchayat_id) || "",
      vehicle_id:        extractId(res?.vehicle_id),
      supervisor_id:     extractId(res?.supervisor_id),
      staff_template_id: extractId(res?.staff_template_id),
      driver_id:         extractId(res?.driver_id),
    });

    // Ensure selected company/project state matches record
    const companyId = extractId(res?.company_id);
    const projectId = extractId(res?.project_id);
    if (companyId) handleCompanyChange(companyId);
    if (projectId) handleProjectChange(projectId);

    setRestoreRecord(null);
  }, [optionsLoaded, restoreRecord]);

  // If the form is opened from the list with query params, prefill company/project
  useEffect(() => {
    if (isEdit) return;
    if (!qsCompany && !qsProject) return;

    if (qsCompany) handleCompanyChange(qsCompany);
    if (qsProject) handleProjectChange(qsProject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsCompany, qsProject]);

  // If parent supplied an initial payload (edit-mode), apply company/project first
  useEffect(() => {
    if (!initialPayload || !isEdit) return;
    const companyId = String(initialPayload.company_id ?? "");
    const projectId = String(initialPayload.project_id ?? "");

    if (companyId) handleCompanyChange(companyId);
    if (projectId) handleProjectChange(projectId);

    editSelection.applyCompanyProjectFromRecord(initialPayload);
    setRestoreRecord(initialPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPayload, isEdit]);

  /* ── Auto-fill driver from selected staff template ──────── */

  const handleTemplateChange = (templateId: string) => {
    const record = staffTemplateRecords.find((r) => r.unique_id === templateId);
    const driverId = record ? extractId(record.driver_id) : "";
    setForm((prev) => ({ ...prev, staff_template_id: templateId, driver_id: driverId }));
  };

  /* ── Submit ─────────────────────────────────────────────── */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const hasZoneOrPanchayat =
      (form.zone_id      && form.zone_id      !== NA_VALUE) ||
      (form.panchayat_id && form.panchayat_id !== NA_VALUE);

    if (
      !selectedCompanyId || !selectedProjectId ||
      !form.district_id  || !form.city_id      ||
      !hasZoneOrPanchayat||
      !form.vehicle_id   || !form.supervisor_id ||
      !form.staff_template_id || !form.driver_id
    ) {
      Swal.fire(t("common.error"), t("common.missing_fields"), "warning");
      return;
    }

    const payload = {
      company_id:        selectedCompanyId,
      project_id:        selectedProjectId,
      district_id:       form.district_id,
      city_id:           form.city_id,
      zone_id:           form.zone_id      && form.zone_id      !== NA_VALUE ? form.zone_id      : null,
      panchayat_id:      form.panchayat_id && form.panchayat_id !== NA_VALUE ? form.panchayat_id : null,
      vehicle_id:        form.vehicle_id,
      supervisor_id:     form.supervisor_id,
      staff_template_id: form.staff_template_id,
      driver_id:         form.driver_id,
    };

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.routePlans.update(id, payload);
      } else {
        await adminApi.routePlans.create(payload);
      }
      Swal.fire(t("common.success"), isEdit ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(ENC_LIST_PATH, { state: { companyUniqueId: selectedCompanyId, projectId: selectedProjectId } });
    } catch {
      Swal.fire(t("common.error"), t("common.save_failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="p-3">
      <ComponentCard title={t("admin.route_plan.title")} desc={t("admin.route_plan.subtitle")}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Company */}
            <div>
              <Label>{t("admin.nav.company") || "Company"}</Label>
              <Select
                value={selectedCompanyId}
                onChange={onCompanyChange}
                options={currentCompanyOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            {/* Project */}
            <div>
              <Label>{t("admin.nav.project") || "Project"}</Label>
              <Select
                value={selectedProjectId}
                onChange={onProjectChange}
                options={currentProjectOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !selectedCompanyId}
                required
              />
            </div>

            {/* District — enabled only after company + project */}
            <div>
              <Label>{t("admin.route_plan.district")}</Label>
              <Select
                value={form.district_id}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, district_id: value, city_id: "", zone_id: "", panchayat_id: "" }))
                }
                options={districtOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !selectedCompanyId || !selectedProjectId}
                required
              />
            </div>

            {/* City */}
            <div>
              <Label>{t("common.city")}</Label>
              <Select
                value={form.city_id}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, city_id: value, zone_id: "", panchayat_id: "" }))
                }
                options={cityOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !form.district_id}
                required
              />
            </div>

            {/* Zone — disabled when panchayat has a real selection */}
            <div>
              <Label>{t("admin.route_plan.zone")}</Label>
              <Select
                value={form.zone_id}
                onChange={handleZoneChange}
                options={zoneOptions}
                placeholder={t("common.select_option")}
                disabled={zoneDisabled}
              />
            </div>

            {/* Panchayat — disabled when zone has a real selection */}
            <div>
              <Label>{t("admin.nav.panchayat") || "Panchayat"}</Label>
              <Select
                value={form.panchayat_id}
                onChange={handlePanchayatChange}
                options={panchayatOptions}
                placeholder={t("common.select_option")}
                disabled={panchayatDisabled}
              />
            </div>

            {/* Staff Template */}
            <div>
              <Label>{t("admin.trip_definition.staff_template") || "Staff Template"}</Label>
              <Select
                value={form.staff_template_id}
                onChange={handleTemplateChange}
                options={staffTemplates}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            {/* Driver — scoped to company + project, auto-filled from template */}
            <div>
              <Label>{t("admin.staff_template.primary_driver") || "Driver"}</Label>
              <Select
                value={form.driver_id}
                onChange={(value) => setForm((prev) => ({ ...prev, driver_id: value }))}
                options={driverOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !selectedCompanyId || !selectedProjectId}
                required
              />
            </div>

            {/* Vehicle */}
            <div>
              <Label>{t("admin.route_plan.vehicle")}</Label>
              <Select
                value={form.vehicle_id}
                onChange={(value) => setForm((prev) => ({ ...prev, vehicle_id: value }))}
                options={vehicleOptions}
                placeholder={t("common.select_option")}
                disabled={fetching}
                required
              />
            </div>

            {/* Supervisor — scoped to company + project */}
            <div>
              <Label>{t("admin.route_plan.supervisor")}</Label>
              <Select
                value={form.supervisor_id}
                onChange={(value) => setForm((prev) => ({ ...prev, supervisor_id: value }))}
                options={supervisorOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !selectedCompanyId || !selectedProjectId}
                required
              />
            </div>

          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId: selectedCompanyId, projectId: selectedProjectId } })}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}

export default function RoutePlanForm() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [routePlanRecord, setRoutePlanRecord] = useState<Record<string, unknown> | null>(null);
  const [routePlanLoading, setRoutePlanLoading] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) {
      setRoutePlanRecord(null);
      return;
    }

    let mounted = true;
    setRoutePlanLoading(true);

    // Debug: log edit fetch
    // eslint-disable-next-line no-console
    console.debug("[RoutePlanForm] fetching route plan", { id });

    adminApi.routePlans
      .get(id)
      .then((res) => {
        // Debug: got response
        // eslint-disable-next-line no-console
        console.debug("[RoutePlanForm] fetched route plan response", { res });
        if (mounted) {
          setRoutePlanRecord(res as Record<string, unknown>);
        }
      })
      .catch((err) => {
        // Debug: fetch error
        // eslint-disable-next-line no-console
        console.error("[RoutePlanForm] fetch error", err);
        if (mounted) {
          Swal.fire(t("common.error"), t("common.load_failed"), "error");
        }
      })
      .finally(() => {
        if (mounted) setRoutePlanLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, isEdit, t]);

  if (isEdit && routePlanLoading && !routePlanRecord) {
    return (
      <ComponentCard title={isEdit ? t("common.edit_item", { item: t("admin.route_plan.title") }) : t("common.add_item", { item: t("admin.route_plan.title") })}>
        <div className="p-6 text-sm text-gray-500">{t("common.loading")}</div>
      </ComponentCard>
    );
  }

  const initialPayload: Record<string, unknown> = routePlanRecord
    ? {
        district_id: String(routePlanRecord?.district_id ?? ""),
        city_id: String(routePlanRecord?.city_id ?? ""),
        zone_id: String(routePlanRecord?.zone_id ?? ""),
        panchayat_id: String(routePlanRecord?.panchayat_id ?? ""),
        vehicle_id: String(routePlanRecord?.vehicle_id ?? ""),
        supervisor_id: String(routePlanRecord?.supervisor_id ?? ""),
        staff_template_id: String(routePlanRecord?.staff_template_id ?? ""),
        driver_id: String(routePlanRecord?.driver_id ?? ""),
        company_id: String(routePlanRecord?.company_id ?? routePlanRecord?.company_unique_id ?? ""),
        project_id: String(routePlanRecord?.project_id ?? routePlanRecord?.project_unique_id ?? ""),
      }
    : {
        district_id: "",
        city_id: "",
        zone_id: "",
        panchayat_id: "",
        vehicle_id: "",
        supervisor_id: "",
        staff_template_id: "",
        driver_id: "",
        company_id: "",
        project_id: "",
      };

  const formKey = isEdit ? String(routePlanRecord?.unique_id ?? id) : "new-routeplan";

  return (
    <div className="p-3">
      <ComponentCard title={isEdit ? t("common.edit_item", { item: t("admin.route_plan.title") }) : t("common.add_item", { item: t("admin.route_plan.title") })} desc={t("admin.route_plan.subtitle")}> 
        <RoutePlanEditor key={formKey} id={id} initialPayload={initialPayload} isEdit={isEdit} />
      </ComponentCard>
    </div>
  );
}
