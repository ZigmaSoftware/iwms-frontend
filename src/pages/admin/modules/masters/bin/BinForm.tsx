import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

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
import { useTranslation } from "react-i18next";

import {
  binApi,
  collectionPointApi,
  panchayatApi,
  wardApi,
  wasteTypeApi,
  zoneApi,
} from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { encryptSegment } from "@/utils/routeCrypto";

/* ================= ROUTES ================= */
const encMasters = encryptSegment("masters");
const encBins = encryptSegment("bins");
const LIST_PATH = `/${encMasters}/${encBins}`;

/* ================= TYPES ================= */
type SelectOption = { value: string; label: string };
// Ward carries zoneId so it can be filtered when a zone is selected
type WardOption = SelectOption & { zoneId: string };
type CollectionPointOption = SelectOption & {
  panchayatId: string;
  wardId: string;
};

/* ================= HELPERS ================= */
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

const toStringOrEmpty = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const toNumberOrEmpty = (value: unknown): number | "" => {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : "";
};

const normalizeIdValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return toStringOrEmpty(
      record.unique_id ?? record.id ?? record.value ?? record.pk ?? ""
    );
  }

  const str = String(value).trim();
  if (!str) return "";

  const inParentheses = str.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
  if (inParentheses?.[1]) return inParentheses[1];
  return str;
};

