import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import type { DailyTripAssignmentRecord } from "@/tanstack/admin";
import {
  useDailyTripAssignmentQuery,
  useCreateDailyTripAssignmentMutation,
  useUpdateDailyTripAssignmentMutation,
} from "@/tanstack/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectOption = { value: string; label: string };

type FormState = {
  trip_definition_id: string;
  staff_template_id: string;
  panchayat_id: string;
  collection_point_id: string;
  waste_type_id: string;
  trip_date: string;
  scheduled_time: string;
  status: string;
  approval_status: string;
  remarks: string;
};

// ─── Static options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: SelectOption[] = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const APPROVAL_OPTIONS: SelectOption[] = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildOptions = (items: any[], labelKey: string | string[]): SelectOption[] =>
  items
    .map((item) => {
      const keys = Array.isArray(labelKey) ? labelKey : [labelKey];
      const label = keys
        .map((key) => item?.[key])
        .find((value) => value !== undefined && value !== null && value !== "");
      const value = String(item?.unique_id ?? item?.id ?? "");

      return {
        value,
        label: String(label ?? item?.display_code ?? item?.name ?? value),
      };
    })
    .filter((o) => o.value);

const filterByCompanyProject = (items: any[], companyId: string, projectId: string) => {
  const hasContext = items.some((item) => item?.company_id || item?.company_unique_id);
  if (!hasContext) return items;
  return items.filter((item) => {
    const c = String(item?.company_id ?? item?.company_unique_id ?? "");
    const p = String(item?.project_id ?? item?.project_unique_id ?? "");
    return (!companyId || c === companyId) && (!projectId || p === projectId);
  });
};

const extractError = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

type DailyTripAssignmentRouteState = {
  record?: Partial<DailyTripAssignmentRecord>;
  companyUniqueId?: string | number | null;
  projectId?: string | number | null;
};

