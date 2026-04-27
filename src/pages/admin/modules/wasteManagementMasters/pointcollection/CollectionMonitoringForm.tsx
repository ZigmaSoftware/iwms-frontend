// import { useEffect, useMemo, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import Swal from "sweetalert2";

// import ComponentCard from "@/components/common/ComponentCard";
// import Label from "@/components/form/Label";
// import Select from "@/components/form/Select";
// import { Input } from "@/components/ui/input";

// import { adminApi } from "@/helpers/admin/registry";
// import { binApi, collectionPointApi, panchayatApi, wasteTypeApi, wardApi } from "@/helpers/admin";
// import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
// import { getEncryptedRoute } from "@/utils/routeCache";
// import { useTranslation } from "react-i18next";

// type SelectOption = {
//   value: string;
//   label: string;
// };
// type BinOption = SelectOption & {
//   panchayatId: string;
//   wardId: string;
// };
// type CollectionPointOption = SelectOption & {
//   panchayatId: string;
//   wardId: string;
// };

// function CollectionMonitoringForm() {
//   const { t } = useTranslation();
//   const [binId, setBinId] = useState("");
//   const [wasteTypeId, setWasteTypeId] = useState("");
//   const [collectionPointId, setCollectionPointId] = useState("");
//   const [pointCollectionWeight, setPointCollectionWeight] = useState("");
//   const [collectionDate, setCollectionDate] = useState("");
//   const [collectionTime, setCollectionTime] = useState("");
//   const [tripId, setTripId] = useState("");
//   const [panchayatId, setPanchayatId] = useState("");
//   const [wardId, setWardId] = useState("");
//   const [isCollected, setIsCollected] = useState(true);
//   const [isActive, setIsActive] = useState(true);

//   const [binRecords, setBinRecords] = useState<BinOption[]>([]);
//   const [wasteTypeOptions, setWasteTypeOptions] = useState<SelectOption[]>([]);
//   const [collectionPoints, setCollectionPoints] = useState<CollectionPointOption[]>([]);
//   const [panchayatOptions, setPanchayatOptions] = useState<SelectOption[]>([]);
//   const [wardOptions, setWardOptions] = useState<SelectOption[]>([]);

//   const [loading, setLoading] = useState(false);
//   const isPanchayatSelected = Boolean(panchayatId);
//   const isWardSelected = Boolean(wardId);
//   const NONE_VALUE = "__none__";

//   const navigate = useNavigate();
//   const { id } = useParams();
//   const isEdit = Boolean(id);
//   const {
//     companyUniqueId,
//     projectId,
//     projects,
//     companies,
//     isSuperAdmin,
//     loggedInCompanyUniqueId,
//     setProjectId,
//     onCompanyChange,
//     applyCompanyProjectFromRecord,
//   } = useCompanyProjectSelection({ isEdit });

//   const { encWasteManagementMaster, encCollectionMonitoring } =
//     getEncryptedRoute();
//   const LIST_PATH = `/${encWasteManagementMaster}/${encCollectionMonitoring}`;

//   const toRecordList = (value: unknown): Record<string, unknown>[] => {
//     if (Array.isArray(value)) {
//       return value.filter(
//         (item): item is Record<string, unknown> =>
//           !!item && typeof item === "object" && !Array.isArray(item)
//       );
//     }

//     if (value && typeof value === "object") {
//       const maybeResults = (value as { results?: unknown }).results;
//       if (Array.isArray(maybeResults)) {
//         return maybeResults.filter(
//           (item): item is Record<string, unknown> =>
//             !!item && typeof item === "object" && !Array.isArray(item)
//         );
//       }
//     }

//     return [];
//   };

//   const normalizeIdValue = (value: unknown): string => {
//     if (value === null || value === undefined) return "";
//     if (typeof value === "object") {
//       const obj = value as Record<string, unknown>;
//       return String(obj.unique_id ?? obj.id ?? "").trim();
//     }
//     const raw = String(value).trim();
//     if (!raw) return "";
//     const inParentheses = raw.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
//     if (inParentheses?.[1]) return inParentheses[1];
//     return raw;
//   };

