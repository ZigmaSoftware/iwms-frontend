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
import { adminApi } from "@/helpers/admin/registry";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";


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
    driver_latitude: "",
    driver_longitude: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  /* ── location cascade filter state (District + City only — user selectable) ── */
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterCity, setFilterCity] = useState("");

  /* ── raw lookup data ── */
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [allRawBins, setAllRawBins] = useState<any[]>([]);
  const [allRawCities, setAllRawCities] = useState<any[]>([]);
  const [rawTripCPs, setRawTripCPs] = useState<any[]>([]);

  /* ── dropdown option lists ── */
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  const [assignmentOptions, setAssignmentOptions] = useState<SelectOption[]>([]);
  const [collectionPointOptions, setCollectionPointOptions] = useState<SelectOption[]>([]);
  const [binOptions, setBinOptions] = useState<SelectOption[]>([]);
  const [fetchingDropdowns, setFetchingDropdowns] = useState(false);
  const [loadingCPs, setLoadingCPs] = useState(false);

  /* ── pending IDs for edit pre-fill ── */
  const [pendingAssignmentId, setPendingAssignmentId] = useState("");
  const [pendingCollectionPointId, setPendingCollectionPointId] = useState("");
  const [pendingBinId, setPendingBinId] = useState("");

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
    const cpId = String(record.trip_collection_point_id ?? "");
    const binId = String(record.bin_id ?? "");

    setForm((prev) => ({
      ...prev,
      trip_assignment_id: assignmentId,
      collection_date: String(record.collection_date ?? ""),
      collected_weight_kg: String(record.collected_weight_kg ?? ""),
      driver_latitude: String(record.driver_latitude ?? ""),
      driver_longitude: String(record.driver_longitude ?? ""),
      notes: String(record.notes ?? ""),
    }));

    if (assignmentId) setPendingAssignmentId(assignmentId);
    if (cpId) setPendingCollectionPointId(cpId);
    if (binId) setPendingBinId(binId);
  }, [isEdit, record]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── load dropdown data when company + project are ready ── */
  useEffect(() => {
    if (!companyUniqueId || !projectId) return;
    setFetchingDropdowns(true);
    const params = { company_id: companyUniqueId, project_id: projectId };
    Promise.all([
      (dailyTripAssignmentApi.readAll({ params }) as Promise<any[]>).catch(() => []),
      (adminApi.bins.readAll({ params }) as Promise<any[]>).catch(() => []),
      (adminApi.districts.readAll({ params }) as Promise<any[]>).catch(() => []),
      (adminApi.cities.readAll({ params }) as Promise<any[]>).catch(() => []),
    ]).then(([assignRes, binRes, districtRes, cityRes]) => {
      const assignments = normalizeList(assignRes);
      const bins = normalizeList(binRes);
      setAllAssignments(assignments);
      setAllRawBins(bins);
      setAllRawCities(normalizeList(cityRes));
      setAssignmentOptions(
        assignments
          .map((a: any) => ({
            value: String(a.unique_id ?? ""),
            label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}`,
          }))
          .filter((o: any) => o.value)
      );
      setBinOptions(toOptions(bins, "unique_id", "bin_name"));
      setDistrictOptions(toOptions(normalizeList(districtRes), "unique_id", "name"));
    }).finally(() => setFetchingDropdowns(false));
  }, [companyUniqueId, projectId]);

  /* ── load collection points + auto-fill location when assignment changes ── */
  useEffect(() => {
    if (!form.trip_assignment_id) {
      setCollectionPointOptions([]);
      setRawTripCPs([]);
      return;
    }
    setLoadingCPs(true);
    (dailyTripCollectionPointApi.readAll({ params: { trip_assignment_id: form.trip_assignment_id } }) as Promise<any[]>)
      .then((res) => {
        const list = normalizeList(res);
        setRawTripCPs(list);
        setCollectionPointOptions(
          list.map((cp: any) => ({
            value: String(cp.unique_id ?? ""),
            label: cp.collection_point?.cp_name ?? cp.collection_point_id ?? cp.unique_id ?? "",
          })).filter((o) => o.value)
        );

        // Auto-select first CP and its bin
        const first = list[0];
        if (first) {
          setForm((prev) => ({
            ...prev,
            trip_collection_point_id: String(first.unique_id ?? ""),
            bin_id: String(first.bin_id ?? ""),
          }));
        }
      })
      .catch(() => { setCollectionPointOptions([]); setRawTripCPs([]); })
      .finally(() => setLoadingCPs(false));
  }, [form.trip_assignment_id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── pending flush: assignment ── */
  useEffect(() => {
    if (!pendingAssignmentId || assignmentOptions.length === 0) return;
    if (assignmentOptions.some((o) => o.value === pendingAssignmentId)) {
      setForm((prev) => ({ ...prev, trip_assignment_id: pendingAssignmentId }));
      setPendingAssignmentId("");
    }
  }, [pendingAssignmentId, assignmentOptions]);

  /* ── pending flush: collection point (edit mode — CPs load after assignment resolves) ── */
  useEffect(() => {
    if (!pendingCollectionPointId || collectionPointOptions.length === 0) return;
    if (collectionPointOptions.some((o) => o.value === pendingCollectionPointId)) {
      setForm((prev) => ({ ...prev, trip_collection_point_id: pendingCollectionPointId }));
      setPendingCollectionPointId("");
    }
  }, [pendingCollectionPointId, collectionPointOptions]);

  /* ── pending flush: bin ── */
  useEffect(() => {
    if (!pendingBinId || binOptions.length === 0) return;
    if (binOptions.some((o) => o.value === pendingBinId)) {
      setForm((prev) => ({ ...prev, bin_id: pendingBinId }));
      setPendingBinId("");
    }
  }, [pendingBinId, binOptions]);

  /* ── assignments filtered by selected district + city ── */
  const cascadedCities = useMemo(() =>
    allRawCities
      .filter((c) => !filterDistrict || String(c?.district_id ?? "") === filterDistrict)
      .map((c) => ({ value: String(c?.unique_id ?? ""), label: String(c?.city_name ?? c?.name ?? "") }))
      .filter((o) => o.value),
    [allRawCities, filterDistrict]
  );

  const filteredAssignmentOptions = useMemo(() => {
    if (!filterDistrict && !filterCity) return assignmentOptions;
    return allAssignments
      .filter((a: any) => {
        if (filterCity) {
          const cityId = String(
            a.panchayat?.city_id ??
            (Array.isArray(a.wards) && a.wards[0]?.city_id) ??
            ""
          );
          if (cityId && cityId !== filterCity) return false;
        }
        return true;
      })
      .map((a: any) => ({
        value: String(a.unique_id ?? ""),
        label: `${a.unique_id ?? ""}${a.trip_plan?.display_code ? " — " + a.trip_plan.display_code : ""}`,
      }))
      .filter((o) => o.value);
  }, [allAssignments, assignmentOptions, filterDistrict, filterCity]);

  /* ── bins filtered by selected collection point ── */
  const filteredBinOptions = useMemo(() => {
    if (!form.trip_collection_point_id) return binOptions;
    const selectedTripCP = rawTripCPs.find((cp: any) => String(cp.unique_id ?? "") === form.trip_collection_point_id);
    if (!selectedTripCP) return binOptions;
    const cpId = String(selectedTripCP.collection_point_id ?? selectedTripCP.collection_point?.unique_id ?? "");
    if (!cpId) return binOptions;
    const filtered = allRawBins.filter((bin: any) =>
      String(bin.collection_point_id ?? bin.collection_point?.unique_id ?? "") === cpId
    );
    return filtered.length
      ? filtered.map((b: any) => ({ value: String(b.unique_id ?? ""), label: String(b.bin_name ?? b.unique_id ?? "") })).filter((o) => o.value)
      : binOptions;
  }, [form.trip_collection_point_id, rawTripCPs, allRawBins, binOptions]);

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
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        company_id_input: companyUniqueId,
        project_id_input: projectId,
        trip_assignment_id: form.trip_assignment_id,
        bin_id: form.bin_id,
      };
      if (form.trip_collection_point_id) payload.trip_collection_point_id = form.trip_collection_point_id;
      if (form.collection_date) payload.collection_date = form.collection_date;
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

          {/* Company / Project (superadmin only) */}
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

          {/* Row 1: District + City (optional pre-filter for assignment list) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>District</Label>
              <Select
                options={districtOptions}
                value={filterDistrict}
                onChange={(v) => {
                  setFilterDistrict(v);
                  setFilterCity("");
                  setForm((prev) => ({ ...prev, trip_assignment_id: "", trip_collection_point_id: "", bin_id: "" }));
                }}
                placeholder={fetchingDropdowns ? "Loading..." : "Select District"}
                disabled={fetchingDropdowns || !projectId}
              />
            </div>
            <div>
              <Label>City</Label>
              <Select
                options={cascadedCities}
                value={filterCity}
                onChange={(v) => {
                  setFilterCity(v);
                  setForm((prev) => ({ ...prev, trip_assignment_id: "", trip_collection_point_id: "", bin_id: "" }));
                }}
                placeholder={filterDistrict ? "Select City" : "Select District first"}
                disabled={fetchingDropdowns || !filterDistrict}
              />
            </div>
          </div>

          {/* Row 2: Trip Assignment + Collection Point */}
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label>Collection Point</Label>
              <Select
                options={collectionPointOptions}
                value={form.trip_collection_point_id}
                onChange={(v) => {
                  set("trip_collection_point_id")(v);
                  set("bin_id")("");
                }}
                placeholder={
                  loadingCPs ? "Loading..." :
                  form.trip_assignment_id ? "Select Collection Point" : "Select assignment first"
                }
                disabled={!form.trip_assignment_id || loadingCPs}
              />
            </div>
          </div>

          {/* Row 3: Bin + Collection Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bin <span className="text-red-500">*</span></Label>
              <Select
                options={filteredBinOptions}
                value={form.bin_id}
                onChange={set("bin_id")}
                placeholder={
                  loadingCPs ? "Loading..." :
                  form.trip_collection_point_id ? "Select Bin" :
                  form.trip_assignment_id ? "Select Collection Point first" :
                  fetchingDropdowns ? "Loading..." : "Select Bin"
                }
                disabled={fetchingDropdowns || !projectId}
              />
            </div>
            <div>
              <Label>Collection Date</Label>
              <Input
                type="date"
                value={form.collection_date}
                onChange={(e) => set("collection_date")(e.target.value)}
              />
            </div>
          </div>

          {/* Collected Weight */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* GPS */}
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
