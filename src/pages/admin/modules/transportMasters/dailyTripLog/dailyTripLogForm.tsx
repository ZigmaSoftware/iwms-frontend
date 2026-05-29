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
import {
  useDailyTripLogQuery,
  useCreateDailyTripLogMutation,
  useUpdateDailyTripLogMutation,
  useDailyTripAssignmentsQuery,
  type DailyTripLogRecord,
  type DailyTripAssignmentRecord,
} from "@/tanstack/admin";

type SelectOption = { value: string; label: string };

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

type DailyTripLogRouteState = {
  record?: Partial<DailyTripLogRecord>;
  companyUniqueId?: string | number | null;
  projectId?: string | number | null;
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

const ensureOption = (options: SelectOption[], value: string, label?: string) => {
  if (!value || options.some((option) => option.value === value)) return options;
  return [...options, { value, label: label || value }];
};

export default function DailyTripLogForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as DailyTripLogRouteState | null;
  const stateRecord = routeState?.record;
  const activeId = routeId ?? stateRecord?.unique_id ?? "";
  const isEdit = Boolean(activeId);
  const routeStateAppliedRef = useRef(false);

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, loggedInCompanyUniqueId,
    setProjectId, onCompanyChange, applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({ isEdit });

  const { encTransportMaster, encDailyTripLog } = getEncryptedRoute();
  const ENC_LIST_PATH = `/${encTransportMaster}/${encDailyTripLog}`;

  const logQuery = useDailyTripLogQuery(activeId || undefined);
  const assignmentsQuery = useDailyTripAssignmentsQuery(
    companyUniqueId ? { company_id: companyUniqueId, project_id: projectId || undefined } : null
  );
  const createMutation = useCreateDailyTripLogMutation();
  const updateMutation = useUpdateDailyTripLogMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [fetching, setFetching] = useState(false);
  const [bins, setBins] = useState<SelectOption[]>([]);
  const [staff, setStaff] = useState<SelectOption[]>([]);
  const [draftId, setDraftId] = useState<string>("");
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

  const currentId = activeId || draftId;
  const currentRecord = logQuery.data ?? stateRecord;
  const readonly = currentRecord?.log_status === "Verified";

  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setBins([]);
      setStaff([]);
      return;
    }
    setFetching(true);
    const params = { company_id: companyUniqueId, project_id: projectId };
    Promise.all([
      adminApi.bins.list({ params }),
      adminApi.staffCreation.list({ params }),
    ])
      .then(([binRes, staffRes]) => {
        setBins(toOptions(normalizeList(binRes), ["bin_name", "name"]));
        setStaff(toOptions(normalizeList(staffRes), ["employee_name", "name"]));
      })
      .catch((err: any) => Swal.fire(t("common.error"), extractError(err) ?? t("common.load_failed"), "error"))
      .finally(() => setFetching(false));
  }, [companyUniqueId, projectId, t]);

  useEffect(() => {
    if (!routeState || routeStateAppliedRef.current) return;
    const routeCompanyId = String(routeState.companyUniqueId ?? "").trim();
    const routeProjectId = String(routeState.projectId ?? "").trim();
    if (routeCompanyId) onCompanyChange(routeCompanyId);
    if (routeProjectId) setProjectId(routeProjectId);
    if (stateRecord && !logQuery.data) {
      applyCompanyProjectFromRecord(stateRecord as Record<string, unknown>);
      setFormData({
        trip_assignment_id: stateRecord.trip_assignment?.unique_id ?? stateRecord.trip_assignment_id ?? "",
        actual_start_time: stateRecord.actual_start_time ?? "",
        actual_end_time: stateRecord.actual_end_time ?? "",
        collected_weight_kg: stateRecord.collected_weight_kg ? String(stateRecord.collected_weight_kg) : "",
        bin_ids: stateRecord.bins?.map((bin) => String(bin.unique_id)) ?? stateRecord.bin_ids ?? [],
        extra_operator_ids: stateRecord.extra_operators?.map((op) => String(op.staff_unique_id ?? op.unique_id)) ?? stateRecord.extra_operator_ids ?? [],
        remarks: stateRecord.remarks ?? "",
        log_status: stateRecord.log_status ?? "Draft",
      });
    }
    routeStateAppliedRef.current = true;
  }, [applyCompanyProjectFromRecord, logQuery.data, onCompanyChange, routeState, setProjectId, stateRecord]);

  useEffect(() => {
    if (!isEdit || !logQuery.data) return;
    const res = logQuery.data;
    applyCompanyProjectFromRecord(res as unknown as Record<string, unknown>);
    setFormData({
      trip_assignment_id: res.trip_assignment?.unique_id ?? res.trip_assignment_id ?? "",
      actual_start_time: res.actual_start_time ?? "",
      actual_end_time: res.actual_end_time ?? "",
      collected_weight_kg: res.collected_weight_kg ? String(res.collected_weight_kg) : "",
      bin_ids: res.bins?.map((bin) => String(bin.unique_id)) ?? res.bin_ids ?? [],
      extra_operator_ids: res.extra_operators?.map((op) => String(op.staff_unique_id ?? op.unique_id)) ?? res.extra_operator_ids ?? [],
      remarks: res.remarks ?? "",
      log_status: res.log_status ?? "Draft",
    });
  }, [applyCompanyProjectFromRecord, isEdit, logQuery.data]);

  const assignmentOptions = useMemo(() => {
    const list = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];
    return list
      .filter((assignment) => assignment.status !== "Cancelled")
      .map((assignment: DailyTripAssignmentRecord) => ({
        value: assignment.unique_id,
        label: `${assignment.unique_id} - ${assignment.collection_point?.cp_name ?? assignment.collection_point_id ?? ""}`,
      }));
  }, [assignmentsQuery.data]);

  const selectedAssignment = useMemo(() => {
    const list = Array.isArray(assignmentsQuery.data) ? assignmentsQuery.data : [];
    return list.find((assignment) => assignment.unique_id === formData.trip_assignment_id);
  }, [assignmentsQuery.data, formData.trip_assignment_id]);

  const resolvedAssignmentOptions = useMemo(
    () => ensureOption(
      assignmentOptions,
      formData.trip_assignment_id,
      currentRecord?.trip_assignment?.display_code ?? currentRecord?.trip_assignment?.unique_id ?? currentRecord?.trip_assignment_id
    ),
    [assignmentOptions, currentRecord, formData.trip_assignment_id]
  );

  const resolvedBins = useMemo(() => {
    const saved = currentRecord?.bins ?? [];
    return saved.reduce(
      (acc, bin) => ensureOption(acc, String(bin.unique_id ?? ""), String(bin.bin_name ?? bin.unique_id ?? "")),
      bins
    );
  }, [bins, currentRecord?.bins]);

  const resolvedStaff = useMemo(() => {
    const saved = currentRecord?.extra_operators ?? [];
    return saved.reduce(
      (acc, op) => ensureOption(acc, String(op.staff_unique_id ?? op.unique_id ?? ""), String(op.employee_name ?? op.staff_unique_id ?? op.unique_id ?? "")),
      staff
    );
  }, [staff, currentRecord?.extra_operators]);

  const assignmentLabel =
    selectedAssignment?.unique_id ??
    currentRecord?.trip_assignment?.display_code ??
    currentRecord?.trip_assignment?.unique_id ??
    formData.trip_assignment_id ??
    "-";
  const vehicle = currentRecord?.vehicle;
  const driver = currentRecord?.driver;
  const operator = currentRecord?.operator;

  const buildPayload = (statusOverride?: string) => ({
    company_id_input: companyUniqueId,
    project_id_input: projectId,
    trip_assignment_id: formData.trip_assignment_id,
    actual_start_time: formData.actual_start_time || null,
    actual_end_time: formData.actual_end_time || null,
    collected_weight_kg: Number(formData.collected_weight_kg),
    bin_ids: formData.bin_ids,
    extra_operator_ids: formData.extra_operator_ids,
    remarks: formData.remarks || undefined,
    log_status: statusOverride ?? formData.log_status,
  });


  const set = (field: keyof FormState) => (value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const setMulti = (field: "bin_ids" | "extra_operator_ids") => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: Array.from(e.target.selectedOptions).map((option) => option.value) }));

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

    try {
      const payload = buildPayload();
      if (currentId) {
        await updateMutation.mutateAsync({ id: currentId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      Swal.fire(t("common.success"), isEdit || draftId ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(ENC_LIST_PATH);
    } catch (err: any) {
      Swal.fire(t("common.save_failed"), extractError(err) ?? t("common.save_failed_desc"), "error");
    }
  };

  return (
    <div className="p-3">
      <ComponentCard
        title={readonly ? "View Daily Trip Log" : isEdit || draftId ? "Edit Daily Trip Log" : "New Daily Trip Log"}
        desc="Record actual trip collection details and submit for verification"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
            <div>
              <Label>Trip Assignment <span className="text-red-500">*</span></Label>
              <Select value={formData.trip_assignment_id} onChange={set("trip_assignment_id")} options={resolvedAssignmentOptions} placeholder="Select trip assignment" disabled={readonly || fetching || !projectId || Boolean(currentId)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.log_status} onChange={set("log_status")} options={LOG_STATUS_OPTIONS} placeholder="Select status" disabled={readonly} />
            </div>
            <div>
              <Label>Actual Start Time</Label>
              <Input type="time" value={formData.actual_start_time} onChange={(e) => set("actual_start_time")(e.target.value)} disabled={readonly} />
            </div>
            <div>
              <Label>Actual End Time</Label>
              <Input type="time" value={formData.actual_end_time} onChange={(e) => set("actual_end_time")(e.target.value)} disabled={readonly} />
            </div>
            <div>
              <Label>Collected Weight (kg) <span className="text-red-500">*</span></Label>
              <Input type="number" min={0.01} step="0.01" value={formData.collected_weight_kg} onChange={(e) => set("collected_weight_kg")(e.target.value)} disabled={readonly} />
            </div>
            <div>
              <Label>Bins</Label>
              <select multiple value={formData.bin_ids} onChange={setMulti("bin_ids")} disabled={readonly || fetching} className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">
                {resolvedBins.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Extra Operators</Label>
              <select multiple value={formData.extra_operator_ids} onChange={setMulti("extra_operator_ids")} disabled={readonly || fetching} className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">
                {resolvedStaff.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="font-semibold text-gray-700">Auto-filled Assignment Data</div>
              <div className="mt-2 space-y-1 text-gray-600">
                <div>Trip Date: {selectedAssignment?.trip_date ?? currentRecord?.trip_date ?? "-"}</div>
                <div>Assignment: {assignmentLabel}</div>
                <div>Vehicle: {vehicle?.vehicle_no ?? selectedAssignment?.trip_definition?.display_code ?? "-"}</div>
                <div>Driver: {driver?.employee_name ?? selectedAssignment?.effective_staff?.driver ?? "-"}</div>
                <div>Operator: {operator?.employee_name ?? selectedAssignment?.effective_staff?.operator ?? "-"}</div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Remarks</Label>
              <textarea value={formData.remarks} onChange={(e) => set("remarks")(e.target.value)} rows={3} disabled={readonly} placeholder="Optional remarks..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
{readonly && currentRecord?.verified_at && <p className="mt-1 text-xs text-green-700">Verified by {currentRecord.verified_by_name ?? "-"} at {new Date(currentRecord.verified_at).toLocaleString()}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            {!readonly && (
              <button type="submit" disabled={isSubmitting || fetching} className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {isSubmitting ? t("common.saving") : formData.log_status === "Draft" ? "Save Draft" : "Submit"}
              </button>
            )}
            <button type="button" onClick={() => navigate(ENC_LIST_PATH)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600">
              {readonly ? t("common.back") : t("common.cancel")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
