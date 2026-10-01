import { DELAY_REASON_LABELS } from "./types";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import { tripDelayReportApi, dailyTripAssignmentApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { normalizeList } from "@/utils/forms";
import { AutoDetectLocationButton } from "@/components/common/AutoDetectLocationButton";
import { tripDelayReportSchema } from "@/schemas/core_modules/dailyOperations/tripDelayReport.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

/**
 * Admin/supervisor counterpart of the driver app's "Report delay" action —
 * log a hold-up (puncture, traffic, queue at the plant…) against one of
 * today's open trips. Create only: a delay is an append-only log entry, and
 * the list page handles Acknowledge / Resolve. Reporter, delay time and
 * company/project are stamped server-side (TripDelayReportSerializer).
 */

type SelectOption = { value: string; label: string };

const extractError = (error: any): string => {
  const data = error?.response?.data;
  if (!data) return "An unexpected error occurred.";
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return "An unexpected error occurred.";
};

const REASON_OPTIONS: SelectOption[] = Object.entries(DELAY_REASON_LABELS).map(
  ([v, l]) => ({ value: v, label: l }),
);

// A delay only makes sense on a trip that is still running (or about to).
const CLOSED_TRIP_STATUSES = new Set(["Completed", "Cancelled"]);

interface FormState {
  trip_assignment_id: string;
  delay_reason: string;
  estimated_delay_minutes: string;
  delay_lat: string;
  delay_lng: string;
  delay_location: string;
  delay_remarks: string;
}

const EMPTY_FORM: FormState = {
  trip_assignment_id: "",
  delay_reason: "",
  estimated_delay_minutes: "",
  delay_lat: "",
  delay_lng: "",
  delay_location: "",
  delay_remarks: "",
};

/* Info row for auto-filled read-only fields */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 min-h-[38px]">
        {value || <span className="text-gray-400 italic">—</span>}
      </div>
    </div>
  );
}

