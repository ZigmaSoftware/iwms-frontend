import type { RetripPendingSnapshot } from "./types";
import { RETRIP_OTHER_REASON_MIN_LENGTH, RETRIP_REASON_OPTIONS } from "./types";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { retripRequestApi, dailyTripAssignmentApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { normalizeList } from "@/utils/forms";
import { tripRetripRequestSchema } from "@/schemas/core_modules/dailyOperations/tripRetripRequest.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

/**
 * Admin/supervisor counterpart of the driver app's "End Trip" with stops
 * left — raise a Pending Re-Trip request on the crew's behalf (no network on
 * the phone, driver called the control room…). The request then goes through
 * the same approve/reject review on the list page as a driver-raised one.
 * Requester, pending-stop snapshot, deadline and company/project are stamped
 * server-side (TripRetripRequestViewSet.create → retrip_service.request_retrip).
 */

type SelectOption = { value: string; label: string };

// The slice of DailyTripAssignmentSerializer this form reads.
type TripSummary = {
  unique_id?: string;
  status?: string;
  trip_date?: string;
  trip_plan?: { display_code?: string; vehicle_no?: string } | null;
  vehicle?: { vehicle_no?: string } | null;
  effective_staff?: { driver?: string; operator?: string } | null;
  staff_template?: { driver?: string; operator?: string } | null;
};

const extractError = (error: unknown): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data) return "An unexpected error occurred.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    const first = Object.values(record)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return "An unexpected error occurred.";
};

// Only an open trip can be cut short — the backend rejects the rest too.
const CLOSED_TRIP_STATUSES = new Set(["Completed", "Cancelled"]);

interface FormState {
  assignment_id: string;
  reason_code: string;
  reason: string;
}

const EMPTY_FORM: FormState = { assignment_id: "", reason_code: "", reason: "" };

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