//   const toText = (value: unknown): string =>
//     value === null || value === undefined ? "" : String(value).trim();

//   const toBool = (value: unknown, fallback = false): boolean => {
//     if (typeof value === "boolean") return value;
//     if (typeof value === "number") return value !== 0;
//     if (typeof value === "string") {
//       const v = value.toLowerCase().trim();
//       if (v === "true" || v === "1") return true;
//       if (v === "false" || v === "0") return false;
//     }
//     return fallback;
//   };

//   useEffect(() => {
//     const now = new Date();
//     const yyyy = now.getFullYear();
//     const mm = String(now.getMonth() + 1).padStart(2, "0");
//     const dd = String(now.getDate()).padStart(2, "0");
//     const hh = String(now.getHours()).padStart(2, "0");
//     const min = String(now.getMinutes()).padStart(2, "0");
//     if (!collectionDate) setCollectionDate(`${yyyy}-${mm}-${dd}`);
//     if (!collectionTime) setCollectionTime(`${hh}:${min}`);
//   }, [collectionDate, collectionTime]);

//   useEffect(() => {
//     Promise.all([
//       binApi.list(),
//       wasteTypeApi.list(),
//       collectionPointApi.list(),
//       panchayatApi.list(),
//       wardApi.list(),
//     ])
//       .then(([binRes, wasteTypeRes, cpRes, panchayatRes, wardRes]) => {
//         const bins = toRecordList(binRes)
//           .filter((x) => x.is_active !== false)
//           .map((x) => ({
//             value: normalizeIdValue(x.unique_id ?? x.bin_id ?? x.id),
//             label: toText(x.bin_name ?? x.name ?? x.unique_id),
//             panchayatId: normalizeIdValue(
//               x.panchayat_id ?? x.panchayat ?? x.panchayat_unique_id
//             ),
//             wardId: normalizeIdValue(x.ward_id ?? x.ward ?? x.ward_unique_id),
//           }))
//           .filter((x) => x.value && x.label);
//         const wasteTypes = toRecordList(wasteTypeRes)
//           .filter((x) => x.is_active !== false)
//           .map((x) => ({
//             value: normalizeIdValue(x.unique_id ?? x.waste_type_id ?? x.id),
//             label: toText(x.waste_type_name ?? x.wastetype_name ?? x.name ?? x.unique_id),
//           }))
//           .filter((x) => x.value && x.label);
//         const cps = toRecordList(cpRes)
//           .filter((x) => x.is_active !== false)
//           .map((x) => ({
//             value: normalizeIdValue(
//               x.unique_id ?? x.collection_point_id ?? x.cp_id ?? x.id
//             ),
//             label: toText(x.cp_name ?? x.collection_point_name ?? x.name ?? x.unique_id),
//             panchayatId: normalizeIdValue(x.panchayat_id ?? x.panchayat),
//             wardId: normalizeIdValue(x.ward_id ?? x.ward),
//           }))
//           .filter((x) => x.value && x.label);
//         const panchayats = toRecordList(panchayatRes)
//           .filter((x) => x.is_active !== false)
//           .map((x) => ({
//             value: normalizeIdValue(x.unique_id ?? x.panchayat_id ?? x.id),
//             label: toText(x.panchayat_name ?? x.name ?? x.unique_id),
//           }))
//           .filter((x) => x.value && x.label);
//         const wards = toRecordList(wardRes)
//           .filter((x) => x.is_active !== false)
//           .map((x) => ({
//             value: normalizeIdValue(x.unique_id ?? x.ward_id ?? x.id),
//             label: toText(x.ward_name ?? x.name ?? x.unique_id),
//           }))
//           .filter((x) => x.value && x.label);

//         setBinRecords(bins);
//         setWasteTypeOptions(wasteTypes);
//         setCollectionPoints(cps);
//         setPanchayatOptions(panchayats);
//         setWardOptions(wards);

