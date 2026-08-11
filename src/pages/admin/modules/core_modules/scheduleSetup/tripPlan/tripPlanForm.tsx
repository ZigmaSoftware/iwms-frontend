import type { FormState, SelectOption, StopRow } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "primereact/multiselect";
import { adminApi } from "@/helpers/admin/registry";
import { tripPlanApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useZonePanchayatVisibility } from "@/hooks/useZonePanchayatVisibility";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";
import { tripPlanSchema } from "@/schemas/core_modules/scheduleSetup/tripPlan.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";


const statusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const approvalStatusOptions: SelectOption[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const collectionModeOptions: SelectOption[] = [
  { value: "bin_collection", label: "Secondary Stops (Manual)" },
  { value: "household_collection", label: "Household (Auto)" },
  { value: "bulk_waste_collection", label: "Bulk Waste (Auto)" },
];

// Household collection only uses these 4 waste types — auto-selected when mode is Household
const HOUSEHOLD_WASTE_TYPE_NAMES = ["Wet Waste", "Dry Waste", "Mixed Waste", "Sanitary Waste"];

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

const emptyStop = (sequence: number, collectionType: StopRow["collection_type"] = "bin_collection"): StopRow => ({
  collection_type: collectionType,
  collection_point_id: "",
  bin_id: "",
  customer_id: "",
  sequence,
  is_active: true,
});

// Household/Bulk modes don't list customers manually — the backend expands
// a single catch-all stop (no customer_id) to every matching customer in
// the plan's ward/panchayat scope at daily-trip-generation time.
const autoAssignStop = (collectionType: "household_collection" | "bulk_waste_collection"): StopRow =>
  emptyStop(1, collectionType);

const optionLabel = (item: any, keys: string[]) =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "") ??
  item?.display_code ??
  item?.unique_id ??
  "";

const buildOptions = (items: any[], keys: string[]): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.unique_id ?? item?.staff_unique_id ?? ""),
      label: String(item?.label ?? optionLabel(item, keys)),
      ...(item?.disabled ? { disabled: true } : {}),
    }))
    .filter((item) => item.value);

const recordId = (value: any): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return String(
    value.unique_id ??
      value.id ??
      value.value ??
      value.pk ??
      value.company_unique_id ??
      value.project_unique_id ??
      ""
  );
};

const normalizedText = (value: any): string => String(value ?? "").trim().toLowerCase();

const collectIds = (value: any): string[] => {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (typeof value !== "object") return [];

  return [
    value.unique_id,
    value.id,
    value.value,
    value.pk,
    value.company_unique_id,
    value.project_unique_id,
  ]
    .map(recordId)
    .filter(Boolean);
};

const collectNames = (value: any, keys: string[]): string[] => {
  if (!value || typeof value !== "object") return [];
  return keys.map((key) => normalizedText(value?.[key])).filter(Boolean);
};

const relationMatches = (
  value: any,
  selectedId: string,
  selectedRecord: any,
  nameKeys: string[] = []
) => {
  if (!selectedId) return true;

  const valueIds = collectIds(value);
  const selectedIds = new Set([selectedId, ...collectIds(selectedRecord)].filter(Boolean));
  if (valueIds.some((id) => selectedIds.has(id))) return true;

  const valueNames = collectNames(value, nameKeys);
  const selectedNames = new Set(collectNames(selectedRecord, nameKeys));
  return valueNames.some((name) => selectedNames.has(name));
};

const scopedItems = (items: any[], companyId: string, projectId: string) =>
  items.filter((item) => {
    const itemCompanyIds = collectIds(item?.company_id ?? item?.company);
    const itemProjectIds = collectIds(item?.project_id ?? item?.project);
    const matchesCompany = !itemCompanyIds.length || !companyId || itemCompanyIds.includes(companyId);
    const matchesProject = !itemProjectIds.length || !projectId || itemProjectIds.includes(projectId);
    return matchesCompany && matchesProject && item?.is_deleted !== true;
  });

const emptyFormState = (): FormState => ({
  district_id: "",
  city_id: "",
  zone_id: "",
  panchayat_id: "",
  ward_ids: [],
  staff_template_id: "",
  vehicle_id: "",
  supervisor_id: "",
  waste_type_ids: [],
  trip_trigger_weight_kg: "",
  max_vehicle_capacity_kg: "",
  scheduled_time: "",
  is_auto_assign: false,
  repeat_days: [],
  approval_status: "PENDING",
  status: "ACTIVE",
  collection_type: "bin_collection",
});

const resetFormSelections = (
  setFormData: Dispatch<SetStateAction<FormState>>,
  setStops: Dispatch<SetStateAction<StopRow[]>>
) => {
  setFormData(emptyFormState());
  setStops([emptyStop(1)]);
};

const extractErrorMessage = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.error === "string") return data.error;
  if (typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return null;
};

