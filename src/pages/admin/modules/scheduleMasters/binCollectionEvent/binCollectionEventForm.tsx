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

type BinCERecord = {
  unique_id?: string;
  trip_assignment_id?: string;
  trip_collection_point_id?: string | null;
  bin_id?: string | null;
  collection_point_id?: string | null;
  panchayat_id?: string | null;
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
  company_id?: string;
  project_name?: string;
  project_id?: string;
  panchayat_name?: string | null;
  ward_name?: string | null;
  zone_name?: string | null;
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
  const LIST_PATH = `/${encScheduleMasters}/${encBinCollectionEvent}`;

  /* ── record loading (edit mode) ── */
  const [record, setRecord] = useState<BinCERecord | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(isEdit);

  /* ── form state ── */
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

  /* ── location filter state ── */
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

  /* ── pending IDs/names for edit pre-fill (applied once option lists load) ── */
  const [pendingAssignmentId, setPendingAssignmentId] = useState("");
  const [pendingCollectionPointId, setPendingCollectionPointId] = useState("");
  const [pendingBinId, setPendingBinId] = useState("");
  /* location filters — matched once option lists are ready */
  const [pendingPanchayatId, setPendingPanchayatId] = useState("");
  const [pendingWardName, setPendingWardName] = useState("");
  const [pendingZoneName, setPendingZoneName] = useState("");

  /* ── load record in edit mode ── */
  useEffect(() => {
    if (!isEdit || !id) return;
    setLoadingRecord(true);
    (binCollectionEventApi.get(id) as Promise<any>)
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
    const cpId = String(record.trip_collection_point_id ?? "");
    const binId = String(record.bin_id ?? "");

    setForm((prev) => ({
      ...prev,
      trip_assignment_id: assignmentId,
      collected_weight_kg: String(record.collected_weight_kg ?? ""),
      driver_latitude: String(record.driver_latitude ?? ""),
      driver_longitude: String(record.driver_longitude ?? ""),
      notes: String(record.notes ?? ""),
    }));

    if (assignmentId) setPendingAssignmentId(assignmentId);
    if (cpId) setPendingCollectionPointId(cpId);
    if (binId) setPendingBinId(binId);

    /* store location values as pending — option lists may not be ready yet */
    if (record.panchayat_id) {
      setPendingPanchayatId(String(record.panchayat_id));
    } else {
      if (record.ward_name) setPendingWardName(String(record.ward_name));
      if (record.zone_name) setPendingZoneName(String(record.zone_name));
    }
  }, [isEdit, record]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── load dropdown options (runs for both create and edit) ── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) return;
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
  }, [companyUniqueId, projectId]);

  /* ── load collection points when assignment changes ── */
  useEffect(() => {
    if (!form.trip_assignment_id) {
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
  }, [form.trip_assignment_id]);

  /* ── apply pending assignment once assignment options load ── */
  useEffect(() => {
    if (!pendingAssignmentId || assignmentOptions.length === 0) return;
    if (assignmentOptions.some((o) => o.value === pendingAssignmentId)) {
      setForm((prev) => ({ ...prev, trip_assignment_id: pendingAssignmentId }));
      setPendingAssignmentId("");
    }
  }, [pendingAssignmentId, assignmentOptions]);

  /* ── apply pending collection point once collection point options load ── */
  useEffect(() => {
    if (!pendingCollectionPointId || collectionPointOptions.length === 0) return;
    if (collectionPointOptions.some((o) => o.value === pendingCollectionPointId)) {
      setForm((prev) => ({ ...prev, trip_collection_point_id: pendingCollectionPointId }));
      setPendingCollectionPointId("");
    }
  }, [pendingCollectionPointId, collectionPointOptions]);

  /* ── apply pending bin once bin options load ── */
  useEffect(() => {
    if (!pendingBinId || binOptions.length === 0) return;
    if (binOptions.some((o) => o.value === pendingBinId)) {
      setForm((prev) => ({ ...prev, bin_id: pendingBinId }));
      setPendingBinId("");
    }
  }, [pendingBinId, binOptions]);

  /* ── apply pending panchayat filter once panchayat options load ── */
  useEffect(() => {
    if (!pendingPanchayatId || panchayatOptions.length === 0) return;
    if (panchayatOptions.some((o) => o.value === pendingPanchayatId)) {
      setFilterPanchayat(pendingPanchayatId);
      setPendingPanchayatId("");
    }
  }, [pendingPanchayatId, panchayatOptions]);

  /* ── apply pending zone filter once zone options load ── */
  useEffect(() => {
    if (!pendingZoneName || zoneOptions.length === 0) return;
    const matched = zoneOptions.find(
      (o) => o.label.trim().toLowerCase() === pendingZoneName.trim().toLowerCase()
    );
    if (matched) {
      setFilterZone(matched.value);
      setPendingZoneName("");
    }
  }, [pendingZoneName, zoneOptions]);

  /* ── apply pending ward filter once ward options load ── */
  useEffect(() => {
    if (!pendingWardName || wardOptions.length === 0) return;
    const matched = wardOptions.find(
      (o) => o.label.trim().toLowerCase() === pendingWardName.trim().toLowerCase()
    );
    if (matched) {
      setFilterWard(matched.value);
      setPendingWardName("");
    }
  }, [pendingWardName, wardOptions]);

  /* ── ward options filtered by zone ── */
  const filteredWardOptions = filterZone
    ? (() => {
        const selectedZoneName = zoneOptions.find((z) => z.value === filterZone)?.label ?? "";
        if (!selectedZoneName) return wardOptions;
        return wardOptions.filter((w) => {
          const rawWard = allRawWards.find((rw: any) => String(rw.unique_id ?? "") === w.value);
          if (!rawWard) return true;
          return String(rawWard.zone_name ?? "") === selectedZoneName;
        });
      })()
    : wardOptions;

  /* ── filter assignments by selected panchayat or ward ── */
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

  /* ── loading spinner while fetching record ── */
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

          {/* Location filters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Zone {filterZone && !filterPanchayat ? <span className="text-red-500">*</span> : null}</Label>
              <Select
                options={zoneOptions}
                value={filterZone}
                onChange={(v) => {
                  setFilterZone(v);
                  setFilterWard("");
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
              <Label>Panchayat</Label>
              <Select
                options={panchayatOptions}
                value={filterPanchayat}
                onChange={(v) => {
                  setFilterPanchayat(v);
                  if (v) { setFilterZone(""); setFilterWard(""); }
                  set("trip_assignment_id")("");
                  set("trip_collection_point_id")("");
                }}
                placeholder="Select Panchayat"
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
              {saving ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