export default function TripRetripRequestForm() {
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

  const { encScheduleOperations, encTripRetripRequest } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encScheduleOperations, encTripRetripRequest);

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

  /* ── stops that the request would carry over ── */
  const [pending, setPending] = useState<RetripPendingSnapshot | null>(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const pendingRequestRef = useRef(0);

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
    (dailyTripAssignmentApi.readAll({ params }) as Promise<TripSummary[]>)
      .then((res) => {
        const assignments = normalizeList(res) as TripSummary[];
        const opts: SelectOption[] = assignments
          .filter((a) => !CLOSED_TRIP_STATUSES.has(String(a.status ?? "")))
          .map((a) => ({
            value: String(a.unique_id ?? ""),
            label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}${a.status ? " [" + a.status + "]" : ""}`,
          }))
          .filter((o: SelectOption) => o.value);
        setAssignmentOptions(opts);
      })
      .catch(() => setAssignmentOptions([]))
      .finally(() => setFetchingDropdowns(false));
  }, [companyUniqueId, projectId]);

  /* ── auto-fill vehicle / crew + pending stops for the selected trip ── */
  useEffect(() => {
    const assignId = form.assignment_id;
    const requestId = ++pendingRequestRef.current;
    setPending(null);
    if (!assignId) {
      setLoadingPending(false);
      setSelectedTripDate("");
      setSelectedTripStatus("");
      setAutoVehicleNo("");
      setAutoDriver("");
      setAutoOperator("");
      return;
    }

    (dailyTripAssignmentApi.read(assignId) as Promise<TripSummary>)
      .then((data) => {
        if (requestId !== pendingRequestRef.current) return;
        setSelectedTripDate(data.trip_date ?? "");
        setSelectedTripStatus(data.status ?? "");
        setAutoVehicleNo(data.vehicle?.vehicle_no ?? data.trip_plan?.vehicle_no ?? "");
        setAutoDriver(data.effective_staff?.driver ?? data.staff_template?.driver ?? "");
        setAutoOperator(data.effective_staff?.operator ?? data.staff_template?.operator ?? "");
      })
      .catch(() => {/* silent — assignment detail is display-only */});

    setLoadingPending(true);
    (retripRequestApi.action("pending-stops", undefined, {
      params: { assignment_id: assignId },
    }) as Promise<RetripPendingSnapshot>)
      .then((data) => {
        if (requestId === pendingRequestRef.current) setPending(data);
      })
      .catch((err) => {
        if (requestId !== pendingRequestRef.current) return;
        Swal.fire(t("common.error"), extractError(err), "error");
      })
      .finally(() => {
        if (requestId === pendingRequestRef.current) setLoadingPending(false);
      });
  }, [form.assignment_id, t]);

  const pendingBins = pending?.collection_points ?? [];
  const pendingHouseholds = pending?.households ?? [];
  const pendingTotal = pendingBins.length + pendingHouseholds.length;
  const noPendingStops = Boolean(pending) && pendingTotal === 0;

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

    const validation = parseWithSchema(tripRetripRequestSchema, form);
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
    if (noPendingStops) {
      Swal.fire(
        t("common.error"),
        "This trip has no pending stops left — it can be ended normally.",
        "error",
      );
      return;
    }

    setSaving(true);
    try {
      await retripRequestApi.create({
        assignment_id: form.assignment_id,
        reason_code: form.reason_code,
        reason: form.reason.trim(),
      });

      await Swal.fire({
        title: t("common.success"),
        text: "Re-Trip request raised. The trip supervisor has been notified.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: unknown) {
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
          <h1 className="text-xl font-bold text-gray-800">Raise Re-Trip Request</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ask to end a running trip with stops still remaining. The trip stays In Progress until a supervisor approves or rejects it.
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

      {/* ── Request Details ── */}
      <ComponentCard title="Re-Trip Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trip Assignment */}
          <div className="md:col-span-2">
            <Label>Trip Assignment <span className="text-red-500">*</span></Label>
            <Select
              options={assignmentOptions}
              value={form.assignment_id}
              onChange={(val) => setField("assignment_id", val)}
              placeholder={
                fetchingDropdowns
                  ? "Loading trips…"
                  : assignmentOptions.length === 0 && companyUniqueId && projectId
                    ? "No open trips today"
                    : "Select trip assignment"
              }
              disabled={fetchingDropdowns || !companyUniqueId || !projectId}
            />
            <FieldError message={fieldErrors.assignment_id} />
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

          {/* Pending stops preview */}
          {form.assignment_id && (
            <div className="md:col-span-2">
              <Label>Pending stops ({loadingPending ? "…" : pendingTotal})</Label>
              <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y">
                {loadingPending && (
                  <div className="p-3 text-xs text-gray-400">Loading pending stops…</div>
                )}
                {!loadingPending && noPendingStops && (
                  <div className="p-3 text-xs text-gray-500">
                    Every stop on this trip is done — no Re-Trip is needed.
                  </div>
                )}
                {pendingBins.map((stop) => (
                  <div key={stop.unique_id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-800">{stop.name ?? stop.unique_id}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                      Bin
                    </span>
                    <span className="text-xs text-gray-400">{stop.status}</span>
                  </div>
                ))}
                {pendingHouseholds.map((stop) => (
                  <div key={stop.unique_id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-800">{stop.name ?? stop.unique_id}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      Household
                    </span>
                    <span className="text-xs text-gray-400">{stop.status}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                The supervisor picks which of these carry over when approving.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label>Reason <span className="text-red-500">*</span></Label>
            <Select
              options={RETRIP_REASON_OPTIONS}
              value={form.reason_code}
              onChange={(val) => setField("reason_code", val)}
              placeholder="Select reason"
            />
            <FieldError message={fieldErrors.reason_code} />
          </div>
          <div className="md:col-span-2">
            <Label>
              {form.reason_code === "OTHER" ? (
                <>Describe the reason <span className="text-red-500">*</span></>
              ) : (
                "Details (optional)"
              )}
            </Label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setField("reason", e.target.value)}
              placeholder={
                form.reason_code === "OTHER"
                  ? `Why can't the remaining stops be finished on this trip? (at least ${RETRIP_OTHER_REASON_MIN_LENGTH} characters)`
                  : "Anything the supervisor should know"
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <FieldError message={fieldErrors.reason} />
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
          disabled={saving || loadingPending || noPendingStops}
          className="flex items-center gap-2 px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </>
          ) : (
            "Raise Request"
          )}
        </button>
      </div>
    </form>
    </div>
  );
}