export default function TripPlanForm() {
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
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const { showZone, showPanchayat } = useZonePanchayatVisibility();

  const { encScheduleSetup, encTripPlans } = getEncryptedRoute();
  const { listPath: listPath } = createCrudRoutePaths(encScheduleSetup, encTripPlans);

  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [stops, setStops] = useState<StopRow[]>([
    emptyStop(1),
  ]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);
  // Track bin IDs already assigned in OTHER trip plans (same geo scope) —
  // prevents double-booking a bin across plans. Populated in the lookups effect.
  const [assignedBinIds, setAssignedBinIds] = useState<string[]>([]);
  // Holds raw edit record until lookups are ready — avoids Radix Select blank-value bug
  const [pendingRecord, setPendingRecord] = useState<any>(null);
  // Kept separately from pendingRecord (which is cleared once the form is hydrated)
  // so the breakdown banner stays visible for the life of the edit screen.
  const [activeBreakdown, setActiveBreakdown] = useState<any>(null);

  // Step 1: fetch the record, store it, trigger company/project → which triggers lookup fetch
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    setLoading(true);
    tripPlanApi.read(id)
      .then((record: any) => {
        if (cancelled) return;
        applyCompanyProjectFromRecord(record);
        setPendingRecord(record);
        setActiveBreakdown(record.active_breakdown ?? null);
      })
      .catch((error) => Swal.fire(t("common.error"), extractErrorMessage(error) ?? t("common.load_failed"), "error"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, isEdit, applyCompanyProjectFromRecord, t]);

  // Step 2: once lookups are populated AND a pending record exists, hydrate the form
  useEffect(() => {
    if (!pendingRecord) return;
    const lookupsReady = (lookups.districts?.length ?? 0) > 0;
    if (!lookupsReady) return;

    const record = pendingRecord;
    const selectedWasteTypeIds = normalizeList(record.waste_types)
      .map((wasteType: any) => recordId(wasteType.unique_id ?? wasteType))
      .filter(Boolean);
    const fallbackWasteTypeId = record.waste_type?.unique_id ?? record.waste_type_id ?? "";
    setFormData({
      district_id: record.district?.unique_id ?? record.district_id ?? "",
      city_id: record.city?.unique_id ?? record.city_id ?? "",
      zone_id: record.zone?.unique_id ?? record.zone_id ?? "",
      panchayat_id: record.panchayat?.unique_id ?? record.panchayat_id ?? "",
      ward_ids: normalizeList(record.wards).map((w: any) => w?.unique_id ?? w).filter(Boolean),
      staff_template_id: record.staff_template?.unique_id ?? record.staff_template_id ?? "",
      vehicle_id: record.vehicle?.unique_id ?? record.vehicle_id ?? "",
      supervisor_id: record.supervisor?.unique_id ?? record.supervisor_id ?? "",
      waste_type_ids: selectedWasteTypeIds.length ? selectedWasteTypeIds : fallbackWasteTypeId ? [String(fallbackWasteTypeId)] : [],
      trip_trigger_weight_kg: String(record.trip_trigger_weight_kg ?? ""),
      max_vehicle_capacity_kg: String(record.max_vehicle_capacity_kg ?? ""),
      scheduled_time: String(record.scheduled_time ?? "").slice(0, 5),
      is_auto_assign: Boolean(record.is_auto_assign),
      repeat_days: Array.isArray(record.repeat_days) ? record.repeat_days.map((d: any) => Number(d)) : [],
      approval_status: record.approval_status ?? "PENDING",
      status: record.status ?? "ACTIVE",
      collection_type: (record.collection_type as StopRow["collection_type"]) ?? "bin_collection",
    });
    const mode = record.collection_type ?? "bin_collection";
    if (mode === "household_collection" || mode === "bulk_waste_collection") {
      // Auto-assign modes carry a single catch-all stop (no customer_id) —
      // represent it as one summary row regardless of how many rows the API
      // returns, since the customer list itself isn't stored/edited here.
      setStops([autoAssignStop(mode)]);
    } else {
      const stopRows: StopRow[] = normalizeList(record.plan_collection_points).map((stop: any, index: number) => ({
        collection_type: "bin_collection" as const,
        collection_point_id: stop.collection_point_id ?? stop.collection_point?.unique_id ?? "",
        bin_id: stop.bin_id ?? stop.bin?.unique_id ?? "",
        customer_id: "",
        sequence: Number(stop.sequence ?? index + 1),
        is_active: stop.is_active !== false,
      }));
      setStops(stopRows.length ? stopRows : [emptyStop(1)]);
    }
    setPendingRecord(null);
  }, [pendingRecord, lookups]);

  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setLookups({});
      setAssignedBinIds([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // Build geo params for collection points (filtered by local body)
    const geoParams: Record<string, string> = {
      company_id: companyUniqueId,
      company_unique_id: companyUniqueId,
      project_id: projectId,
      project: projectId,
      project_unique_id: projectId,
    };
    if (formData.district_id) geoParams.district_id = formData.district_id;
    if (formData.zone_id) geoParams.zone_id = formData.zone_id;
    if (formData.panchayat_id) geoParams.panchayat_id = formData.panchayat_id;
    // Base params for bins (no geo filtering - backend may not support it)
    const baseParams = {
      company_id: companyUniqueId,
      company_unique_id: companyUniqueId,
      project_id: projectId,
      project: projectId,
      project_unique_id: projectId,
    };

    // Promise.allSettled — not all() — because a staff without Zone (or
    // Panchayat) access 403s that one call at the module-permission
    // middleware; that must not blank out every other dropdown/lookup.
    // Zone/Panchayat are additionally skipped entirely up front when the
    // login-scoped data shows the staff has no access to that resource.
    Promise.allSettled([
      adminApi.districts.readAll({ params: geoParams }),
      adminApi.cities.readAll({ params: geoParams }),
      showZone ? adminApi.zones.readAll({ params: geoParams }) : Promise.resolve([]),
      showPanchayat ? adminApi.panchayats.readAll({ params: geoParams }) : Promise.resolve([]),
      adminApi.wards.readAll({ params: geoParams }),
      adminApi.staffTemplateCreation.readAll({ params: geoParams }),
      adminApi.vehicleCreations.readAll({ params: geoParams }),
      adminApi.staffCreation.readAll({ params: geoParams }),
      adminApi.wasteTypes.readAll({ params: geoParams }),
      adminApi.collectionPoints.readAll({ params: geoParams }),
      adminApi.bins.readAll({ params: baseParams }),
      adminApi.customerCreations.readAll({ params: geoParams }),
      // Unscoped by geo: a collection point can serve multiple wards/zones, so a
      // bin's reservation by a trip plan in another zone/panchayat must still count.
      tripPlanApi.readAll({ params: baseParams }),
    ])
      .then(([districtsR, citiesR, zonesR, panchayatsR, wardsR, staffTemplatesR, vehiclesR, staffR, wasteTypesR, collectionPointsR, binsR, customersR, existingTripPlansR]) => {
        if (cancelled) return;

        const settled = (result: PromiseSettledResult<unknown>): unknown =>
          result.status === "fulfilled" ? result.value : [];

        const districts = settled(districtsR);
        const cities = settled(citiesR);
        const zones = settled(zonesR);
        const panchayats = settled(panchayatsR);
        const wards = settled(wardsR);
        const staffTemplates = settled(staffTemplatesR);
        const vehicles = settled(vehiclesR);
        const staff = settled(staffR);
        const wasteTypes = settled(wasteTypesR);
        const collectionPoints = settled(collectionPointsR);
        const bins = settled(binsR);
        const customers = settled(customersR);
        const existingTripPlans = settled(existingTripPlansR);
        // Compute bin IDs already used by OTHER active trip plans in the same geo scope
        const reservedBins = new Set<string>();
        const loadedTripPlans = normalizeList(existingTripPlans);
        loadedTripPlans.forEach((plan: any) => {
          if (String(plan?.unique_id ?? "") === String(id ?? "")) return;
          normalizeList(plan?.plan_collection_points).forEach((stop: any) => {
            const binId = String(stop?.bin_id ?? "");
            if (binId) reservedBins.add(binId);
          });
        });
        setAssignedBinIds(Array.from(reservedBins));

        // Normalize bins: ensure collection_point_id is a string ID (from collection_point_id or collection_point.unique_id)
        const normalizedBins = normalizeList(bins).map((bin: any) => ({
          ...bin,
          collection_point_id: String(bin?.collection_point_id ?? bin?.collection_point?.unique_id ?? bin?.collection_point ?? ""),
          waste_type_id: String(bin?.wastetype_id ?? bin?.waste_type_id ?? bin?.waste_type ?? ""),
        }));

        setLookups({
          districts: normalizeList(districts),
          cities: normalizeList(cities),
          zones: normalizeList(zones),
          panchayats: normalizeList(panchayats),
          wards: normalizeList(wards),
          staffTemplates: normalizeList(staffTemplates),
          vehicles: normalizeList(vehicles),
          staff: normalizeList(staff),
          wasteTypes: normalizeList(wasteTypes),
          collectionPoints: normalizeList(collectionPoints),
          bins: normalizedBins,
          customers: normalizeList(customers),
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId, formData.district_id, formData.zone_id, formData.panchayat_id, formData.collection_type, id, t, showZone, showPanchayat]);

  const options = useMemo(() => {
    const districts = scopedItems(lookups.districts ?? [], companyUniqueId, projectId);
    const cities = scopedItems(lookups.cities ?? [], companyUniqueId, projectId);
    const zones = scopedItems(lookups.zones ?? [], companyUniqueId, projectId);
    const panchayats = scopedItems(lookups.panchayats ?? [], companyUniqueId, projectId);
    const wards = scopedItems(lookups.wards ?? [], companyUniqueId, projectId);
    const collectionPoints = scopedItems(lookups.collectionPoints ?? [], companyUniqueId, projectId);
    const customers = scopedItems(lookups.customers ?? [], companyUniqueId, projectId);
    const bins = scopedItems(lookups.bins ?? [], companyUniqueId, projectId);

    const selectedDistrict = districts.find((item) => recordId(item) === formData.district_id);
    const selectedCity = cities.find((item) => recordId(item) === formData.city_id);
    const selectedZone = zones.find((item) => recordId(item) === formData.zone_id);

    // Household waste types: filter to only the 4 standard types
    const allWasteTypes = scopedItems(lookups.wasteTypes ?? [], companyUniqueId, projectId);
    const householdWasteTypes = allWasteTypes.filter((wt) =>
      HOUSEHOLD_WASTE_TYPE_NAMES.includes(String(wt?.waste_type_name ?? wt?.name ?? "").trim())
    );
    const wasteTypeOptions = formData.collection_type === "household_collection"
      ? householdWasteTypes
      : allWasteTypes;

    // Collection points: filter by geo scope, then mark as "Assigned" when all bins are used
    const filteredCollectionPoints = collectionPoints.filter((item) => {
      if (formData.ward_ids.length > 0) {
        const cpWards = Array.isArray(item?.wards) ? item.wards : [];
        return formData.ward_ids.some((wid) =>
          cpWards.some((w: any) => recordId(w) === wid) ||
          recordId(item?.ward_id ?? item?.ward) === wid
        );
      }
      if (formData.panchayat_id) {
        const selectedPanchayat = panchayats.find((panchayat) => recordId(panchayat) === formData.panchayat_id);
        return relationMatches(
          item?.panchayat_id ?? item?.panchayat ?? { panchayat_name: item?.panchayat_name, name: item?.panchayat_name },
          formData.panchayat_id,
          selectedPanchayat,
          ["panchayat_name", "name"]
        );
      }
      if (formData.zone_id) {
        return relationMatches(
          item?.zone_id ?? item?.zone ?? { zone_name: item?.zone_name, name: item?.zone_name },
          formData.zone_id,
          selectedZone,
          ["zone_name", "name"]
        );
      }
      return true;
    });

    // For each collection point, check if all its bins (matching selected waste types) are assigned.
    // excludeStopIndex lets the row currently holding a given collection point treat its own
    // selected bin as still "eligible" (a bin doesn't count as blocking itself).
    const buildCollectionPointsWithStatus = (excludeStopIndex: number = -1) =>
      filteredCollectionPoints.map((cp) => {
        const cpId = recordId(cp);
        // Find bins for this collection point that match selected waste types
        const eligibleBins = bins.filter((bin) => {
          const binCpId = recordId(bin?.collection_point_id ?? bin?.collection_point);
          if (binCpId !== cpId) return false;
          if (formData.waste_type_ids.length > 0) {
            const binWasteTypeId = recordId(bin?.wastetype_id ?? bin?.waste_type_id);
            if (binWasteTypeId && !formData.waste_type_ids.includes(binWasteTypeId)) return false;
          }
          // Exclude bins assigned in other trip plans
          if (assignedBinIds.includes(recordId(bin))) return false;
          // Exclude bins already used in current form stops (other than the excluded row)
          const usedInCurrentStops = stops.some(
            (stop, stopIndex) =>
              stopIndex !== excludeStopIndex && stop.bin_id === recordId(bin) && stop.collection_point_id === cpId
          );
          if (usedInCurrentStops) return false;
          return true;
        });
        const allBinsForCp = bins.filter((bin) => recordId(bin?.collection_point_id ?? bin?.collection_point) === cpId);
        const allBinsAssigned = allBinsForCp.length > 0 && eligibleBins.length === 0;
        return allBinsAssigned
          ? { ...cp, label: String(cp?.cp_name ?? cp?.collection_point_name ?? cp?.name ?? "") + " (Assigned)", disabled: true }
          : cp;
      });

    const collectionPointsWithStatus = buildCollectionPointsWithStatus();

    return {
      districts: buildOptions(districts, ["name", "district_name"]),
      cities: buildOptions(
        cities.filter((item) =>
          relationMatches(
            item?.district_id ?? item?.district ?? { name: item?.district_name, district_name: item?.district_name },
            formData.district_id,
            selectedDistrict,
            ["name", "district_name"]
          )
        ),
        ["name", "city_name"]
      ),
      zones: buildOptions(
        zones.filter((item) =>
          relationMatches(
            item?.city_id ?? item?.city ?? { name: item?.city_name, city_name: item?.city_name },
            formData.city_id,
            selectedCity,
            ["name", "city_name"]
          )
        ),
        ["name", "zone_name"]
      ),
      panchayats: buildOptions(
        panchayats.filter((item) =>
          relationMatches(
            item?.city_id ?? item?.city ?? { name: item?.city_name, city_name: item?.city_name },
            formData.city_id,
            selectedCity,
            ["name", "city_name"]
          )
        ),
        ["panchayat_name", "name"]
      ),
      wards: buildOptions(
        wards.filter((item) => {
          if (formData.zone_id) {
            return relationMatches(
              item?.zone_id ?? item?.zone ?? { name: item?.zone_name, zone_name: item?.zone_name },
              formData.zone_id,
              selectedZone,
              ["name", "zone_name"]
            );
          }
          if (formData.panchayat_id) {
            const selectedPanchayat = panchayats.find((p) => recordId(p) === formData.panchayat_id);
            return relationMatches(
              item?.panchayat_id ?? item?.panchayat ?? { panchayat_name: item?.panchayat_name, name: item?.panchayat_name },
              formData.panchayat_id,
              selectedPanchayat,
              ["panchayat_name", "name"]
            );
          }
          return false;
        }),
        ["ward_name", "name"]
      ),
      staffTemplates: buildOptions(
        scopedItems(lookups.staffTemplates ?? [], companyUniqueId, projectId).map((item) =>
          item?.is_assigned_today
            ? { ...item, label: `${optionLabel(item, ["display_code"])} (Assigned)`, disabled: true }
            : item
        ),
        ["display_code"]
      ),
      vehicles: buildOptions(
        scopedItems(lookups.vehicles ?? [], companyUniqueId, projectId).map((item) =>
          item?.is_assigned_today
            ? { ...item, label: `${optionLabel(item, ["vehicle_no"])} (Assigned)`, disabled: true }
            : item
        ),
        ["vehicle_no"]
      ),
      staff: buildOptions(
        scopedItems(lookups.staff ?? [], companyUniqueId, projectId).filter((s) =>
          String(s?.staffusertype_name ?? s?.designation ?? "").trim().toLowerCase().includes("supervisor")
        ),
        ["employee_name", "username"]
      ),
      wasteTypes: buildOptions(wasteTypeOptions, ["waste_type_name", "name"]),
      collectionPoints: buildOptions(collectionPointsWithStatus, ["cp_name", "collection_point_name", "name"]),
      collectionPointsFor: (excludeStopIndex: number) =>
        buildOptions(buildCollectionPointsWithStatus(excludeStopIndex), ["cp_name", "collection_point_name", "name"]),
      customers: buildOptions(
        customers.filter((item) => {
          if (formData.panchayat_id) {
            const selectedPanchayat = panchayats.find((panchayat) => recordId(panchayat) === formData.panchayat_id);
            return relationMatches(
              item?.panchayat_id ?? item?.panchayat ?? { panchayat_name: item?.panchayat_name, name: item?.panchayat_name },
              formData.panchayat_id,
              selectedPanchayat,
              ["panchayat_name", "name"]
            );
          }
          if (formData.zone_id) {
            return relationMatches(
              item?.zone ?? item?.zone_id ?? { zone_name: item?.zone_name, name: item?.zone_name },
              formData.zone_id,
              selectedZone,
              ["zone_name", "name"]
            );
          }
          return true;
        }),
        ["customer_name", "name"]
      ),
    };
  }, [companyUniqueId, projectId, formData.district_id, formData.city_id, formData.zone_id, formData.panchayat_id, formData.ward_ids, formData.collection_type, formData.waste_type_ids, stops, assignedBinIds, lookups]);

  // Preview of who the backend will auto-assign for Household/Bulk mode —
  // mirrors the same geo scope (panchayat/zone, narrowed by ward) the
  // customer dropdown already uses, plus the household-vs-bulk split via
  // is_bulkwaste_generator. Informational only; the actual expansion
  // happens server-side at daily-trip-generation time.
  const autoAssignCustomers = useMemo(() => {
    if (formData.collection_type === "bin_collection") return [];
    const wantBulk = formData.collection_type === "bulk_waste_collection";
    const customers = scopedItems(lookups.customers ?? [], companyUniqueId, projectId);
    const panchayats = scopedItems(lookups.panchayats ?? [], companyUniqueId, projectId);
    const zones = scopedItems(lookups.zones ?? [], companyUniqueId, projectId);
    const selectedPanchayat = panchayats.find((p) => recordId(p) === formData.panchayat_id);
    const selectedZone = zones.find((z) => recordId(z) === formData.zone_id);

    return customers.filter((item) => {
      if (Boolean(item?.is_bulkwaste_generator) !== wantBulk) return false;
      if (formData.panchayat_id) {
        if (!relationMatches(
          item?.panchayat_id ?? item?.panchayat ?? { panchayat_name: item?.panchayat_name, name: item?.panchayat_name },
          formData.panchayat_id,
          selectedPanchayat,
          ["panchayat_name", "name"]
        )) return false;
      } else if (formData.zone_id) {
        if (!relationMatches(
          item?.zone ?? item?.zone_id ?? { zone_name: item?.zone_name, name: item?.zone_name },
          formData.zone_id,
          selectedZone,
          ["zone_name", "name"]
        )) return false;
      } else {
        return false;
      }
      if (formData.ward_ids.length > 0) {
        const wardId = recordId(item?.ward_id ?? item?.ward);
        if (!wardId || !formData.ward_ids.includes(wardId)) return false;
      }
      return true;
    });
  }, [companyUniqueId, projectId, formData.collection_type, formData.panchayat_id, formData.zone_id, formData.ward_ids, lookups]);

  const binOptionsFor = (collectionPointId: string, currentBinId: string = "") => {
    const normalizedWasteTypeIds = formData.waste_type_ids.map((v: any) =>
      v && typeof v === "object" ? String(v.value ?? v.unique_id ?? v.id ?? "") : String(v)
    );
    // Build a set of waste type names for the selected IDs so we can match
    // bins that store the waste type as a name string rather than an ID.
    const selectedWasteTypeNames = new Set(
      (lookups.wasteTypes ?? [])
        .filter((wt) => normalizedWasteTypeIds.includes(recordId(wt)))
        .flatMap((wt) => [
          normalizedText(wt?.waste_type_name),
          normalizedText(wt?.name),
          normalizedText(wt?.wastetype_name),
        ])
        .filter(Boolean)
    );

    // Bin IDs already used in current form stops (for this collection point),
    // excluding the bin currently selected on this row so it stays visible.
    const usedBinIdsInCurrentStops = new Set(
      stops
        .filter((stop) =>
          stop.collection_type === "bin_collection" &&
          stop.collection_point_id === collectionPointId &&
          stop.bin_id !== currentBinId
        )
        .map((stop) => stop.bin_id)
        .filter(Boolean)
    );

    const matchingBins = scopedItems(lookups.bins ?? [], companyUniqueId, projectId).filter((bin) => {
      // Direct ID match: bin.collection_point_id or bin.collection_point?.unique_id
      const binCollectionPointId = recordId(bin?.collection_point_id ?? bin?.collection_point);
      const belongsToCollectionPoint = !collectionPointId || binCollectionPointId === collectionPointId;
      if (!belongsToCollectionPoint) return false;
      if (normalizedWasteTypeIds.length === 0) return true;
      // Try ID match first (if the API ever returns wastetype_id)
      const binWasteTypeId = recordId(bin?.wastetype_id ?? bin?.waste_type_id);
      if (binWasteTypeId && normalizedWasteTypeIds.includes(binWasteTypeId)) return true;
      // Fall back to name match
      const binWasteTypeName = normalizedText(bin?.waste_type_name ?? bin?.wastetype_name ?? bin?.waste_type);
      return binWasteTypeName ? selectedWasteTypeNames.has(binWasteTypeName) : false;
    });

    // Bins already reserved (by another trip plan or another stop in this
    // form) stay visible but show as "Assigned" and can't be picked, so the
    // dropdown communicates why a bin is unavailable instead of just hiding it.
    return buildOptions(
      matchingBins.map((bin) => {
        const binId = recordId(bin);
        if (binId === currentBinId) return bin;
        const isAssigned = assignedBinIds.includes(binId) || usedBinIdsInCurrentStops.has(binId);
        if (!isAssigned) return bin;
        return {
          ...bin,
          bin_name: `${String(bin?.bin_name ?? bin?.name ?? "")} (Assigned)`,
          disabled: true,
        };
      }),
      ["bin_name", "name"]
    );
  };

  const collectionPointDetails = (collectionPointId: string) =>
    scopedItems(lookups.collectionPoints ?? [], companyUniqueId, projectId).find((item) => recordId(item) === collectionPointId);

  const handleCompanyChange = (value: string) => {
    resetFormSelections(setFormData, setStops);
    onCompanyChange(value);
  };

  const handleProjectChange = (value: string) => {
    resetFormSelections(setFormData, setStops);
    setProjectId(value);
  };

  const coordinateText = (collectionPointId: string) => {
    const point = collectionPointDetails(collectionPointId);
    if (!point) return "";
    const latitude = point.latitude ?? point.lat ?? "";
    const longitude = point.longitude ?? point.lng ?? point.long ?? "";
    if (!latitude && !longitude) return "";
    return `Lat: ${latitude || "-"} | Long: ${longitude || "-"}`;
  };

  const setField = (field: keyof FormState) => (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "district_id" ? { city_id: "", zone_id: "", panchayat_id: "", ward_ids: [] } : {}),
      ...(field === "city_id" ? { zone_id: "", panchayat_id: "", ward_ids: [] } : {}),
      ...(field === "zone_id" && value ? { panchayat_id: "", ward_ids: [] } : {}),
      ...(field === "panchayat_id" && value ? { zone_id: "", ward_ids: [] } : {}),
    }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    // Household/Bulk mode has no manual stop rows to reset — the auto-assign
    // scope just follows the new zone/panchayat/ward automatically via the
    // autoAssignCustomers memo. Only Bin mode's manual rows need clearing.
    if ((field === "panchayat_id" || field === "zone_id") && formData.collection_type === "bin_collection") {
      setStops([emptyStop(1)]);
    }
  };

  const handleCollectionModeChange = (value: string) => {
    const mode = value as StopRow["collection_type"];
    setFormData((prev) => ({ ...prev, collection_type: mode }));
    if (mode === "household_collection") {
      // Auto-select the 4 standard household waste types
      const householdTypes = (lookups.wasteTypes ?? [])
        .filter((wt) => HOUSEHOLD_WASTE_TYPE_NAMES.includes(String(wt?.waste_type_name ?? wt?.name ?? "").trim()))
        .map((wt) => recordId(wt))
        .filter(Boolean);
      setFormData((prev) => ({ ...prev, waste_type_ids: householdTypes }));
      setStops([autoAssignStop(mode)]);
    } else if (mode === "bulk_waste_collection") {
      setStops([autoAssignStop(mode)]);
    } else {
      setStops((current) =>
        current.some((s) => s.collection_type === "bin_collection") ? current : [emptyStop(1)]
      );
    }
  };

  const setStop = (index: number, patch: Partial<StopRow>) => {
    setStops((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      if (patch.collection_point_id !== undefined) next.bin_id = "";
      return next;
    }));
  };

  const addStop = () => {
    setStops((current) => [...current, emptyStop(current.length + 1)]);
  };

  const removeStop = (index: number) => {
    setStops((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      const normalized = next.length ? next : [emptyStop(1)];
      return normalized.map((row, rowIndex) => ({ ...row, sequence: rowIndex + 1 }));
    });
  };

  const toggleRepeatDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      repeat_days: prev.repeat_days.includes(day)
        ? prev.repeat_days.filter((d) => d !== day)
        : [...prev.repeat_days, day],
    }));
  };

  const moveStop = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setStops((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((row, rowIndex) => ({ ...row, sequence: rowIndex + 1 }));
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const triggerWeight = Number(formData.trip_trigger_weight_kg);
    const maxCapacity = Number(formData.max_vehicle_capacity_kg);
    const isAutoAssignMode = formData.collection_type !== "bin_collection";
    const validStops = isAutoAssignMode
      ? [autoAssignStop(formData.collection_type as "household_collection" | "bulk_waste_collection")]
      : stops.filter((stop) => Boolean(stop.collection_point_id && stop.bin_id));

    const fieldValues = {
      district_id: formData.district_id,
      city_id: formData.city_id,
      staff_template_id: formData.staff_template_id,
      vehicle_id: formData.vehicle_id,
      supervisor_id: formData.supervisor_id,
      waste_type_ids: formData.waste_type_ids,
      scheduled_time: formData.scheduled_time,
    };

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push("Company");
    if (!projectId) missingFields.push("Project");

    const validation = parseWithSchema(tripPlanSchema, fieldValues);
    if (!validation.success) {
      setFieldErrors(validation.errors);
    } else {
      setFieldErrors({});
    }

    if (missingFields.length > 0 || !validation.success) {
      const schemaMessages = !validation.success ? Object.values(validation.errors) : [];
      Swal.fire(t("common.warning"), `Please fill: ${[...missingFields, ...schemaMessages].join(", ")}`, "warning");
      return;
    }
    if (!formData.panchayat_id && !formData.zone_id) {
      Swal.fire(t("common.warning"), "Select either Zone or PLB (Panchayat).", "warning");
      return;
    }
    if (formData.ward_ids.length === 0) {
      Swal.fire(t("common.warning"), "At least one ward is required.", "warning");
      return;
    }
    if (!Number.isFinite(triggerWeight) || !Number.isFinite(maxCapacity) || triggerWeight >= maxCapacity) {
      Swal.fire(t("common.warning"), "Trigger weight must be less than vehicle capacity.", "warning");
      return;
    }
    if (!isAutoAssignMode && !validStops.length) {
      Swal.fire(t("common.warning"), "Add at least one collection point stop.", "warning");
      return;
    }
    if (formData.is_auto_assign && formData.repeat_days.length === 0) {
      Swal.fire(t("common.warning"), "Select at least one repeat day for auto-assign, or turn auto-assign off.", "warning");
      return;
    }

    // Collection Mode (formData.collection_type) drives what the backend
    // does with this plan's stops: bin_collection keeps the manual stop
    // list below; household_collection/bulk_waste_collection send a single
    // catch-all stop (no customer_id) that the backend expands to every
    // matching customer in the plan's ward/panchayat scope at daily-trip-
    // generation time (see run_for_date / sync_daily_assignment_stops_from_plan).
    const payload = {
      company_id_input: companyUniqueId,
      project_id_input: projectId,
      ...formData,
      zone_id: formData.zone_id || null,
      panchayat_id: formData.panchayat_id || null,
      ward_ids: formData.ward_ids,
      waste_type_id: formData.waste_type_ids[0],
      waste_type_ids: formData.waste_type_ids,
      trip_trigger_weight_kg: triggerWeight,
      max_vehicle_capacity_kg: maxCapacity,
      is_auto_assign: formData.is_auto_assign,
      repeat_days: formData.is_auto_assign ? formData.repeat_days : [],
      collection_type: formData.collection_type,
      collection_points: isAutoAssignMode
        ? [{
            collection_type: formData.collection_type,
            collection_point_id: null,
            bin_id: null,
            customer_id: null,
            sequence: 1,
            is_active: true,
          }]
        : validStops.map((stop, index) => ({
            collection_type: "bin_collection",
            collection_point_id: stop.collection_point_id,
            bin_id: stop.bin_id,
            customer_id: null,
            sequence: index + 1,
            is_active: stop.is_active,
          })),
    };

    setSubmitting(true);
    try {
      if (isEdit && id) await tripPlanApi.update(id, payload);
      else await tripPlanApi.create(payload);
      Swal.fire(t("common.success"), isEdit ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(listPath, { state: { companyUniqueId, projectId } });
    } catch (error: any) {
      Swal.fire(t("common.save_failed"), extractErrorMessage(error) ?? t("common.save_failed_desc"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3">
      <ComponentCard title={isEdit ? "Edit Trip Plan" : "New Trip Plan"} desc="Configure route geography, staff, vehicle, schedule, and stop list">
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeBreakdown && (
            <div className="flex flex-col gap-1 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <i className="pi pi-exclamation-triangle text-orange-500" />
                <span className="text-sm font-semibold text-orange-800">
                  Vehicle breakdown on {activeBreakdown.trip_date}
                </span>
              </div>
              <p className="text-xs text-orange-700">
                {activeBreakdown.breakdown_vehicle_no ?? "The assigned vehicle"} broke down and was
                replaced with <span className="font-semibold">{activeBreakdown.replacement_vehicle_no ?? "a replacement vehicle"}</span>
                {(activeBreakdown.replacement_driver || activeBreakdown.replacement_operator) && (
                  <>
                    {" "}(driver: {activeBreakdown.replacement_driver ?? "-"}, operator:{" "}
                    {activeBreakdown.replacement_operator ?? "-"})
                  </>
                )}{" "}
                for that trip. The vehicle configured below is this plan's default and is unaffected
                going forward.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Label>{t("admin.nav.company")}</Label>
              <select value={companyUniqueId} onChange={(e) => handleCompanyChange(e.target.value)} disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId) || companies.length === 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">{t("common.select_item_placeholder", { item: t("admin.nav.company") })}</option>
                {companies.map((company) => <option key={company.value} value={company.value}>{company.label}</option>)}
              </select>
            </div>
            <div>
              <Label>{t("admin.nav.project")}</Label>
              <select value={projectId} onChange={(e) => handleProjectChange(e.target.value)} disabled={!companyUniqueId || projects.length === 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">{t("common.select_item_placeholder", { item: t("admin.nav.project") })}</option>
                {projects.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
              </select>
            </div>
            <div><Label>District</Label><Select value={formData.district_id} onChange={setField("district_id")} options={options.districts} disabled={loading || !projectId} /><FieldError message={fieldErrors.district_id} /></div>
            <div><Label>City</Label><Select value={formData.city_id} onChange={setField("city_id")} options={options.cities} disabled={loading || !formData.district_id} /><FieldError message={fieldErrors.city_id} /></div>
            {showZone && !formData.panchayat_id && <div><Label>Zone</Label><Select value={formData.zone_id} onChange={setField("zone_id")} options={options.zones} disabled={loading || !formData.city_id} /></div>}
            {showPanchayat && !formData.zone_id && <div><Label>PLB (Participating Local Bodies)</Label><Select value={formData.panchayat_id} onChange={setField("panchayat_id")} options={options.panchayats} disabled={loading || !formData.city_id} /></div>}
            {(formData.zone_id || formData.panchayat_id) && (
              <div>
                <Label>Ward</Label>
                <MultiSelect
                  value={formData.ward_ids}
                  onChange={(e) => {
                    const raw = Array.isArray(e.value) ? e.value : [];
                    const values = raw.map((v: any) =>
                      v && typeof v === "object" ? String(v.value ?? v.unique_id ?? v.id ?? "") : String(v)
                    );
                    setFormData((prev) => ({ ...prev, ward_ids: values }));
                    setStops([emptyStop(1)]);
                  }}
                  options={options.wards}
                  optionLabel="label"
                  optionValue="value"
                  maxSelectedLabels={3}
                  placeholder="Select ward(s)"
                  disabled={loading}
                  className="!flex !h-10 !w-full !items-center !rounded-md !border !border-gray-300 !bg-white !px-3 !py-2 !text-sm !shadow-none"
                />
              </div>
            )}
            <div><Label>Staff Template</Label><Select value={formData.staff_template_id} onChange={setField("staff_template_id")} options={options.staffTemplates} disabled={loading || !projectId} /><FieldError message={fieldErrors.staff_template_id} /></div>
            <div><Label>Vehicle</Label><Select value={formData.vehicle_id} onChange={setField("vehicle_id")} options={options.vehicles} disabled={loading || !projectId} /><FieldError message={fieldErrors.vehicle_id} /></div>
            <div><Label>Supervisor</Label><Select value={formData.supervisor_id} onChange={setField("supervisor_id")} options={options.staff} disabled={loading || !projectId} /><FieldError message={fieldErrors.supervisor_id} /></div>
            <div>
              <Label>Waste Type</Label>
              <MultiSelect
                value={formData.waste_type_ids}
                onChange={(event) => {
                  const raw = Array.isArray(event.value) ? event.value : [];
                  // PrimeReact MultiSelect sometimes returns objects instead of the optionValue string
                  const values = raw.map((v: any) =>
                    v && typeof v === "object" ? String(v.value ?? v.unique_id ?? v.id ?? "") : String(v)
                  );
                  setFormData((prev) => ({ ...prev, waste_type_ids: values }));
                  setStops((current) => current.map((stop) => ({ ...stop, bin_id: "" })));
                  setFieldErrors((prev) => ({ ...prev, waste_type_ids: "" }));
                }}
                options={options.wasteTypes}
                optionLabel="label"
                optionValue="value"
                maxSelectedLabels={3}
                placeholder="Select waste types"
                disabled={loading || !projectId}
                className="!flex !h-10 !w-full !items-center !rounded-md !border !border-gray-300 !bg-white !px-3 !py-2 !text-sm !shadow-none"
              />
              <FieldError message={fieldErrors.waste_type_ids} />
            </div>
            <div><Label>Start Time</Label><Input type="time" value={formData.scheduled_time} onChange={(e) => setField("scheduled_time")(e.target.value)} disabled={!projectId} /><FieldError message={fieldErrors.scheduled_time} /></div>
            <div><Label>Trigger Weight (kg)</Label><Input type="number" min={0} value={formData.trip_trigger_weight_kg} onChange={(e) => setField("trip_trigger_weight_kg")(e.target.value)} /></div>
            <div><Label>Max Vehicle Capacity (kg)</Label><Input type="number" min={0} value={formData.max_vehicle_capacity_kg} onChange={(e) => setField("max_vehicle_capacity_kg")(e.target.value)} /></div>
            <div><Label>Status</Label><Select value={formData.status} onChange={setField("status")} options={statusOptions} disabled={loading} /></div>
            <div><Label>Approval Status</Label><Select value={formData.approval_status} onChange={setField("approval_status")} options={approvalStatusOptions} disabled={loading} /></div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Collection Points</h2>
                <p className="text-sm text-gray-500">Add all stops for this trip plan before saving.</p>
              </div>
              <div className="flex items-end gap-3">
                <div className="w-64">
                  <Label>Collection Mode</Label>
                  <Select
                    value={formData.collection_type}
                    onChange={handleCollectionModeChange}
                    options={collectionModeOptions}
                    disabled={loading || !projectId}
                  />
                </div>
                {formData.collection_type === "bin_collection" && (
                  <button type="button" onClick={addStop} disabled={loading || !projectId} className="rounded-lg bg-green-custom px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    Add Stop
                  </button>
                )}
              </div>
            </div>

            {formData.collection_type === "bulk_waste_collection" ? (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Bulk waste stops are generated automatically for bulk-waste-generator customers under
                this Trip Plan's ward/panchayat scope — no manual stop list is needed here.
                {(formData.panchayat_id || formData.zone_id) && (
                  <span className="ml-1 font-semibold text-green-700">
                    {autoAssignCustomers.length} matching customer{autoAssignCustomers.length === 1 ? "" : "s"} found.
                  </span>
                )}
              </div>
            ) : formData.collection_type === "household_collection" ? (
              <div className="space-y-3">
                <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-gray-700">
                  {formData.panchayat_id || formData.zone_id ? (
                    <>
                      <span className="font-semibold text-green-700">
                        All {autoAssignCustomers.length} household customer{autoAssignCustomers.length === 1 ? "" : "s"}
                      </span>{" "}
                      in this ward/local body will be auto-assigned as stops for this trip — no manual list needed.
                    </>
                  ) : (
                    "Select a Zone or PLB (Panchayat) first — every household customer under it will be auto-assigned as a stop."
                  )}
                </div>

                {(formData.panchayat_id || formData.zone_id) && autoAssignCustomers.length > 0 && (
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                      <span>Customers in scope</span>
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        {autoAssignCustomers.length}
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-white text-xs uppercase text-gray-500">
                          <tr>
                            <th className="px-4 py-2 font-medium">#</th>
                            <th className="px-4 py-2 font-medium">Customer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoAssignCustomers.map((customer, index) => (
                            <tr key={recordId(customer) || index} className="border-t border-gray-100">
                              <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                              <td className="px-4 py-2 text-gray-700">{customer?.customer_name ?? customer?.name ?? recordId(customer)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => setDraggedStopIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedStopIndex !== null) moveStop(draggedStopIndex, index);
                      setDraggedStopIndex(null);
                    }}
                    onDragEnd={() => setDraggedStopIndex(null)}
                    className="grid cursor-move grid-cols-1 gap-3 rounded-md border border-gray-200 p-3 lg:grid-cols-[72px_minmax(180px,1fr)_minmax(180px,1fr)_120px_92px]"
                  >
                    <div>
                      <Label>Seq</Label>
                      <Input type="number" min={1} value={index + 1} disabled className="bg-gray-50" />
                    </div>
                    <div>
                      <Label>Collection Point</Label>
                      <Select value={stop.collection_point_id} onChange={(value) => setStop(index, { collection_point_id: value })} options={options.collectionPointsFor(index)} disabled={loading || !projectId || (!formData.zone_id && !formData.panchayat_id && formData.ward_ids.length === 0)} />
                      {stop.collection_point_id && (
                        <p className="mt-1 min-h-5 text-xs text-gray-500">
                          {coordinateText(stop.collection_point_id) || "Lat: - | Long: -"}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Bin</Label>
                      <Select value={stop.bin_id} onChange={(value) => setStop(index, { bin_id: value })} options={binOptionsFor(stop.collection_point_id, stop.bin_id)} disabled={loading || !stop.collection_point_id} />
                    </div>
                    <div>
                      <Label>Active</Label>
                      <div className="flex h-10 items-center">
                        <Switch checked={stop.is_active} onCheckedChange={(checked) => setStop(index, { is_active: checked })} />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={() => removeStop(index)} disabled={stops.length === 1} className="h-10 w-full rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_auto_assign}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_auto_assign: e.target.checked }))}
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300 text-green-600"
                />
                Enable Auto-Assignment
              </label>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, the daily trip scheduler auto-generates a Daily Trip Assignment for this
                plan (and clones its stops) on each selected repeat day, once approved.
              </p>
            </div>

            {formData.is_auto_assign && (
              <div>
                <Label>Repeat Days</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <label
                      key={day.value}
                      className={`flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
                        formData.repeat_days.includes(day.value)
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.repeat_days.includes(day.value)}
                        onChange={() => toggleRepeatDay(day.value)}
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button type="submit" disabled={submitting || loading} className="rounded-lg bg-green-custom px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {submitting ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
            </button>
            <button type="button" onClick={() => navigate(listPath, { state: { companyUniqueId, projectId } })} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600">
              {t("common.cancel")}
            </button>
          </div>

          
        </form>
      </ComponentCard>
    </div>
  );
}
