import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
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
import { binApi, cityApi, collectionPointApi, districtApi, panchayatApi, wasteTypeApi, wardApi, zoneApi, tripDefinitionApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import type { SelectOption } from "@/types";
import type { BinOption, CityOption, CollectionPointOption, LocationOption, WardOption } from "./types";

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
          options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))
        ) : (
          <div className="p-2 text-sm text-gray-500">No options available</div>
        )}
      </SelectContent>
    </Select>
  </div>
);

const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
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
  isRequired = true,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: string;
  min?: string;
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
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      autoComplete="off"
    />
  </div>
);

function CollectionMonitoringForm() {
  const { t } = useTranslation();
  const [binId, setBinId] = useState("");
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [collectionPointId, setCollectionPointId] = useState("");
  const [pointCollectionWeight, setPointCollectionWeight] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [collectionTime, setCollectionTime] = useState("");
  const [tripId, setTripId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [panchayatId, setPanchayatId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [wardId, setWardId] = useState("");
  const [isCollected, setIsCollected] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Holds the raw API record until dropdown options are loaded, then flushes into state
  const [pendingRecord, setPendingRecord] = useState<Record<string, unknown> | null>(null);
  // Holds projectId from the record separately because the hook may reset it
  // while re-fetching the projects list after company is applied
  const [pendingProjectId, setPendingProjectId] = useState("");
  // Holds binId separately — applied only once binRecords are loaded (avoids showing raw ID as label)
  const [pendingBinId, setPendingBinId] = useState("");

  const [binRecords, setBinRecords] = useState<BinOption[]>([]);
  const [wasteTypeOptions, setWasteTypeOptions] = useState<SelectOption[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<SelectOption[]>([]);
  const [cityRecords, setCityRecords] = useState<CityOption[]>([]);
  const [panchayatRecords, setPanchayatRecords] = useState<LocationOption[]>([]);
  const [zoneRecords, setZoneRecords] = useState<LocationOption[]>([]);
  const [wardRecords, setWardRecords] = useState<WardOption[]>([]);
  const [tripDefinitionOptions, setTripDefinitionOptions] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(false);
  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);
  const isWardSelected = Boolean(wardId);
  const NONE_VALUE = "__none__";

  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const { id } = useParams();
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
  } = useCompanyProjectSelection({ isEdit, initialCompanyId: routeState?.companyUniqueId, initialProjectId: routeState?.projectId });

  const { encWasteManagementMaster, encCollectionMonitoring } =
    getEncryptedRoute();
  const LIST_PATH = `/${encWasteManagementMaster}/${encCollectionMonitoring}`;

  const tenantParams = useMemo(
    () =>
      companyUniqueId && projectId
        ? {
            company_id: companyUniqueId,
            project_id: projectId,
          }
        : null,
    [companyUniqueId, projectId]
  );

  const resetLocationFields = () => {
    setDistrictId("");
    setCityId("");
    setPanchayatId("");
    setZoneId("");
    setWardId("");
    setCollectionPointId("");
    setBinId("");
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

  const normalizeIdValue = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      return String(obj.unique_id ?? obj.id ?? "").trim();
    }
    const raw = String(value).trim();
    if (!raw) return "";
    const inParentheses = raw.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
    if (inParentheses?.[1]) return inParentheses[1];
    return raw;
  };

  const toText = (value: unknown): string =>
    value === null || value === undefined ? "" : String(value).trim();

  const toBool = (value: unknown, fallback = false): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const v = value.toLowerCase().trim();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
    }
    return fallback;
  };

  // Default date/time for new records
  useEffect(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    if (!collectionDate) setCollectionDate(`${yyyy}-${mm}-${dd}`);
    if (!collectionTime) setCollectionTime(`${hh}:${min}`);
  }, [collectionDate, collectionTime]);

  // Re-apply projectId once the projects list has finished loading.
  useEffect(() => {
    if (!pendingProjectId || projects.length === 0) return;
    const match = projects.find((p) => p.value === pendingProjectId);
    if (match) {
      setProjectId(pendingProjectId);
      setPendingProjectId("");
    }
  }, [pendingProjectId, projects, setProjectId]);

  // Apply binId once binRecords have loaded — same deferred pattern as
  // pendingDistrict / pendingCity in PanchayatForm. No "found" guard: binOptions
  // already adds the selected bin as a fallback item even when it falls outside
  // the current filter (collectionPoint / panchayat / ward).
  useEffect(() => {
    if (!pendingBinId || binRecords.length === 0) return;
    setBinId(pendingBinId);
    setPendingBinId("");
  }, [pendingBinId, binRecords]);

  // Fetch all dropdown options whenever company+project are confirmed
  useEffect(() => {
    if (!tenantParams) {
      setBinRecords([]);
      setDistrictOptions([]);
      setCityRecords([]);
      setCollectionPoints([]);
      setPanchayatRecords([]);
      setZoneRecords([]);
      setWardRecords([]);
      return;
    }

    const config = { params: tenantParams };

    Promise.all([
      binApi.list(config),
      districtApi.list(config),
      cityApi.list(config),
      wasteTypeApi.list(),
      collectionPointApi.list(config),
      panchayatApi.list(config),
      zoneApi.list(config),
      wardApi.list(config),
      tripDefinitionApi.list(),
    ])
      .then(([binRes, districtRes, cityRes, wasteTypeRes, cpRes, panchayatRes, zoneRes, wardRes, tripDefRes]) => {
        const bins = toRecordList(binRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.bin_id ?? x.id),
            label: toText(x.bin_name ?? x.name ?? x.unique_id),
            districtId: normalizeIdValue(x.district_id ?? x.district),
            cityId: normalizeIdValue(x.city_id ?? x.city),
            panchayatId: normalizeIdValue(x.panchayat_id ?? x.panchayat ?? x.panchayat_unique_id),
            wardId: normalizeIdValue(x.ward_id ?? x.ward ?? x.ward_unique_id),
            collectionPointId: normalizeIdValue(x.collection_point_id ?? x.collection_point ?? x.collection_point_unique_id),
          }))
          .filter((x) => x.value && x.label);

        const districts = toRecordList(districtRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.district_id ?? x.id),
            label: toText(x.name ?? x.district_name ?? x.unique_id),
          }))
          .filter((x) => x.value && x.label);

        const cities = toRecordList(cityRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.city_id ?? x.id),
            label: toText(x.name ?? x.city_name ?? x.unique_id),
            districtId: normalizeIdValue(x.district_id ?? x.district),
          }))
          .filter((x) => x.value && x.label);

        const wasteTypes = toRecordList(wasteTypeRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.waste_type_id ?? x.id),
            label: toText(x.waste_type_name ?? x.wastetype_name ?? x.name ?? x.unique_id),
          }))
          .filter((x) => x.value && x.label);

        const cps = toRecordList(cpRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.collection_point_id ?? x.cp_id ?? x.id),
            label: toText(x.cp_name ?? x.collection_point_name ?? x.name ?? x.unique_id),
            districtId: normalizeIdValue(x.district_id ?? x.district),
            cityId: normalizeIdValue(x.city_id ?? x.city),
            panchayatId: normalizeIdValue(x.panchayat_id ?? x.panchayat),
            wardId: normalizeIdValue(x.ward_id ?? x.ward),
          }))
          .filter((x) => x.value && x.label);

        const panchayats = toRecordList(panchayatRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.panchayat_id ?? x.id),
            label: toText(x.panchayat_name ?? x.name ?? x.unique_id),
            districtId: normalizeIdValue(x.district_id ?? x.district),
            cityId: normalizeIdValue(x.city_id ?? x.city),
          }))
          .filter((x) => x.value && x.label);

        const zones = toRecordList(zoneRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.zone_id ?? x.id),
            label: toText(x.zone_name ?? x.name ?? x.unique_id),
            districtId: normalizeIdValue(x.district_id ?? x.district),
            cityId: normalizeIdValue(x.city_id ?? x.city),
          }))
          .filter((x) => x.value && x.label);

        const wards = toRecordList(wardRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.ward_id ?? x.id),
            label: toText(x.ward_name ?? x.name ?? x.unique_id),
            districtId: normalizeIdValue(x.district_id ?? x.district),
            cityId: normalizeIdValue(x.city_id ?? x.city),
            panchayatId: normalizeIdValue(x.panchayat_id ?? x.panchayat),
            zoneId: normalizeIdValue(x.zone_id ?? x.zone ?? x.zone_unique_id),
          }))
          .filter((x) => x.value && x.label);

        const tripDefinitions = toRecordList(tripDefRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.trip_definition_id ?? x.id),
            label: toText(x.trip_code ?? x.unique_id ?? x.id),
          }))
          .filter((x) => x.value && x.label);

        setBinRecords(bins);
        setDistrictOptions(districts);
        setCityRecords(cities);
        setWasteTypeOptions(wasteTypes);
        setCollectionPoints(cps);
        setPanchayatRecords(panchayats);
        setZoneRecords(zones);
        setWardRecords(wards);
        setTripDefinitionOptions(tripDefinitions);

        if (!isEdit) {
          if (bins.length > 0) setBinId((prev) => prev || bins[0].value);
          if (wasteTypes.length > 0) setWasteTypeId((prev) => prev || wasteTypes[0].value);
          if (cps.length > 0) setCollectionPointId((prev) => prev || cps[0].value);
        }
      })
      .catch(() => {
        setBinRecords([]);
        setDistrictOptions([]);
        setCityRecords([]);
        setWasteTypeOptions([]);
        setCollectionPoints([]);
        setPanchayatRecords([]);
        setZoneRecords([]);
        setWardRecords([]);
        setTripDefinitionOptions([]);
      });
  }, [isEdit, tenantParams]);

  // Flush pendingRecord into fields once dropdown options are ready.
  // binId is handled separately via pendingBinId to avoid the race where
  // the bin label shows as the raw ID when binRecords haven't loaded yet.
  useEffect(() => {
    if (!pendingRecord) return;

    const optionsReady =
      binRecords.length > 0 ||
      districtOptions.length > 0 ||
      wasteTypeOptions.length > 0 ||
      collectionPoints.length > 0;

    if (!optionsReady) return;

    const rawBinId = normalizeIdValue(pendingRecord.bin_id);
    if (rawBinId) setPendingBinId(rawBinId);
    setWasteTypeId(normalizeIdValue(pendingRecord.waste_type_id));
    setCollectionPointId(normalizeIdValue(pendingRecord.collection_point_id));
    setPointCollectionWeight(toText(pendingRecord.point_collection_weight));
    setCollectionDate(toText(pendingRecord.collection_date));
    setCollectionTime(toText(pendingRecord.collection_time).slice(0, 5));
    setTripId(toText(pendingRecord.trip_id));
    setDistrictId(normalizeIdValue(pendingRecord.district_id));
    setCityId(normalizeIdValue(pendingRecord.city_id));
    setPanchayatId(normalizeIdValue(pendingRecord.panchayat_id));
    setZoneId(normalizeIdValue(pendingRecord.zone_id));
    setWardId(normalizeIdValue(pendingRecord.ward_id));
    setIsCollected(toBool(pendingRecord.is_collected, true));
    setIsActive(toBool(pendingRecord.is_active, true));

    setPendingRecord(null); // clear so this effect doesn't re-run
  }, [pendingRecord, binRecords, districtOptions, wasteTypeOptions, collectionPoints]);

  // Ward options filtered by zone/panchayat/city/district
  const wardOptions = useMemo(() => {
    const filtered = wardRecords
      .filter((ward) => {
        if (zoneId) return ward.zoneId === zoneId;
        if (panchayatId) return ward.panchayatId === panchayatId;
        if (cityId) return ward.cityId === cityId;
        if (districtId) return ward.districtId === districtId;
        return true;
      })
      .map((ward) => ({ value: ward.value, label: ward.label }));

    if (!wardId) return filtered;
    if (filtered.some((w) => w.value === wardId)) return filtered;
    const current = wardRecords.find((w) => w.value === wardId);
    return [...filtered, { value: wardId, label: current?.label || wardId }];
  }, [cityId, districtId, panchayatId, wardId, wardRecords, zoneId]);

  const panchayatOptions = useMemo(() => {
    const filtered = panchayatRecords
      .filter((panchayat) => {
        if (cityId) return panchayat.cityId === cityId;
        if (districtId) return panchayat.districtId === districtId;
        return true;
      })
      .map((panchayat) => ({ value: panchayat.value, label: panchayat.label }));

    if (!panchayatId) return filtered;
    if (filtered.some((p) => p.value === panchayatId)) return filtered;
    const current = panchayatRecords.find((p) => p.value === panchayatId);
    return [...filtered, { value: panchayatId, label: current?.label || panchayatId }];
  }, [cityId, districtId, panchayatId, panchayatRecords]);

  const zoneOptions = useMemo(() => {
    const filtered = zoneRecords
      .filter((zone) => {
        if (cityId) return zone.cityId === cityId;
        if (districtId) return zone.districtId === districtId;
        return true;
      })
      .map((zone) => ({ value: zone.value, label: zone.label }));

    if (!zoneId) return filtered;
    if (filtered.some((z) => z.value === zoneId)) return filtered;
    const current = zoneRecords.find((z) => z.value === zoneId);
    return [...filtered, { value: zoneId, label: current?.label || zoneId }];
  }, [cityId, districtId, zoneId, zoneRecords]);

  const cityOptions = useMemo(() => {
    const filtered = cityRecords
      .filter((city) => {
        if (districtId) return city.districtId === districtId;
        return true;
      })
      .map((city) => ({ value: city.value, label: city.label }));

    if (!cityId) return filtered;
    if (filtered.some((c) => c.value === cityId)) return filtered;
    return [...filtered, { value: cityId, label: cityId }];
  }, [cityId, cityRecords, districtId]);

  const binOptions = useMemo(() => {
    const filtered = binRecords
      .filter((bin) => {
        if (collectionPointId) return bin.collectionPointId === collectionPointId;
        if (wardId) return bin.wardId === wardId;
        if (panchayatId) return bin.panchayatId === panchayatId;
        if (cityId) return bin.cityId === cityId;
        if (districtId) return bin.districtId === districtId;
        return true;
      })
      .map((bin) => ({ value: bin.value, label: bin.label }));

    if (!binId) return filtered;
    if (filtered.some((b) => b.value === binId)) return filtered;
    const current = binRecords.find((b) => b.value === binId);
    return [...filtered, { value: binId, label: current?.label || binId }];
  }, [binId, binRecords, cityId, collectionPointId, districtId, panchayatId, wardId]);

  useEffect(() => {
    if (pendingRecord || pendingBinId) return; // skip while edit population is in progress
    if (!binId) return;
    const selectedBin = binRecords.find((bin) => bin.value === binId);
    if (!selectedBin) return;
    if (districtId && selectedBin.districtId && selectedBin.districtId !== districtId) { setBinId(""); return; }
    if (cityId && selectedBin.cityId && selectedBin.cityId !== cityId) { setBinId(""); return; }
    if (collectionPointId && selectedBin.collectionPointId && selectedBin.collectionPointId !== collectionPointId) { setBinId(""); return; }
    if (wardId && selectedBin.wardId !== wardId) { setBinId(""); return; }
    if (panchayatId && selectedBin.panchayatId && selectedBin.panchayatId !== panchayatId) { setBinId(""); }
  }, [binId, binRecords, cityId, collectionPointId, districtId, panchayatId, pendingBinId, pendingRecord, wardId]);

  // Auto-select bin when collection point is set and no bin is chosen yet.
  // Covers two cases:
  //   1. Old records where bin_id was not stored (bin_id = null in DB).
  //   2. Any new record where the CP has exactly one bin.
  // When multiple bins exist for the CP, we leave the choice to the user.
  useEffect(() => {
    if (pendingRecord || pendingBinId || binId) return;
    if (!collectionPointId || binRecords.length === 0) return;
    const binsForCp = binRecords.filter((b) => b.collectionPointId === collectionPointId);
    if (binsForCp.length === 1) {
      setBinId(binsForCp[0].value);
    }
  }, [binId, binRecords, collectionPointId, pendingBinId, pendingRecord]);

  const collectionPointOptions = useMemo(() => {
    const filtered = collectionPoints
      .filter((cp) => {
        if (wardId) return cp.wardId === wardId;
        if (panchayatId) return cp.panchayatId === panchayatId;
        if (cityId) return cp.cityId === cityId;
        if (districtId) return cp.districtId === districtId;
        return true;
      })
      .map((cp) => ({ value: cp.value, label: cp.label }));

    if (!collectionPointId) return filtered;
    if (filtered.some((cp) => cp.value === collectionPointId)) return filtered;
    const current = collectionPoints.find((cp) => cp.value === collectionPointId);
    return [...filtered, { value: collectionPointId, label: current?.label || collectionPointId }];
  }, [cityId, collectionPointId, collectionPoints, districtId, panchayatId, wardId]);

  useEffect(() => {
    if (pendingRecord) return; // skip while edit population is in progress
    if (!collectionPointId) return;
    const selectedCp = collectionPoints.find((cp) => cp.value === collectionPointId);
    if (!selectedCp) return;
    if (districtId && selectedCp.districtId && selectedCp.districtId !== districtId) { setCollectionPointId(""); return; }
    if (cityId && selectedCp.cityId && selectedCp.cityId !== cityId) { setCollectionPointId(""); return; }
    if (!districtId && selectedCp.districtId) setDistrictId(selectedCp.districtId);
    if (!cityId && selectedCp.cityId) setCityId(selectedCp.cityId);
    if (wardId && selectedCp.wardId !== wardId) { setCollectionPointId(""); return; }
    if (panchayatId && selectedCp.panchayatId && selectedCp.panchayatId !== panchayatId) { setCollectionPointId(""); }
  }, [cityId, collectionPointId, collectionPoints, districtId, panchayatId, pendingRecord, wardId]);

  // ─── FIX: Fetch edit record — defer ALL field population until options ready ──
  useEffect(() => {
    if (!isEdit) return;

    adminApi.pointCollections.get(id as string).then((res: Record<string, unknown>) => {
      // Step 1: Apply company so the hook starts fetching projects for that company
      applyCompanyProjectFromRecord(res);

      // Step 2: Store project_id separately — the hook resets projectId while
      //         re-fetching the projects list, so we re-apply it once ready
      const recordProjectId = normalizeIdValue(res.project_id ?? res.project);
      if (recordProjectId) setPendingProjectId(recordProjectId);

      // Step 3: Store the full record — all other fields populate after options load
      setPendingRecord(res);
    });
  }, [applyCompanyProjectFromRecord, id, isEdit]);
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
    if (!districtId) missingFields.push(t("common.district"));
    if (!cityId) missingFields.push(t("common.city"));
    if (!binId) missingFields.push(t("admin.nav.bin_master"));
    if (!wasteTypeId) missingFields.push(t("common.waste_type"));
    if (!collectionPointId) missingFields.push(t("admin.nav.collection_point"));
    if (!pointCollectionWeight.trim()) missingFields.push("Point Collection Weight");
    if (!collectionDate) missingFields.push(t("common.date"));
    if (!collectionTime) missingFields.push("Time");

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
        "warning"
      );
      return;
    }

    setLoading(true);
    try {
      const parsedWeight = Number.parseFloat(pointCollectionWeight || "0");
      const payload = {
        company_id: companyUniqueId,
        project_id: projectId,
        bin_id: binId,
        waste_type_id: wasteTypeId,
        collection_point_id: collectionPointId,
        point_collection_weight: Number.isFinite(parsedWeight)
          ? parsedWeight.toFixed(2)
          : pointCollectionWeight,
        collection_date: collectionDate,
        collection_time: collectionTime.length === 5 ? `${collectionTime}:00` : collectionTime,
        trip_id: tripId.trim() || null,
        district_id: districtId,
        city_id: cityId,
        panchayat_id: panchayatId || null,
        zone_id: zoneId || null,
        ward_id: wardId || null,
        is_collected: isCollected,
        is_active: isActive,
      };

      if (isEdit) {
        await adminApi.pointCollections.update(id as string, payload);
      } else {
        await adminApi.pointCollections.create(payload);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
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
          ? t("common.edit_item", { item: t("admin.nav.collection_monitoring") })
          : t("common.add_item", { item: t("admin.nav.collection_monitoring") })
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormSection title="Company & Project Information">
          <ShadcnSelect
            label={t("admin.nav.company")}
            value={companyUniqueId}
            onChange={(value) => {
              onCompanyChange(value);
              resetLocationFields();
            }}
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
            onChange={(value) => {
              setProjectId(value);
              resetLocationFields();
            }}
            options={projects.map((x) => ({ value: x.value, label: x.label }))}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            disabled={!companyUniqueId || projects.length === 0}
          />
        </FormSection>

        <FormSection title="Location Details">
          <ShadcnSelect
            label={t("common.district")}
            value={districtId}
            onChange={(value) => {
              setDistrictId(value);
              setCityId("");
              setPanchayatId("");
              setZoneId("");
              setWardId("");
              setBinId("");
              setCollectionPointId("");
            }}
            options={districtOptions}
            placeholder={t("common.select_item_placeholder", { item: t("common.district") })}
          />

          <ShadcnSelect
            label={t("common.city")}
            value={cityId}
            onChange={(value) => {
              setCityId(value);
              setPanchayatId("");
              setZoneId("");
              setWardId("");
              setBinId("");
              setCollectionPointId("");
            }}
            options={cityOptions}
            placeholder={t("common.select_item_placeholder", { item: t("common.city") })}
            disabled={!districtId}
          />

          <ShadcnSelect
            label={t("admin.nav.panchayat")}
            value={panchayatId || NONE_VALUE}
            onChange={(value) => {
              const next = value === NONE_VALUE ? "" : value;
              setPanchayatId(next);
              setZoneId("");
              setWardId("");
              setBinId("");
              setCollectionPointId("");
            }}
            options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...panchayatOptions]}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })}
            disabled={!cityId || isZoneSelected || isWardSelected}
            isRequired={false}
          />

          <ShadcnSelect
            label={t("admin.nav.zone")}
            value={zoneId || NONE_VALUE}
            onChange={(value) => {
              const next = value === NONE_VALUE ? "" : value;
              setZoneId(next);
              setPanchayatId("");
              setWardId("");
              setBinId("");
              setCollectionPointId("");
            }}
            options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...zoneOptions]}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") })}
            disabled={!cityId || isPanchayatSelected}
            isRequired={false}
          />

          <ShadcnSelect
            label={t("common.ward")}
            value={wardId || NONE_VALUE}
            onChange={(value) => {
              const next = value === NONE_VALUE ? "" : value;
              setWardId(next);
              setBinId("");
              setCollectionPointId("");
            }}
            options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...wardOptions]}
            placeholder={t("common.select_item_placeholder", { item: t("common.ward") })}
            disabled={!cityId || isPanchayatSelected || (!zoneId && !panchayatId)}
            isRequired={false}
          />
        </FormSection>

        <FormSection title="Collection Details">
          <ShadcnSelect
            label={t("admin.nav.collection_point")}
            value={collectionPointId}
            onChange={(value) => {
              setCollectionPointId(value);
             
            }}
            options={collectionPointOptions}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.collection_point") })}
            disabled={collectionPointOptions.length === 0}
          />

          <ShadcnSelect
            label={t("common.item_name", { item: t("admin.nav.bin_master") })}
            value={binId}
            onChange={setBinId}
            options={binOptions}
            placeholder={t("common.select_item_placeholder", { item: t("admin.nav.bin_master") })}
            disabled={binOptions.length === 0}
          />

          <ShadcnSelect
            label={t("common.waste_type")}
            value={wasteTypeId}
            onChange={setWasteTypeId}
            options={wasteTypeOptions}
            placeholder={t("common.select_item_placeholder", { item: t("common.waste_type") })}
          />

          <FormInput
            label="Point Collection Weight (kg)"
            type="number"
            step="0.01"
            min="0"
            value={pointCollectionWeight}
            onChange={(e) => setPointCollectionWeight(e.target.value)}
          />

          <FormInput
            label={t("common.date")}
            type="date"
            value={collectionDate}
            onChange={(e) => setCollectionDate(e.target.value)}
          />

          <FormInput
            label="Time"
            type="time"
            value={collectionTime}
            onChange={(e) => setCollectionTime(e.target.value)}
          />

          <ShadcnSelect
            label="Trip ID"
            value={tripId || NONE_VALUE}
            onChange={(value) => {
              const nextTripId = value === NONE_VALUE ? "" : value;
              setTripId(nextTripId);
            }}
            options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...tripDefinitionOptions]}
            placeholder={t("common.select_item_placeholder", { item: "Trip" })}
            isRequired={false}
          />
        </FormSection>

        <FormSection title={t("common.status")}>
          <ShadcnSelect
            label={t("common.collected")}
            value={isCollected ? "true" : "false"}
            onChange={(val) => setIsCollected(val === "true")}
            options={[
              { value: "true", label: t("common.yes") },
              { value: "false", label: t("common.no") },
            ]}
            placeholder={t("common.select_item_placeholder", { item: t("common.collected") })}
            isRequired={false}
          />

          <ShadcnSelect
            label={t("common.status")}
            value={isActive ? "true" : "false"}
            onChange={(val) => setIsActive(val === "true")}
            options={[
              { value: "true", label: t("common.active") },
              { value: "false", label: t("common.inactive") },
            ]}
            placeholder={t("common.select_status")}
            isRequired={false}
          />
        </FormSection>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded"
          >
            {loading ? t("common.saving") : isEdit ? t("common.update") : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => navigate(LIST_PATH, { state: { companyUniqueId, projectId } })}
            className="bg-red-400 text-white px-4 py-2 rounded"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}

export default CollectionMonitoringForm;