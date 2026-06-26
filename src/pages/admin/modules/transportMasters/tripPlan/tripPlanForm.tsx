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
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";


const statusOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const approvalStatusOptions: SelectOption[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const collectionTypeOptions: SelectOption[] = [
  { value: "bin_collection", label: "Bin Collection" },
  { value: "household_collection", label: "Household Collection" },
];

const emptyStop = (sequence: number): StopRow => ({
  collection_type: "bin_collection",
  collection_point_id: "",
  bin_id: "",
  customer_id: "",
  sequence,
  is_active: true,
});

const optionLabel = (item: any, keys: string[]) =>
  keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null && value !== "") ??
  item?.display_code ??
  item?.unique_id ??
  "";

const buildOptions = (items: any[], keys: string[]): SelectOption[] =>
  items
    .map((item) => ({
      value: String(item?.unique_id ?? item?.staff_unique_id ?? ""),
      label: String(optionLabel(item, keys)),
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
  approval_status: "PENDING",
  status: "ACTIVE",
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

  const { encScheduleMasters, encTripPlans } = getEncryptedRoute();
  const { listPath: listPath } = createCrudRoutePaths(encScheduleMasters, encTripPlans);

  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [stops, setStops] = useState<StopRow[]>([
    emptyStop(1),
  ]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [draggedStopIndex, setDraggedStopIndex] = useState<number | null>(null);
  // Holds raw edit record until lookups are ready — avoids Radix Select blank-value bug
  const [pendingRecord, setPendingRecord] = useState<any>(null);

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
      approval_status: record.approval_status ?? "PENDING",
      status: record.status ?? "ACTIVE",
    });
    const stopRows: StopRow[] = normalizeList(record.plan_collection_points).map((stop: any, index: number) => ({
      collection_type: stop.collection_type === "household_collection" ? "household_collection" as const : "bin_collection" as const,
      collection_point_id: stop.collection_point_id ?? stop.collection_point?.unique_id ?? "",
      bin_id: stop.bin_id ?? stop.bin?.unique_id ?? "",
      customer_id: stop.customer_id ?? stop.customer?.unique_id ?? "",
      sequence: Number(stop.sequence ?? index + 1),
      is_active: stop.is_active !== false,
    }));
    setStops(stopRows.length ? stopRows : [emptyStop(1)]);
    setPendingRecord(null);
  }, [pendingRecord, lookups]);

  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setLookups({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = {
      company_id: companyUniqueId,
      company_unique_id: companyUniqueId,
      project_id: projectId,
      project: projectId,
      project_unique_id: projectId,
    };
    Promise.all([
      adminApi.districts.readAll({ params }),
      adminApi.cities.readAll({ params }),
      adminApi.zones.readAll({ params }),
      adminApi.panchayats.readAll({ params }),
      adminApi.wards.readAll({ params }),
      adminApi.staffTemplateCreation.readAll({ params }),
      adminApi.vehicleCreations.readAll({ params }),
      adminApi.staffCreation.readAll({ params }),
      adminApi.wasteTypes.readAll({ params }),
      adminApi.collectionPoints.readAll({ params }),
      adminApi.bins.readAll({ params }),
      adminApi.customerCreations.readAll({ params }),
    ])
      .then(([districts, cities, zones, panchayats, wards, staffTemplates, vehicles, staff, wasteTypes, collectionPoints, bins, customers]) => {
        if (cancelled) return;
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
          bins: normalizeList(bins),
          customers: normalizeList(customers),
        });
      })
      .catch((error) => Swal.fire(t("common.error"), extractErrorMessage(error) ?? t("common.load_failed"), "error"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId, t]);

  const options = useMemo(() => {
    const districts = scopedItems(lookups.districts ?? [], companyUniqueId, projectId);
    const cities = scopedItems(lookups.cities ?? [], companyUniqueId, projectId);
    const zones = scopedItems(lookups.zones ?? [], companyUniqueId, projectId);
    const panchayats = scopedItems(lookups.panchayats ?? [], companyUniqueId, projectId);
    const wards = scopedItems(lookups.wards ?? [], companyUniqueId, projectId);
    const collectionPoints = scopedItems(lookups.collectionPoints ?? [], companyUniqueId, projectId);
    const customers = scopedItems(lookups.customers ?? [], companyUniqueId, projectId);

    const selectedDistrict = districts.find((item) => recordId(item) === formData.district_id);
    const selectedCity = cities.find((item) => recordId(item) === formData.city_id);
    const selectedZone = zones.find((item) => recordId(item) === formData.zone_id);
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
      staffTemplates: buildOptions(scopedItems(lookups.staffTemplates ?? [], companyUniqueId, projectId), ["display_code"]),
      vehicles: buildOptions(scopedItems(lookups.vehicles ?? [], companyUniqueId, projectId), ["vehicle_no"]),
      staff: buildOptions(
        scopedItems(lookups.staff ?? [], companyUniqueId, projectId).filter((s) =>
          String(s?.staffusertype_name ?? s?.designation ?? "").trim().toLowerCase().includes("supervisor")
        ),
        ["employee_name", "username"]
      ),
      wasteTypes: buildOptions(scopedItems(lookups.wasteTypes ?? [], companyUniqueId, projectId), ["waste_type_name", "name"]),
      collectionPoints: buildOptions(
        collectionPoints.filter((item) => {
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
        }),
        ["cp_name", "collection_point_name", "name"]
      ),
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
  }, [companyUniqueId, projectId, formData.district_id, formData.city_id, formData.zone_id, formData.panchayat_id, formData.ward_ids, lookups]);

  const binOptionsFor = (collectionPointId: string) => {
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

    return buildOptions(
      scopedItems(lookups.bins ?? [], companyUniqueId, projectId).filter((bin) => {
        const belongsToCollectionPoint = !collectionPointId || relationMatches(
          bin?.collection_point_id ?? bin?.collection_point ?? { cp_name: bin?.collection_point_name, name: bin?.collection_point_name },
          collectionPointId,
          collectionPointDetails(collectionPointId),
          ["cp_name", "collection_point_name", "name"]
        );
        if (!belongsToCollectionPoint) return false;
        if (normalizedWasteTypeIds.length === 0) return true;
        // Try ID match first (if the API ever returns wastetype_id)
        const binWasteTypeId = recordId(bin?.wastetype_id ?? bin?.waste_type_id);
        if (binWasteTypeId && normalizedWasteTypeIds.includes(binWasteTypeId)) return true;
        // Fall back to name match
        const binWasteTypeName = normalizedText(bin?.waste_type_name ?? bin?.wastetype_name ?? bin?.waste_type);
        return binWasteTypeName ? selectedWasteTypeNames.has(binWasteTypeName) : false;
      }),
      ["bin_name"]
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
    if (field === "panchayat_id" || field === "zone_id") {
      setStops([emptyStop(1)]);
    }
  };

  const setStop = (index: number, patch: Partial<StopRow>) => {
    setStops((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      if (patch.collection_type === "bin_collection") next.customer_id = "";
      if (patch.collection_type === "household_collection") {
        next.collection_point_id = "";
        next.bin_id = "";
      }
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
    const validStops = stops.filter((stop) =>
      stop.collection_type === "household_collection"
        ? Boolean(stop.customer_id)
        : Boolean(stop.collection_point_id && stop.bin_id)
    );

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push("Company");
    if (!projectId) missingFields.push("Project");
    if (!formData.district_id) missingFields.push("District");
    if (!formData.city_id) missingFields.push("City");
    if (!formData.staff_template_id) missingFields.push("Staff Template");
    if (!formData.vehicle_id) missingFields.push("Vehicle");
    if (!formData.supervisor_id) missingFields.push("Supervisor");
    if (formData.waste_type_ids.length === 0) missingFields.push("Waste Type");
    if (!formData.scheduled_time) missingFields.push("Scheduled Time");
    if (missingFields.length) {
      Swal.fire(t("common.warning"), `Please fill: ${missingFields.join(", ")}`, "warning");
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
    if (!validStops.length) {
      Swal.fire(t("common.warning"), "Add at least one collection point or household stop.", "warning");
      return;
    }

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
      collection_points: validStops.map((stop, index) => ({
        collection_type: stop.collection_type,
        collection_point_id: stop.collection_type === "bin_collection" ? stop.collection_point_id : null,
        bin_id: stop.collection_type === "bin_collection" ? stop.bin_id : null,
        customer_id: stop.collection_type === "household_collection" ? stop.customer_id : null,
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
            <div><Label>District</Label><Select value={formData.district_id} onChange={setField("district_id")} options={options.districts} disabled={loading || !projectId} /></div>
            <div><Label>City</Label><Select value={formData.city_id} onChange={setField("city_id")} options={options.cities} disabled={loading || !formData.district_id} /></div>
            {!formData.panchayat_id && <div><Label>Zone</Label><Select value={formData.zone_id} onChange={setField("zone_id")} options={options.zones} disabled={loading || !formData.city_id} /></div>}
            {!formData.zone_id && <div><Label>PLB (Participating Local Bodies)</Label><Select value={formData.panchayat_id} onChange={setField("panchayat_id")} options={options.panchayats} disabled={loading || !formData.city_id} /></div>}
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
            <div><Label>Staff Template</Label><Select value={formData.staff_template_id} onChange={setField("staff_template_id")} options={options.staffTemplates} disabled={loading || !projectId} /></div>
            <div><Label>Vehicle</Label><Select value={formData.vehicle_id} onChange={setField("vehicle_id")} options={options.vehicles} disabled={loading || !projectId} /></div>
            <div><Label>Supervisor</Label><Select value={formData.supervisor_id} onChange={setField("supervisor_id")} options={options.staff} disabled={loading || !projectId} /></div>
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
                }}
                options={options.wasteTypes}
                optionLabel="label"
                optionValue="value"
                maxSelectedLabels={3}
                placeholder="Select waste types"
                disabled={loading || !projectId}
                className="!flex !h-10 !w-full !items-center !rounded-md !border !border-gray-300 !bg-white !px-3 !py-2 !text-sm !shadow-none"
              />
            </div>
            <div><Label>Scheduled Time</Label><Input type="time" value={formData.scheduled_time} onChange={(e) => setField("scheduled_time")(e.target.value)} disabled={!projectId} /></div>
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
              <button type="button" onClick={addStop} disabled={loading || !projectId} className="rounded-lg bg-green-custom px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Add Stop
              </button>
            </div>

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
                  className="grid cursor-move grid-cols-1 gap-3 rounded-md border border-gray-200 p-3 lg:grid-cols-[72px_minmax(160px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_120px_92px]"
                >
                  <div>
                    <Label>Seq</Label>
                    <Input type="number" min={1} value={index + 1} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={stop.collection_type} onChange={(value) => setStop(index, { collection_type: value as StopRow["collection_type"] })} options={collectionTypeOptions} disabled={loading || !projectId} />
                  </div>
                  {stop.collection_type === "household_collection" ? (
                    <>
                      <div className="lg:col-span-2">
                        <Label>Customer</Label>
                        <Select value={stop.customer_id} onChange={(value) => setStop(index, { customer_id: value })} options={options.customers} disabled={loading || !projectId} />
                      </div>
                      <div />
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Collection Point</Label>
                        <Select value={stop.collection_point_id} onChange={(value) => setStop(index, { collection_point_id: value })} options={options.collectionPoints.filter((opt) => !opt.value || opt.value === stop.collection_point_id || !stops.some((s, si) => si !== index && s.collection_point_id === opt.value))} disabled={loading || !projectId || (!formData.panchayat_id && formData.ward_ids.length === 0)} />
                        {stop.collection_point_id && (
                          <p className="mt-1 min-h-5 text-xs text-gray-500">
                            {coordinateText(stop.collection_point_id) || "Lat: - | Long: -"}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Bin</Label>
                        <Select value={stop.bin_id} onChange={(value) => setStop(index, { bin_id: value })} options={binOptionsFor(stop.collection_point_id)} disabled={loading || !stop.collection_point_id} />
                      </div>
                    </>
                  )}
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
