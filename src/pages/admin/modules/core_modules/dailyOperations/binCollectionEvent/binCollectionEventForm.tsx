import type { BinCERecord } from "./types";
import type { FormState, SelectOption } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import {
  binCollectionEventApi,
  dailyTripAssignmentApi,
  dailyTripCollectionPointApi,
} from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";
import { AutoDetectLocationButton } from "@/components/common/AutoDetectLocationButton";


// A5: BinCollectionEvent.STATUS_CHOICES.
const STATUS_OPTIONS: SelectOption[] = [
  { value: "Collected", label: "Collected" },
  { value: "Not Collected", label: "Not Collected" },
  { value: "Collect Later", label: "Collect Later" },
];

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

const stopIdOf = (stop: any): string =>
  String(stop?.unique_id ?? stop?.id ?? "");

const entityIdOf = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return String(value.unique_id ?? value.id ?? value.value ?? "");
  }
  return String(value);
};

const collectionPointIdOf = (source: any): string =>
  entityIdOf(
    source?.collection_point_id ??
    source?.collection_point?.unique_id ??
    source?.collection_point?.id ??
    source?.collection_point ??
    "",
  );

const binIdOf = (source: any): string =>
  entityIdOf(source?.bin_id ?? source?.bin?.unique_id ?? source?.bin?.id ?? source?.bin ?? "");

const collectionPointLabelOf = (source: any, fallback = ""): string =>
  String(
    source?.collection_point?.cp_name ??
    source?.collection_point?.collection_point_name ??
    source?.collection_point?.name ??
    source?.collection_point_name ??
    source?.collection_point_id ??
    fallback,
  );

const binLabelOf = (source: any, fallback = ""): string =>
  String(
    source?.bin?.bin_name ??
    source?.bin_name ??
    (typeof source?.bin_id === "object" ? source.bin_id?.bin_name : null) ??
    (typeof source?.bin_id === "object" ? source.bin_id?.name : null) ??
    entityIdOf(source?.bin_id) ??
    fallback,
  );

const binTypeLabelOf = (source: any, fallback = ""): string =>
  String(
    source?.bin?.wastetype_name ??
    source?.bin?.waste_type_name ??
    source?.bin?.waste_type?.waste_type_name ??
    source?.bin?.waste_type?.name ??
    source?.wastetype_name ??
    source?.waste_type_name ??
    source?.waste_type?.waste_type_name ??
    source?.waste_type?.name ??
    source?.bin?.bin_type ??
    source?.bin_type ??
    fallback,
  );

const isStopCollected = (stop: any): boolean =>
  Boolean(stop?.is_collected) ||
  String(stop?.status ?? stop?.collection_status ?? "").toLowerCase() === "collected";

const isCollectedEvent = (event: any): boolean =>
  String(event?.status ?? "Collected").toLowerCase() === "collected";

const collectionPointStopLabel = (stop: any, fallback = ""): string => {
  const collectionPointLabel = collectionPointLabelOf(stop, fallback);
  const binTypeLabel = binTypeLabelOf(stop, binLabelOf(stop));
  const baseLabel = binTypeLabel
    ? `${collectionPointLabel} - ${binTypeLabel}`
    : collectionPointLabel;

  return isStopCollected(stop) ? `${baseLabel} (Collected)` : baseLabel;
};

