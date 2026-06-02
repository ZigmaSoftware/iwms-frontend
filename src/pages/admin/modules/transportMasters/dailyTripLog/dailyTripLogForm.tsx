/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/helpers/admin/registry";
import { dailyTripLogApi, dailyTripAssignmentApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";
import { api } from "@/api";

type SelectOption = { value: string; label: string };

type StaffRef = { unique_id?: string; staff_unique_id?: string; employee_name?: string };
type NamedRef = { unique_id?: string; name?: string; [key: string]: unknown };

type DailyTripLogRecord = {
  unique_id: string;
  trip_assignment_id?: string;
  trip_assignment?: NamedRef & { display_code?: string; status?: string };
  company_id?: string | null;
  company_unique_id?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  trip_date?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  driver?: StaffRef;
  operator?: StaffRef;
  extra_operator_ids?: string[];
  extra_operators?: StaffRef[];
  collected_weight_kg?: string | number;
  vehicle?: NamedRef & { vehicle_no?: string };
  bin_ids?: string[];
  bins?: (NamedRef & { bin_name?: string })[];
  remarks?: string | null;
  log_status?: string;
  verified_by_name?: string | null;
  verified_at?: string | null;
  collection_point?: NamedRef & { cp_name?: string };
  collection_point_id?: string;
  [key: string]: unknown;
};

type DailyTripAssignmentRecord = {
  unique_id: string;
  status?: string;
  trip_date?: string;
  collection_point?: NamedRef & { cp_name?: string };
  collection_point_id?: string;
  trip_plan?: { unique_id?: string; display_code?: string };
  effective_staff?: { driver?: string; operator?: string };
  [key: string]: unknown;
};

type FormState = {
  trip_assignment_id: string;
  actual_start_time: string;
  actual_end_time: string;
  collected_weight_kg: string;
  bin_ids: string[];
  extra_operator_ids: string[];
  remarks: string;
  log_status: string;
};

const LOG_STATUS_OPTIONS: SelectOption[] = [
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
];

const toOptions = (items: any[], labelKeys: string | string[]): SelectOption[] =>
  items
    .map((item) => {
      const keys = Array.isArray(labelKeys) ? labelKeys : [labelKeys];
      const label = keys.map((key) => item?.[key]).find(Boolean);
      const value = String(item?.unique_id ?? item?.staff_unique_id ?? item?.id ?? "");
      return { value, label: String(label ?? item?.display_code ?? value) };
    })
    .filter((option) => option.value);

const ensureOption = (options: SelectOption[], value: string, label?: string) => {
  if (!value || options.some((o) => o.value === value)) return options;
  return [...options, { value, label: label || value }];
};

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

export default function DailyTripLogForm() {
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

  const { encScheduleMasters, encDailyTripLog } = getEncryptedRoute();
  const LIST_PATH = `/${encScheduleMasters}/${encDailyTripLog}`;

  /* ── form state ── */
  const [formData, setFormData] = useState<FormState>({
    trip_assignment_id: "",
    actual_start_time: "",
    actual_end_time: "",
    collected_weight_kg: "",
    bin_ids: [],
    extra_operator_ids: [],
    remarks: "",
    log_status: "Draft",
  });

  /* ── dropdown options ── */
  const [assignments, setAssignments] = useState<DailyTripAssignmentRecord[]>([]);
  const [bins, setBins] = useState<SelectOption[]>([]);
  const [staff, setStaff] = useState<SelectOption[]>([]);

  /* ── record for edit/readonly info ── */
  const [recordData, setRecordData] = useState<DailyTripLogRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);

  const readonly = recordData?.log_status === "Verified";

  /* ── load record in edit mode ── */
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoadingRecord(true);
    (dailyTripLogApi.get(id) as Promise<DailyTripLogRecord>)
      .then((res) => {
        if (cancelled) return;
        setRecordData(res);
        applyCompanyProjectFromRecord(res as unknown as Record<string, unknown>);
        setFormData({
          trip_assignment_id: (res.trip_assignment as any)?.unique_id ?? res.trip_assignment_id ?? "",
          actual_start_time: res.actual_start_time ?? "",
          actual_end_time: res.actual_end_time ?? "",
          collected_weight_kg: res.collected_weight_kg ? String(res.collected_weight_kg) : "",
          bin_ids: res.bins?.map((b) => String(b.unique_id ?? "")) ?? res.bin_ids ?? [],
          extra_operator_ids: res.extra_operators?.map((op) => String(op.staff_unique_id ?? op.unique_id ?? "")) ?? res.extra_operator_ids ?? [],
          remarks: res.remarks ?? "",
          log_status: res.log_status ?? "Draft",
        });
        setLoadingRecord(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadingRecord(false);
        Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? "Failed to load record" });
      });
    return () => { cancelled = true; };
  }, [id, isEdit, applyCompanyProjectFromRecord, t]);

  /* ── load assignments, bins, staff when company+project are set ── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setAssignments([]);
      setBins([]);
      setStaff([]);
      return;
    }
    let cancelled = false;
    setFetching(true);
    const params = { company_id: companyUniqueId, project_id: projectId };
    Promise.all([
      (dailyTripAssignmentApi.list({ params }) as Promise<DailyTripAssignmentRecord[]>).catch(() => []),
      adminApi.bins.list({ params }).catch(() => []),
      adminApi.staffCreation.list({ params }).catch(() => []),
    ])
      .then(([assignRes, binRes, staffRes]) => {
        if (cancelled) return;
        setAssignments(normalizeList<DailyTripAssignmentRecord>(assignRes));
        setBins(toOptions(normalizeList(binRes), ["bin_name", "name"]));
        setStaff(toOptions(normalizeList(staffRes), ["employee_name", "name"]));
      })
      .catch((err) => Swal.fire(t("common.error"), extractError(err) ?? t("common.load_failed"), "error"))
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId, t]);

  /* ── derived: assignment options ── */
  const assignmentOptions: SelectOption[] = assignments
    .filter((a) => a.status !== "Cancelled")
    .map((a) => ({
      value: a.unique_id,
      label: `${a.unique_id} - ${a.collection_point?.cp_name ?? a.collection_point_id ?? ""}`,
    }));

  const resolvedAssignmentOptions = ensureOption(
    assignmentOptions,
    formData.trip_assignment_id,
    (recordData?.trip_assignment as any)?.display_code ??
      (recordData?.trip_assignment as any)?.unique_id ??
      recordData?.trip_assignment_id
  );

  const resolvedBins = (recordData?.bins ?? []).reduce(
    (acc, b) => ensureOption(acc, String(b.unique_id ?? ""), String((b as any).bin_name ?? b.unique_id ?? "")),
    bins
  );

  const resolvedStaff = (recordData?.extra_operators ?? []).reduce(
    (acc, op) => ensureOption(acc, String(op.staff_unique_id ?? op.unique_id ?? ""), String(op.employee_name ?? op.staff_unique_id ?? op.unique_id ?? "")),
    staff
  );

  const selectedAssignment = assignments.find((a) => a.unique_id === formData.trip_assignment_id);

  const set = (field: keyof FormState) => (value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const setMulti = (field: "bin_ids" | "extra_operator_ids") =>
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      setFormData((prev) => ({
        ...prev,
        [field]: Array.from(e.target.selectedOptions).map((o) => o.value),
      }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyUniqueId || !projectId || !formData.trip_assignment_id || !formData.collected_weight_kg) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }
    if (Number(formData.collected_weight_kg) <= 0) {
      Swal.fire(t("common.warning"), "Weight must be greater than 0.", "warning");
      return;
    }
    if (formData.actual_start_time && formData.actual_end_time && formData.actual_end_time <= formData.actual_start_time) {
      Swal.fire(t("common.warning"), "End time must be after start time.", "warning");
      return;
    }

    const payload = {
      company_id_input: companyUniqueId,
      project_id_input: projectId,
      trip_assignment_id: formData.trip_assignment_id,
      actual_start_time: formData.actual_start_time || null,
      actual_end_time: formData.actual_end_time || null,
      collected_weight_kg: Number(formData.collected_weight_kg),
      bin_ids: formData.bin_ids,
      extra_operator_ids: formData.extra_operator_ids,
      remarks: formData.remarks || undefined,
      log_status: formData.log_status,
    };

    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        await dailyTripLogApi.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await dailyTripLogApi.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: any) {
      Swal.fire(t("common.save_failed"), extractError(err) ?? t("common.save_failed_desc"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard
        title={readonly ? "View Daily Trip Log" : isEdit ? "Edit Daily Trip Log" : "New Daily Trip Log"}
        desc="Record actual trip collection details and submit for verification"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Company */}
            <div>
              <Label>{t("admin.nav.company")}</Label>
              <select
                value={companyUniqueId}
                onChange={(e) => onCompanyChange(e.target.value)}
                disabled={readonly || Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId) || companies.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{t("common.select_item_placeholder", { item: t("admin.nav.company") })}</option>
                {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Project */}
            <div>
              <Label>{t("admin.nav.project")}</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={readonly || !companyUniqueId || projects.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">{companyUniqueId ? t("common.select_item_placeholder", { item: t("admin.nav.project") }) : "Select a company first"}</option>
                {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {/* Trip Assignment */}
            <div>
              <Label>Trip Assignment <span className="text-red-500">*</span></Label>
              <Select
                value={formData.trip_assignment_id}
                onChange={set("trip_assignment_id")}
                options={resolvedAssignmentOptions}
                placeholder="Select trip assignment"
                disabled={readonly || fetching || !projectId || (isEdit && Boolean(formData.trip_assignment_id))}
              />
            </div>

            {/* Status */}
            <div>
              <Label>Status</Label>
              <Select
                value={formData.log_status}
                onChange={set("log_status")}
                options={LOG_STATUS_OPTIONS}
                placeholder="Select status"
                disabled={readonly}
              />
            </div>

            {/* Actual Start Time */}
            <div>
              <Label>Actual Start Time</Label>
              <Input
                type="time"
                value={formData.actual_start_time}
                onChange={(e) => set("actual_start_time")(e.target.value)}
                disabled={readonly}
              />
            </div>

            {/* Actual End Time */}
            <div>
              <Label>Actual End Time</Label>
              <Input
                type="time"
                value={formData.actual_end_time}
                onChange={(e) => set("actual_end_time")(e.target.value)}
                disabled={readonly}
              />
            </div>

            {/* Collected Weight */}
            <div>
              <Label>Collected Weight (kg) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={formData.collected_weight_kg}
                onChange={(e) => set("collected_weight_kg")(e.target.value)}
                disabled={readonly}
              />
            </div>

            {/* Bins */}
            <div>
              <Label>Bins</Label>
              <select
                multiple
                value={formData.bin_ids}
                onChange={setMulti("bin_ids")}
                disabled={readonly || fetching}
                className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                {resolvedBins.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Extra Operators */}
            <div>
              <Label>Extra Operators</Label>
              <select
                multiple
                value={formData.extra_operator_ids}
                onChange={setMulti("extra_operator_ids")}
                disabled={readonly || fetching}
                className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                {resolvedStaff.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Auto-filled assignment info */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="font-semibold text-gray-700">Auto-filled Assignment Data</div>
              <div className="mt-2 space-y-1 text-gray-600">
                <div>Trip Date: {selectedAssignment?.trip_date ?? recordData?.trip_date ?? "-"}</div>
                <div>Assignment: {
                  selectedAssignment?.unique_id ??
                  (recordData?.trip_assignment as any)?.display_code ??
                  (recordData?.trip_assignment as any)?.unique_id ??
                  formData.trip_assignment_id ??
                  "-"
                }</div>
                <div>Vehicle: {recordData?.vehicle?.vehicle_no ?? selectedAssignment?.trip_plan?.display_code ?? "-"}</div>
                <div>Driver: {recordData?.driver?.employee_name ?? selectedAssignment?.effective_staff?.driver ?? "-"}</div>
                <div>Operator: {recordData?.operator?.employee_name ?? selectedAssignment?.effective_staff?.operator ?? "-"}</div>
              </div>
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <Label>Remarks</Label>
              <textarea
                value={formData.remarks}
                onChange={(e) => set("remarks")(e.target.value)}
                rows={3}
                disabled={readonly}
                placeholder="Optional remarks..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              {readonly && recordData?.verified_at && (
                <p className="mt-1 text-xs text-green-700">
                  Verified by {recordData.verified_by_name ?? "-"} at {new Date(recordData.verified_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {!readonly && (
              <button
                type="submit"
                disabled={isSubmitting || loadingRecord || fetching}
                className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSubmitting ? t("common.saving") : formData.log_status === "Draft" ? "Save Draft" : "Submit"}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {readonly ? t("common.back") : t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
