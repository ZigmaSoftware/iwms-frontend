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
import {
  binCollectionEventApi,
  dailyTripAssignmentApi,
  dailyTripCollectionPointApi,
  zoneApi,
  panchayatApi,
  wardApi,
} from "@/helpers/admin";
import { adminApi } from "@/helpers/admin/registry";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";

type BinCEDetail = {
  unique_id?: string;
  trip_plan?: { display_code?: string };
  collection_point?: { cp_name?: string };
  bin?: { bin_name?: string; bin_capacity?: number; bin_type?: string };
  waste_type?: { waste_type_name?: string };
  vehicle?: { vehicle_no?: string };
  effective_staff_template?: any;
  collected_weight_kg?: string | number;
  driver_latitude?: string | number | null;
  driver_longitude?: string | number | null;
  notes?: string | null;
  created_at?: string;
  company_name?: string;
  project_name?: string;
  [key: string]: unknown;
};

type SelectOption = { value: string; label: string };

type FormState = {
  trip_assignment_id: string;
  trip_collection_point_id: string;
  bin_id: string;
  collected_weight_kg: string;
  driver_latitude: string;
  driver_longitude: string;
  notes: string;
};

const field = (label: string, value: unknown) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-800 font-medium">{String(value ?? "-")}</span>
  </div>
);