export default function DailyTripAssignmentForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as DailyTripAssignmentRouteState | null;
  const stateRecord = routeState?.record;
  const routeStateAppliedRef = useRef(false);
  const activeId = routeId ?? stateRecord?.unique_id ?? String(stateRecord?.id ?? "");
  const isEdit = Boolean(activeId);

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, loggedInCompanyUniqueId,
    setProjectId, onCompanyChange, applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  const { encTransportMaster, encDailyTripAssignment } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encDailyTripAssignment}`;

  // ── TanStack ──────────────────────────────────────────────────────────────
  const assignmentQuery = useDailyTripAssignmentQuery(activeId || undefined);
  const createMutation = useCreateDailyTripAssignmentMutation();
  const updateMutation = useUpdateDailyTripAssignmentMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Dropdown state ────────────────────────────────────────────────────────
  const [fetching, setFetching] = useState(false);
  const [tripDefinitions, setTripDefinitions] = useState<SelectOption[]>([]);
  const [staffTemplates, setStaffTemplates] = useState<SelectOption[]>([]);
  const [panchayats, setPanchayats] = useState<SelectOption[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<SelectOption[]>([]);
  const [wasteTypes, setWasteTypes] = useState<SelectOption[]>([]);
  const [altStaffCache, setAltStaffCache] = useState<any[]>([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<FormState>({
    trip_definition_id: "",
    staff_template_id: "",
    panchayat_id: "",
    collection_point_id: "",
    waste_type_id: "",
    trip_date: "",
    scheduled_time: "",
    status: "Scheduled",
    approval_status: "Pending",
    remarks: "",
  });

  // ── Fetch dropdowns when company/project selected ─────────────────────────
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setTripDefinitions([]);
      setStaffTemplates([]);
      setPanchayats([]);
      setCollectionPoints([]);
      setAltStaffCache([]);
      return;
    }

    setFetching(true);
    const params = { company_id: companyUniqueId, project_id: projectId };

    Promise.all([
      adminApi.tripDefinitions.list({ params }),
      adminApi.staffTemplateCreation.list({ params }),
      adminApi.panchayats.list({ params }),
      adminApi.collectionPoints.list({ params }),
      adminApi.wasteTypes.list({ params }),
      adminApi.alternativeStaffTemplate.list({ params }),
    ])
      .then(([tripRes, staffRes, panchRes, cpRes, wtRes, altRes]) => {
        setTripDefinitions(buildOptions(filterByCompanyProject(normalizeList(tripRes), companyUniqueId, projectId), "display_code"));
        setStaffTemplates(buildOptions(filterByCompanyProject(normalizeList(staffRes), companyUniqueId, projectId), "display_code"));
        setPanchayats(buildOptions(filterByCompanyProject(normalizeList(panchRes), companyUniqueId, projectId), "panchayat_name"));
        setCollectionPoints(buildOptions(filterByCompanyProject(normalizeList(cpRes), companyUniqueId, projectId), ["collection_point_name", "cp_name", "name"]));
        setWasteTypes(buildOptions(normalizeList(wtRes), ["waste_type_name", "name"]));
        setAltStaffCache(normalizeList(altRes));
      })
      .catch((err: any) => {
        Swal.fire(t("common.error"), extractError(err) ?? t("common.load_failed"), "error");
      })
      .finally(() => setFetching(false));
  }, [companyUniqueId, projectId, t]);

  // ── Auto-resolve effective staff ──────────────────────────────────────────
  const resolvedAltStaff = useMemo(() => {
    if (!formData.staff_template_id || !formData.trip_date) return null;
    return altStaffCache.find((alt) => {
      const templateId = String(alt?.staff_template?.unique_id ?? alt?.staff_template_id ?? "");
      return (
        templateId === formData.staff_template_id &&
        alt.from_date <= formData.trip_date &&
        formData.trip_date <= alt.to_date
      );
    }) ?? null;
  }, [formData.staff_template_id, formData.trip_date, altStaffCache]);

  const ensureOption = (options: SelectOption[], value: string, label?: string) => {
    if (!value) return options;
    if (options.some((option) => String(option.value) === value)) return options;
    return [...options, { value, label: label ?? value }];
  };

  const selectedTripDefinitionLabel =
    assignmentQuery.data?.trip_definition?.display_code ??
    stateRecord?.trip_definition?.display_code ??
    stateRecord?.trip_definition_id ??
    assignmentQuery.data?.trip_definition_id ?? "";

  const selectedStaffTemplateLabel =
    assignmentQuery.data?.staff_template?.display_code ??
    stateRecord?.staff_template?.display_code ??
    stateRecord?.staff_template_id ??
    assignmentQuery.data?.staff_template_id ?? "";

  const selectedPanchayatLabel =
    assignmentQuery.data?.panchayat?.panchayat_name ??
    assignmentQuery.data?.panchayat?.name ??
    stateRecord?.panchayat?.panchayat_name ??
    stateRecord?.panchayat?.name ??
    stateRecord?.panchayat_id ??
    assignmentQuery.data?.panchayat_id ?? "";

  const selectedCollectionPointLabel =
    (assignmentQuery.data?.collection_point as any)?.cp_name ??
    (assignmentQuery.data?.collection_point as any)?.collection_point_name ??
    assignmentQuery.data?.collection_point?.name ??
    stateRecord?.collection_point?.cp_name ??
    stateRecord?.collection_point?.collection_point_name ??
    stateRecord?.collection_point?.name ??
    stateRecord?.collection_point_id ??
    assignmentQuery.data?.collection_point_id ?? "";

  const selectedWasteTypeLabel =
    (assignmentQuery.data?.waste_type as any)?.waste_type_name ??
    (assignmentQuery.data?.waste_type as any)?.name ??
    stateRecord?.waste_type?.waste_type_name ??
    stateRecord?.waste_type?.name ??
    stateRecord?.waste_type_id ??
    assignmentQuery.data?.waste_type_id ?? "";

  const resolvedTripDefinitions = useMemo(
    () => ensureOption(tripDefinitions, formData.trip_definition_id, selectedTripDefinitionLabel),
    [tripDefinitions, formData.trip_definition_id, selectedTripDefinitionLabel]
  );

  const resolvedStaffTemplates = useMemo(
    () => ensureOption(staffTemplates, formData.staff_template_id, selectedStaffTemplateLabel),
    [staffTemplates, formData.staff_template_id, selectedStaffTemplateLabel]
  );

  const resolvedPanchayats = useMemo(
    () => ensureOption(panchayats, formData.panchayat_id, selectedPanchayatLabel),
    [panchayats, formData.panchayat_id, selectedPanchayatLabel]
  );

  const resolvedCollectionPoints = useMemo(
    () => ensureOption(collectionPoints, formData.collection_point_id, selectedCollectionPointLabel),
    [collectionPoints, formData.collection_point_id, selectedCollectionPointLabel]
  );

  const resolvedWasteTypes = useMemo(
    () => ensureOption(wasteTypes, formData.waste_type_id, selectedWasteTypeLabel),
    [wasteTypes, formData.waste_type_id, selectedWasteTypeLabel]
  );

  // ── Populate from router state ────────────────────────────────────────────
  useEffect(() => {
    if (!routeState || routeStateAppliedRef.current) return;

    const routeCompanyId = String(routeState.companyUniqueId ?? "").trim();
    const routeProjectId = String(routeState.projectId ?? "").trim();
    let applied = false;

    if (routeCompanyId && routeCompanyId !== companyUniqueId) {
      onCompanyChange(routeCompanyId);
      applied = true;
    }

    if (routeProjectId && routeProjectId !== projectId) {
      setProjectId(routeProjectId);
      applied = true;
    }

    if (stateRecord && !assignmentQuery.data) {
      applyCompanyProjectFromRecord(stateRecord as Record<string, unknown>);
      setFormData({
        trip_definition_id: stateRecord.trip_definition?.unique_id ?? stateRecord.trip_definition_id ?? "",
        staff_template_id: stateRecord.staff_template?.unique_id ?? stateRecord.staff_template_id ?? "",
        panchayat_id: stateRecord.panchayat?.unique_id ?? stateRecord.panchayat_id ?? "",
        collection_point_id: stateRecord.collection_point?.unique_id ?? stateRecord.collection_point_id ?? "",
        waste_type_id: stateRecord.waste_type?.unique_id ?? stateRecord.waste_type_id ?? "",
        trip_date: stateRecord.trip_date ?? "",
        scheduled_time: stateRecord.scheduled_time ?? "",
        status: stateRecord.status ?? "Scheduled",
        approval_status: stateRecord.approval_status ?? "Pending",
        remarks: stateRecord.remarks ?? "",
      });
      applied = true;
    }

    if (applied) {
      routeStateAppliedRef.current = true;
    }
  }, [assignmentQuery.data, companyUniqueId, projectId, routeState, onCompanyChange, setProjectId, applyCompanyProjectFromRecord, stateRecord]);

  // ── Populate from TanStack query ──────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !assignmentQuery.data) return;
    const res = assignmentQuery.data;
    applyCompanyProjectFromRecord(res as unknown as Record<string, unknown>);
    setFormData({
      trip_definition_id: res.trip_definition?.unique_id ?? res.trip_definition_id ?? "",
      staff_template_id: res.staff_template?.unique_id ?? res.staff_template_id ?? "",
      panchayat_id: res.panchayat?.unique_id ?? res.panchayat_id ?? "",
      collection_point_id: res.collection_point?.unique_id ?? res.collection_point_id ?? "",
      waste_type_id: res.waste_type?.unique_id ?? res.waste_type_id ?? "",
      trip_date: res.trip_date ?? "",
      scheduled_time: res.scheduled_time ?? "",
      status: res.status ?? "Scheduled",
      approval_status: res.approval_status ?? "Pending",
      remarks: String(res.remarks ?? ""),
    });
  }, [applyCompanyProjectFromRecord, isEdit, assignmentQuery.data]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!companyUniqueId || !projectId ||
        !formData.trip_definition_id || !formData.staff_template_id ||
        !formData.panchayat_id || !formData.collection_point_id ||
        !formData.waste_type_id || !formData.trip_date || !formData.scheduled_time) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    const payload = {
      company_id_input: companyUniqueId,
      project_id_input: projectId,
      trip_definition_id: formData.trip_definition_id,
      staff_template_id: formData.staff_template_id,
      panchayat_id: formData.panchayat_id,
      collection_point_id: formData.collection_point_id,
      waste_type_id: formData.waste_type_id,
      trip_date: formData.trip_date,
      scheduled_time: formData.scheduled_time,
      status: formData.status,
      approval_status: formData.approval_status,
      remarks: formData.remarks || undefined,
    };

    try {
      if (isEdit && activeId) {
        await updateMutation.mutateAsync({ id: activeId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      Swal.fire(t("common.success"), isEdit ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(ENC_LIST_PATH);
    } catch (err: any) {
      Swal.fire(t("common.save_failed"), extractError(err) ?? t("common.save_failed_desc"), "error");
    }
  };

  const set = (field: keyof FormState) => (value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <ComponentCard
        title={isEdit ? "Edit Trip Assignment" : "New Trip Assignment"}
        desc="Schedule a daily trip with vehicle, staff, route, and waste collection details"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Company */}
            <div>
              <Label>{t("admin.nav.company")}</Label>
              <select
                value={companyUniqueId}
                onChange={(e) => onCompanyChange(e.target.value)}
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
                onChange={(e) => setProjectId(e.target.value)}
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

            {/* Trip Date */}
            <div>
              <Label>Trip Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.trip_date}
                onChange={(e) => set("trip_date")(e.target.value)}
                disabled={!projectId}
                required
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <Label>Scheduled Time <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => set("scheduled_time")(e.target.value)}
                disabled={!projectId}
                required
              />
            </div>

            {/* Trip Definition */}
            <div>
              <Label>Trip Definition <span className="text-red-500">*</span></Label>
              <Select
                value={formData.trip_definition_id}
                onChange={set("trip_definition_id")}
                options={resolvedTripDefinitions}
                placeholder="Select trip definition"
                disabled={fetching || !projectId}
              />
            </div>

            {/* Staff Template */}
            <div>
              <Label>Staff Template <span className="text-red-500">*</span></Label>
              <Select
                value={formData.staff_template_id}
                onChange={set("staff_template_id")}
                options={resolvedStaffTemplates}
                placeholder="Select staff template"
                disabled={fetching || !projectId}
              />
            </div>

            {/* Effective Staff Banner */}
            {formData.staff_template_id && formData.trip_date && (
              <div className="md:col-span-2">
                <div className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${
                  resolvedAltStaff
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-green-300 bg-green-50 text-green-800"
                }`}>
                  {resolvedAltStaff
                    ? `🔄 Alt staff active: ${resolvedAltStaff.display_code ?? resolvedAltStaff.unique_id}`
                    : `✅ Base staff template: ${staffTemplates.find((s) => s.value === formData.staff_template_id)?.label ?? ""}`}
                </div>
              </div>
            )}

            {/* Panchayat */}
            <div>
              <Label>Panchayat <span className="text-red-500">*</span></Label>
              <Select
                value={formData.panchayat_id}
                onChange={set("panchayat_id")}
                options={resolvedPanchayats}
                placeholder="Select panchayat"
                disabled={fetching || !projectId}
              />
            </div>

            {/* Collection Point */}
            <div>
              <Label>Collection Point <span className="text-red-500">*</span></Label>
              <Select
                value={formData.collection_point_id}
                onChange={set("collection_point_id")}
                options={resolvedCollectionPoints}
                placeholder="Select collection point"
                disabled={fetching || !projectId}
              />
            </div>

            {/* Waste Type */}
            <div>
              <Label>Waste Type <span className="text-red-500">*</span></Label>
              <Select
                value={formData.waste_type_id}
                onChange={set("waste_type_id")}
                options={resolvedWasteTypes}
                placeholder="Select waste type"
                disabled={fetching}
              />
            </div>

            {/* Status — edit mode only */}
            {isEdit && (
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onChange={set("status")}
                  options={STATUS_OPTIONS}
                  placeholder="Select status"
                />
              </div>
            )}

            {/* Approval Status — edit mode only */}
            {isEdit && (
              <div>
                <Label>Approval Status</Label>
                <Select
                  value={formData.approval_status}
                  onChange={set("approval_status")}
                  options={APPROVAL_OPTIONS}
                  placeholder="Select approval status"
                />
              </div>
            )}

            {/* Remarks */}
            <div className="md:col-span-2">
              <Label>Remarks</Label>
              <textarea
                value={formData.remarks}
                onChange={(e) => set("remarks")(e.target.value)}
                rows={3}
                placeholder="Optional remarks..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting || fetching}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
            <button
              type="button"
              onClick={() => navigate(ENC_LIST_PATH)}
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