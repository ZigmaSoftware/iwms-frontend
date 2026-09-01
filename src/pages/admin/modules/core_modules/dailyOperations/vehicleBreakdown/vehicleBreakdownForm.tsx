import type { PendingStopsSnapshot, VehicleBreakdownRecord } from "./types";
import { BREAKDOWN_REASON_LABELS } from "./types";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import { vehicleBreakdownApi, dailyTripAssignmentApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { normalizeList } from "@/utils/forms";
import { api } from "@/api";
import { AutoDetectLocationButton } from "@/components/common/AutoDetectLocationButton";
import { vehicleBreakdownSchema } from "@/schemas/core_modules/dailyOperations/vehicleBreakdown.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

type SelectOption = { value: string; label: string };

type StaffTemplateOption = SelectOption & {
  driverId: string;
  operatorId: string;
};

type AssignmentBinStop = {
  unique_id?: string;
  sequence?: number;
  status?: string;
  collection_point_id?: string | null;
  collection_point?: { cp_name?: string | null } | null;
  bin_id?: string | null;
  is_collected?: boolean;
};

type AssignmentHouseholdStop = {
  unique_id?: string;
  sequence?: number;
  status?: string;
  customer_id?: string | null;
  customer?: { customer_name?: string | null; building_no?: string | null } | null;
  is_collected?: boolean;
};

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


const REASON_OPTIONS: SelectOption[] = Object.entries(BREAKDOWN_REASON_LABELS).map(
  ([v, l]) => ({ value: v, label: l }),
);

interface FormState {
  trip_assignment_id: string;
  breakdown_vehicle_id: string;
  replacement_vehicle_id: string;
  replacement_staff_template_id: string;
  replacement_driver_id: string;
  replacement_operator_id: string;
  breakdown_reason: string;
  breakdown_time: string;
  breakdown_lat: string;
  breakdown_lng: string;
  breakdown_location: string;
  collected_weight_before_breakdown_kg: string;
  breakdown_remarks: string;
}

const EMPTY_FORM: FormState = {
  trip_assignment_id: "",
  breakdown_vehicle_id: "",
  replacement_vehicle_id: "",
  replacement_staff_template_id: "",
  replacement_driver_id: "",
  replacement_operator_id: "",
  breakdown_reason: "",
  breakdown_time: "",
  breakdown_lat: "",
  breakdown_lng: "",
  breakdown_location: "",
  collected_weight_before_breakdown_kg: "",
  breakdown_remarks: "",
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

const isPendingBinStop = (stop: AssignmentBinStop) =>
  !stop.is_collected && !["Collected", "Missed"].includes(String(stop.status ?? ""));

const isPendingHouseholdStop = (stop: AssignmentHouseholdStop) =>
  !stop.is_collected && !["Collected", "Not Available"].includes(String(stop.status ?? ""));

const pendingStopsFromAssignment = (assignment: any): PendingStopsSnapshot => ({
  collection_points: (Array.isArray(assignment?.collection_points) ? assignment.collection_points : [])
    .filter(isPendingBinStop)
    .map((stop: AssignmentBinStop) => ({
      unique_id: String(stop.unique_id ?? ""),
      sequence: Number(stop.sequence ?? 0),
      status: String(stop.status ?? "Pending"),
      collection_point_id: stop.collection_point_id ?? null,
      name: stop.collection_point?.cp_name ?? null,
      bin_id: stop.bin_id ?? null,
    }))
    .filter((stop: PendingStopsSnapshot["collection_points"][number]) => stop.unique_id),
  households: (Array.isArray(assignment?.household_collection_points) ? assignment.household_collection_points : [])
    .filter(isPendingHouseholdStop)
    .map((stop: AssignmentHouseholdStop) => ({
      unique_id: String(stop.unique_id ?? ""),
      sequence: Number(stop.sequence ?? 0),
      status: String(stop.status ?? "Pending"),
      customer_id: stop.customer_id ?? null,
      name: stop.customer?.customer_name ?? stop.customer?.building_no ?? null,
    }))
    .filter((stop: PendingStopsSnapshot["households"][number]) => stop.unique_id),
});

export default function VehicleBreakdownForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const isEdit = Boolean(id);

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { encScheduleOperations, encVehicleBreakdown } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encScheduleOperations, encVehicleBreakdown);

  /* ── record (edit mode) ── */
  const [record, setRecord] = useState<VehicleBreakdownRecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);

  /* ── form ── */
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [photos, setPhotos] = useState<File[]>([]);

  /* ── dropdown data ── */
  const [assignmentOptions, setAssignmentOptions] = useState<SelectOption[]>([]);
  const [availableVehicleOptions, setAvailableVehicleOptions] = useState<SelectOption[]>([]);
  const [staffTemplateOptions, setStaffTemplateOptions] = useState<StaffTemplateOption[]>([]);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);
  const [fetchingVehicles, setFetchingVehicles] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(false);

  /* ── auto-filled info from selected trip assignment ── */
  const [selectedTripDate, setSelectedTripDate] = useState("");
  const [autoVehicleNo, setAutoVehicleNo] = useState("");
  const [autoDriver, setAutoDriver] = useState("");
  const [autoOperator, setAutoOperator] = useState("");
  const [selectedPendingStops, setSelectedPendingStops] = useState<PendingStopsSnapshot | null>(null);

  /* ── pending IDs for edit pre-fill ── */
  const [pendingAssignmentId, setPendingAssignmentId] = useState("");
  const [pendingReplacementVehicleId, setPendingReplacementVehicleId] = useState("");
  const [pendingStaffTemplateIds, setPendingStaffTemplateIds] = useState<{ driverId: string; operatorId: string } | null>(null);

  /* ────────────────────────────────────────────────────────────
     Load record in edit mode
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingRecord(true);
    (vehicleBreakdownApi.read(id) as Promise<any>)
      .then((data: any) => {
        setRecord(data);
        applyCompanyProjectFromRecord(data);
      })
      .catch(() => Swal.fire(t("common.error"), t("common.fetch_failed"), "error"))
      .finally(() => setLoadingRecord(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── pre-fill form from record ── */
  useEffect(() => {
    if (!isEdit || !record) return;
    setForm({
      trip_assignment_id: String(record.trip_assignment_id ?? ""),
      breakdown_vehicle_id: String(record.breakdown_vehicle_id ?? ""),
      replacement_vehicle_id: String(record.replacement_vehicle_id ?? ""),
      replacement_staff_template_id: "",
      replacement_driver_id: String(record.replacement_driver_id ?? ""),
      replacement_operator_id: String(record.replacement_operator_id ?? ""),
      breakdown_reason: String(record.breakdown_reason ?? ""),
      breakdown_time: String(record.breakdown_time ?? ""),
      breakdown_lat: String(record.breakdown_lat ?? ""),
      breakdown_lng: String(record.breakdown_lng ?? ""),
      breakdown_location: String(record.breakdown_location ?? ""),
      collected_weight_before_breakdown_kg: String(record.collected_weight_before_breakdown_kg ?? ""),
      breakdown_remarks: String(record.breakdown_remarks ?? ""),
    });
    if (record.trip_assignment_id) setPendingAssignmentId(String(record.trip_assignment_id));
    if (record.replacement_vehicle_id) setPendingReplacementVehicleId(String(record.replacement_vehicle_id));
    if (record.replacement_driver_id && record.replacement_operator_id) {
      setPendingStaffTemplateIds({
        driverId: String(record.replacement_driver_id),
        operatorId: String(record.replacement_operator_id),
      });
    }

    /* restore auto-filled display strings */
    if (record.trip_assignment_detail?.trip_date) setSelectedTripDate(record.trip_assignment_detail.trip_date);
    if (record.breakdown_vehicle_detail?.vehicle_no) setAutoVehicleNo(record.breakdown_vehicle_detail.vehicle_no);
    if (record.original_driver_detail?.name) setAutoDriver(record.original_driver_detail.name);
    if (record.original_operator_detail?.name) setAutoOperator(record.original_operator_detail.name);
    setSelectedPendingStops(record.pending_stops ?? null);
  }, [isEdit, record]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ────────────────────────────────────────────────────────────
     Load dropdowns when company+project are ready
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) return;
    setFetchingDropdowns(true);
    // Only today's trips can have a breakdown reported against them.
    const params = { company_id: companyUniqueId, project_id: projectId, today: true };
    (dailyTripAssignmentApi.readAll({ params }) as Promise<any[]>)
      .then((res) => {
        const assignments = normalizeList(res);
        const opts: SelectOption[] = assignments.map((a: any) => ({
          value: String(a.unique_id ?? ""),
          label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}${a.trip_date ? " (" + a.trip_date + ")" : ""}`,
        })).filter((o: any) => o.value);

        // Edit mode: the record's own assignment may no longer be "today" —
        // keep it selectable (the field is disabled in edit mode anyway) so
        // the saved value still displays.
        if (isEdit && record?.trip_assignment_id && !opts.find((o) => o.value === String(record.trip_assignment_id))) {
          opts.unshift({
            value: String(record.trip_assignment_id),
            label: `${record.trip_assignment_id}${record.trip_assignment_detail?.trip_plan_display_code ? " — " + record.trip_assignment_detail.trip_plan_display_code : ""}${record.trip_assignment_detail?.trip_date ? " (" + record.trip_assignment_detail.trip_date + ")" : ""}`,
          });
        }

        setAssignmentOptions(opts);
      })
      .catch(() => {})
      .finally(() => setFetchingDropdowns(false));
  }, [companyUniqueId, projectId, isEdit, record]);

  /* ── flush pending IDs once dropdowns load ── */
  useEffect(() => {
    if (!pendingAssignmentId || !assignmentOptions.length) return;
    const match = assignmentOptions.find((o) => o.value === pendingAssignmentId);
    if (match) {
      setForm((prev) => ({ ...prev, trip_assignment_id: pendingAssignmentId }));
      setPendingAssignmentId("");
    }
  }, [pendingAssignmentId, assignmentOptions]);

  useEffect(() => {
    if (!pendingStaffTemplateIds || !staffTemplateOptions.length) return;
    const match = staffTemplateOptions.find(
      (o) => o.driverId === pendingStaffTemplateIds.driverId && o.operatorId === pendingStaffTemplateIds.operatorId,
    );
    if (match) {
      setForm((prev) => ({
        ...prev,
        replacement_staff_template_id: match.value,
        replacement_driver_id: match.driverId,
        replacement_operator_id: match.operatorId,
      }));
      setPendingStaffTemplateIds(null);
    }
  }, [pendingStaffTemplateIds, staffTemplateOptions]);

  useEffect(() => {
    if (!pendingReplacementVehicleId || !availableVehicleOptions.length) return;
    const match = availableVehicleOptions.find((o) => o.value === pendingReplacementVehicleId);
    if (match) {
      setForm((prev) => ({ ...prev, replacement_vehicle_id: pendingReplacementVehicleId }));
      setPendingReplacementVehicleId("");
    }
  }, [pendingReplacementVehicleId, availableVehicleOptions]);

  /* ────────────────────────────────────────────────────────────
     When a trip assignment is selected, fetch its details to
     auto-fill the broken vehicle, original driver, operator.
     Also fetch available vehicles for that trip date.
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const assignId = form.trip_assignment_id;
    if (!assignId) {
      setSelectedTripDate("");
      setAutoVehicleNo("");
      setAutoDriver("");
      setAutoOperator("");
      setSelectedPendingStops(null);
      setAvailableVehicleOptions([]);
      setStaffTemplateOptions([]);
      if (!isEdit) {
        setForm((prev) => ({
          ...prev,
          breakdown_vehicle_id: "",
          replacement_vehicle_id: "",
          replacement_staff_template_id: "",
          replacement_driver_id: "",
          replacement_operator_id: "",
        }));
      }
      return;
    }

    (dailyTripAssignmentApi.read(assignId) as Promise<any>)
      .then((data: any) => {
        const tripDate: string = data.trip_date ?? "";
        setSelectedTripDate(tripDate);

        /* broken vehicle — serializer returns data.vehicle */
        const vehicleNo: string =
          data.vehicle?.vehicle_no ??
          data.trip_plan?.vehicle_no ??
          "";
        const vehicleId: string =
          data.vehicle?.unique_id ??
          "";
        setAutoVehicleNo(vehicleNo);

        /* original driver / operator — use effective_staff which accounts for alt template */
        const driverName: string =
          data.effective_staff?.driver ??
          data.staff_template?.driver ??
          "";
        const operatorName: string =
          data.effective_staff?.operator ??
          data.staff_template?.operator ??
          "";
        setAutoDriver(driverName);
        setAutoOperator(operatorName);
        setSelectedPendingStops(pendingStopsFromAssignment(data));

        if (!isEdit) {
          setForm((prev) => ({ ...prev, breakdown_vehicle_id: vehicleId }));
        }

        /* fetch available vehicles + staff for the trip date */
        if (tripDate) {
          const params: Record<string, string> = { date: tripDate };
          if (companyUniqueId) params.company_id = companyUniqueId;
          if (projectId) params.project_id = projectId;

          setFetchingVehicles(true);
          // In edit mode pass exclude_id so this record's own replacement vehicle
          // is not filtered out by the pending-replacements exclusion logic.
          if (isEdit && id) params.exclude_id = id;
          api
            .get("/schedule-operations/vehicle-breakdowns/available-vehicles/", { params })
            .then((res) => {
              const list = Array.isArray(res.data) ? res.data : [];
              const opts: SelectOption[] = list.map((v: any) => ({
                value: String(v.unique_id ?? ""),
                label: `${v.vehicle_no ?? ""}${v.capacity ? " (" + v.capacity + ")" : ""}`,
              })).filter((o: any) => o.value);

              // Safety net: if edit mode and the current replacement vehicle is still
              // not in the list (e.g. already assigned to a trip), inject it manually
              // so the dropdown shows the saved value.
              if (isEdit && record?.replacement_vehicle_detail) {
                const existingId = String(record.replacement_vehicle_id ?? "");
                if (existingId && !opts.find((o) => o.value === existingId)) {
                  const vd = record.replacement_vehicle_detail;
                  opts.unshift({
                    value: existingId,
                    label: `${vd.vehicle_no ?? ""}${vd.capacity ? " (" + vd.capacity + ")" : ""}`,
                  });
                }
              }

              setAvailableVehicleOptions(opts);
              if (pendingReplacementVehicleId) {
                setPendingReplacementVehicleId((prev) => prev);
              }
            })
            .catch(() => setAvailableVehicleOptions([]))
            .finally(() => setFetchingVehicles(false));

          setFetchingStaff(true);
          api
            .get("/schedule-operations/vehicle-breakdowns/available-staff-templates/", { params })
            .then((res) => {
              const list = Array.isArray(res.data) ? res.data : [];
              const opts: StaffTemplateOption[] = list
                .map((template: any) => ({
                  value: String(template.unique_id ?? ""),
                  label: `${template.display_code ?? template.unique_id ?? ""} — ${template.driver_name ?? "Driver"} / ${template.operator_name ?? "Operator"}`,
                  driverId: String(template.driver_id ?? ""),
                  operatorId: String(template.operator_id ?? ""),
                }))
                .filter((o) => o.value && o.driverId && o.operatorId);

              const currentDriverId = String(record?.replacement_driver_id ?? "");
              const currentOperatorId = String(record?.replacement_operator_id ?? "");
              if (
                isEdit &&
                currentDriverId &&
                currentOperatorId &&
                record?.replacement_driver_detail &&
                record?.replacement_operator_detail &&
                !opts.find((o) => o.driverId === currentDriverId && o.operatorId === currentOperatorId)
              ) {
                opts.unshift({
                  value: "__current_replacement_staff__",
                  label: `Current replacement — ${record.replacement_driver_detail.name ?? "Driver"} / ${record.replacement_operator_detail.name ?? "Operator"}`,
                  driverId: currentDriverId,
                  operatorId: currentOperatorId,
                });
              }

              setStaffTemplateOptions(opts);
            })
            .catch(() => setStaffTemplateOptions([]))
            .finally(() => setFetchingStaff(false));
        }
      })
      .catch(() => {/* silent — assignment detail not critical */});
  }, [form.trip_assignment_id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ────────────────────────────────────────────────────────────
     Helpers
  ──────────────────────────────────────────────────────────── */
  const setField = (key: keyof FormState, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const setReplacementStaffTemplate = (val: string) => {
    const selected = staffTemplateOptions.find((option) => option.value === val);
    setForm((prev) => ({
      ...prev,
      replacement_staff_template_id: val,
      replacement_driver_id: selected?.driverId ?? "",
      replacement_operator_id: selected?.operatorId ?? "",
    }));
    setFieldErrors((prev) => ({
      ...prev,
      replacement_staff_template_id: "",
      replacement_driver_id: "",
      replacement_operator_id: "",
    }));
  };

  /* ────────────────────────────────────────────────────────────
     Submit
  ──────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = parseWithSchema(vehicleBreakdownSchema, {
      trip_assignment_id: form.trip_assignment_id,
      breakdown_vehicle_id: form.breakdown_vehicle_id,
      replacement_vehicle_id: form.replacement_vehicle_id,
      replacement_staff_template_id: form.replacement_staff_template_id,
      breakdown_reason: form.breakdown_reason,
      breakdown_lat: form.breakdown_lat,
      breakdown_lng: form.breakdown_lng,
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
      const payload = {
        company_id_input: companyUniqueId,
        project_id_input: projectId,
        trip_assignment_id: form.trip_assignment_id,
        breakdown_vehicle_id: form.breakdown_vehicle_id,
        replacement_vehicle_id: form.replacement_vehicle_id,
        replacement_driver_id: form.replacement_driver_id,
        replacement_operator_id: form.replacement_operator_id,
        breakdown_reason: form.breakdown_reason,
        breakdown_time: form.breakdown_time || null,
        breakdown_lat: form.breakdown_lat,
        breakdown_lng: form.breakdown_lng,
        breakdown_location: form.breakdown_location || null,
        collected_weight_before_breakdown_kg: form.collected_weight_before_breakdown_kg || null,
        breakdown_remarks: form.breakdown_remarks || null,
      };

      if (isEdit && id) {
        await vehicleBreakdownApi.update(id, payload);
      } else if (photos.length > 0) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          formData.append(key, String(value));
        });
        photos.forEach((file) => formData.append("photos", file));
        await vehicleBreakdownApi.upload(formData);
      } else {
        await vehicleBreakdownApi.create(payload);
      }

      await Swal.fire({
        title: t("common.success"),
        text: isEdit ? "Breakdown record updated." : "Breakdown reported successfully. Pending approval.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
      navigate(LIST_PATH);
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  if (loadingRecord) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-3">
        <span className="animate-spin h-5 w-5 border-2 border-gray-200 border-t-orange-500 rounded-full" />
        Loading…
      </div>
    );
  }

  return (
    <div className="p-3">
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-800">
            {isEdit ? "Edit Breakdown Record" : "Report Vehicle Breakdown"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEdit
              ? "Update the replacement arrangement details."
              : "Report a vehicle breakdown and arrange a replacement for the trip."}
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
                disabled={isEdit}
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
              disabled={isEdit || (!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            />
          </div>
        </div>
      </ComponentCard>

      {/* ── Section 1: Breakdown Details ── */}
      <ComponentCard title="Breakdown Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trip Assignment */}
          <div className="md:col-span-2">
            <Label>Trip Assignment <span className="text-red-500">*</span></Label>
            <Select
              options={assignmentOptions}
              value={form.trip_assignment_id}
              onChange={(val) => setField("trip_assignment_id", val)}
              placeholder={fetchingDropdowns ? "Loading trips…" : "Select trip assignment"}
              disabled={fetchingDropdowns || isEdit || !companyUniqueId || !projectId}
            />
            <FieldError message={fieldErrors.trip_assignment_id} />
            {selectedTripDate && (
              <p className="text-xs text-gray-400 mt-1">Trip date: <strong>{selectedTripDate}</strong></p>
            )}
          </div>

          {/* Auto-filled: Broken Vehicle */}
          <div>
            <InfoRow
              label="Broken Vehicle (auto-filled)"
              value={autoVehicleNo || (form.breakdown_vehicle_id ? `ID: ${form.breakdown_vehicle_id}` : "")}
            />
            <FieldError message={fieldErrors.breakdown_vehicle_id} />
          </div>

          {/* Auto-filled: Original Driver */}
          <InfoRow label="Original Driver (auto-filled)" value={autoDriver} />

          {/* Auto-filled: Original Operator */}
          <InfoRow label="Original Operator (auto-filled)" value={autoOperator} />

          {selectedPendingStops && (
            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-gray-800">Remaining Collection Work</p>
                <p className="text-xs text-gray-500">
                  {selectedPendingStops.collection_points.length} collection point(s),{" "}
                  {selectedPendingStops.households.length} household(s)
                </p>
              </div>

              {selectedPendingStops.collection_points.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600">
                    Pending collection points available for manual carry-over at approval
                  </p>
                  <div className="mt-2 max-h-36 overflow-y-auto rounded-md border border-gray-200 bg-white">
                    {selectedPendingStops.collection_points.map((cp) => (
                      <div key={cp.unique_id} className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-xs last:border-b-0">
                        <span className="font-medium text-gray-700">{cp.name ?? cp.collection_point_id ?? cp.unique_id}</span>
                        <span className="shrink-0 text-gray-400">{cp.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPendingStops.households.length > 0 && (
                <div className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  {selectedPendingStops.households.length} un-collected household stop(s) will automatically carry over to the replacement trip.
                </div>
              )}

              {selectedPendingStops.collection_points.length === 0 && selectedPendingStops.households.length === 0 && (
                <p className="mt-3 text-xs text-amber-600">This trip has no pending stops to carry over.</p>
              )}
            </div>
          )}

          {/* Breakdown Reason */}
          <div>
            <Label>Breakdown Reason <span className="text-red-500">*</span></Label>
            <Select
              options={REASON_OPTIONS}
              value={form.breakdown_reason}
              onChange={(val) => setField("breakdown_reason", val)}
              placeholder="Select reason"
            />
            <FieldError message={fieldErrors.breakdown_reason} />
          </div>

          {/* Breakdown Time */}
          <div>
            <Label>Breakdown Time (optional)</Label>
            <Input
              type="time"
              value={form.breakdown_time}
              onChange={(e) => setField("breakdown_time", e.target.value)}
            />
          </div>

          {/* Breakdown Latitude */}
          <div>
            <Label>Breakdown Latitude <span className="text-red-500">*</span></Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                value={form.breakdown_lat}
                onChange={(e) => setField("breakdown_lat", e.target.value)}
                placeholder="e.g. 28.6139"
              />
              <AutoDetectLocationButton
                onDetected={({ latitude, longitude }) => {
                  setField("breakdown_lat", String(latitude));
                  setField("breakdown_lng", String(longitude));
                }}
                label="Detect"
                className="shrink-0 whitespace-nowrap"
                title="Auto-detect current GPS coordinates"
              />
            </div>
            <FieldError message={fieldErrors.breakdown_lat} />
          </div>

          {/* Breakdown Longitude */}
          <div>
            <Label>Breakdown Longitude <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="any"
              value={form.breakdown_lng}
              onChange={(e) => setField("breakdown_lng", e.target.value)}
              placeholder="e.g. 77.2090"
            />
            <FieldError message={fieldErrors.breakdown_lng} />
          </div>

          {/* Collected Weight Before Breakdown */}
          <div>
            <Label>Collected Weight Before Breakdown (kg) — optional</Label>
            <Input
              type="number"
              step="any"
              min="0"
              value={form.collected_weight_before_breakdown_kg}
              onChange={(e) => setField("collected_weight_before_breakdown_kg", e.target.value)}
              placeholder="e.g. 120.5"
            />
            <p className="text-xs text-gray-400 mt-1">
              Weight already collected by the broken vehicle before the breakdown occurred.
            </p>
          </div>

          {/* Breakdown Location */}
          <div className="md:col-span-2">
            <Label>Breakdown Location (optional)</Label>
            <Input
              type="text"
              value={form.breakdown_location}
              onChange={(e) => setField("breakdown_location", e.target.value)}
              placeholder="e.g. Near Main Road Junction, Ward 5"
            />
          </div>

          {/* Breakdown Remarks */}
          <div className="md:col-span-2">
            <Label>Breakdown Remarks (optional)</Label>
            <textarea
              rows={2}
              value={form.breakdown_remarks}
              onChange={(e) => setField("breakdown_remarks", e.target.value)}
              placeholder="Additional notes about the breakdown…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* Photo Evidence — create only, matches the backend's perform_create-only handling */}
          {!isEdit && (
            <div className="md:col-span-2">
              <Label>Photos (optional)</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-orange-700 hover:file:bg-orange-100"
              />
              {photos.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">{photos.length} photo(s) selected.</p>
              )}
            </div>
          )}
        </div>
      </ComponentCard>

      {/* ── Section 2: Replacement Arrangement ── */}
      <ComponentCard title="Replacement Arrangement">
        {!form.trip_assignment_id && (
          <p className="text-sm text-gray-400 italic">Select a trip assignment above to see available replacement vehicles.</p>
        )}
        {form.trip_assignment_id && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Available Vehicle */}
            <div className="md:col-span-2">
              <Label>Replacement Vehicle <span className="text-red-500">*</span></Label>
              <Select
                options={availableVehicleOptions}
                value={form.replacement_vehicle_id}
                onChange={(val) => setField("replacement_vehicle_id", val)}
                placeholder={fetchingVehicles ? "Loading available vehicles…" : availableVehicleOptions.length === 0 ? "No vehicles available for this date" : "Select replacement vehicle"}
                disabled={fetchingVehicles || availableVehicleOptions.length === 0}
              />
              <FieldError message={fieldErrors.replacement_vehicle_id} />
              {availableVehicleOptions.length === 0 && !fetchingVehicles && (
                <p className="text-xs text-amber-600 mt-1">
                  All vehicles are assigned on {selectedTripDate}. Please check vehicle availability.
                </p>
              )}
            </div>

            {/* Replacement Staff Template */}
            <div className="md:col-span-2">
              <Label>Replacement Staff Template <span className="text-red-500">*</span></Label>
              <Select
                options={staffTemplateOptions}
                value={form.replacement_staff_template_id}
                onChange={setReplacementStaffTemplate}
                placeholder={
                  fetchingStaff
                    ? "Loading available staff templates…"
                    : staffTemplateOptions.length === 0
                      ? "No available staff templates for this date"
                      : "Select replacement staff template"
                }
                disabled={fetchingStaff}
              />
              <FieldError message={fieldErrors.replacement_staff_template_id} />
              {!fetchingStaff && staffTemplateOptions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  All staff templates are already assigned on {selectedTripDate}.
                </p>
              )}
            </div>

            <div className="md:col-span-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-800">
              <strong>Note:</strong> The replacement trip will be created after a supervisor verifies this
              breakdown request, carrying over the remaining stops from the original trip.
            </div>
          </div>
        )}
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
            isEdit ? "Update Record" : "Report Breakdown"
          )}
        </button>
      </div>
    </form>
    </div>
  );
}