/* ==========================================================
      COMPONENT
========================================================== */
export default function BinForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
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
  } = useCompanyProjectSelection({ isEdit });

  const extractErr = useCallback((e: unknown): string => {
    const error = e as {
      response?: { data?: unknown };
      message?: unknown;
    };
    const data = error.response?.data;
    if (data) {
      if (typeof data === "string") return data;
      if (typeof data === "object") {
        return Object.entries(data)
          .map(([key, value]) => {
            if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
            return `${key}: ${String(value)}`;
          })
          .join("\n");
      }
      return String(data);
    }
    if (typeof error.message === "string") return error.message;
    return t("common.unexpected_error");
  }, [t]);

  /* ================= FORM STATE ================= */
  const [binName, setBinName] = useState("");
  const [panchayatId, setPanchayatId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [wardId, setWardId] = useState("");
  const [collectionPointId, setCollectionPointId] = useState("");
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [binCapacity, setBinCapacity] = useState<number | "">("");
  const [binType, setBinType] = useState("medium");
  const [binImage, setBinImage] = useState("default.png");
  const [binQr, setBinQr] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [panchayats, setPanchayats] = useState<SelectOption[]>([]);
  const [zones, setZones] = useState<SelectOption[]>([]);
  const [wardRecords, setWardRecords] = useState<WardOption[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointOption[]>([]);
  const [wasteTypes, setWasteTypes] = useState<SelectOption[]>([]);
  const [pendingWard, setPendingWard] = useState("");
  const [pendingPanchayat, setPendingPanchayat] = useState("");
  const [pendingWasteType, setPendingWasteType] = useState("");
  const [loading, setLoading] = useState(false);

  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);
  const isWardSelected = Boolean(wardId);

  /* ================= LOAD LOOKUPS ================= */
  useEffect(() => {
    Promise.all([
      panchayatApi.list(),
      zoneApi.list(),
      wardApi.list(),
      collectionPointApi.list(),
      wasteTypeApi.list(),
    ])
      .then(([panchayatRes, zoneRes, wardRes, collectionPointRes, wasteTypeRes]) => {
        const panchayatOptions = toRecordList(panchayatRes)
          .filter((p) => p.is_active !== false)
          .map((p) => ({
            value: normalizeIdValue(p.unique_id ?? p.panchayat_id ?? p.id ?? p.panchayat),
            label: String(p.panchayat_name ?? p.name ?? p.panchayat ?? p.unique_id ?? ""),
          }))
          .filter((p) => p.value && p.label);
        setPanchayats(panchayatOptions);

        const zoneOptions = toRecordList(zoneRes)
          .filter((z) => z.is_active !== false)
          .map((z) => ({
            value: normalizeIdValue(z.unique_id ?? z.zone_id ?? z.id),
            label: String(z.zone_name ?? z.name ?? z.unique_id ?? ""),
          }))
          .filter((z) => z.value && z.label);
        setZones(zoneOptions);

        // Wards carry their zoneId for filtering
        const wardOptions = toRecordList(wardRes)
          .filter((w) => w.is_active !== false)
          .map((w) => ({
            value: normalizeIdValue(w.unique_id ?? w.ward_id ?? w.id),
            label: String(w.ward_name ?? w.name ?? w.ward ?? w.unique_id ?? ""),
            zoneId: normalizeIdValue(w.zone_id ?? w.zone ?? w.zone_unique_id),
          }))
          .filter((w) => w.value && w.label);
        setWardRecords(wardOptions);

        const collectionPointOptions = toRecordList(collectionPointRes)
          .filter((cp) => cp.is_active !== false)
          .map((cp) => ({
            value: normalizeIdValue(cp.unique_id ?? cp.collection_point_id ?? cp.cp_id ?? cp.id),
            label: String(cp.cp_name ?? cp.collection_point_name ?? cp.name ?? cp.unique_id ?? ""),
            panchayatId: normalizeIdValue(cp.panchayat_id ?? cp.panchayat),
            wardId: normalizeIdValue(cp.ward_id ?? cp.ward),
          }))
          .filter((cp) => cp.value && cp.label);
        setCollectionPoints(collectionPointOptions);

        const wasteTypeOptions = toRecordList(wasteTypeRes)
          .filter((w) => w.is_active !== false)
          .map((w) => ({
            value: normalizeIdValue(w.unique_id ?? w.waste_type_id ?? w.wastetype_id ?? w.id),
            label: String(
              w.waste_type_name ?? w.wastetype_name ?? w.property_name ?? w.name ?? w.unique_id ?? ""
            ),
          }))
          .filter((w) => w.value && w.label);
        setWasteTypes(wasteTypeOptions);
      })
      .catch((err) => {
        Swal.fire(t("common.error"), extractErr(err), "error");
        setPanchayats([]);
        setZones([]);
        setWardRecords([]);
        setCollectionPoints([]);
        setWasteTypes([]);
      });
  }, [extractErr, t]);

  // Ward options filtered by zone when a zone is selected
  const wardOptions = useMemo(() => {
    const filtered = wardRecords
      .filter((w) => {
        if (zoneId) return w.zoneId === zoneId;
        return true;
      })
      .map((w) => ({ value: w.value, label: w.label }));

    if (!wardId) return filtered;
    if (filtered.some((w) => w.value === wardId)) return filtered;

    const current = wardRecords.find((w) => w.value === wardId);
    return [...filtered, { value: wardId, label: current?.label || wardId }];
  }, [wardId, wardRecords, zoneId]);

  const collectionPointOptions = useMemo(() => {
    const filtered = collectionPoints
      .filter((cp) => {
        if (wardId) return cp.wardId === wardId;
        if (panchayatId) return cp.panchayatId === panchayatId;
        return true;
      })
      .map((cp) => ({ value: cp.value, label: cp.label }));

    if (!collectionPointId) return filtered;
    if (filtered.some((cp) => cp.value === collectionPointId)) return filtered;

    const current = collectionPoints.find((cp) => cp.value === collectionPointId);
    return [...filtered, { value: collectionPointId, label: current?.label || collectionPointId }];
  }, [collectionPointId, collectionPoints, panchayatId, wardId]);

  /* ================= EDIT MODE LOAD ================= */
  useEffect(() => {
    if (!isEdit || !id) return;

    binApi
      .get(id)
      .then((data: unknown) => {
        const record = (data ?? {}) as Record<string, unknown>;
        setBinName(toStringOrEmpty(record.bin_name));
        setBinType(toStringOrEmpty(record.bin_type) || "medium");
        setBinCapacity(toNumberOrEmpty(record.bin_capacity ?? record.capacity_liters));
        setCollectionPointId(
          normalizeIdValue(record.collection_point_id ?? record.collection_point)
        );
        setBinImage(toStringOrEmpty(record.bin_image) || "default.png");
        setBinQr(toStringOrEmpty(record.bin_qr));
        setIsActive(Boolean(record.is_active));
        applyCompanyProjectFromRecord(record);

        // Zone is loaded directly (not pending) as it doesn't depend on other data
        const zoneCandidate = normalizeIdValue(record.zone_id ?? record.zone);
        if (zoneCandidate) setZoneId(zoneCandidate);

        const panchayatCandidate = normalizeIdValue(record.panchayat_id ?? record.panchayat);
        const wardCandidate = normalizeIdValue(record.ward_id ?? record.ward);

        if (wardCandidate) {
          setPendingWard(wardCandidate);
          setPendingPanchayat("");
        } else if (panchayatCandidate) {
          setPendingPanchayat(panchayatCandidate);
          setPendingWard("");
        }

        const wasteTypeCandidate = normalizeIdValue(
          record.wastetype_id ?? record.waste_type_id ?? record.waste_type
        );
        if (wasteTypeCandidate) setPendingWasteType(wasteTypeCandidate);
      })
      .catch(() => Swal.fire(t("common.error"), t("common.load_failed"), "error"));
  }, [applyCompanyProjectFromRecord, id, isEdit, t]);

  /* ================= APPLY PENDING VALUES ================= */
  useEffect(() => {
    if (!pendingWard || wardRecords.length === 0) return;
    if (!wardRecords.some((w) => w.value === pendingWard)) {
      setWardRecords((prev) => [...prev, { value: pendingWard, label: pendingWard, zoneId: "" }]);
    }
    setWardId(pendingWard);
    setPendingWard("");
  }, [pendingWard, wardRecords]);

  useEffect(() => {
    if (!pendingPanchayat || panchayats.length === 0) return;
    if (!panchayats.some((p) => p.value === pendingPanchayat)) {
      setPanchayats((prev) => [...prev, { value: pendingPanchayat, label: pendingPanchayat }]);
    }
    setPanchayatId(pendingPanchayat);
    setPendingPanchayat("");
  }, [pendingPanchayat, panchayats]);

  useEffect(() => {
    if (!pendingWasteType || wasteTypes.length === 0) return;
    if (!wasteTypes.some((w) => w.value === pendingWasteType)) {
      setWasteTypes((prev) => [...prev, { value: pendingWasteType, label: pendingWasteType }]);
    }
    setWasteTypeId(pendingWasteType);
    setPendingWasteType("");
  }, [pendingWasteType, wasteTypes]);

  useEffect(() => {
    if (!collectionPointId) return;
    const selectedCp = collectionPoints.find((cp) => cp.value === collectionPointId);
    if (!selectedCp) return;
    if (wardId && selectedCp.wardId !== wardId) { setCollectionPointId(""); return; }
    if (panchayatId && selectedCp.panchayatId && selectedCp.panchayatId !== panchayatId) {
      setCollectionPointId("");
    }
  }, [collectionPointId, collectionPoints, panchayatId, wardId]);

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!binName.trim()) missingFields.push("Bin name");
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
    if (!panchayatId && !wardId) {
      missingFields.push(`${t("admin.nav.panchayat")} / ${t("common.ward")}`);
    }
    if (!collectionPointId) missingFields.push(t("admin.nav.collection_point"));
    if (!wasteTypeId) missingFields.push(t("common.waste_type"));
    if (typeof binCapacity !== "number" || binCapacity <= 0) {
      missingFields.push(t("common.bin_capacity"));
    }

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
        "warning"
      );
      return;
    }

    setLoading(true);

    const payload = {
      company_id: companyUniqueId,
      project_id: projectId,
      panchayat_id: panchayatId || null,
      zone_id: zoneId || null,
      ward_id: wardId || null,
      collection_point_id: collectionPointId,
      bin_capacity: Number(binCapacity),
      bin_name: binName.trim(),
      bin_type: binType,
      bin_image: binImage.trim() || "default.png",
      bin_qr: binQr.trim() || null,
      wastetype_id: wasteTypeId,
      is_active: isActive,
    };

    try {
      if (isEdit && id) {
        await binApi.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await binApi.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }
      navigate(LIST_PATH);
    } catch (err: unknown) {
      Swal.fire(t("common.save_failed"), extractErr(err), "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= JSX ================= */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.bin_master") })
          : t("common.add_item", { item: t("admin.nav.bin_creation") })
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>
        {/* Company */}
        <div>
          <Label>{t("admin.nav.company")} *</Label>
          <Select
            value={companyUniqueId}
            onValueChange={onCompanyChange}
            disabled={
              Boolean(loggedInCompanyUniqueId) ||
              (!isSuperAdmin && !loggedInCompanyUniqueId) ||
              companies.length === 0
            }
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue
                placeholder={
                  loggedInCompanyUniqueId ? "Company from logged-in profile" : "Select Company"
                }
              />
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

        {/* Project */}
        <div>
          <Label>{t("admin.nav.project")} *</Label>
          <Select
            value={projectId}
            onValueChange={setProjectId}
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

        {/* Bin Name */}
        <div>
          <Label>{t("common.item_name", { item: t("admin.nav.bin_master") })} *</Label>
          <Input value={binName} onChange={(e) => setBinName(e.target.value)} required />
        </div>

        {/* Panchayat — disabled when zone or ward is selected */}
        <div>
          <Label>{t("admin.nav.panchayat")}</Label>
          <Select
            value={panchayatId || "__none__"}
            onValueChange={(value) => {
              const next = value === "__none__" ? "" : value;
              setPanchayatId(next);
              setCollectionPointId("");
              if (next) setWardId("");
            }}
            disabled={isZoneSelected || isWardSelected}
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.nav.panchayat"),
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
              {panchayats.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zone — disabled when panchayat is selected */}
        <div>
          <Label>{t("admin.nav.zone")}</Label>
          <Select
            value={zoneId || "__none__"}
            onValueChange={(value) => {
              const next = value === "__none__" ? "" : value;
              setZoneId(next);
              // Reset ward & collection point when zone changes
              setWardId("");
              setCollectionPointId("");
            }}
            disabled={isPanchayatSelected}
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.nav.zone"),
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
              {zones.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ward — disabled when panchayat is selected; filtered by zone when zone is selected */}
        <div>
          <Label>{t("common.ward")}</Label>
          <Select
            value={wardId || "__none__"}
            onValueChange={(value) => {
              const next = value === "__none__" ? "" : value;
              setWardId(next);
              if (next) {
                setPanchayatId("");
                setCollectionPointId("");
              }
            }}
            disabled={isPanchayatSelected}
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue
                placeholder={t("common.select_item_placeholder", {
                  item: t("common.ward"),
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
              {wardOptions.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Collection Point */}
        <div>
          <Label>{t("admin.nav.collection_point")} *</Label>
          <Select
            value={collectionPointId}
            onValueChange={setCollectionPointId}
            disabled={collectionPointOptions.length === 0}
          >
            <SelectTrigger className="input-validate w-full">
              <SelectValue
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.nav.collection_point"),
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {collectionPointOptions.map((cp) => (
                <SelectItem key={cp.value} value={cp.value}>
                  {cp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bin Capacity */}
        <div>
          <Label>{t("common.bin_capacity")} *</Label>
          <Input
            type="number"
            value={binCapacity}
            onChange={(e) => setBinCapacity(e.target.value ? Number(e.target.value) : "")}
            min={1}
            required
          />
        </div>

        {/* Bin Type */}
        <div>
          <Label>{t("common.bin_type")}</Label>
          <Select value={binType} onValueChange={setBinType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Waste Type */}
        <div>
          <Label>{t("common.waste_type")} *</Label>
          <Select value={wasteTypeId} onValueChange={setWasteTypeId}>
            <SelectTrigger>
              <SelectValue
                placeholder={t("common.select_item_placeholder", {
                  item: t("common.waste_type"),
                })}
              />
            </SelectTrigger>
            <SelectContent>
              {wasteTypes.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bin Image */}
        <div>
          <Label>Bin Image</Label>
          <Input
            value={binImage}
            onChange={(e) => setBinImage(e.target.value)}
            placeholder="default.png"
          />
        </div>

        {/* Bin QR */}
        <div>
          <Label>Bin QR</Label>
          <Input
            value={binQr}
            onChange={(e) => setBinQr(e.target.value)}
            placeholder="QR-BIN-001"
          />
        </div>

        {/* Active Status */}
        <div>
          <Label>{t("common.status")}</Label>
          <Select
            value={isActive ? "true" : "false"}
            onValueChange={(v) => setIsActive(v === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t("common.active")}</SelectItem>
              <SelectItem value="false">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Buttons */}
        <div className="md:col-span-2 flex justify-end gap-3">
          <Button type="submit" disabled={loading}>
            {loading
              ? isEdit
                ? t("common.updating")
                : t("common.saving")
              : isEdit
                ? t("common.update")
                : t("common.save")}
          </Button>
          <Button type="button" variant="destructive" onClick={() => navigate(LIST_PATH)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}