//         if (!isEdit) {
//           if (bins.length > 0) setBinId((prev) => prev || bins[0].value);
//           if (wasteTypes.length > 0) {
//             setWasteTypeId((prev) => prev || wasteTypes[0].value);
//           }
//           if (cps.length > 0) setCollectionPointId((prev) => prev || cps[0].value);
//         }
//       })
//       .catch(() => {
//         setBinRecords([]);
//         setWasteTypeOptions([]);
//         setCollectionPoints([]);
//         setPanchayatOptions([]);
//         setWardOptions([]);
//       });
//   }, [isEdit]);

//   const binOptions = useMemo(() => {
//     const filtered = binRecords
//       .filter((bin) => {
//         if (wardId) return bin.wardId === wardId;
//         if (panchayatId) return bin.panchayatId === panchayatId;
//         return true;
//       })
//       .map((bin) => ({ value: bin.value, label: bin.label }));

//     if (!binId) return filtered;
//     if (filtered.some((bin) => bin.value === binId)) return filtered;

//     const current = binRecords.find((bin) => bin.value === binId);
//     return [
//       ...filtered,
//       {
//         value: binId,
//         label: current?.label || binId,
//       },
//     ];
//   }, [binId, binRecords, panchayatId, wardId]);

//   useEffect(() => {
//     if (!binId) return;

//     const selectedBin = binRecords.find((bin) => bin.value === binId);
//     if (!selectedBin) return;

//     if (wardId && selectedBin.wardId !== wardId) {
//       setBinId("");
//       return;
//     }

//     if (
//       panchayatId &&
//       selectedBin.panchayatId &&
//       selectedBin.panchayatId !== panchayatId
//     ) {
//       setBinId("");
//     }
//   }, [binId, binRecords, panchayatId, wardId]);

//   const collectionPointOptions = useMemo(() => {
//     const filtered = collectionPoints
//       .filter((cp) => {
//         if (wardId) return cp.wardId === wardId;
//         if (panchayatId) return cp.panchayatId === panchayatId;
//         return true;
//       })
//       .map((cp) => ({ value: cp.value, label: cp.label }));

//     if (!collectionPointId) return filtered;
//     if (filtered.some((cp) => cp.value === collectionPointId)) return filtered;

//     const current = collectionPoints.find((cp) => cp.value === collectionPointId);
//     return [
//       ...filtered,
//       {
//         value: collectionPointId,
//         label: current?.label || collectionPointId,
//       },
//     ];
//   }, [collectionPointId, collectionPoints, panchayatId, wardId]);

//   useEffect(() => {
//     if (!collectionPointId) return;

//     const selectedCollectionPoint = collectionPoints.find(
//       (cp) => cp.value === collectionPointId
//     );

//     if (!selectedCollectionPoint) return;

//     if (wardId && selectedCollectionPoint.wardId !== wardId) {
//       setCollectionPointId("");
//       return;
//     }

//     if (
//       panchayatId &&
//       selectedCollectionPoint.panchayatId &&
//       selectedCollectionPoint.panchayatId !== panchayatId
//     ) {
//       setCollectionPointId("");
//     }
//   }, [collectionPointId, collectionPoints, panchayatId, wardId]);

//   useEffect(() => {
//     if (!isEdit) return;

//     adminApi.wasteCollections.get(id as string).then((res: any) => {
//       setBinId(normalizeIdValue(res.bin_id));
//       setWasteTypeId(normalizeIdValue(res.waste_type_id));
//       setCollectionPointId(normalizeIdValue(res.collection_point_id));
//       setPointCollectionWeight(toText(res.point_collection_weight));
//       setCollectionDate(toText(res.collection_date));
//       setCollectionTime(toText(res.collection_time).slice(0, 5));
//       setTripId(toText(res.trip_id));
//       setPanchayatId(normalizeIdValue(res.panchayat_id));
//       setWardId(normalizeIdValue(res.ward_id));
//       setIsCollected(toBool(res.is_collected, true));
//       setIsActive(toBool(res.is_active, true));
//       applyCompanyProjectFromRecord(res as Record<string, unknown>);
//     });
//   }, [applyCompanyProjectFromRecord, id, isEdit]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     const missingFields: string[] = [];
//     if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
//     if (!projectId) missingFields.push(t("admin.nav.project"));
//     if (!binId) missingFields.push(t("admin.nav.bin_master"));
//     if (!wasteTypeId) missingFields.push(t("common.waste_type"));
//     if (!collectionPointId) missingFields.push(t("admin.nav.collection_point"));
//     if (!pointCollectionWeight.trim()) missingFields.push("Point Collection Weight");
//     if (!collectionDate) missingFields.push(t("common.date"));
//     if (!collectionTime) missingFields.push("Time");