const formatDate = (val?: string) => {
  if (!val) return "-";
  return new Date(val).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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

const toOptions = (items: any[], valueKey: string, labelKey: string): SelectOption[] =>
  items
    .map((item) => ({ value: String(item?.[valueKey] ?? ""), label: String(item?.[labelKey] ?? item?.[valueKey] ?? "") }))
    .filter((o) => o.value);

export default function BinCollectionEventForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const routeState = location.state as { record?: BinCEDetail; companyUniqueId?: string; projectId?: string } | null;
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
  const LIST_PATH = `/${encScheduleMasters}/${encBinCollectionEvent}`;

  /* ── view mode state ── */
  const [record, setRecord] = useState<BinCEDetail | null>(routeState?.record ?? null);
  const [loading, setLoading] = useState(isEdit && !routeState?.record);

  /* ── create mode state ── */
  const [form, setForm] = useState<FormState>({
    trip_assignment_id: "",
    trip_collection_point_id: "",
    bin_id: "",
    collected_weight_kg: "",
    driver_latitude: "",
    driver_longitude: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  /* ── location filter state (zone → panchayat/ward to filter assignments) ── */
  const [filterZone, setFilterZone] = useState("");
  const [filterPanchayat, setFilterPanchayat] = useState("");
  const [filterWard, setFilterWard] = useState("");
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [allRawWards, setAllRawWards] = useState<any[]>([]);
  const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
  const [panchayatOptions, setPanchayatOptions] = useState<SelectOption[]>([]);
  const [wardOptions, setWardOptions] = useState<SelectOption[]>([]);

  /* ── dropdown options ── */
  const [assignmentOptions, setAssignmentOptions] = useState<SelectOption[]>([]);
  const [collectionPointOptions, setCollectionPointOptions] = useState<SelectOption[]>([]);
  const [binOptions, setBinOptions] = useState<SelectOption[]>([]);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);

  /* ── load view record ── */
  useEffect(() => {
    if (!isEdit || !id) return;
    if (routeState?.record) {
      applyCompanyProjectFromRecord(routeState.record);
      return;
    }
    setLoading(true);
    (binCollectionEventApi.get(id) as Promise<any>)
      .then((data: any) => {
        setRecord(data);
        applyCompanyProjectFromRecord(data);
      })
      .catch(() => Swal.fire(t("common.error"), t("common.fetch_failed"), "error"))
      .finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── load dropdown options for create ── */
  useEffect(() => {
    if (isEdit || !companyUniqueId || !projectId) return;
    setFetchingDropdowns(true);
    const params = { company_id: companyUniqueId, project_id: projectId };
    Promise.all([
      (dailyTripAssignmentApi.list({ params }) as Promise<any[]>).catch(() => []),
      (adminApi.bins.list({ params }) as Promise<any[]>).catch(() => []),
      (zoneApi.list({ params }) as Promise<any[]>).catch(() => []),
      (panchayatApi.list({ params }) as Promise<any[]>).catch(() => []),
      (wardApi.list({ params }) as Promise<any[]>).catch(() => []),
    ]).then(([assignRes, binRes, zoneRes, panchRes, wardRes]) => {
      const assignments = normalizeList(assignRes);
      const wards = normalizeList(wardRes);
      setAllAssignments(assignments);
      setAllRawWards(wards);
      setAssignmentOptions(
        assignments
          .map((a: any) => ({
            value: String(a.unique_id ?? ""),
            label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}`,
          }))
          .filter((o: any) => o.value)
      );
      setBinOptions(toOptions(normalizeList(binRes), "unique_id", "bin_name"));
      setZoneOptions(toOptions(normalizeList(zoneRes), "unique_id", "zone_name"));
      setPanchayatOptions(toOptions(normalizeList(panchRes), "unique_id", "panchayat_name"));
      setWardOptions(toOptions(wards, "unique_id", "ward_name"));
    }).finally(() => setFetchingDropdowns(false));
  }, [isEdit, companyUniqueId, projectId]);

  /* ── load collection points when assignment changes ── */
  useEffect(() => {
    if (isEdit || !form.trip_assignment_id) {
      setCollectionPointOptions([]);
      return;
    }
    (dailyTripCollectionPointApi.list({ params: { trip_assignment_id: form.trip_assignment_id } }) as Promise<any[]>)
      .then((res) => {
        const list = normalizeList(res);
        setCollectionPointOptions(
          list.map((cp: any) => ({
            value: String(cp.unique_id ?? ""),
            label: cp.collection_point?.cp_name ?? cp.collection_point_id ?? cp.unique_id ?? "",
          })).filter((o) => o.value)
        );
      })
      .catch(() => setCollectionPointOptions([]));
  }, [isEdit, form.trip_assignment_id]);

  /* ── ward options filtered by zone ─────────────────────────────────────────
     The ward serializer returns zone_id as the zone's integer PK (no to_field),
     so comparing against filterZone (which is the zone's unique_id string) always
     fails.  Instead look up the selected zone's zone_name from zoneOptions and
     compare against rawWard.zone_name which the serializer does populate.        */
  const filteredWardOptions = filterZone
    ? (() => {
        const selectedZoneName = zoneOptions.find((z) => z.value === filterZone)?.label ?? "";
        if (!selectedZoneName) return wardOptions; // zone not found — show all
        return wardOptions.filter((w) => {
          const rawWard = allRawWards.find((rw: any) => String(rw.unique_id ?? "") === w.value);
          if (!rawWard) return true; // can't resolve — show all
          return String(rawWard.zone_name ?? "") === selectedZoneName;
        });
      })()
    : wardOptions;

  /* ── filter assignments by selected panchayat or ward ───────────────────────
     The serializer exposes nested objects:
       a.ward      → { unique_id, ward_name }  (SerializerMethodField)
       a.panchayat → { unique_id, panchayat_name }  (SerializerMethodField)
     whereas a.ward_id / a.panchayat_id are raw integer PKs — NOT unique_id strings.
     Always prefer the nested objects so the comparison works.                    */
  const filteredAssignmentOptions = (() => {
    if (!filterPanchayat && !filterWard) return assignmentOptions;
    return allAssignments
      .filter((a: any) => {
        const aPanchayat = String(a.panchayat?.unique_id ?? "");
        const aWard = String(a.ward?.unique_id ?? "");
        if (filterPanchayat && aPanchayat !== filterPanchayat) return false;
        if (filterWard && aWard !== filterWard) return false;
        return true;
      })
      .map((a: any) => ({
        value: String(a.unique_id ?? ""),
        label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}`,
      }))
      .filter((o) => o.value);
  })();

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
    // Zone and Ward must be filled together; panchayat is standalone
    if (filterZone && !filterWard) {
      Swal.fire(t("common.warning"), "Please select a Ward when Zone is selected.", "warning");
      return;
    }
    if (filterWard && !filterZone) {
      Swal.fire(t("common.warning"), "Please select a Zone when Ward is selected.", "warning");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        company_id_input: companyUniqueId,
        project_id_input: projectId,
        trip_assignment_id: form.trip_assignment_id,
        bin_id: form.bin_id,
      };
      if (form.trip_collection_point_id) payload.trip_collection_point_id = form.trip_collection_point_id;
      if (form.collected_weight_kg) payload.collected_weight_kg = Number(form.collected_weight_kg);
      if (form.driver_latitude) payload.driver_latitude = form.driver_latitude;
      if (form.driver_longitude) payload.driver_longitude = form.driver_longitude;
      if (form.notes) payload.notes = form.notes;

      await binCollectionEventApi.create(payload);
      Swal.fire({ icon: "success", title: t("common.success"), text: t("common.added_success"), timer: 1500, showConfirmButton: false });
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? t("common.save_failed_desc"), "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── create form ── */
  if (!isEdit) {
    return (
      <div className="p-4 space-y-4">
        <ComponentCard title="Add Bin Collection Event" desc="Record a bin collection scan event manually">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company / Project (superadmin) */}
            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("admin.nav.company")}</Label>
                  <select
                    value={companyUniqueId || ""}
                    onChange={(e) => onCompanyChange(e.target.value)}
                    disabled={Boolean(loggedInCompanyUniqueId) || companies.length === 0}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">{t("common.select_item_placeholder", { item: t("admin.nav.company") })}</option>
                    {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>{t("admin.nav.project")}</Label>
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
            )}

            {/* Location filters:
                  • Panchayat alone is sufficient (Zone + Ward not needed)
                  • Zone + Ward must be selected together (both required if either is picked)
                  • Panchayat and Zone/Ward are mutually exclusive                     */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Zone {filterZone && !filterPanchayat ? <span className="text-red-500">*</span> : null}</Label>
                <Select
                  options={zoneOptions}
                  value={filterZone}
                  onChange={(v) => {
                    setFilterZone(v);
                    setFilterWard("");          // zone change resets ward
                    set("trip_assignment_id")("");
                    set("trip_collection_point_id")("");
                  }}
                  placeholder={fetchingDropdowns ? "Loading..." : "Select Zone"}
                  disabled={fetchingDropdowns || !projectId || Boolean(filterPanchayat)}
                />
              </div>
              <div>
                <Label>Ward {filterZone && !filterPanchayat ? <span className="text-red-500">*</span> : null}</Label>
                <Select
                  options={filteredWardOptions}
                  value={filterWard}
                  onChange={(v) => {
                    setFilterWard(v);
                    set("trip_assignment_id")("");
                    set("trip_collection_point_id")("");
                  }}
                  placeholder={filterZone ? "Select Ward" : "Select Zone first"}
                  disabled={fetchingDropdowns || !projectId || !filterZone || Boolean(filterPanchayat)}
                />
              </div>
              <div>
                <Label>PLB (Participating Local Bodies)</Label>
                <Select
                  options={panchayatOptions}
                  value={filterPanchayat}
                  onChange={(v) => {
                    setFilterPanchayat(v);
                    if (v) { setFilterZone(""); setFilterWard(""); } // panchayat clears zone+ward
                    set("trip_assignment_id")("");
                    set("trip_collection_point_id")("");
                  }}
                  placeholder="Select PLB"
                  disabled={fetchingDropdowns || !projectId || Boolean(filterZone) || Boolean(filterWard)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trip Assignment <span className="text-red-500">*</span></Label>
                <Select
                  options={filteredAssignmentOptions}
                  value={form.trip_assignment_id}
                  onChange={(v) => { set("trip_assignment_id")(v); set("trip_collection_point_id")(""); }}
                  placeholder={fetchingDropdowns ? "Loading..." : "Select Trip Assignment"}
                  disabled={fetchingDropdowns || !projectId}
                />
              </div>
              <div>
                <Label>Collection Point</Label>
                <Select
                  options={collectionPointOptions}
                  value={form.trip_collection_point_id}
                  onChange={set("trip_collection_point_id")}
                  placeholder={form.trip_assignment_id ? "Select Collection Point" : "Select assignment first"}
                  disabled={!form.trip_assignment_id}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bin <span className="text-red-500">*</span></Label>
                <Select
                  options={binOptions}
                  value={form.bin_id}
                  onChange={set("bin_id")}
                  placeholder={fetchingDropdowns ? "Loading..." : "Select Bin"}
                  disabled={fetchingDropdowns || !projectId}
                />
              </div>
              <div>
                <Label>Collected Weight (kg)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.collected_weight_kg}
                  onChange={(e) => set("collected_weight_kg")(e.target.value)}
                  placeholder="e.g. 12.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>GPS Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.driver_latitude}
                  onChange={(e) => set("driver_latitude")(e.target.value)}
                  placeholder="e.g. 11.1271"
                />
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
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>
    );
  }

  /* ── view mode ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <i className="pi pi-spin pi-spinner text-2xl text-blue-600" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Record not found.</p>
        <button
          onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
          className="mt-3 text-blue-600 underline text-sm"
        >
          Back to list
        </button>
      </div>
    );
  }

  const staffTemplate = record.effective_staff_template as any;
  const driverName = staffTemplate?.driver_id?.employee_name ?? staffTemplate?.driver?.employee_name ?? "-";
  const operatorName = staffTemplate?.operator_id?.employee_name ?? staffTemplate?.operator?.employee_name ?? "-";

  return (
    <div className="p-4 space-y-4">
      <ComponentCard title={`Bin Collection Event — ${record.unique_id ?? ""}`}>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {field("Event ID", record.unique_id)}
          {field("Trip Plan", record.trip_plan?.display_code)}
          {field("Collection Point", record.collection_point?.cp_name ?? (record.collection_point as any)?.cp_name)}
          {field("Bin", record.bin?.bin_name)}
          {field("Bin Type", record.bin?.bin_type)}
          {field("Bin Capacity (L)", record.bin?.bin_capacity)}
          {field("Waste Type", record.waste_type?.waste_type_name)}
          {field("Vehicle", record.vehicle?.vehicle_no)}
          {field("Driver", driverName)}
          {field("Operator", operatorName)}
          {field("Collected Weight (kg)", record.collected_weight_kg)}
          {field("GPS Latitude", record.driver_latitude ?? "-")}
          {field("GPS Longitude", record.driver_longitude ?? "-")}
          {field("Notes", record.notes ?? "-")}
          {field("Company", record.company_name)}
          {field("Project", record.project_name)}
          {field("Scanned At", formatDate(record.created_at))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            {t("common.back")}
          </button>
        </div>
      </ComponentCard>
    </div>
  );
}
