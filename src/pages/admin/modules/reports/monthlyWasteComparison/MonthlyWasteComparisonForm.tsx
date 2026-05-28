import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { adminApi } from "@/helpers/admin/registry";
import { panchayatApi, wasteTypeApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import type { SelectOption } from "@/types";

/* ────────────────────────────────────────────
   Local sub-components (identical pattern to
   CollectionMonitoringForm)
──────────────────────────────────────────── */

const ShadcnSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  isRequired = true,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  isRequired?: boolean;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-gray-700">
      {label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500">
        <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
      </SelectTrigger>
      <SelectContent>
        {options.length > 0 ? (
          options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-gray-500">No options available</div>
        )}
      </SelectContent>
    </Select>
  </div>
);

const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mb-8 bg-white rounded-lg">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b-2 border-blue-500">
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
  </div>
);

const FormInput = ({
  label,
  value,
  onChange,
  type = "text",
  step,
  min,
  max,
  isRequired = true,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  isRequired?: boolean;
}) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium text-gray-700">
      {label}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Input
      type={type}
      value={value}
      onChange={onChange}
      step={step}
      min={min}
      max={max}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      autoComplete="off"
    />
  </div>
);

/* ────────────────────────────────────────────
   Helpers
──────────────────────────────────────────── */

const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object");
  if (value && typeof value === "object") {
    const r = (value as { results?: unknown }).results;
    if (Array.isArray(r)) return r.filter((x) => x && typeof x === "object");
  }
  return [];
};

const normalizeId = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.unique_id ?? obj.id ?? "").trim();
  }
  const raw = String(value).trim();
  const m = raw.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
  return m?.[1] ?? raw;
};

const toText = (value: unknown): string =>
  value == null ? "" : String(value).trim();

/* ────────────────────────────────────────────
   Component
──────────────────────────────────────────── */

export default function MonthlyWasteComparisonForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const isEdit = Boolean(id);

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { encReport, encMonthlyWasteComparison } = getEncryptedRoute();
  const LIST_PATH = `/${encReport}/${encMonthlyWasteComparison}`;

  /* field state */
  const [panchayatId, setPanchayatId] = useState("");
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [month, setMonth] = useState("");
  const [agreedWeight, setAgreedWeight] = useState("");
  const [actualWeight, setActualWeight] = useState("");
  const [totalTrips, setTotalTrips] = useState("");
  const [collectionPointsCovered, setCollectionPointsCovered] = useState("");

  /* dropdown data */
  const [panchayatOptions, setPanchayatOptions] = useState<SelectOption[]>([]);
  const [wasteTypeOptions, setWasteTypeOptions] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<Record<string, unknown> | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState("");

  /* default month */
  useEffect(() => {
    if (!month) {
      const today = new Date();
      setMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
    }
  }, [month]);

  /* re-apply projectId after hook re-fetches */
  useEffect(() => {
    if (!pendingProjectId || projects.length === 0) return;
    const match = projects.find((p) => p.value === pendingProjectId);
    if (match) {
      setProjectId(pendingProjectId);
      setPendingProjectId("");
    }
  }, [pendingProjectId, projects, setProjectId]);

  /* tenant params */
  const tenantParams = useMemo(
    () => (companyUniqueId && projectId ? { company_id: companyUniqueId, project_id: projectId } : null),
    [companyUniqueId, projectId],
  );

  /* fetch dropdowns */
  useEffect(() => {
    if (!tenantParams) {
      setPanchayatOptions([]);
      setWasteTypeOptions([]);
      return;
    }
    const config = { params: tenantParams };
    Promise.all([panchayatApi.list(config), wasteTypeApi.list()])
      .then(([panchayatRes, wasteTypeRes]) => {
        const panchayats = toRecordList(panchayatRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeId(x.unique_id ?? x.panchayat_id),
            label: toText(x.panchayat_name ?? x.name ?? x.unique_id),
          }))
          .filter((x) => x.value && x.label);

        const wasteTypes = toRecordList(wasteTypeRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeId(x.unique_id ?? x.waste_type_id),
            label: toText(x.waste_type_name ?? x.wastetype_name ?? x.name ?? x.unique_id),
          }))
          .filter((x) => x.value && x.label);

        setPanchayatOptions(panchayats);
        setWasteTypeOptions(wasteTypes);
      })
      .catch(() => {
        setPanchayatOptions([]);
        setWasteTypeOptions([]);
      });
  }, [tenantParams]);

  /* flush pending record once dropdowns ready */
  useEffect(() => {
    if (!pendingRecord) return;
    if (panchayatOptions.length === 0 && wasteTypeOptions.length === 0) return;

    setPanchayatId(normalizeId(pendingRecord.panchayat_id));
    setWasteTypeId(normalizeId(pendingRecord.waste_type_id));
    setMonth(toText(pendingRecord.month));
    setAgreedWeight(toText(pendingRecord.agreed_weight_kg));
    setActualWeight(toText(pendingRecord.actual_weight_kg));
    setTotalTrips(toText(pendingRecord.total_trips));
    setCollectionPointsCovered(toText(pendingRecord.collection_points_covered));
    setPendingRecord(null);
  }, [pendingRecord, panchayatOptions, wasteTypeOptions]);

  /* load record for edit */
  useEffect(() => {
    if (!isEdit) return;
    adminApi.monthlyWasteComparison.get(id as string).then((res: Record<string, unknown>) => {
      applyCompanyProjectFromRecord(res);
      const recProjectId = normalizeId(res.project_id ?? res.project);
      if (recProjectId) setPendingProjectId(recProjectId);
      setPendingRecord(res);
    });
  }, [applyCompanyProjectFromRecord, id, isEdit]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    if (!companyUniqueId) missing.push(t("admin.nav.company"));
    if (!projectId) missing.push(t("admin.nav.project"));
    if (!panchayatId) missing.push(t("admin.nav.panchayat"));
    if (!wasteTypeId) missing.push(t("common.waste_type"));
    if (!month) missing.push("Month");
    if (!agreedWeight.trim()) missing.push("Agreed Weight");

    if (missing.length > 0) {
      Swal.fire(t("common.warning"), `Missing: ${missing.join(", ")}`, "warning");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        company_id: companyUniqueId,
        project_id: projectId,
        panchayat_id: panchayatId,
        waste_type_id: wasteTypeId,
        month,
        agreed_weight_kg: parseFloat(agreedWeight) || 0,
        actual_weight_kg: parseFloat(actualWeight) || 0,
        total_trips: parseInt(totalTrips) || 0,
        collection_points_covered: parseInt(collectionPointsCovered) || 0,
      };

      if (isEdit) {
        await adminApi.monthlyWasteComparison.update(id as string, payload);
      } else {
        await adminApi.monthlyWasteComparison.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success",
      );
      navigate(LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch {
      Swal.fire(t("common.save_failed"), t("common.save_failed_desc"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: "Monthly Waste Comparison" })
          : t("common.add_item", { item: "Monthly Waste Comparison" })
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection title="Company & Project Information">
          <ShadcnSelect
            label={t("admin.nav.company")}
            value={companyUniqueId}
            onChange={onCompanyChange}
            options={companies.map((x) => ({ value: x.value, label: x.label }))}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            disabled={
              Boolean(loggedInCompanyUniqueId) ||
              (!isSuperAdmin && !loggedInCompanyUniqueId) ||
              companies.length === 0
            }
          />
          <ShadcnSelect
            label={t("admin.nav.project")}
            value={projectId}
            onChange={setProjectId}
            options={projects.map((x) => ({ value: x.value, label: x.label }))}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            disabled={!companyUniqueId || projects.length === 0}
          />
        </FormSection>

        <FormSection title="Report Details">
          <ShadcnSelect
            label={t("admin.nav.panchayat")}
            value={panchayatId}
            onChange={setPanchayatId}
            options={panchayatOptions}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })}
            disabled={panchayatOptions.length === 0}
          />
          <ShadcnSelect
            label={t("common.waste_type")}
            value={wasteTypeId}
            onChange={setWasteTypeId}
            options={wasteTypeOptions}
            placeholder={t("common.select_item_placeholder", { item: t("common.waste_type") })}
            disabled={wasteTypeOptions.length === 0}
          />
          <FormInput
            label="Month"
            type="month"
            value={month}
            max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`}
            onChange={(e) => setMonth(e.target.value)}
          />
        </FormSection>

        <FormSection title="Weight & Collection Data">
          <FormInput
            label="Agreed Weight (kg)"
            type="number"
            step="0.01"
            min="0"
            value={agreedWeight}
            onChange={(e) => setAgreedWeight(e.target.value)}
          />
          <FormInput
            label="Actual Weight (kg)"
            type="number"
            step="0.01"
            min="0"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            isRequired={false}
          />
          <FormInput
            label="Total Trips"
            type="number"
            min="0"
            value={totalTrips}
            onChange={(e) => setTotalTrips(e.target.value)}
            isRequired={false}
          />
          <FormInput
            label="Collection Points Covered"
            type="number"
            min="0"
            value={collectionPointsCovered}
            onChange={(e) => setCollectionPointsCovered(e.target.value)}
            isRequired={false}
          />
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
            className="bg-red-400 hover:bg-red-500 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