//     if (missingFields.length > 0) {
//       Swal.fire(
//         t("common.warning"),
//         t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
//         "warning"
//       );
//       return;
//     }

//     setLoading(true);
//     try {
//       const parsedWeight = Number.parseFloat(pointCollectionWeight || "0");
//       const payload = {
//         company_id: companyUniqueId,
//         project_id: projectId,
//         bin_id: binId,
//         waste_type_id: wasteTypeId,
//         collection_point_id: collectionPointId,
//         point_collection_weight: Number.isFinite(parsedWeight)
//           ? parsedWeight.toFixed(2)
//           : pointCollectionWeight,
//         collection_date: collectionDate,
//         collection_time: collectionTime.length === 5 ? `${collectionTime}:00` : collectionTime,
//         trip_id: tripId.trim() || null,
//         panchayat_id: panchayatId || null,
//         ward_id: wardId || null,
//         is_collected: isCollected,
//         is_active: isActive,
//       };

//       isEdit
//         ? await adminApi.wasteCollections.update(id as string, payload)
//         : await adminApi.wasteCollections.create(payload);

//       Swal.fire(
//         t("common.success"),
//         isEdit ? t("common.updated_success") : t("common.added_success"),
//         "success"
//       );
//       navigate(LIST_PATH);
//     } catch {
//       Swal.fire(t("common.save_failed"), t("common.save_failed_desc"), "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ComponentCard
//       title={
//         isEdit
//           ? t("common.edit_item", { item: t("admin.nav.collection_monitoring") })
//           : t("common.add_item", { item: t("admin.nav.collection_monitoring") })
//       }
//     >
//       <form onSubmit={handleSubmit}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div>
//             <Label>{t("admin.nav.company")} *</Label>
//             <Select
//               value={companyUniqueId}
//               onChange={onCompanyChange}
//               options={companies.map((x) => ({
//                 value: x.value,
//                 label: x.label,
//               }))}
//               disabled={
//                 Boolean(loggedInCompanyUniqueId) ||
//                 (!isSuperAdmin && !loggedInCompanyUniqueId) ||
//                 companies.length === 0
//               }
//             />
//           </div>

//           <div>
//             <Label>{t("admin.nav.project")} *</Label>
//             <Select
//               value={projectId}
//               onChange={setProjectId}
//               options={projects.map((x) => ({
//                 value: x.value,
//                 label: x.label,
//               }))}
//               disabled={!companyUniqueId || projects.length === 0}
//             />
//           </div>

//           <div>
//             <Label>
//               {t("common.item_name", { item: t("admin.nav.bin_master") })} *
//             </Label>
//             <Select
//               value={binId}
//               onChange={setBinId}
//               options={binOptions}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("admin.nav.bin_master"),
//               })}
//               disabled={binOptions.length === 0}
//             />
//           </div>

//           <div>
//             <Label>{t("common.waste_type")} *</Label>
//             <Select
//               value={wasteTypeId}
//               onChange={setWasteTypeId}
//               options={wasteTypeOptions}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("common.waste_type"),
//               })}
//             />
//           </div>

//           <div>
//             <Label>{t("admin.nav.collection_point")} *</Label>
//             <Select
//               value={collectionPointId}
//               onChange={setCollectionPointId}
//               options={collectionPointOptions}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("admin.nav.collection_point"),
//               })}
//               disabled={collectionPointOptions.length === 0}
//             />
//           </div>

