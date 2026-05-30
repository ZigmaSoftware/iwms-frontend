/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select, { type SelectOption } from "@/components/form/Select";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";

// ─── Types ────────────────────────────────────────────────────────────────────

type RelatedOption = SelectOption & {
  districtId?: string;
  cityId?: string;
};

type StaffTemplateRecord = {
  unique_id: string;
  display_code?: string;
  driver_id?: string;
  [key: string]: unknown;
};

const NA_VALUE = "__na__";
const NA_OPTION: SelectOption = { value: NA_VALUE, label: "N/A" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.unique_id ?? obj.id ?? "");
  }
  return String(value);
};

const toOptions = (items: any[], valueKey: string, labelKey: string): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(item?.[labelKey] ?? item?.[valueKey] ?? ""),
    }))
    .filter((o) => o.value);

const toRelatedOptions = (items: any[], valueKey: string, labelKey: string): RelatedOption[] =>
  items
    .map((item) => ({
      value: String(item?.[valueKey] ?? ""),
      label: String(item?.[labelKey] ?? item?.name ?? item?.[valueKey] ?? ""),
      districtId: extractId(item?.district_id ?? item?.district),
      cityId: extractId(item?.city_id ?? item?.city),
    }))
    .filter((o) => o.value);

const extractError = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

type FormState = {
  district_id: string;
  city_id: string;
  zone_id: string;
  panchayat_id: string;
  vehicle_id: string;
  supervisor_id: string;
  staff_template_id: string;
  driver_id: string;
};

const EMPTY_FORM: FormState = {
  district_id: "",
  city_id: "",
  zone_id: "",
  panchayat_id: "",
  vehicle_id: "",
  supervisor_id: "",
  staff_template_id: "",
  driver_id: "",
};