export default function BinCollectionEventForm() {
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

  const { encScheduleMasters, encBinCollectionEvent } = getEncryptedRoute();
  const { listPath: LIST_PATH } = createCrudRoutePaths(encScheduleMasters, encBinCollectionEvent);

  /* ── record loading (edit mode) ── */
  const [record, setRecord] = useState<BinCERecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);

  /* ── form state ── */
  const [form, setForm] = useState<FormState>({
    trip_assignment_id: "",
    trip_collection_point_id: "",
    bin_id: "",
    collection_date: "",
    collected_weight_kg: "",
    status: "Collected",
    status_reason: "",
    driver_latitude: "",
    driver_longitude: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  /* ── raw lookup data ── */
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  // One row per DailyTripCollectionPoint stop. A collection point can appear
  // more than once when the trip contains multiple bins for the same point,
  // so the dropdown groups these rows by collection point.
  const [rawTripCPs, setRawTripCPs] = useState<any[]>([]);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);
  const [loadingCPs, setLoadingCPs] = useState(false);

  /* ── pending IDs for edit pre-fill ── */
  const [pendingAssignmentId, setPendingAssignmentId] = useState("");
  const [pendingCollectionPointId, setPendingCollectionPointId] = useState("");

  /* ── load record in edit mode ── */
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingRecord(true);
    (binCollectionEventApi.read(id) as Promise<any>)
      .then((data: any) => {
        setRecord(data);
        applyCompanyProjectFromRecord(data);
      })
      .catch(() => Swal.fire(t("common.error"), t("common.fetch_failed"), "error"))
      .finally(() => setLoadingRecord(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── pre-fill form from record (edit mode) ── */
  useEffect(() => {
    if (!isEdit || !record) return;

    const assignmentId = String(record.trip_assignment_id ?? "");
    const cpId = String(
      record.trip_collection_point_id ??
      (record.trip_collection_point as any)?.unique_id ??
      (record.trip_collection_point as any)?.id ??
      "",
    );
    const binId = String(record.bin_id ?? record.bin?.unique_id ?? record.bin?.id ?? "");

    setForm((prev) => ({
      ...prev,
      trip_assignment_id: assignmentId,
      trip_collection_point_id: cpId,
      bin_id: binId,
      collection_date: String(record.collection_date ?? ""),
      collected_weight_kg: record.collected_weight_kg == null ? "" : String(record.collected_weight_kg),
      status: (record.status as FormState["status"]) ?? "Collected",
      status_reason: String(record.status_reason ?? ""),
      driver_latitude: String(record.driver_latitude ?? ""),
      driver_longitude: String(record.driver_longitude ?? ""),
      notes: String(record.notes ?? ""),
    }));

    if (assignmentId) setPendingAssignmentId(assignmentId);
    if (cpId) setPendingCollectionPointId(cpId);
  }, [isEdit, record]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── load Trip Assignments when company + project are ready — only
     bin-collection-type trip plans are in scope for this form (bins are
     never collected on a household round). ── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) return;
    setFetchingDropdowns(true);
    const params = { company_id: companyUniqueId, project_id: projectId };
    (dailyTripAssignmentApi.readAll({ params }) as Promise<any[]>)
      .then((assignRes) => {
        setAllAssignments(normalizeList(assignRes).filter((a: any) => a?.collection_types?.has_bin));
      })
      .catch(() => setAllAssignments([]))
      .finally(() => setFetchingDropdowns(false));
  }, [companyUniqueId, projectId]);

  /* ── load collection-point/bin stops when the assignment changes ── */
  useEffect(() => {
    if (!form.trip_assignment_id) {
      setRawTripCPs([]);
      setExistingEvents([]);
      return;
    }
    setLoadingCPs(true);
    const params = { trip_assignment_id: form.trip_assignment_id };
    Promise.all([
      (dailyTripCollectionPointApi.readAll({ params }) as Promise<any[]>).catch(() => []),
      (binCollectionEventApi.readAll({ params }) as Promise<any[]>).catch(() => []),
    ])
      .then(([tripCPs, events]) => {
        setRawTripCPs(normalizeList(tripCPs));
        setExistingEvents(normalizeList(events));
      })
      .catch(() => {
        setRawTripCPs([]);
        setExistingEvents([]);
      })
      .finally(() => setLoadingCPs(false));
  }, [form.trip_assignment_id]);

  /* ── pending flush: assignment ── */
  useEffect(() => {
    if (!pendingAssignmentId || allAssignments.length === 0) return;
    if (allAssignments.some((a: any) => String(a?.unique_id ?? a?.id ?? "") === pendingAssignmentId)) {
      setForm((prev) => ({ ...prev, trip_assignment_id: pendingAssignmentId }));
      setPendingAssignmentId("");
    }
  }, [pendingAssignmentId, allAssignments]);

  /* ── pending flush: collection point (edit mode — stops load after
     assignment resolves). The stop's own bin_id is already correct in
     form.bin_id from the pre-fill effect's record data; here we just wait
     for rawTripCPs to confirm the stop actually exists before clearing the
     pending marker (so the Select shows it as selected rather than blank). ── */
  useEffect(() => {
    if (!pendingCollectionPointId || rawTripCPs.length === 0) return;
    if (rawTripCPs.some((cp: any) => stopIdOf(cp) === pendingCollectionPointId)) {
      setPendingCollectionPointId("");
    }
  }, [pendingCollectionPointId, rawTripCPs]);

  useEffect(() => {
    if (!isEdit || !record || rawTripCPs.length === 0) return;

    const currentMatches = rawTripCPs.some((cp: any) => stopIdOf(cp) === form.trip_collection_point_id);
    if (currentMatches) return;

    const recordCollectionPointId = collectionPointIdOf(record);
    const recordBinId = binIdOf(record);
    const matchingStop = rawTripCPs.find((stop: any) => {
      const sameCollectionPoint = recordCollectionPointId
        ? collectionPointIdOf(stop) === recordCollectionPointId
        : true;
      const sameBin = recordBinId ? binIdOf(stop) === recordBinId : true;
      return sameCollectionPoint && sameBin;
    });

    if (!matchingStop) return;

    setForm((prev) => ({
      ...prev,
      trip_collection_point_id: stopIdOf(matchingStop),
      bin_id: binIdOf(matchingStop) || prev.bin_id,
    }));
    setPendingCollectionPointId("");
  }, [form.trip_collection_point_id, isEdit, rawTripCPs, record]);

  /* ── assignments filtered by company + project (already applied via the
     fetch params above) + the selected Collection Date ── */
  const filteredAssignmentOptions = useMemo(() => {
    const dateFiltered = form.collection_date
      ? allAssignments.filter((a: any) => String(a?.trip_date ?? "") === form.collection_date)
      : allAssignments;
    return dateFiltered
      .map((a: any) => ({
        value: String(a.unique_id ?? ""),
        label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}`,
      }))
      .filter((o: any) => o.value);
  }, [allAssignments, form.collection_date]);

  /* ── District / City auto-derived (read-only) from the selected Trip
     Assignment's location — never user-selected. ── */
  const selectedAssignment = useMemo(
    () => allAssignments.find((a: any) => String(a?.unique_id ?? a?.id ?? "") === form.trip_assignment_id),
    [allAssignments, form.trip_assignment_id]
  );
  const derivedDistrictName = selectedAssignment?.panchayat?.district_name ?? selectedAssignment?.zone?.district_name ?? "";
  const derivedCityName = selectedAssignment?.panchayat?.city_name ?? selectedAssignment?.zone?.city_name ?? "";

  const eventCollectedByStopId = useMemo(() => {
    const ids = new Set<string>();
    existingEvents.forEach((event: any) => {
      if (!isCollectedEvent(event)) return;
      if (isEdit && id && String(event?.unique_id ?? event?.id ?? "") === id) return;
      const stopId = String(
        event?.trip_collection_point_id ??
        event?.trip_collection_point?.unique_id ??
        event?.trip_collection_point?.id ??
        "",
      );
      if (stopId) ids.add(stopId);
    });
    return ids;
  }, [existingEvents, id, isEdit]);

  const eventCollectedByBinId = useMemo(() => {
    const ids = new Set<string>();
    existingEvents.forEach((event: any) => {
      if (!isCollectedEvent(event)) return;
      if (isEdit && id && String(event?.unique_id ?? event?.id ?? "") === id) return;
      const binId = binIdOf(event);
      if (binId) ids.add(binId);
    });
    return ids;
  }, [existingEvents, id, isEdit]);

  const isStopAlreadyCollected = (stop: any): boolean => {
    const stopId = stopIdOf(stop);
    const binId = binIdOf(stop);
    return (
      Boolean(stopId && eventCollectedByStopId.has(stopId)) ||
      Boolean(binId && eventCollectedByBinId.has(binId))
    );
  };

  /* ── Collection Point options: one option per collection-point/bin stop.
     The option text includes the collection point plus bin type/name, so the
     separate Bin dropdown reflects the same selected stop clearly. ── */
  const currentStopId = String(form.trip_collection_point_id ?? "");
  const collectionPointOptions = useMemo(() =>
    rawTripCPs
      .map((stop: any) => {
        const value = stopIdOf(stop);
        const isCurrent = value === currentStopId;
        const isCollected = isStopAlreadyCollected(stop);
        return {
          value,
          label: collectionPointStopLabel({
            ...stop,
            is_collected: isCollected,
            status: isCollected ? "Collected" : "Pending",
            collection_status: isCollected ? "Collected" : "Pending",
          }, value),
          disabled: isCollected && !isCurrent,
        };
      })
      .filter((option) => option.value),
    [rawTripCPs, currentStopId, eventCollectedByStopId, eventCollectedByBinId]
  );

  const collectionPointOptionsWithCurrent = useMemo(() => {
    if (!isEdit || !record || !currentStopId) return collectionPointOptions;
    if (collectionPointOptions.some((option) => option.value === currentStopId)) {
      return collectionPointOptions;
    }

    return [
      {
        value: currentStopId,
        label: collectionPointStopLabel(record, currentStopId),
      },
      ...collectionPointOptions,
    ];
  }, [collectionPointOptions, currentStopId, isEdit, record]);

  /* ── Selected stop → its bin, shown read-only. For grouped collection
     points, choosing the point selects the next uncollected bin stop. ── */
  const selectedStop = useMemo(
    () => rawTripCPs.find((cp: any) => stopIdOf(cp) === currentStopId),
    [rawTripCPs, currentStopId]
  );

  useEffect(() => {
    if (!selectedStop) return;
    const selectedBinId = binIdOf(selectedStop);
    if (!selectedBinId || form.bin_id === selectedBinId) return;
    setForm((prev) => ({ ...prev, bin_id: selectedBinId }));
  }, [form.bin_id, selectedStop]);

  const selectedBinLabel = selectedStop
    ? binLabelOf(selectedStop)
    : isEdit && record && currentStopId
      ? binLabelOf(record, form.bin_id)
      : "";
  const binOptions = useMemo(() => {
    if (!form.bin_id) return [];

    return [
      {
        value: form.bin_id,
        label: selectedBinLabel || form.bin_id,
      },
    ];
  }, [form.bin_id, selectedBinLabel]);

  const handleCollectionPointChange = (stopId: string) => {
    const stop = rawTripCPs.find((cp: any) => stopIdOf(cp) === stopId);
    setForm((prev) => ({
      ...prev,
      trip_collection_point_id: stopId,
      bin_id: binIdOf(stop),
    }));
  };

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyUniqueId || !projectId) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }
    if (!form.trip_assignment_id || !form.bin_id) {
      Swal.fire(t("common.warning"), "Trip Assignment and Bin are required.", "warning");
      return;
    }
    // A5: collected_weight_kg is only required when status is Collected
    // (nullable on the backend for Not Collected / Collect Later).
    if (form.status === "Collected" && !form.collected_weight_kg) {
      Swal.fire(t("common.warning"), "Collected weight is required when status is Collected.", "warning");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        company_id_input: companyUniqueId,
        project_id_input: projectId,
        trip_assignment_id: form.trip_assignment_id,
        bin_id: form.bin_id,
        status: form.status,
      };
      if (form.trip_collection_point_id) payload.trip_collection_point_id = form.trip_collection_point_id;
      if (form.collection_date) payload.collection_date = form.collection_date;
      payload.collected_weight_kg =
        form.status === "Collected" ? Number(form.collected_weight_kg) : null;
      if (form.status_reason) payload.status_reason = form.status_reason;
      if (form.driver_latitude) payload.driver_latitude = form.driver_latitude;
      if (form.driver_longitude) payload.driver_longitude = form.driver_longitude;
      if (form.notes) payload.notes = form.notes;

      if (isEdit && id) {
        await binCollectionEventApi.update(id, payload);
        Swal.fire({ icon: "success", title: t("common.success"), text: t("common.updated_success"), timer: 1500, showConfirmButton: false });
      } else {
        await binCollectionEventApi.create(payload);
        Swal.fire({ icon: "success", title: t("common.success"), text: t("common.added_success"), timer: 1500, showConfirmButton: false });
      }
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? t("common.save_failed_desc"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (loadingRecord) {
    return (
      <div className="flex items-center justify-center p-10">
        <i className="pi pi-spin pi-spinner text-2xl text-blue-600" />
      </div>
    );
  }

  const title = isEdit
    ? `Edit Bin Collection Event${record?.unique_id ? ` — ${record.unique_id}` : ""}`
    : "Add Bin Collection Event";

  return (
    <div className="p-4 space-y-4">
      <ComponentCard title={title} desc={isEdit ? "Update the bin collection scan record" : "Record a bin collection scan event manually"}>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Company / Project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("admin.nav.company")} *</Label>
              <select
                value={companyUniqueId || ""}
                onChange={(e) => onCompanyChange(e.target.value)}
                disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId) || companies.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{t("common.select_item_placeholder", { item: t("admin.nav.company") })}</option>
                {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label>{t("admin.nav.project")} *</Label>
              <select
                value={projectId || ""}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={!companyUniqueId || projects.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{companyUniqueId ? t("common.select_item_placeholder", { item: t("admin.nav.project") }) : "Select a company first"}</option>
                {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row 1: Collection Date + Trip Assignment — the date narrows which
              (bin-collection-type) trip assignments are selectable. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Collection Date</Label>
              <Input
                type="date"
                value={form.collection_date}
                onChange={(e) => {
                  set("collection_date")(e.target.value);
                  setForm((prev) => ({ ...prev, trip_assignment_id: "", trip_collection_point_id: "", bin_id: "" }));
                }}
              />
            </div>
            <div>
              <Label>Trip Assignment <span className="text-red-500">*</span></Label>
              <Select
                options={filteredAssignmentOptions}
                value={form.trip_assignment_id}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, trip_assignment_id: v, trip_collection_point_id: "", bin_id: "" }));
                }}
                placeholder={fetchingDropdowns ? "Loading..." : "Select Trip Assignment"}
                disabled={fetchingDropdowns || !projectId}
              />
            </div>
          </div>

          {/* Row 2: District + City — read-only, auto-filled from the
              selected Trip Assignment's location. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>District</Label>
              <Input disabled className="bg-gray-100" value={derivedDistrictName} placeholder="Select a trip assignment" />
            </div>
            <div>
              <Label>City</Label>
              <Input disabled className="bg-gray-100" value={derivedCityName} placeholder="Select a trip assignment" />
            </div>
          </div>

          {/* Row 3: Collection Point grouped across its bin stops + selected
              Bin, shown read-only. A fully collected point is labeled
              "(Collected)" and locked from further entry (except the one
              currently saved on this record). */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Collection Point</Label>
              <Select
                options={collectionPointOptionsWithCurrent}
                value={form.trip_collection_point_id}
                onChange={handleCollectionPointChange}
                placeholder={
                  loadingCPs ? "Loading..." :
                  form.trip_assignment_id ? "Select Collection Point" : "Select assignment first"
                }
                disabled={!form.trip_assignment_id || loadingCPs}
              />
            </div>
            <div>
              <Label>Bin <span className="text-red-500">*</span></Label>
              <Select
                options={binOptions}
                value={form.bin_id}
                onChange={set("bin_id")}
                placeholder="Select a collection point"
                disabled
              />
            </div>
          </div>

          {/* Zone / Ward — auto-derived server-side from the trip assignment's
              wards M2M (single-ward case), read-only display only (A5). */}
          {isEdit && (record?.ward_name || record?.zone_name) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ward</Label>
                <Input disabled className="bg-gray-100" value={record?.ward_name ?? ""} />
              </div>
              <div>
                <Label>Zone</Label>
                <Input
                  disabled
                  className="bg-gray-100"
                  value={
                    typeof record?.zone_name === "object" && record?.zone_name !== null
                      ? String((record.zone_name as Record<string, unknown>).zone_name ?? "")
                      : String(record?.zone_name ?? "")
                  }
                />
              </div>
            </div>
          )}

          {/* Row: Status + Collected Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status <span className="text-red-500">*</span></Label>
              <Select
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    status: v as FormState["status"],
                    collected_weight_kg: v === "Collected" ? prev.collected_weight_kg : "",
                  }))
                }
                placeholder="Select status"
              />
            </div>
            <div>
              <Label>
                Collected Weight (kg)
                {form.status === "Collected" && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.collected_weight_kg}
                onChange={(e) => set("collected_weight_kg")(e.target.value)}
                placeholder="e.g. 12.5"
                disabled={form.status !== "Collected"}
                required={form.status === "Collected"}
              />
            </div>
          </div>

          {/* Status Reason — required context for Not Collected / Collect Later */}
          {form.status !== "Collected" && (
            <div>
              <Label>Status Reason</Label>
              <Input
                value={form.status_reason}
                onChange={(e) => set("status_reason")(e.target.value)}
                placeholder="e.g. Bin inaccessible, vehicle breakdown..."
              />
            </div>
          )}

          {/* GPS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>GPS Latitude</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  value={form.driver_latitude}
                  onChange={(e) => set("driver_latitude")(e.target.value)}
                  placeholder="e.g. 11.1271"
                />
                <AutoDetectLocationButton
                  onDetected={({ latitude, longitude }) => {
                    set("driver_latitude")(String(latitude));
                    set("driver_longitude")(String(longitude));
                  }}
                  label="Detect"
                  className="shrink-0 whitespace-nowrap"
                  title="Auto-detect current GPS coordinates"
                />
              </div>
            </div>
            <div>
              <Label>GPS Longitude</Label>
              <Input
                type="number"
                step="any"
                value={form.driver_longitude}
                onChange={(e) => set("driver_longitude")(e.target.value)}
                placeholder="e.g. 78.6569"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
