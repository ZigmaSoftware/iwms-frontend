import { createCrudRoutePaths } from "@/utils/routePaths";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { getEncryptedRoute } from "@/utils/routeCache";
import { stateApi, districtApi, cityApi, panchayatApi, zoneApi, wardApi, collectionPointApi } from "@/helpers/admin";
import { adminApi } from "@/helpers/admin/registry";
import type { SelectOption } from "@/types";
import type {
  UnknownRecord,
  WardOption,
  WithCityIdOption,
  WithDistrictIdOption,
  WithStateIdOption,
  ZoneOption,
} from "./types";

const normalizeIdValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return String(obj.unique_id ?? obj.id ?? obj.value ?? "").trim();
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const inParentheses = raw.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
  if (inParentheses?.[1]) return inParentheses[1];
  return raw;
};

const toStringOrEmpty = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
};

const isValidCoordinate = (value: string, min: number, max: number): boolean => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max;
};

const ensureSelectedOption = (options: SelectOption[], selectedValue: string): SelectOption[] => {
  if (!selectedValue) return options;
  if (options.some((option) => option.value === selectedValue)) {
    return options;
  }
  return [...options, { value: selectedValue, label: selectedValue }];
};

const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (value && typeof value === "object") {
    const maybeResults = (value as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object" && !Array.isArray(item)
      );
    }
  }
  return [];
};

const { encScheduleMasters, encCollectionPoints } = getEncryptedRoute();
const { listPath: ENC_LIST_PATH } = createCrudRoutePaths(encScheduleMasters, encCollectionPoints);

