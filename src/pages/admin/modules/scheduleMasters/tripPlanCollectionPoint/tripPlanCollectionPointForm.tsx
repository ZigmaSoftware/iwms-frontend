/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { adminApi } from "@/helpers/admin/registry";
import { tripPlanCollectionPointApi, tripPlanApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";
import { useCollectionPointLocationOptions } from "@/hooks/useCollectionPointLocationOptions";

type SelectOption = { value: string; label: string };

type FormState = {
  trip_plan_id: string;
  collection_point_id: string;
  bin_id: string;
  sequence: string;
  is_active: boolean;
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

const buildOptions = (items: any[], valueKey: string, labelKeys: string[]): SelectOption[] =>
  items.map((item) => ({
    value: String(item?.[valueKey] ?? ""),
    label: labelKeys.map((k) => item?.[k]).find((v) => v) ?? item?.[valueKey] ?? "",
  })).filter((o) => o.value);

export default function TripPlanCollectionPointForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isEdit = Boolean(id);
  const routeState = location.state as { companyUniqueId?: string; projectId?: string; record?: any } | null;

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

  const { encScheduleMasters, encTripPlanCollectionPoints } = getEncryptedRoute();
  const LIST_PATH = `/${encScheduleMasters}/${encTripPlanCollectionPoints}`;

  const [form, setForm] = useState<FormState>({
    trip_plan_id: "",
    collection_point_id: "",
    bin_id: "",
    sequence: "1",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [tripPlanOptions, setTripPlanOptions] = useState<SelectOption[]>([]);
  const [binOptions, setBinOptions] = useState<SelectOption[]>([]);
  const locationOptions = useCollectionPointLocationOptions(companyUniqueId, projectId);
  const collectionPointOptions = locationOptions.collectionPoints;

  // Pending IDs — set when record loads, flushed once each option list is ready (Radix pattern)
  const [pendingProjectCandidates, setPendingProjectCandidates] = useState<{
    projectUniqueId: string; projectId: string; projectName: string;
  } | null>(null);
  const [pendingTripPlanId, setPendingTripPlanId] = useState("");
  const [pendingCollectionPointId, setPendingCollectionPointId] = useState("");
  const [pendingBinId, setPendingBinId] = useState("");

  // Load trip plans
  useEffect(() => {
    if (!companyUniqueId) return;
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    tripPlanApi.readAll({ params }).then((data) => {
      setTripPlanOptions(buildOptions(normalizeList(data) as any[], "unique_id", ["display_code"]));
    }).catch(() => {});
  }, [companyUniqueId, projectId]);

  // Load bins when collection point selected
  useEffect(() => {
    if (!form.collection_point_id) { setBinOptions([]); return; }
    const params: Record<string, string> = { collection_point_id: form.collection_point_id };
    if (companyUniqueId) params.company_id = companyUniqueId;
    adminApi.bins.readAll({ params }).then((data) => {
      setBinOptions(buildOptions(normalizeList(data) as any[], "unique_id", ["bin_name"]));
    }).catch(() => {});
  }, [form.collection_point_id, companyUniqueId]);

  // Load record for edit — try route state first, fall back to API
  useEffect(() => {
    if (!isEdit || !id) return;

    const applyRecord = (data: any) => {
      applyCompanyProjectFromRecord(data);
      setPendingProjectCandidates({
        projectUniqueId: String(data.project_unique_id ?? data.project?.unique_id ?? ""),
        projectId: String(data.project_id ?? ""),
        projectName: String(data.project_name ?? ""),
      });
      // Store non-select fields immediately
      setForm((f) => ({
        ...f,
        sequence: String(data.sequence ?? "1"),
        is_active: data.is_active !== false,
      }));
      // Store select field IDs as pending — applied only after option lists load
      const tripPlanId = String(data.trip_plan?.unique_id ?? data.trip_plan_id ?? "");
      const cpId = String(data.collection_point?.unique_id ?? data.collection_point_id ?? "");
      const binId = String(data.bin?.unique_id ?? data.bin_id ?? "");
      if (tripPlanId) setPendingTripPlanId(tripPlanId);
      if (cpId) setPendingCollectionPointId(cpId);
      if (binId) setPendingBinId(binId);
    };

    const stateRecord = routeState?.record;
    if (stateRecord) {
      applyRecord(stateRecord);
    } else {
      tripPlanCollectionPointApi.read(id).then((data: any) => applyRecord(data)).catch(() => {});
    }
  }, [isEdit, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush project after hook loads project list
  useEffect(() => {
    if (!pendingProjectCandidates || projects.length === 0) return;
    const { projectUniqueId, projectId: rawId, projectName } = pendingProjectCandidates;
    let match = projects.find((p) => projectUniqueId && p.value === projectUniqueId);
    if (!match) match = projects.find((p) => rawId && p.value === rawId);
    if (!match && projectName)
      match = projects.find((p) => p.label.toLowerCase() === projectName.toLowerCase());
    if (match) setProjectId(match.value);
    setPendingProjectCandidates(null);
  }, [projects, pendingProjectCandidates, setProjectId]);

  // Flush trip plan after options load
  useEffect(() => {
    if (!pendingTripPlanId || tripPlanOptions.length === 0) return;
    if (tripPlanOptions.some((o) => o.value === pendingTripPlanId)) {
      setForm((f) => ({ ...f, trip_plan_id: pendingTripPlanId }));
      setPendingTripPlanId("");
    }
  }, [pendingTripPlanId, tripPlanOptions]);

  // Flush collection point after options load — also sets collection_point_id which triggers bin load
  useEffect(() => {
    if (!pendingCollectionPointId || collectionPointOptions.length === 0) return;
    if (collectionPointOptions.some((o) => o.value === pendingCollectionPointId)) {
      setForm((f) => ({ ...f, collection_point_id: pendingCollectionPointId }));
      setPendingCollectionPointId("");
    }
  }, [pendingCollectionPointId, collectionPointOptions]);

  useEffect(() => {
    if (locationOptions.loading || !form.collection_point_id) return;
    if (!collectionPointOptions.some((option) => option.value === form.collection_point_id)) {
      setForm((current) => ({ ...current, collection_point_id: "", bin_id: "" }));
    }
  }, [collectionPointOptions, form.collection_point_id, locationOptions.loading]);

  // Flush bin after bins load (bins load after collection_point_id is set)
  useEffect(() => {
    if (!pendingBinId || binOptions.length === 0) return;
    if (binOptions.some((o) => o.value === pendingBinId)) {
      setForm((f) => ({ ...f, bin_id: pendingBinId }));
      setPendingBinId("");
    }
  }, [pendingBinId, binOptions]);

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.trip_plan_id || !form.collection_point_id || !form.bin_id) {
      Swal.fire(t("common.error"), "Trip Plan, Collection Point and Bin are required.", "warning");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        trip_plan_id: form.trip_plan_id,
        collection_point_id: form.collection_point_id,
        bin_id: form.bin_id,
        sequence: parseInt(form.sequence, 10) || 1,
        is_active: form.is_active,
      };
      if (isEdit && id) {
        await tripPlanCollectionPointApi.update(id, payload);
      } else {
        await tripPlanCollectionPointApi.create(payload);
      }
      Swal.fire({ icon: "success", title: isEdit ? t("common.updated") : t("common.created"), timer: 1500, showConfirmButton: false });
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (error) {
      Swal.fire(t("common.error"), extractError(error) ?? t("common.save_failed"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <ComponentCard title={isEdit ? "Edit Trip Plan Collection Point" : "Add Trip Plan Collection Point"}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {isSuperAdmin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company</Label>
                <select value={companyUniqueId || ""} onChange={(e) => onCompanyChange(e.target.value)} disabled={isEdit} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="" disabled>Select Company</option>
                  {companies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Project</Label>
                <select value={projectId || ""} onChange={(e) => setProjectId(e.target.value)} disabled={isEdit || !companyUniqueId} className="w-full rounded border px-3 py-2 text-sm">
                  <option value="" disabled>Select Project</option>
                  {projects.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Zone</Label>
              <Select options={locationOptions.zones} value={locationOptions.zoneId} onChange={locationOptions.setZoneId} placeholder="Select Zone" />
            </div>
            <div>
              <Label>Ward</Label>
              <Select options={locationOptions.wards} value={locationOptions.wardId} onChange={locationOptions.setWardId} placeholder="Select Ward" disabled={!locationOptions.zoneId} />
            </div>
            <div>
              <Label>Panchayat</Label>
              <Select options={locationOptions.panchayats} value={locationOptions.panchayatId} onChange={locationOptions.setPanchayatId} placeholder="Select Panchayat (rural)" />
            </div>
            <div>
              <Label>Trip Plan <span className="text-red-500">*</span></Label>
              <Select
                options={tripPlanOptions}
                value={form.trip_plan_id}
                onChange={(v) => set("trip_plan_id", v)}
                placeholder="Select Trip Plan"
              />
            </div>
            <div>
              <Label>Collection Point <span className="text-red-500">*</span></Label>
              <Select
                options={collectionPointOptions}
                value={form.collection_point_id}
                onChange={(v) => { set("collection_point_id", v); set("bin_id", ""); }}
                placeholder="Select Collection Point"
                disabled={locationOptions.loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bin <span className="text-red-500">*</span></Label>
              <Select
                options={binOptions}
                value={form.bin_id}
                onChange={(v) => set("bin_id", v)}
                placeholder={form.collection_point_id ? "Select Bin" : "Select Collection Point first"}
              />
            </div>
            <div>
              <Label>Sequence <span className="text-red-500">*</span></Label>
              <input
                type="number"
                min={1}
                value={form.sequence}
                onChange={(e) => set("sequence", e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}