export default function RoutePlanForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const isEdit = Boolean(id);

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, loggedInCompanyUniqueId,
    setProjectId, onCompanyChange, applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const LIST_PATH = `/${encStaffMasters}/${encRoutePlans}`;

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Holds the raw record values until dropdown options finish loading
  const [pendingRecord, setPendingRecord] = useState<FormState | null>(null);

  // ── Master dropdown data (loaded once, no company filter needed) ──────────
  const [fetchingMasters, setFetchingMasters] = useState(false);
  const [districts, setDistricts] = useState<SelectOption[]>([]);
  const [cities, setCities] = useState<RelatedOption[]>([]);
  const [zones, setZones] = useState<RelatedOption[]>([]);
  const [panchayats, setPanchayats] = useState<RelatedOption[]>([]);

  // ── Company-scoped dropdown data (reloaded when company+project change) ───
  const [fetchingScoped, setFetchingScoped] = useState(false);
  const [vehicles, setVehicles] = useState<SelectOption[]>([]);
  const [staffTemplates, setStaffTemplates] = useState<SelectOption[]>([]);
  const [staffTemplateRecords, setStaffTemplateRecords] = useState<StaffTemplateRecord[]>([]);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [supervisors, setSupervisors] = useState<SelectOption[]>([]);

  const fetching = fetchingMasters || fetchingScoped;

  // ── Load master data once ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFetchingMasters(true);
    Promise.all([
      adminApi.districts.list(),
      adminApi.cities.list(),
      adminApi.zones.list(),
      adminApi.panchayats.list(),
    ])
      .then(([distRes, cityRes, zoneRes, panchRes]) => {
        if (cancelled) return;
        setDistricts(toOptions(normalizeList(distRes), "unique_id", "name"));
        setCities(toRelatedOptions(normalizeList(cityRes), "unique_id", "name"));
        setZones(toRelatedOptions(normalizeList(zoneRes), "unique_id", "zone_name"));
        setPanchayats(toRelatedOptions(normalizeList(panchRes), "unique_id", "panchayat_name"));
      })
      .catch(() => {
        if (cancelled) return;
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      })
      .finally(() => { if (!cancelled) setFetchingMasters(false); });
    return () => { cancelled = true; };
  }, [t]);

  // ── Load scoped data when company + project change ────────────────────────
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setVehicles([]);
      setStaffTemplates([]);
      setStaffTemplateRecords([]);
      setDrivers([]);
      setSupervisors([]);
      return;
    }
    let cancelled = false;
    setFetchingScoped(true);
    const params = { company_id: companyUniqueId, project_id: projectId };
    Promise.all([
      adminApi.vehicleCreations.list({ params }),
      adminApi.staffTemplateCreation.list({ params }),
      adminApi.staffCreation.list({ params }),
    ])
      .then(([vehicleRes, templateRes, staffRes]) => {
        if (cancelled) return;
        const templateList = normalizeList<StaffTemplateRecord>(templateRes);
        const staffList = normalizeList(staffRes);

        setVehicles(toOptions(normalizeList(vehicleRes), "unique_id", "vehicle_no"));
        setStaffTemplateRecords(templateList);
        setStaffTemplates(
          templateList.map((t) => ({ value: String(t.unique_id), label: String(t.display_code ?? t.unique_id) }))
        );
        setDrivers(
          staffList
            .filter((s: any) => {
              const role = String(s.staffusertype_name ?? s.designation ?? "").toLowerCase().replace(/[_-]+/g, " ");
              return role === "driver" || role === "company driver" || role === "contractor driver";
            })
            .map((s: any) => ({
              value: String(s.unique_id ?? ""),
              label: String(s.employee_name ?? s.staff_name ?? s.unique_id ?? ""),
            }))
            .filter((o) => o.value)
        );
        setSupervisors(
          staffList
            .filter((s: any) => {
              const role = String(s.staffusertype_name ?? s.designation ?? "").toLowerCase().replace(/[_-]+/g, " ");
              return role === "supervisor" || role === "company supervisor" || role === "contractor supervisor";
            })
            .map((s: any) => ({
              value: String(s.unique_id ?? ""),
              label: String(s.employee_name ?? s.staff_name ?? s.unique_id ?? ""),
            }))
            .filter((o) => o.value)
        );
      })
      .catch(() => { if (!cancelled) Swal.fire(t("common.error"), t("common.load_failed"), "error"); })
      .finally(() => { if (!cancelled) setFetchingScoped(false); });
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId, t]);

  // ── Load record in edit mode ──────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    adminApi.routePlans.get(id)
      .then((res: any) => {
        if (cancelled) return;
        applyCompanyProjectFromRecord(res as Record<string, unknown>);
        setPendingRecord({
          district_id: extractId(res?.district_id),
          city_id: extractId(res?.city_id),
          zone_id: extractId(res?.zone_id) || "",
          panchayat_id: extractId(res?.panchayat_id) || "",
          vehicle_id: extractId(res?.vehicle_id),
          supervisor_id: extractId(res?.supervisor_id),
          staff_template_id: extractId(res?.staff_template_id),
          driver_id: extractId(res?.driver_id),
        });
        setLoadingRecord(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setLoadingRecord(false);
        Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? t("common.load_failed") });
      });
    return () => { cancelled = true; };
  }, [id, isEdit, applyCompanyProjectFromRecord, t]);

  // ── Flush pending record once all dropdowns are ready ────────────────────
  useEffect(() => {
    if (!pendingRecord || fetching) return;
    setForm(pendingRecord);
    setPendingRecord(null);
  }, [pendingRecord, fetching]);

  // ── Cascade-filtered options ──────────────────────────────────────────────
  const cityOptions = useMemo(
    () => cities.filter((c) => !form.district_id || !c.districtId || c.districtId === form.district_id),
    [cities, form.district_id]
  );

  const zoneOptions: SelectOption[] = useMemo(() => [
    NA_OPTION,
    ...zones.filter(
      (z) =>
        (!form.district_id || !z.districtId || z.districtId === form.district_id) &&
        (!form.city_id || !z.cityId || z.cityId === form.city_id)
    ),
  ], [zones, form.district_id, form.city_id]);

  const panchayatOptions: SelectOption[] = useMemo(() => [
    NA_OPTION,
    ...panchayats.filter(
      (p) =>
        (!form.district_id || !p.districtId || p.districtId === form.district_id) &&
        (!form.city_id || !p.cityId || p.cityId === form.city_id)
    ),
  ], [panchayats, form.district_id, form.city_id]);

  // Zone/Panchayat mutual exclusion
  const zoneDisabled = fetching || !form.city_id || (Boolean(form.panchayat_id) && form.panchayat_id !== NA_VALUE);
  const panchayatDisabled = fetching || !form.city_id || (Boolean(form.zone_id) && form.zone_id !== NA_VALUE);

  const handleZoneChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      zone_id: value,
      panchayat_id: value && value !== NA_VALUE ? "" : prev.panchayat_id,
    }));

  const handlePanchayatChange = (value: string) =>
    setForm((prev) => ({
      ...prev,
      panchayat_id: value,
      zone_id: value && value !== NA_VALUE ? "" : prev.zone_id,
    }));

  // Auto-fill driver from selected staff template
  const handleTemplateChange = (templateId: string) => {
    const record = staffTemplateRecords.find((r) => r.unique_id === templateId);
    const driverId = record ? extractId(record.driver_id) : "";
    setForm((prev) => ({ ...prev, staff_template_id: templateId, driver_id: driverId }));
  };

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const hasZoneOrPanchayat =
      (form.zone_id && form.zone_id !== NA_VALUE) ||
      (form.panchayat_id && form.panchayat_id !== NA_VALUE);

    if (
      !companyUniqueId || !projectId ||
      !form.district_id || !form.city_id || !hasZoneOrPanchayat ||
      !form.vehicle_id || !form.supervisor_id ||
      !form.staff_template_id || !form.driver_id
    ) {
      Swal.fire(t("common.error"), t("common.missing_fields"), "warning");
      return;
    }

    const payload = {
      company_id: companyUniqueId,
      project_id: projectId,
      district_id: form.district_id,
      city_id: form.city_id,
      zone_id: form.zone_id && form.zone_id !== NA_VALUE ? form.zone_id : null,
      panchayat_id: form.panchayat_id && form.panchayat_id !== NA_VALUE ? form.panchayat_id : null,
      vehicle_id: form.vehicle_id,
      supervisor_id: form.supervisor_id,
      staff_template_id: form.staff_template_id,
      driver_id: form.driver_id,
    };

    setSubmitting(true);
    try {
      if (isEdit && id) {
        await adminApi.routePlans.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await adminApi.routePlans.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? t("common.save_failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <ComponentCard
        title={isEdit ? t("common.edit_item", { item: t("admin.route_plan.title") }) : t("common.add_item", { item: t("admin.route_plan.title") })}
        desc={t("admin.route_plan.subtitle")}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Company */}
            <div>
              <Label>{t("admin.nav.company")}</Label>
              <select
                value={companyUniqueId}
                onChange={(e) => {
                  onCompanyChange(e.target.value);
                  setForm(EMPTY_FORM);
                }}
                disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId) || companies.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {loggedInCompanyUniqueId
                    ? t("common.company_from_profile")
                    : t("common.select_item_placeholder", { item: t("admin.nav.company") })}
                </option>
                {companies.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <Label>{t("admin.nav.project")}</Label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setForm(EMPTY_FORM);
                }}
                disabled={!companyUniqueId || projects.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {companyUniqueId
                    ? t("common.select_item_placeholder", { item: t("admin.nav.project") })
                    : "Select a company first"}
                </option>
                {projects.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <Label>{t("admin.route_plan.district") || "District"} <span className="text-red-500">*</span></Label>
              <Select
                value={form.district_id}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, district_id: value, city_id: "", zone_id: "", panchayat_id: "" }))
                }
                options={districts}
                placeholder={t("common.select_option")}
                disabled={fetching || !companyUniqueId || !projectId}
              />
            </div>

            {/* City */}
            <div>
              <Label>{t("common.city")} <span className="text-red-500">*</span></Label>
              <Select
                value={form.city_id}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, city_id: value, zone_id: "", panchayat_id: "" }))
                }
                options={cityOptions}
                placeholder={t("common.select_option")}
                disabled={fetching || !form.district_id}
              />
            </div>

            {/* Zone (mutual exclusive with panchayat) */}
            <div>
              <Label>{t("admin.route_plan.zone") || "Zone"}</Label>
              <Select
                value={form.zone_id}
                onChange={handleZoneChange}
                options={zoneOptions}
                placeholder={t("common.select_option")}
                disabled={zoneDisabled}
              />
            </div>

            {/* Panchayat (mutual exclusive with zone) */}
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
              <Label>{t("admin.trip_definition.staff_template") || "Staff Template"} <span className="text-red-500">*</span></Label>
              <Select
                value={form.staff_template_id}
                onChange={handleTemplateChange}
                options={staffTemplates}
                placeholder={t("common.select_option")}
                disabled={fetchingScoped || !projectId}
              />
            </div>

            {/* Driver (auto-filled from template) */}
            <div>
              <Label>{t("admin.staff_template.primary_driver") || "Driver"} <span className="text-red-500">*</span></Label>
              <Select
                value={form.driver_id}
                onChange={set("driver_id")}
                options={drivers}
                placeholder={t("common.select_option")}
                disabled={fetchingScoped || !projectId}
              />
            </div>

            {/* Vehicle */}
            <div>
              <Label>{t("admin.route_plan.vehicle") || "Vehicle"} <span className="text-red-500">*</span></Label>
              <Select
                value={form.vehicle_id}
                onChange={set("vehicle_id")}
                options={vehicles}
                placeholder={t("common.select_option")}
                disabled={fetchingScoped || !projectId}
              />
            </div>

            {/* Supervisor */}
            <div>
              <Label>{t("admin.route_plan.supervisor") || "Supervisor"} <span className="text-red-500">*</span></Label>
              <Select
                value={form.supervisor_id}
                onChange={set("supervisor_id")}
                options={supervisors}
                placeholder={t("common.select_option")}
                disabled={fetchingScoped || !projectId}
              />
            </div>

          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={submitting || loadingRecord || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
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