//           <div>
//             <Label>Point Collection Weight (kg) *</Label>
//             <Input
//               type="number"
//               step="0.01"
//               min="0"
//               value={pointCollectionWeight}
//               onChange={(e) => setPointCollectionWeight(e.target.value)}
//             />
//           </div>

//           <div>
//             <Label>{t("common.date")} *</Label>
//             <Input
//               type="date"
//               value={collectionDate}
//               onChange={(e) => setCollectionDate(e.target.value)}
//             />
//           </div>

//           <div>
//             <Label>Time *</Label>
//             <Input
//               type="time"
//               value={collectionTime}
//               onChange={(e) => setCollectionTime(e.target.value)}
//             />
//           </div>

//           <div>
//             <Label>Trip ID</Label>
//             <Input
//               value={tripId}
//               onChange={(e) => setTripId(e.target.value)}
//               placeholder="TRIP-XXXXXXXXXXXX"
//             />
//           </div>

//           <div>
//             <Label>{t("admin.nav.panchayat")}</Label>
//             <Select
//               value={panchayatId || NONE_VALUE}
//               onChange={(value) => {
//                 const nextPanchayatId = value === NONE_VALUE ? "" : value;
//                 setPanchayatId(nextPanchayatId);
//                 setBinId("");
//                 setCollectionPointId("");
//                 if (nextPanchayatId) {
//                   setWardId("");
//                 }
//               }}
//               options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...panchayatOptions]}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("admin.nav.panchayat"),
//               })}
//               disabled={isWardSelected}
//             />
//           </div>

//           <div>
//             <Label>{t("common.ward")}</Label>
//             <Select
//               value={wardId || NONE_VALUE}
//               onChange={(value) => {
//                 const nextWardId = value === NONE_VALUE ? "" : value;
//                 setWardId(nextWardId);
//                 setBinId("");
//                 setCollectionPointId("");
//                 if (nextWardId) {
//                   setPanchayatId("");
//                 }
//               }}
//               options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...wardOptions]}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("common.ward"),
//               })}
//               disabled={isPanchayatSelected}
//             />
//           </div>

//           <div>
//             <Label>{t("common.collected")}</Label>
//             <Select
//               value={isCollected ? "true" : "false"}
//               onChange={(val) => setIsCollected(val === "true")}
//               options={[
//                 { value: "true", label: t("common.yes") },
//                 { value: "false", label: t("common.no") },
//               ]}
//             />
//           </div>

//           <div>
//             <Label>{t("common.status")}</Label>
//             <Select
//               value={isActive ? "true" : "false"}
//               onChange={(val) => setIsActive(val === "true")}
//               options={[
//                 { value: "true", label: t("common.active") },
//                 { value: "false", label: t("common.inactive") },
//               ]}
//             />
//           </div>
//         </div>

//         <div className="flex justify-end gap-3 mt-6">
//           <button
//             type="submit"
//             disabled={loading}
//             className="bg-green-custom text-white px-4 py-2 rounded"
//           >
//             {loading
//               ? t("common.saving")
//               : isEdit
//                 ? t("common.update")
//                 : t("common.save")}
//           </button>
//           <button
//             type="button"
//             onClick={() => navigate(LIST_PATH)}
//             className="bg-red-400 text-white px-4 py-2 rounded"
//           >
//             {t("common.cancel")}
//           </button>
//         </div>
//       </form>
//     </ComponentCard>
//   );
// }

// export default CollectionMonitoringForm;




import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Input } from "@/components/ui/input";

