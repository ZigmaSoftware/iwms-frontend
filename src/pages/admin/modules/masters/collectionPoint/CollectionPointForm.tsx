import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
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

const { encMasters, encCollectionPoints } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encCollectionPoints}`;

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
    useFieldVisibility("masters", "collection-points", COLLECTION_POINT_FIELDS);
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

  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [panchayatId, setPanchayatId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [wardId, setWardId] = useState("");
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

  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);
  const isWardSelected = Boolean(wardId);

  const resetLocationFields = useCallback(() => {
    setStateId("");
    setDistrictId("");
    setCityId("");
    setPanchayatId("");
    setZoneId("");
    setWardId("");
  }, []);

  /* ==========================================================
      LOAD STATES (global, no tenant filter)
  ========================================================== */
  useEffect(() => {
    let cancelled = false;
    adminApi.states.list()
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
      adminApi.districts.list({ params }),
      adminApi.cities.list({ params }),
      adminApi.panchayats.list({ params }),
      adminApi.zones.list({ params }),
      adminApi.wards.list({ params }),
    ])
      .then(([distData, cityData, panData, zoneData, wardData]) => {
        if (cancelled) return;

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
    adminApi.collectionPoints.get(id)
      .then((data: unknown) => {
        if (cancelled) return;
        const record = data as UnknownRecord;
        setStateId(normalizeIdValue(record.state_id ?? record.state));
        setDistrictId(normalizeIdValue(record.district_id ?? record.district));
        setCityId(normalizeIdValue(record.city_id ?? record.city));
        setPanchayatId(normalizeIdValue(record.panchayat_id ?? record.panchayat));
        setZoneId(normalizeIdValue(record.zone_id ?? record.zone));
        setWardId(normalizeIdValue(record.ward_id ?? record.ward));
        setCpName(toStringOrEmpty(record.cp_name ?? record.collection_point_name));
        setLatitude(toStringOrEmpty(record.latitude));
        setLongitude(toStringOrEmpty(record.longitude));
        setIsActive(toBoolean(record.is_active, true));

        applyCompanyProjectFromRecord(record);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        Swal.fire(t("common.error"), extractErr(err), "error");
      });
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const filtered = wards
      .filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        if (panchayatId && option.panchayatId && option.panchayatId !== panchayatId) return false;
        if (zoneId && option.zoneId && option.zoneId !== zoneId) return false;
        return true;
      })
      .map((option) => ({ value: option.value, label: option.label }));
    return ensureSelectedOption(filtered, wardId);
  }, [cityId, districtId, panchayatId, stateId, wardId, wards, zoneId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    const fieldValues: Record<string, unknown> = {
      state_id: stateId,
      district_id: districtId,
      city_id: cityId,
      panchayat_id: panchayatId,
      ward_id: wardId,
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
    if ((showField("panchayat_id") || showField("ward_id")) && !panchayatId && !wardId) {
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
      zone_id: zoneId || null,
      ward_id: wardId || null,
      cp_name: cpName.trim(),
      latitude: parsedLatitude.toFixed(6),
      longitude: parsedLongitude.toFixed(6),
      is_active: isActive,
    };
    const payload = filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload;

    try {
      setIsSubmitting(true);
      if (isEdit && id) {
        await adminApi.collectionPoints.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await adminApi.collectionPoints.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

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
                setWardId("");
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
                setWardId("");
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
                setWardId("");
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

        {showField("panchayat_id") && (
          <div>
            <Label>{t("admin.nav.panchayat")}</Label>
            <Select
              value={panchayatId || "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? "" : value;
                setPanchayatId(next);
                setZoneId("");
                setWardId("");
              }}
              disabled={!cityId || isZoneSelected || isWardSelected}
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

        {showField("zone_id") && (
          <div>
            <Label>{t("admin.nav.zone")}</Label>
            <Select
              value={zoneId || "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? "" : value;
                setZoneId(next);
                setPanchayatId("");
                setWardId("");
              }}
              disabled={!cityId || isPanchayatSelected}
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

        {showField("ward_id") && (
          <div>
            <Label>{t("admin.nav.ward")}</Label>
            <Select
              value={wardId || "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? "" : value;
                setWardId(next);
                if (next) setPanchayatId("");
              }}
              disabled={!cityId || isPanchayatSelected}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_item_placeholder", { item: t("admin.nav.ward") })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
                {wardOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