export default function TripDelayReportForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { encScheduleOperations, encTripDelayReport } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encScheduleOperations, encTripDelayReport);

  /* ── form ── */
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /* ── dropdown data ── */
  const [assignmentOptions, setAssignmentOptions] = useState<SelectOption[]>([]);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);

  /* ── auto-filled info from selected trip assignment ── */
  const [selectedTripDate, setSelectedTripDate] = useState("");
  const [selectedTripStatus, setSelectedTripStatus] = useState("");
  const [autoVehicleNo, setAutoVehicleNo] = useState("");
  const [autoDriver, setAutoDriver] = useState("");
  const [autoOperator, setAutoOperator] = useState("");

  /* ────────────────────────────────────────────────────────────
     Load today's open trips when company+project are ready
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setAssignmentOptions([]);
      return;
    }
    setFetchingDropdowns(true);
    const params = { company_id: companyUniqueId, project_id: projectId, today: true };
    (dailyTripAssignmentApi.readAll({ params }) as Promise<any[]>)
      .then((res) => {
        const assignments = normalizeList(res);
        const opts: SelectOption[] = assignments
          .filter((a: any) => !CLOSED_TRIP_STATUSES.has(String(a.status ?? "")))
          .map((a: any) => ({
            value: String(a.unique_id ?? ""),
            label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}${a.status ? " [" + a.status + "]" : ""}`,
          }))
          .filter((o: SelectOption) => o.value);
        setAssignmentOptions(opts);
      })
      .catch(() => setAssignmentOptions([]))
      .finally(() => setFetchingDropdowns(false));
  }, [companyUniqueId, projectId]);

  /* ── auto-fill vehicle / crew for the selected trip ── */
  useEffect(() => {
    const assignId = form.trip_assignment_id;
    if (!assignId) {
      setSelectedTripDate("");
      setSelectedTripStatus("");
      setAutoVehicleNo("");
      setAutoDriver("");
      setAutoOperator("");
      return;
    }

    (dailyTripAssignmentApi.read(assignId) as Promise<any>)
      .then((data: any) => {
        setSelectedTripDate(data.trip_date ?? "");
        setSelectedTripStatus(data.status ?? "");
        setAutoVehicleNo(data.vehicle?.vehicle_no ?? data.trip_plan?.vehicle_no ?? "");
        setAutoDriver(data.effective_staff?.driver ?? data.staff_template?.driver ?? "");
        setAutoOperator(data.effective_staff?.operator ?? data.staff_template?.operator ?? "");
      })
      .catch(() => {/* silent — assignment detail is display-only */});
  }, [form.trip_assignment_id]);

  /* ────────────────────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────────────────────── */
  const setField = (key: keyof FormState, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /* ────────────────────────────────────────────────────────────
     Submit
  ──────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = parseWithSchema(tripDelayReportSchema, {
      trip_assignment_id: form.trip_assignment_id,
      delay_reason: form.delay_reason,
      delay_remarks: form.delay_remarks,
      estimated_delay_minutes: form.estimated_delay_minutes,
      delay_lat: form.delay_lat,
      delay_lng: form.delay_lng,
    });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      Swal.fire(
        t("common.error"),
        Object.values(validation.errors)[0] ?? "Please complete all required fields.",
        "error",
      );
      return;
    }
    setFieldErrors({});

    if (!companyUniqueId) {
      Swal.fire(t("common.error"), "Please select a company.", "error"); return;
    }
    if (!projectId) {
      Swal.fire(t("common.error"), "Please select a project.", "error"); return;
    }

    setSaving(true);
    try {
      await tripDelayReportApi.create({
        company_id_input: companyUniqueId,
        project_id_input: projectId,
        trip_assignment_id: form.trip_assignment_id,
        delay_reason: form.delay_reason,
        delay_remarks: form.delay_remarks.trim(),
        estimated_delay_minutes: form.estimated_delay_minutes ? Number(form.estimated_delay_minutes) : null,
        delay_lat: form.delay_lat || null,
        delay_lng: form.delay_lng || null,
        delay_location: form.delay_location || null,
      });

      await Swal.fire({
        title: t("common.success"),
        text: "Delay reported. The trip supervisor has been notified.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="p-3">
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-800">Report Trip Delay</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Log a hold-up on a running trip. The vehicle stays on the trip — use Vehicle Breakdown if it needs replacing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(LIST_PATH)}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-4 py-2"
        >
          ← Back to List
        </button>
      </div>

      {/* ── Company / Project ── */}
      <ComponentCard title="Scope">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isSuperAdmin && (
            <div>
              <Label>Company <span className="text-red-500">*</span></Label>
              <Select
                options={companies}
                value={companyUniqueId || ""}
                onChange={(val) => onCompanyChange(val)}
                placeholder="Select company"
              />
            </div>
          )}
          <div>
            <Label>Project <span className="text-red-500">*</span></Label>
            <Select
              options={projects}
              value={projectId || ""}
              onChange={(val) => setProjectId(val)}
              placeholder="Select project"
              disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            />
          </div>
        </div>
      </ComponentCard>

      {/* ── Delay Details ── */}
      <ComponentCard title="Delay Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trip Assignment */}
          <div className="md:col-span-2">
            <Label>Trip Assignment <span className="text-red-500">*</span></Label>
            <Select
              options={assignmentOptions}
              value={form.trip_assignment_id}
              onChange={(val) => setField("trip_assignment_id", val)}
              placeholder={
                fetchingDropdowns
                  ? "Loading trips…"
                  : assignmentOptions.length === 0 && companyUniqueId && projectId
                    ? "No open trips today"
                    : "Select trip assignment"
              }
              disabled={fetchingDropdowns || !companyUniqueId || !projectId}
            />
            <FieldError message={fieldErrors.trip_assignment_id} />
            {selectedTripDate && (
              <p className="text-xs text-gray-400 mt-1">
                Trip date: <strong>{selectedTripDate}</strong>
                {selectedTripStatus && <> · Status: <strong>{selectedTripStatus}</strong></>}
              </p>
            )}
          </div>

          {/* Auto-filled trip context */}
          <InfoRow label="Vehicle (auto-filled)" value={autoVehicleNo} />
          <InfoRow label="Driver (auto-filled)" value={autoDriver} />
          <InfoRow label="Operator (auto-filled)" value={autoOperator} />

          {/* Delay Reason */}
          <div>
            <Label>Delay Reason <span className="text-red-500">*</span></Label>
            <Select
              options={REASON_OPTIONS}
              value={form.delay_reason}
              onChange={(val) => setField("delay_reason", val)}
              placeholder="Select reason"
            />
            <FieldError message={fieldErrors.delay_reason} />
          </div>

          {/* Estimated Delay */}
          <div>
            <Label>Estimated Delay (minutes) — optional</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={form.estimated_delay_minutes}
              onChange={(e) => setField("estimated_delay_minutes", e.target.value)}
              placeholder="e.g. 30"
            />
            <FieldError message={fieldErrors.estimated_delay_minutes} />
          </div>

          {/* Delay Latitude */}
          <div>
            <Label>Latitude (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                value={form.delay_lat}
                onChange={(e) => setField("delay_lat", e.target.value)}
                placeholder="e.g. 28.6139"
              />
              <AutoDetectLocationButton
                onDetected={({ latitude, longitude }) => {
                  setField("delay_lat", String(latitude));
                  setField("delay_lng", String(longitude));
                }}
                label="Detect"
                className="shrink-0 whitespace-nowrap"
                title="Auto-detect current GPS coordinates"
              />
            </div>
            <FieldError message={fieldErrors.delay_lat} />
          </div>

          {/* Delay Longitude */}
          <div>
            <Label>Longitude (optional)</Label>
            <Input
              type="number"
              step="any"
              value={form.delay_lng}
              onChange={(e) => setField("delay_lng", e.target.value)}
              placeholder="e.g. 77.2090"
            />
            <FieldError message={fieldErrors.delay_lng} />
          </div>

          {/* Delay Location */}
          <div className="md:col-span-2">
            <Label>Location (optional)</Label>
            <Input
              type="text"
              value={form.delay_location}
              onChange={(e) => setField("delay_location", e.target.value)}
              placeholder="e.g. Near Main Road Junction, Ward 5"
            />
          </div>

          {/* Delay Remarks */}
          <div className="md:col-span-2">
            <Label>Remarks <span className="text-red-500">*</span></Label>
            <textarea
              rows={3}
              value={form.delay_remarks}
              onChange={(e) => setField("delay_remarks", e.target.value)}
              placeholder="Describe what caused the delay…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
            <FieldError message={fieldErrors.delay_remarks} />
          </div>
        </div>
      </ComponentCard>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => navigate(LIST_PATH)}
          className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </>
          ) : (
            "Report Delay"
          )}
        </button>
      </div>
    </form>
    </div>
  );
}