import { adminApi } from "@/helpers/admin/registry";
import { binApi, collectionPointApi, panchayatApi, wasteTypeApi, wardApi, zoneApi, tripDefinitionApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";

type SelectOption = {
  value: string;
  label: string;
};
type BinOption = SelectOption & {
  panchayatId: string;
  wardId: string;
};
type CollectionPointOption = SelectOption & {
  panchayatId: string;
  wardId: string;
};
type WardOption = SelectOption & {
  zoneId: string;
};

function CollectionMonitoringForm() {
  const { t } = useTranslation();
  const [binId, setBinId] = useState("");
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [collectionPointId, setCollectionPointId] = useState("");
  const [pointCollectionWeight, setPointCollectionWeight] = useState("");
  const [collectionDate, setCollectionDate] = useState("");
  const [collectionTime, setCollectionTime] = useState("");
  const [tripId, setTripId] = useState("");
  const [panchayatId, setPanchayatId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [wardId, setWardId] = useState("");
  const [isCollected, setIsCollected] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [binRecords, setBinRecords] = useState<BinOption[]>([]);
  const [wasteTypeOptions, setWasteTypeOptions] = useState<SelectOption[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointOption[]>([]);
  const [panchayatOptions, setPanchayatOptions] = useState<SelectOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
  const [wardRecords, setWardRecords] = useState<WardOption[]>([]);
  const [tripDefinitionOptions, setTripDefinitionOptions] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(false);
  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);
  const isWardSelected = Boolean(wardId);
  const NONE_VALUE = "__none__";

  const navigate = useNavigate();
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
  } = useCompanyProjectSelection({ isEdit });

  const { encWasteManagementMaster, encCollectionMonitoring } =
    getEncryptedRoute();
  const LIST_PATH = `/${encWasteManagementMaster}/${encCollectionMonitoring}`;

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

  useEffect(() => {
    Promise.all([
      binApi.list(),
      wasteTypeApi.list(),
      collectionPointApi.list(),
      panchayatApi.list(),
      zoneApi.list(),
      wardApi.list(),
      tripDefinitionApi.list(),
    ])
      .then(([binRes, wasteTypeRes, cpRes, panchayatRes, zoneRes, wardRes, tripDefRes]) => {
        const bins = toRecordList(binRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.bin_id ?? x.id),
            label: toText(x.bin_name ?? x.name ?? x.unique_id),
            panchayatId: normalizeIdValue(
              x.panchayat_id ?? x.panchayat ?? x.panchayat_unique_id
            ),
            wardId: normalizeIdValue(x.ward_id ?? x.ward ?? x.ward_unique_id),
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
            value: normalizeIdValue(
              x.unique_id ?? x.collection_point_id ?? x.cp_id ?? x.id
            ),
            label: toText(x.cp_name ?? x.collection_point_name ?? x.name ?? x.unique_id),
            panchayatId: normalizeIdValue(x.panchayat_id ?? x.panchayat),
            wardId: normalizeIdValue(x.ward_id ?? x.ward),
          }))
          .filter((x) => x.value && x.label);

        const panchayats = toRecordList(panchayatRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.panchayat_id ?? x.id),
            label: toText(x.panchayat_name ?? x.name ?? x.unique_id),
          }))
          .filter((x) => x.value && x.label);

        const zones = toRecordList(zoneRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.zone_id ?? x.id),
            label: toText(x.zone_name ?? x.name ?? x.unique_id),
          }))
          .filter((x) => x.value && x.label);

        // Wards carry their zoneId so we can filter them when a zone is selected
        const wards = toRecordList(wardRes)
          .filter((x) => x.is_active !== false)
          .map((x) => ({
            value: normalizeIdValue(x.unique_id ?? x.ward_id ?? x.id),
            label: toText(x.ward_name ?? x.name ?? x.unique_id),
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
        setWasteTypeOptions(wasteTypes);
        setCollectionPoints(cps);
        setPanchayatOptions(panchayats);
        setZoneOptions(zones);
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
        setWasteTypeOptions([]);
        setCollectionPoints([]);
        setPanchayatOptions([]);
        setZoneOptions([]);
        setWardRecords([]);
        setTripDefinitionOptions([]);
      });
  }, [isEdit]);

  // Ward options filtered by zone when a zone is selected
  const wardOptions = useMemo(() => {
    const filtered = wardRecords
      .filter((ward) => {
        if (zoneId) return ward.zoneId === zoneId;
        return true;
      })
      .map((ward) => ({ value: ward.value, label: ward.label }));

    if (!wardId) return filtered;
    if (filtered.some((w) => w.value === wardId)) return filtered;

    const current = wardRecords.find((w) => w.value === wardId);
    return [...filtered, { value: wardId, label: current?.label || wardId }];
  }, [wardId, wardRecords, zoneId]);

  const binOptions = useMemo(() => {
    const filtered = binRecords
      .filter((bin) => {
        if (wardId) return bin.wardId === wardId;
        if (panchayatId) return bin.panchayatId === panchayatId;
        return true;
      })
      .map((bin) => ({ value: bin.value, label: bin.label }));

    if (!binId) return filtered;
    if (filtered.some((bin) => bin.value === binId)) return filtered;

    const current = binRecords.find((bin) => bin.value === binId);
    return [...filtered, { value: binId, label: current?.label || binId }];
  }, [binId, binRecords, panchayatId, wardId]);

  useEffect(() => {
    if (!binId) return;
    const selectedBin = binRecords.find((bin) => bin.value === binId);
    if (!selectedBin) return;
    if (wardId && selectedBin.wardId !== wardId) { setBinId(""); return; }
    if (panchayatId && selectedBin.panchayatId && selectedBin.panchayatId !== panchayatId) {
      setBinId("");
    }
  }, [binId, binRecords, panchayatId, wardId]);

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

  useEffect(() => {
    if (!collectionPointId) return;
    const selectedCp = collectionPoints.find((cp) => cp.value === collectionPointId);
    if (!selectedCp) return;
    if (wardId && selectedCp.wardId !== wardId) { setCollectionPointId(""); return; }
    if (panchayatId && selectedCp.panchayatId && selectedCp.panchayatId !== panchayatId) {
      setCollectionPointId("");
    }
  }, [collectionPointId, collectionPoints, panchayatId, wardId]);

  useEffect(() => {
    if (!isEdit) return;

    adminApi.wasteCollections.get(id as string).then((res: any) => {
      setBinId(normalizeIdValue(res.bin_id));
      setWasteTypeId(normalizeIdValue(res.waste_type_id));
      setCollectionPointId(normalizeIdValue(res.collection_point_id));
      setPointCollectionWeight(toText(res.point_collection_weight));
      setCollectionDate(toText(res.collection_date));
      setCollectionTime(toText(res.collection_time).slice(0, 5));
      setTripId(toText(res.trip_id));
      setPanchayatId(normalizeIdValue(res.panchayat_id));
      setZoneId(normalizeIdValue(res.zone_id));
      setWardId(normalizeIdValue(res.ward_id));
      setIsCollected(toBool(res.is_collected, true));
      setIsActive(toBool(res.is_active, true));
      applyCompanyProjectFromRecord(res as Record<string, unknown>);
    });
  }, [applyCompanyProjectFromRecord, id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
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
        panchayat_id: panchayatId || null,
        zone_id: zoneId || null,
        ward_id: wardId || null,
        is_collected: isCollected,
        is_active: isActive,
      };

      isEdit
        ? await adminApi.wasteCollections.update(id as string, payload)
        : await adminApi.wasteCollections.create(payload);

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );
      navigate(LIST_PATH);
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
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>{t("admin.nav.company")} *</Label>
            <Select
              value={companyUniqueId}
              onChange={onCompanyChange}
              options={companies.map((x) => ({ value: x.value, label: x.label }))}
              disabled={
                Boolean(loggedInCompanyUniqueId) ||
                (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                companies.length === 0
              }
            />
          </div>

          <div>
            <Label>{t("admin.nav.project")} *</Label>
            <Select
              value={projectId}
              onChange={setProjectId}
              options={projects.map((x) => ({ value: x.value, label: x.label }))}
              disabled={!companyUniqueId || projects.length === 0}
            />
          </div>

          <div>
            <Label>{t("common.waste_type")} *</Label>
            <Select
              value={wasteTypeId}
              onChange={setWasteTypeId}
              options={wasteTypeOptions}
              placeholder={t("common.select_item_placeholder", { item: t("common.waste_type") })}
            />
          </div>

          <div>
            <Label>{t("admin.nav.collection_point")} *</Label>
            <Select
              value={collectionPointId}
              onChange={setCollectionPointId}
              options={collectionPointOptions}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.collection_point") })}
              disabled={collectionPointOptions.length === 0}
            />
          </div>

          <div>
            <Label>Point Collection Weight (kg) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pointCollectionWeight}
              onChange={(e) => setPointCollectionWeight(e.target.value)}
            />
          </div>

          <div>
            <Label>{t("common.date")} *</Label>
            <Input
              type="date"
              value={collectionDate}
              onChange={(e) => setCollectionDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Time *</Label>
            <Input
              type="time"
              value={collectionTime}
              onChange={(e) => setCollectionTime(e.target.value)}
            />
          </div>

          <div>
            <Label>Trip ID</Label>
            <Select
              value={tripId || NONE_VALUE}
              onChange={(value) => {
                const nextTripId = value === NONE_VALUE ? "" : value;
                setTripId(nextTripId);
              }}
              options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...tripDefinitionOptions]}
              placeholder={t("common.select_item_placeholder", {
                item: "Trip",
              })}
            />
          </div>

          {/* Panchayat — disabled when zone or ward is selected */}
          <div>
            <Label>{t("admin.nav.panchayat")}</Label>
            <Select
              value={panchayatId || NONE_VALUE}
              onChange={(value) => {
                const next = value === NONE_VALUE ? "" : value;
                setPanchayatId(next);
                setBinId("");
                setCollectionPointId("");
              }}
              options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...panchayatOptions]}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.panchayat") })}
              disabled={isZoneSelected || isWardSelected}
            />
          </div>

          {/* Zone — disabled when panchayat is selected */}
          <div>
            <Label>{t("admin.nav.zone")}</Label>
            <Select
              value={zoneId || NONE_VALUE}
              onChange={(value) => {
                const next = value === NONE_VALUE ? "" : value;
                setZoneId(next);
                // Reset dependent fields when zone changes
                setWardId("");
                setBinId("");
                setCollectionPointId("");
              }}
              options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...zoneOptions]}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") })}
              disabled={isPanchayatSelected}
            />
          </div>

          {/* Ward — disabled when panchayat is selected; filtered by zone when zone is selected */}
          <div>
            <Label>{t("common.ward")}</Label>
            <Select
              value={wardId || NONE_VALUE}
              onChange={(value) => {
                const next = value === NONE_VALUE ? "" : value;
                setWardId(next);
                setBinId("");
                setCollectionPointId("");
              }}
              options={[{ value: NONE_VALUE, label: t("common.not_available") }, ...wardOptions]}
              placeholder={t("common.select_item_placeholder", { item: t("common.ward") })}
              disabled={isPanchayatSelected}
            />
          </div>
          <div>
            <Label>
              {t("common.item_name", { item: t("admin.nav.bin_master") })} *
            </Label>
            <Select
              value={binId}
              onChange={setBinId}
              options={binOptions}
              placeholder={t("common.select_item_placeholder", { item: t("admin.nav.bin_master") })}
              disabled={binOptions.length === 0}
            />
          </div>

          <div>
            <Label>{t("common.collected")}</Label>
            <Select
              value={isCollected ? "true" : "false"}
              onChange={(val) => setIsCollected(val === "true")}
              options={[
                { value: "true", label: t("common.yes") },
                { value: "false", label: t("common.no") },
              ]}
            />
          </div>

          <div>
            <Label>{t("common.status")}</Label>
            <Select
              value={isActive ? "true" : "false"}
              onChange={(val) => setIsActive(val === "true")}
              options={[
                { value: "true", label: t("common.active") },
                { value: "false", label: t("common.inactive") },
              ]}
            />
          </div>
        </div>

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
            onClick={() => navigate(LIST_PATH)}
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