const COLLECTION_POINT_FIELDS: Record<string, string[]> = {
  state_id: ["state_id", "state"],
  district_id: ["district_id", "district"],
  city_id: ["city_id", "city"],
  panchayat_id: ["panchayat_id", "panchayat"],
  zone_id: ["zone_id", "zone"],
  ward_id: ["ward_id", "ward"],
  cp_name: ["cp_name", "collection_point_name", "name"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  is_active: ["is_active"],
};

export default function CollectionPointForm() {
  const { t } = useTranslation();
  const { showField, filterPayload, getMissingRequiredFields } =
    useFieldVisibility("schedule-masters", "collection-points", COLLECTION_POINT_FIELDS);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
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
  } = useCompanyProjectSelection({ isEdit, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

  const extractErr = useCallback(
    (error: unknown): string => {
      const err = error as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;

      if (typeof data === "string") return data;
      if (data && typeof data === "object") {
        return Object.entries(data as Record<string, unknown>)
          .map(([key, value]) =>
            Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${String(value)}`
          )
          .join("\n");
      }

      if (err.message) return err.message;
      return t("common.unexpected_error");
    },
    [t]
  );

  // ── Bins state ──────────────────────────────────────────────────────────────
  type BinRow = { waste_type_id: string; bin_name: string; bin_capacity: string; bin_type: string };
  type ExistingBin = BinRow & { unique_id: string };
  const emptyBinRow = (): BinRow => ({ waste_type_id: "", bin_name: "", bin_capacity: "240", bin_type: "medium" });

  const [wasteTypeOptions, setWasteTypeOptions] = useState<SelectOption[]>([]);
  const [existingBins, setExistingBins] = useState<ExistingBin[]>([]);
  const [newBins, setNewBins] = useState<BinRow[]>([emptyBinRow()]);
  const [binsToDelete, setBinsToDelete] = useState<string[]>([]);
  // ────────────────────────────────────────────────────────────────────────────

  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [panchayatId, setPanchayatId] = useState("");
  const [zoneId, setZoneId] = useState("");
  // Multi-ward selection
  const [wardIds, setWardIds] = useState<string[]>([]);
  const [wardDropdownOpen, setWardDropdownOpen] = useState(false);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  /* pending IDs for edit-mode prefill race condition */
  const [pendingStateId, setPendingStateId] = useState("");
  const [pendingDistrictId, setPendingDistrictId] = useState("");
  const [pendingCityId, setPendingCityId] = useState("");
  const [pendingPanchayatId, setPendingPanchayatId] = useState("");
  const [pendingZoneId, setPendingZoneId] = useState("");
  const [pendingWardIds, setPendingWardIds] = useState<string[]>([]);
  const [pendingProjectCandidates, setPendingProjectCandidates] = useState<{
    projectUniqueId: string; projectId: string; projectName: string;
  } | null>(null);
  const [collectionType, setCollectionType] = useState<"bin_collection" | "household_collection">("bin_collection");
  const [cpName, setCpName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [states, setStates] = useState<SelectOption[]>([]);
  const [districts, setDistricts] = useState<WithStateIdOption[]>([]);
  const [cities, setCities] = useState<WithDistrictIdOption[]>([]);
  const [panchayats, setPanchayats] = useState<WithCityIdOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([]);
  const [wards, setWards] = useState<WardOption[]>([]);
  // All CPs in this project (raw), used to compute usedWardIds per collection_type
  const [allProjectCPs, setAllProjectCPs] = useState<Record<string, unknown>[]>([]);
  // Ward IDs already assigned to OTHER collection points of the SAME collection_type
  const usedWardIds = useMemo(() => {
    const used = new Set<string>();
    allProjectCPs.forEach((cp) => {
      if (isEdit && id && normalizeIdValue(cp.unique_id) === id) return;
      const cpType = (cp.collection_type as string | undefined) ?? "bin_collection";
      if (cpType !== collectionType) return;
      const cpWards = cp.wards as { unique_id: string }[] | undefined;
      if (Array.isArray(cpWards)) {
        cpWards.forEach((w) => { if (w?.unique_id) used.add(w.unique_id); });
      }
    });
    return used;
  }, [allProjectCPs, collectionType, isEdit, id]);

  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);

  const resetLocationFields = useCallback(() => {
    setStateId("");
    setDistrictId("");
    setCityId("");
    setPanchayatId("");
    setZoneId("");
    setWardIds([]);
  }, []);

  // Close ward dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wardDropdownRef.current && !wardDropdownRef.current.contains(e.target as Node)) {
        setWardDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ==========================================================
      LOAD STATES (global, no tenant filter)
  ========================================================== */
  useEffect(() => {
    let cancelled = false;
    stateApi.readAll()
      .then((data: unknown) => {
        if (cancelled) return;
        setStates(
          toRecordList(data)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
            }))
            .filter((item) => item.value && item.label)
            .sort((a, b) => a.label.localeCompare(b.label))
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        Swal.fire(t("common.error"), extractErr(err), "error");
      });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==========================================================
      LOAD TENANT-FILTERED DROPDOWNS (districts, cities, panchayats, zones, wards)
  ========================================================== */
  useEffect(() => {
    if (!companyUniqueId || !projectId) return;
    let cancelled = false;
    const params = { company_id: companyUniqueId, project_id: projectId };
    Promise.all([
      districtApi.readAll({ params }),
      cityApi.readAll({ params }),
      panchayatApi.readAll({ params }),
      zoneApi.readAll({ params }),
      wardApi.readAll({ params }),
      collectionPointApi.readAll({ params }),
    ])
      .then(([distData, cityData, panData, zoneData, wardData, cpData]) => {
        if (cancelled) return;

        setAllProjectCPs(toRecordList(cpData));

        setDistricts(
          toRecordList(distData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
            }))
            .filter((item) => item.value && item.label)
        );

        setCities(
          toRecordList(cityData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id ?? item.district),
            }))
            .filter((item) => item.value && item.label)
        );

        setPanchayats(
          toRecordList(panData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.panchayat_name ?? item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id),
              cityId: normalizeIdValue(item.city_id),
            }))
            .filter((item) => item.value && item.label)
        );

        setZoneOptions(
          toRecordList(zoneData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.zone_name ?? item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id),
              cityId: normalizeIdValue(item.city_id),
            }))
            .filter((item) => item.value && item.label)
        );

        setWards(
          toRecordList(wardData)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: normalizeIdValue(item.unique_id),
              label: toStringOrEmpty(item.ward_name ?? item.name ?? item.unique_id),
              stateId: normalizeIdValue(item.state_id),
              districtId: normalizeIdValue(item.district_id ?? item.district),
              cityId: normalizeIdValue(item.city_id ?? item.city),
              panchayatId: normalizeIdValue(item.panchayat_id ?? item.panchayat),
              zoneId: normalizeIdValue(item.zone_id ?? item.zone),
            }))
            .filter((item) => item.value && item.label)
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        Swal.fire(t("common.error"), extractErr(err), "error");
      });
    return () => { cancelled = true; };
  }, [companyUniqueId, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==========================================================
      LOAD COLLECTION POINT DATA (edit mode)
  ========================================================== */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    collectionPointApi.read(id)
      .then((data: unknown) => {
        if (cancelled) return;
        const record = data as UnknownRecord;
        const _stateId = normalizeIdValue(record.state_id ?? record.state);
        const _districtId = normalizeIdValue(record.district_id ?? record.district);
        const _cityId = normalizeIdValue(record.city_id ?? record.city);
        const _panchayatId = normalizeIdValue(record.panchayat_id ?? record.panchayat);
        const _zoneId = normalizeIdValue(record.zone_id ?? record.zone);

        // wards is now M2M — the API returns an array of ward objects under "wards"
        const wardsArray = Array.isArray(record.wards) ? record.wards : [];
        const _wardIds = wardsArray.map((w: unknown) => normalizeIdValue(w)).filter(Boolean);

        setStateId(_stateId);
        setPendingStateId(_stateId);
        setDistrictId(_districtId);
        setPendingDistrictId(_districtId);
        setCityId(_cityId);
        setPendingCityId(_cityId);
        setPanchayatId(_panchayatId);
        setPendingPanchayatId(_panchayatId);
        setZoneId(_zoneId);
        setPendingZoneId(_zoneId);
        setWardIds(_wardIds);
        setPendingWardIds(_wardIds);
        const recType = toStringOrEmpty(record.collection_type);
        if (recType === "household_collection") setCollectionType("household_collection");
        else setCollectionType("bin_collection");
        setCpName(toStringOrEmpty(record.cp_name ?? record.collection_point_name));
        setLatitude(toStringOrEmpty(record.latitude));
        setLongitude(toStringOrEmpty(record.longitude));
        setIsActive(toBoolean(record.is_active, true));

        applyCompanyProjectFromRecord(record);
        setPendingProjectCandidates({
          projectUniqueId: toStringOrEmpty((record as any).project_unique_id ?? (record as any).project?.unique_id ?? ""),
          projectId: toStringOrEmpty((record as any).project_id ?? ""),
          projectName: toStringOrEmpty((record as any).project_name ?? ""),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        Swal.fire(t("common.error"), extractErr(err), "error");
      });
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==========================================================
      LOAD WASTE TYPES + EXISTING BINS
  ========================================================== */
  useEffect(() => {
    if (!companyUniqueId) return;
    let cancelled = false;
    adminApi.wasteTypes.readAll({ params: { company_id: companyUniqueId } })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data as any)?.data ?? (data as any)?.results ?? [];
        setWasteTypeOptions(
          (list as any[]).map((wt: any) => ({
            value: String(wt.unique_id ?? ""),
            label: String(wt.waste_type_name ?? wt.name ?? wt.unique_id ?? ""),
          })).filter((o: SelectOption) => o.value)
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [companyUniqueId]);

  useEffect(() => {
    if (!isEdit || !id || !companyUniqueId) return;
    let cancelled = false;
    adminApi.bins.readAll({ params: { company_id: companyUniqueId, collection_point_id: id } })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data as any)?.data ?? (data as any)?.results ?? [];
        setExistingBins(
          (list as any[]).map((b: any) => ({
            unique_id: String(b.unique_id ?? ""),
            waste_type_id: String(b.wastetype_id ?? b.waste_type_id ?? b.waste_type?.unique_id ?? ""),
            bin_name: String(b.bin_name ?? ""),
            bin_capacity: String(b.bin_capacity ?? "240"),
            bin_type: String(b.bin_type ?? "medium"),
          })).filter((b: ExistingBin) => b.unique_id)
        );
        setNewBins([emptyBinRow()]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isEdit, id, companyUniqueId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ==========================================================
      APPLY PENDING IDs once option lists have loaded
  ========================================================== */

  // Apply pending stateId once the global states list is available
  useEffect(() => {
    if (!pendingStateId) return;
    if (states.length > 0 && states.some((s) => s.value === pendingStateId)) {
      setStateId(pendingStateId);
      setPendingStateId("");
    }
  }, [pendingStateId, states]);

  // Apply pending districtId once the tenant-filtered districts list is available
  useEffect(() => {
    if (!pendingDistrictId) return;
    if (districts.length > 0 && districts.some((d) => d.value === pendingDistrictId)) {
      setDistrictId(pendingDistrictId);
      setPendingDistrictId("");
    }
  }, [pendingDistrictId, districts]);

  // Apply pending cityId once the tenant-filtered cities list is available
  useEffect(() => {
    if (!pendingCityId) return;
    if (cities.length > 0 && cities.some((c) => c.value === pendingCityId)) {
      setCityId(pendingCityId);
      setPendingCityId("");
    }
  }, [pendingCityId, cities]);

  // Apply pending panchayatId once the tenant-filtered panchayats list is available
  useEffect(() => {
    if (!pendingPanchayatId) return;
    if (panchayats.length > 0 && panchayats.some((p) => p.value === pendingPanchayatId)) {
      setPanchayatId(pendingPanchayatId);
      setPendingPanchayatId("");
    }
  }, [pendingPanchayatId, panchayats]);

  // Apply pending zoneId once the tenant-filtered zones list is available
  useEffect(() => {
    if (!pendingZoneId) return;
    if (zoneOptions.length > 0 && zoneOptions.some((z) => z.value === pendingZoneId)) {
      setZoneId(pendingZoneId);
      setPendingZoneId("");
    }
  }, [pendingZoneId, zoneOptions]);

  // Apply pending wardIds once the tenant-filtered wards list is available
  useEffect(() => {
    if (!pendingWardIds.length || wards.length === 0) return;
    const available = wards.map((w) => w.value);
    const resolved = pendingWardIds.filter((id) => available.includes(id));
    if (resolved.length > 0) {
      setWardIds(resolved);
      setPendingWardIds([]);
    }
  }, [pendingWardIds, wards]);

  // Re-apply project after the hook loads the project list
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

  const districtOptions = useMemo(() => {
    const filtered = districts
      .filter((option) => !stateId || !option.stateId || option.stateId === stateId)
      .map((option) => ({ value: option.value, label: option.label }));
    return ensureSelectedOption(filtered, districtId);
  }, [districtId, districts, stateId]);

  const cityOptions = useMemo(() => {
    const filtered = cities
      .filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        return true;
      })
      .map((option) => ({ value: option.value, label: option.label }));
    return ensureSelectedOption(filtered, cityId);
  }, [cities, cityId, districtId, stateId]);

  const panchayatOptions = useMemo(() => {
    const filtered = panchayats
      .filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        return true;
      })
      .map((option) => ({ value: option.value, label: option.label }));
    return ensureSelectedOption(filtered, panchayatId);
  }, [cityId, districtId, panchayatId, panchayats, stateId]);

  const filteredZoneOptions = useMemo(() => {
    const filtered = zoneOptions
      .filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        return true;
      })
      .map((option) => ({ value: option.value, label: option.label }));
    return ensureSelectedOption(filtered, zoneId);
  }, [cityId, districtId, stateId, zoneId, zoneOptions]);

  const wardOptions = useMemo(() => {
    return wards
      .filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        // XOR filter: show zone-wards when zone selected, panchayat-wards when panchayat selected
        if (zoneId) return option.zoneId === zoneId;
        if (panchayatId) return option.panchayatId === panchayatId;
        return true;
      })
      .map((option) => ({
        value: option.value,
        label: option.label,
        disabled: usedWardIds.has(option.value) && !wardIds.includes(option.value),
      }));
  }, [cityId, districtId, panchayatId, stateId, wards, zoneId, usedWardIds, wardIds]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    const fieldValues: Record<string, unknown> = {
      state_id: stateId,
      district_id: districtId,
      city_id: cityId,
      panchayat_id: panchayatId,
      ward_ids: wardIds,
      cp_name: cpName.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
    };
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
    if (getMissingRequiredFields(["state_id"], (fieldKey) => fieldValues[fieldKey]).length > 0) {
      missingFields.push(t("common.state"));
    }
    if (getMissingRequiredFields(["district_id"], (fieldKey) => fieldValues[fieldKey]).length > 0) {
      missingFields.push(t("common.district"));
    }
    if (getMissingRequiredFields(["city_id"], (fieldKey) => fieldValues[fieldKey]).length > 0) {
      missingFields.push(t("common.city"));
    }
    if ((showField("panchayat_id") || showField("ward_id")) && !panchayatId && wardIds.length === 0) {
      missingFields.push(`${t("admin.nav.panchayat")} / ${t("admin.nav.ward")}`);
    }
    if (getMissingRequiredFields(["cp_name"], (fieldKey) => fieldValues[fieldKey]).length > 0) {
      missingFields.push(t("common.item_name", { item: t("admin.nav.collection_point") }));
    }
    if (getMissingRequiredFields(["latitude"], (fieldKey) => fieldValues[fieldKey]).length > 0) missingFields.push(t("common.latitude"));
    if (getMissingRequiredFields(["longitude"], (fieldKey) => fieldValues[fieldKey]).length > 0) missingFields.push(t("common.longitude"));

    const latitudeValid = isValidCoordinate(latitude, -90, 90);
    const longitudeValid = isValidCoordinate(longitude, -180, 180);
    if (showField("latitude") && latitude.trim() && !latitudeValid) missingFields.push("Valid Latitude");
    if (showField("longitude") && longitude.trim() && !longitudeValid) missingFields.push("Valid Longitude");

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
        "warning"
      );
      return;
    }

    const parsedLatitude = Number.parseFloat(latitude);
    const parsedLongitude = Number.parseFloat(longitude);

    const rawPayload = {
      company_id: companyUniqueId,
      project_id: projectId,
      state_id: stateId,
      district_id: districtId,
      city_id: cityId,
      panchayat_id: panchayatId || null,
      ward_ids: wardIds,
      collection_type: collectionType,
      cp_name: cpName.trim(),
      latitude: parsedLatitude.toFixed(6),
      longitude: parsedLongitude.toFixed(6),
      is_active: isActive,
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

    try {
      setIsSubmitting(true);
      let cpId = id ?? "";

      if (isEdit && id) {
        await collectionPointApi.update(id, payload);
        // Delete removed bins
        await Promise.all(binsToDelete.map((binId) => adminApi.bins.delete(binId)));
      } else {
        const created = await collectionPointApi.create(payload);
        cpId = (created as any)?.unique_id ?? (created as any)?.data?.unique_id ?? "";
      }

      // Create new bins (those with all required fields filled)
      const validNewBins = newBins.filter(
        (b) => b.waste_type_id && b.bin_name.trim() && b.bin_capacity && b.bin_type
      );
      await Promise.all(
        validNewBins.map((b) =>
          adminApi.bins.create({
            company_id: companyUniqueId,
            project_id: projectId,
            collection_point_id: cpId,
            wastetype_id: b.waste_type_id,
            bin_name: b.bin_name.trim(),
            bin_capacity: parseInt(b.bin_capacity, 10),
            bin_type: b.bin_type,
            bin_image: "default.png",
          })
        )
      );

      Swal.fire(t("common.success"), isEdit ? t("common.updated_success") : t("common.added_success"), "success");
      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } });
    } catch (error) {
      Swal.fire(t("common.save_failed"), extractErr(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.collection_point") })
          : t("common.add_item", { item: t("admin.nav.collection_point") })
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>
        <div>
          <Label>{t("admin.nav.company")} *</Label>
          <Select
            value={companyUniqueId}
            onValueChange={(value) => {
              onCompanyChange(value);
              resetLocationFields();
            }}
            disabled={
              Boolean(loggedInCompanyUniqueId) ||
              (!isSuperAdmin && !loggedInCompanyUniqueId) ||
              companies.length === 0
            }
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue placeholder={loggedInCompanyUniqueId ? "Company from logged-in profile" : "Select Company"} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.value} value={company.value}>
                  {company.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t("admin.nav.project")} *</Label>
          <Select
            value={projectId}
            onValueChange={(value) => {
              setProjectId(value);
              resetLocationFields();
            }}
            disabled={!companyUniqueId || projects.length === 0}
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.value} value={project.value}>
                  {project.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showField("state_id") && (
          <div>
            <Label>{t("common.state")} *</Label>
            <Select
              value={stateId}
              onValueChange={(value) => {
                setStateId(value);
                setDistrictId("");
                setCityId("");
                setPanchayatId("");
                setZoneId("");
                setWardIds([]);
              }}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.state") })} />
              </SelectTrigger>
              <SelectContent>
                {states.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showField("district_id") && (
          <div>
            <Label>{t("common.district")} *</Label>
            <Select
              value={districtId}
              onValueChange={(value) => {
                setDistrictId(value);
                setCityId("");
                setPanchayatId("");
                setZoneId("");
                setWardIds([]);
              }}
              disabled={!stateId}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.district") })} />
              </SelectTrigger>
              <SelectContent>
                {districtOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showField("city_id") && (
          <div>
            <Label>{t("common.city")} *</Label>
            <Select
              value={cityId}
              onValueChange={(value) => {
                setCityId(value);
                setPanchayatId("");
                setZoneId("");
                setWardIds([]);
              }}
              disabled={!districtId}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("common.city") })} />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Panchayat — hidden when Zone is selected */}
        {showField("panchayat_id") && !isZoneSelected && (
          <div>
            <Label>{t("admin.nav.panchayat")}</Label>
            <Select
              value={panchayatId || "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? "" : value;
                setPanchayatId(next);
                setZoneId("");
                setWardIds([]);
              }}
              disabled={!cityId}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
                {panchayatOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Zone — hidden when Panchayat is selected */}
        {showField("zone_id") && !isPanchayatSelected && (
          <div>
            <Label>{t("admin.nav.zone")}</Label>
            <Select
              value={zoneId || "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? "" : value;
                setZoneId(next);
                setPanchayatId("");
                setWardIds([]);
              }}
              disabled={!cityId}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
                {filteredZoneOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Collection Type *</Label>
          <Select
            value={collectionType}
            onValueChange={(v) => setCollectionType(v as "bin_collection" | "household_collection")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bin_collection">Bin Collection</SelectItem>
              <SelectItem value="household_collection">Household Collection</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Wards — multi-select checkbox dropdown, visible only when zone or panchayat is chosen */}
        {showField("ward_id") && (isZoneSelected || isPanchayatSelected) && (
          <div ref={wardDropdownRef} className="relative">
            <Label>{t("admin.nav.ward")}</Label>
            <button
              type="button"
              onClick={() => setWardDropdownOpen((o) => !o)}
              disabled={!cityId || wardOptions.length === 0}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="truncate text-left">
                {wardIds.length === 0
                  ? t("common.select_item_placeholder", { item: t("admin.nav.ward") })
                  : wardIds.length === 1
                    ? (wardOptions.find((w) => w.value === wardIds[0])?.label ?? wardIds[0])
                    : `${wardIds.length} wards selected`}
              </span>
              <svg className="h-4 w-4 opacity-50 shrink-0 ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {wardDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                <div className="max-h-60 overflow-y-auto p-1">
                  {wardOptions.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">No wards found</p>
                  ) : (
                    wardOptions.map((w) => {
                      const checked = wardIds.includes(w.value);
                      const isDisabled = w.disabled === true;
                      return (
                        <label
                          key={w.value}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"}`}
                          title={isDisabled ? "Already assigned to another collection point" : undefined}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isDisabled}
                            onChange={() => {
                              if (isDisabled) return;
                              setWardIds((prev) =>
                                checked ? prev.filter((id) => id !== w.value) : [...prev, w.value]
                              );
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {w.label}
                          {isDisabled && <span className="ml-auto text-xs text-muted-foreground">(assigned)</span>}
                        </label>
                      );
                    })
                  )}
                </div>
                {wardIds.length > 0 && (
                  <div className="border-t px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => setWardIds([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            )}
            {wardIds.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {wardIds.map((id) => {
                  const label = wardOptions.find((w) => w.value === id)?.label ?? id;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      {label}
                      <button type="button" onClick={() => setWardIds((prev) => prev.filter((v) => v !== id))} className="hover:text-red-600">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {showField("cp_name") && (
          <div>
            <Label>{t("common.item_name", { item: t("admin.nav.collection_point") })} *</Label>
            <Input value={cpName} onChange={(e) => setCpName(e.target.value)} placeholder="CP 1" required />
          </div>
        )}

        {showField("latitude") && (
          <div>
            <Label>{t("common.latitude")} *</Label>
            <Input type="number" step="0.000001" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="13.083000" required />
          </div>
        )}

        {showField("longitude") && (
          <div>
            <Label>{t("common.longitude")} *</Label>
            <Input type="number" step="0.000001" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="80.271000" required />
          </div>
        )}

        {showField("is_active") && (
          <div>
            <Label>{t("common.status")}</Label>
            <Select value={isActive ? "true" : "false"} onValueChange={(value) => setIsActive(value === "true")}>
              <SelectTrigger className="input-validate w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ── BINS SECTION — only for bin_collection type ─────────────────── */}
        {collectionType === "bin_collection" && <div className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Bins at this Collection Point</h3>
              <p className="text-xs text-gray-500">Each bin is linked to a specific waste type. QR code is auto-generated.</p>
            </div>
          </div>

          {/* Existing bins (edit mode) */}
          {existingBins.map((bin, idx) => (
            <div key={bin.unique_id} className={`grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_100px_120px_auto] ${binsToDelete.includes(bin.unique_id) ? "opacity-40 line-through" : ""}`}>
              <div>
                <Label className="text-xs text-gray-500">Waste Type</Label>
                <Select
                  value={bin.waste_type_id}
                  onValueChange={(v) => setExistingBins((prev) => prev.map((b, i) => i === idx ? { ...b, waste_type_id: v } : b))}
                  disabled={binsToDelete.includes(bin.unique_id)}
                >
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Waste Type" /></SelectTrigger>
                  <SelectContent>
                    {wasteTypeOptions.map((wt) => <SelectItem key={wt.value} value={String(wt.value)}>{wt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Bin Name</Label>
                <Input value={bin.bin_name} onChange={(e) => setExistingBins((prev) => prev.map((b, i) => i === idx ? { ...b, bin_name: e.target.value } : b))} disabled={binsToDelete.includes(bin.unique_id)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Capacity (L)</Label>
                <Input type="number" min={1} value={bin.bin_capacity} onChange={(e) => setExistingBins((prev) => prev.map((b, i) => i === idx ? { ...b, bin_capacity: e.target.value } : b))} disabled={binsToDelete.includes(bin.unique_id)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Type</Label>
                <Select value={bin.bin_type} onValueChange={(v) => setExistingBins((prev) => prev.map((b, i) => i === idx ? { ...b, bin_type: v } : b))} disabled={binsToDelete.includes(bin.unique_id)}>
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {binsToDelete.includes(bin.unique_id) ? (
                  <button type="button" className="rounded border px-3 py-1.5 text-xs text-blue-600" onClick={() => setBinsToDelete((prev) => prev.filter((uid) => uid !== bin.unique_id))}>Undo</button>
                ) : (
                  <button type="button" className="rounded border px-3 py-1.5 text-xs text-red-600" onClick={() => setBinsToDelete((prev) => [...prev, bin.unique_id])}>Remove</button>
                )}
              </div>
            </div>
          ))}

          {/* New bins to add */}
          {newBins.map((bin, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-3 md:grid-cols-[1fr_1fr_100px_120px_auto]">
              <div>
                <Label className="text-xs text-gray-500">Waste Type *</Label>
                <Select value={bin.waste_type_id} onValueChange={(v) => setNewBins((prev) => prev.map((b, i) => i === idx ? { ...b, waste_type_id: v } : b))}>
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Select waste type" /></SelectTrigger>
                  <SelectContent>
                    {wasteTypeOptions.map((wt) => <SelectItem key={wt.value} value={String(wt.value)}>{wt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Bin Name *</Label>
                <Input placeholder="e.g. Bin 1" value={bin.bin_name} onChange={(e) => setNewBins((prev) => prev.map((b, i) => i === idx ? { ...b, bin_name: e.target.value } : b))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Capacity (L)</Label>
                <Input type="number" min={1} value={bin.bin_capacity} onChange={(e) => setNewBins((prev) => prev.map((b, i) => i === idx ? { ...b, bin_capacity: e.target.value } : b))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Type</Label>
                <Select value={bin.bin_type} onValueChange={(v) => setNewBins((prev) => prev.map((b, i) => i === idx ? { ...b, bin_type: v } : b))}>
                  <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <button type="button" className="rounded border px-3 py-1.5 text-xs text-red-500 disabled:opacity-30" disabled={newBins.length === 1} onClick={() => setNewBins((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setNewBins((prev) => [...prev, emptyBinRow()])}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-400 px-4 py-2 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600"
          >
            <span className="text-lg leading-none">+</span> Add Bin
          </button>
        </div>}
        {/* ── END BINS SECTION ─────────────────────────────────────────────── */}

        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? t("common.updating")
                : t("common.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </Button>
          <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId } })}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
