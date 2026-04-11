// import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import Swal from "sweetalert2";
// import { useTranslation } from "react-i18next";

// import ComponentCard from "@/components/common/ComponentCard";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import {
//   cityApi,
//   collectionPointApi,
//   districtApi,
//   panchayatApi,
//   stateApi,
//   wardApi,
// } from "@/helpers/admin";
// import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
// import { getEncryptedRoute } from "@/utils/routeCache";

// type SelectOption = { value: string; label: string };
// type WithStateIdOption = SelectOption & { stateId: string };
// type WithDistrictIdOption = SelectOption & {
//   stateId: string;
//   districtId: string;
// };
// type WithCityIdOption = SelectOption & {
//   stateId: string;
//   districtId: string;
//   cityId: string;
// };
// type WardOption = WithCityIdOption & { panchayatId: string };
// type UnknownRecord = Record<string, unknown>;

// const toRecordList = (value: unknown): UnknownRecord[] => {
//   if (Array.isArray(value)) {
//     return value.filter(
//       (item): item is UnknownRecord =>
//         !!item && typeof item === "object" && !Array.isArray(item)
//     );
//   }

//   if (value && typeof value === "object") {
//     const maybeResults = (value as { results?: unknown }).results;
//     if (Array.isArray(maybeResults)) {
//       return maybeResults.filter(
//         (item): item is UnknownRecord =>
//           !!item && typeof item === "object" && !Array.isArray(item)
//       );
//     }
//   }

//   return [];
// };

// const getValueByPath = (record: UnknownRecord, path: string): unknown => {
//   const segments = path.split(".");
//   let current: unknown = record;

//   for (const segment of segments) {
//     if (!current || typeof current !== "object" || Array.isArray(current)) {
//       return undefined;
//     }
//     current = (current as UnknownRecord)[segment];
//   }

//   return current;
// };

// const hasValue = (value: unknown): boolean => {
//   if (value === null || value === undefined) return false;
//   if (typeof value === "string") return value.trim() !== "";
//   return true;
// };

// const pickValue = (record: UnknownRecord, paths: string[]): unknown => {
//   for (const path of paths) {
//     const value = getValueByPath(record, path);
//     if (hasValue(value)) {
//       return value;
//     }
//   }
//   return undefined;
// };

// const normalizeIdValue = (value: unknown): string => {
//   if (value === null || value === undefined) return "";

//   if (typeof value === "object") {
//     const obj = value as Record<string, unknown>;
//     return String(obj.unique_id ?? obj.id ?? obj.value ?? "").trim();
//   }

//   const raw = String(value).trim();
//   if (!raw) return "";

//   const inParentheses = raw.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
//   if (inParentheses?.[1]) return inParentheses[1];
//   return raw;
// };

// const toStringOrEmpty = (value: unknown): string =>
//   value === null || value === undefined ? "" : String(value).trim();

// const toBoolean = (value: unknown, fallback = false): boolean => {
//   if (typeof value === "boolean") return value;
//   if (typeof value === "number") return value !== 0;
//   if (typeof value === "string") {
//     const normalized = value.trim().toLowerCase();
//     if (normalized === "true" || normalized === "1") return true;
//     if (normalized === "false" || normalized === "0") return false;
//   }
//   return fallback;
// };

// const isValidCoordinate = (value: string, min: number, max: number): boolean => {
//   const parsed = Number.parseFloat(value);
//   return Number.isFinite(parsed) && parsed >= min && parsed <= max;
// };

// const ensureSelectedOption = (
//   options: SelectOption[],
//   selectedValue: string
// ): SelectOption[] => {
//   if (!selectedValue) return options;
//   if (options.some((option) => option.value === selectedValue)) {
//     return options;
//   }
//   return [...options, { value: selectedValue, label: selectedValue }];
// };

// const { encMasters, encCollectionPoints } = getEncryptedRoute();
// const ENC_LIST_PATH = `/${encMasters}/${encCollectionPoints}`;

// export default function CollectionPointForm() {
//   const { t } = useTranslation();
//   const navigate = useNavigate();
//   const { id } = useParams<{ id: string }>();
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

//   const extractErr = useCallback(
//     (error: unknown): string => {
//       const err = error as { response?: { data?: unknown }; message?: string };
//       const data = err.response?.data;

//       if (typeof data === "string") return data;
//       if (data && typeof data === "object") {
//         return Object.entries(data as Record<string, unknown>)
//           .map(([key, value]) =>
//             Array.isArray(value)
//               ? `${key}: ${value.join(", ")}`
//               : `${key}: ${String(value)}`
//           )
//           .join("\n");
//       }

//       if (err.message) return err.message;
//       return t("common.unexpected_error");
//     },
//     [t]
//   );

//   const [stateId, setStateId] = useState("");
//   const [districtId, setDistrictId] = useState("");
//   const [cityId, setCityId] = useState("");
//   const [panchayatId, setPanchayatId] = useState("");
//   const [wardId, setWardId] = useState("");
//   const [cpName, setCpName] = useState("");
//   const [latitude, setLatitude] = useState("");
//   const [longitude, setLongitude] = useState("");
//   const [isActive, setIsActive] = useState(true);

//   const [states, setStates] = useState<SelectOption[]>([]);
//   const [districts, setDistricts] = useState<WithStateIdOption[]>([]);
//   const [cities, setCities] = useState<WithDistrictIdOption[]>([]);
//   const [panchayats, setPanchayats] = useState<WithCityIdOption[]>([]);
//   const [wards, setWards] = useState<WardOption[]>([]);
//   const [loading, setLoading] = useState(false);
//   const isPanchayatSelected = Boolean(panchayatId);
//   const isWardSelected = Boolean(wardId);

//   const districtOptions = useMemo(() => {
//     const filtered = districts
//       .filter((option) => !stateId || !option.stateId || option.stateId === stateId)
//       .map((option) => ({ value: option.value, label: option.label }));
//     return ensureSelectedOption(filtered, districtId);
//   }, [districtId, districts, stateId]);

//   const cityOptions = useMemo(() => {
//     const filtered = cities
//       .filter((option) => {
//         if (stateId && option.stateId && option.stateId !== stateId) return false;
//         if (districtId && option.districtId && option.districtId !== districtId) {
//           return false;
//         }
//         return true;
//       })
//       .map((option) => ({ value: option.value, label: option.label }));
//     return ensureSelectedOption(filtered, cityId);
//   }, [cities, cityId, districtId, stateId]);

//   const panchayatOptions = useMemo(() => {
//     const filtered = panchayats
//       .filter((option) => {
//         if (stateId && option.stateId && option.stateId !== stateId) return false;
//         if (districtId && option.districtId && option.districtId !== districtId) {
//           return false;
//         }
//         if (cityId && option.cityId && option.cityId !== cityId) return false;
//         return true;
//       })
//       .map((option) => ({ value: option.value, label: option.label }));
//     return ensureSelectedOption(filtered, panchayatId);
//   }, [cityId, districtId, panchayatId, panchayats, stateId]);

//   const wardOptions = useMemo(() => {
//     const filtered = wards
//       .filter((option) => {
//         if (stateId && option.stateId && option.stateId !== stateId) return false;
//         if (districtId && option.districtId && option.districtId !== districtId) {
//           return false;
//         }
//         if (cityId && option.cityId && option.cityId !== cityId) return false;
//         if (panchayatId && option.panchayatId && option.panchayatId !== panchayatId) {
//           return false;
//         }
//         return true;
//       })
//       .map((option) => ({ value: option.value, label: option.label }));
//     return ensureSelectedOption(filtered, wardId);
//   }, [cityId, districtId, panchayatId, stateId, wardId, wards]);

//   useEffect(() => {
//     Promise.all([
//       stateApi.list(),
//       districtApi.list(),
//       cityApi.list(),
//       panchayatApi.list(),
//       wardApi.list(),
//     ])
//       .then(([stateRes, districtRes, cityRes, panchayatRes, wardRes]) => {
//         const stateOptions = toRecordList(stateRes)
//           .filter((item) => item.is_active !== false)
//           .map((item) => ({
//             value: normalizeIdValue(
//               pickValue(item, ["unique_id", "state_id", "id", "state.unique_id"])
//             ),
//             label: toStringOrEmpty(
//               pickValue(item, ["state_name", "name", "state", "unique_id"])
//             ),
//           }))
//           .filter((item) => item.value && item.label)
//           .sort((a, b) => a.label.localeCompare(b.label));
//         setStates(stateOptions);

//         const districtOptions = toRecordList(districtRes)
//           .filter((item) => item.is_active !== false)
//           .map((item) => ({
//             value: normalizeIdValue(
//               pickValue(item, [
//                 "unique_id",
//                 "district_id",
//                 "id",
//                 "district.unique_id",
//               ])
//             ),
//             label: toStringOrEmpty(
//               pickValue(item, ["district_name", "name", "district", "unique_id"])
//             ),
//             stateId: normalizeIdValue(
//               pickValue(item, ["state_id", "state", "state.unique_id"])
//             ),
//           }))
//           .filter((item) => item.value && item.label);
//         setDistricts(districtOptions);

//         const cityOptions = toRecordList(cityRes)
//           .filter((item) => item.is_active !== false)
//           .map((item) => ({
//             value: normalizeIdValue(
//               pickValue(item, ["unique_id", "city_id", "id", "city.unique_id"])
//             ),
//             label: toStringOrEmpty(
//               pickValue(item, ["city_name", "name", "city", "unique_id"])
//             ),
//             stateId: normalizeIdValue(
//               pickValue(item, ["state_id", "state", "state.unique_id"])
//             ),
//             districtId: normalizeIdValue(
//               pickValue(item, ["district_id", "district", "district.unique_id"])
//             ),
//           }))
//           .filter((item) => item.value && item.label);
//         setCities(cityOptions);

//         const panchayatOptions = toRecordList(panchayatRes)
//           .filter((item) => item.is_active !== false)
//           .map((item) => ({
//             value: normalizeIdValue(
//               pickValue(item, [
//                 "unique_id",
//                 "panchayat_id",
//                 "id",
//                 "panchayat.unique_id",
//               ])
//             ),
//             label: toStringOrEmpty(
//               pickValue(item, ["panchayat_name", "name", "panchayat", "unique_id"])
//             ),
//             stateId: normalizeIdValue(
//               pickValue(item, ["state_id", "state", "state.unique_id"])
//             ),
//             districtId: normalizeIdValue(
//               pickValue(item, ["district_id", "district", "district.unique_id"])
//             ),
//             cityId: normalizeIdValue(
//               pickValue(item, ["city_id", "city", "city.unique_id"])
//             ),
//           }))
//           .filter((item) => item.value && item.label);
//         setPanchayats(panchayatOptions);

//         const wardOptions = toRecordList(wardRes)
//           .filter((item) => item.is_active !== false)
//           .map((item) => ({
//             value: normalizeIdValue(
//               pickValue(item, ["unique_id", "ward_id", "id", "ward.unique_id"])
//             ),
//             label: toStringOrEmpty(
//               pickValue(item, ["ward_name", "name", "ward", "unique_id"])
//             ),
//             stateId: normalizeIdValue(
//               pickValue(item, ["state_id", "state", "state.unique_id"])
//             ),
//             districtId: normalizeIdValue(
//               pickValue(item, ["district_id", "district", "district.unique_id"])
//             ),
//             cityId: normalizeIdValue(
//               pickValue(item, ["city_id", "city", "city.unique_id"])
//             ),
//             panchayatId: normalizeIdValue(
//               pickValue(item, ["panchayat_id", "panchayat", "panchayat.unique_id"])
//             ),
//           }))
//           .filter((item) => item.value && item.label);
//         setWards(wardOptions);
//       })
//       .catch((error) => {
//         setStates([]);
//         setDistricts([]);
//         setCities([]);
//         setPanchayats([]);
//         setWards([]);
//         Swal.fire(t("common.error"), extractErr(error), "error");
//       });
//   }, [extractErr, t]);

//   useEffect(() => {
//     if (!isEdit || !id) return;

//     collectionPointApi
//       .get(id)
//       .then((response) => {
//         const data = (response ?? {}) as UnknownRecord;

//         setStateId(normalizeIdValue(pickValue(data, ["state_id", "state", "state.unique_id"])));
//         setDistrictId(
//           normalizeIdValue(
//             pickValue(data, ["district_id", "district", "district.unique_id"])
//           )
//         );
//         setCityId(normalizeIdValue(pickValue(data, ["city_id", "city", "city.unique_id"])));
//         setPanchayatId(
//           normalizeIdValue(
//             pickValue(data, ["panchayat_id", "panchayat", "panchayat.unique_id"])
//           )
//         );
//         setWardId(normalizeIdValue(pickValue(data, ["ward_id", "ward", "ward.unique_id"])));
//         setCpName(toStringOrEmpty(pickValue(data, ["cp_name", "collection_point_name"])));
//         setLatitude(toStringOrEmpty(pickValue(data, ["latitude"])));
//         setLongitude(toStringOrEmpty(pickValue(data, ["longitude"])));
//         setIsActive(toBoolean(pickValue(data, ["is_active"]), true));

//         applyCompanyProjectFromRecord(data);
//       })
//       .catch((error) => {
//         Swal.fire(t("common.error"), extractErr(error), "error");
//       });
//   }, [applyCompanyProjectFromRecord, extractErr, id, isEdit, t]);

//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();

//     const missingFields: string[] = [];
//     if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
//     if (!projectId) missingFields.push(t("admin.nav.project"));
//     if (!stateId) missingFields.push(t("common.state"));
//     if (!districtId) missingFields.push(t("common.district"));
//     if (!cityId) missingFields.push(t("common.city"));
//     if (!panchayatId && !wardId) {
//       missingFields.push(`${t("admin.nav.panchayat")} / ${t("admin.nav.ward")}`);
//     }
//     if (!cpName.trim()) {
//       missingFields.push(
//         t("common.item_name", { item: t("admin.nav.collection_point") })
//       );
//     }
//     if (!latitude.trim()) missingFields.push(t("common.latitude"));
//     if (!longitude.trim()) missingFields.push(t("common.longitude"));

//     const latitudeValid = isValidCoordinate(latitude, -90, 90);
//     const longitudeValid = isValidCoordinate(longitude, -180, 180);
//     if (latitude.trim() && !latitudeValid) missingFields.push("Valid Latitude");
//     if (longitude.trim() && !longitudeValid) missingFields.push("Valid Longitude");

//     if (missingFields.length > 0) {
//       Swal.fire(
//         t("common.warning"),
//         t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
//         "warning"
//       );
//       return;
//     }

//     setLoading(true);
//     const parsedLatitude = Number.parseFloat(latitude);
//     const parsedLongitude = Number.parseFloat(longitude);

//     const payload = {
//       company_id: companyUniqueId,
//       project_id: projectId,
//       state_id: stateId,
//       district_id: districtId,
//       city_id: cityId,
//       panchayat_id: panchayatId || null,
//       ward_id: wardId || null,
//       cp_name: cpName.trim(),
//       latitude: parsedLatitude.toFixed(6),
//       longitude: parsedLongitude.toFixed(6),
//       is_active: isActive,
//     };

//     try {
//       if (isEdit && id) {
//         await collectionPointApi.update(id, payload);
//         Swal.fire(t("common.success"), t("common.updated_success"), "success");
//       } else {
//         await collectionPointApi.create(payload);
//         Swal.fire(t("common.success"), t("common.added_success"), "success");
//       }

//       navigate(ENC_LIST_PATH);
//     } catch (error) {
//       Swal.fire(t("common.save_failed"), extractErr(error), "error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ComponentCard
//       title={
//         isEdit
//           ? t("common.edit_item", { item: t("admin.nav.collection_point") })
//           : t("common.add_item", { item: t("admin.nav.collection_point") })
//       }
//     >
//       <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>
//         <div>
//           <Label>{t("admin.nav.company")} *</Label>
//           <Select
//             value={companyUniqueId}
//             onValueChange={onCompanyChange}
//             disabled={
//               Boolean(loggedInCompanyUniqueId) ||
//               (!isSuperAdmin && !loggedInCompanyUniqueId) ||
//               companies.length === 0
//             }
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue
//                 placeholder={
//                   loggedInCompanyUniqueId
//                     ? "Company from logged-in profile"
//                     : "Select Company"
//                 }
//               />
//             </SelectTrigger>
//             <SelectContent>
//               {companies.map((company) => (
//                 <SelectItem key={company.value} value={company.value}>
//                   {company.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>{t("admin.nav.project")} *</Label>
//           <Select
//             value={projectId}
//             onValueChange={setProjectId}
//             disabled={!companyUniqueId || projects.length === 0}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue placeholder="Select Project" />
//             </SelectTrigger>
//             <SelectContent>
//               {projects.map((project) => (
//                 <SelectItem key={project.value} value={project.value}>
//                   {project.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>{t("common.state")} *</Label>
//           <Select
//             value={stateId}
//             onValueChange={(value) => {
//               setStateId(value);
//               setDistrictId("");
//               setCityId("");
//               setPanchayatId("");
//               setWardId("");
//             }}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue
//                 placeholder={t("common.select_item_placeholder", {
//                   item: t("common.state"),
//                 })}
//               />
//             </SelectTrigger>
//             <SelectContent>
//               {states.map((item) => (
//                 <SelectItem key={item.value} value={item.value}>
//                   {item.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>{t("common.district")} *</Label>
//           <Select
//             value={districtId}
//             onValueChange={(value) => {
//               setDistrictId(value);
//               setCityId("");
//               setPanchayatId("");
//               setWardId("");
//             }}
//             disabled={!stateId}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue
//                 placeholder={t("common.select_item_placeholder", {
//                   item: t("common.district"),
//                 })}
//               />
//             </SelectTrigger>
//             <SelectContent>
//               {districtOptions.map((item) => (
//                 <SelectItem key={item.value} value={item.value}>
//                   {item.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>{t("common.city")} *</Label>
//           <Select
//             value={cityId}
//             onValueChange={(value) => {
//               setCityId(value);
//               setPanchayatId("");
//               setWardId("");
//             }}
//             disabled={!districtId}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue
//                 placeholder={t("common.select_item_placeholder", {
//                   item: t("common.city"),
//                 })}
//               />
//             </SelectTrigger>
//             <SelectContent>
//               {cityOptions.map((item) => (
//                 <SelectItem key={item.value} value={item.value}>
//                   {item.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>{t("admin.nav.panchayat")}</Label>
//           <Select
//             value={panchayatId || "__none__"}
//             onValueChange={(value) => {
//               const nextPanchayatId = value === "__none__" ? "" : value;
//               setPanchayatId(nextPanchayatId);
//               if (nextPanchayatId) {
//                 setWardId("");
//               }
//             }}
//             disabled={!cityId || isWardSelected}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue
//                 placeholder={t("common.select_item_placeholder", {
//                   item: t("admin.nav.panchayat"),
//                 })}
//               />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
//               {panchayatOptions.map((item) => (
//                 <SelectItem key={item.value} value={item.value}>
//                   {item.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>{t("admin.nav.ward")}</Label>
//           <Select
//             value={wardId || "__none__"}
//             onValueChange={(value) => {
//               const nextWardId = value === "__none__" ? "" : value;
//               setWardId(nextWardId);
//               if (nextWardId) {
//                 setPanchayatId("");
//               }
//             }}
//             disabled={!cityId || isPanchayatSelected}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue
//                 placeholder={t("common.select_item_placeholder", {
//                   item: t("admin.nav.ward"),
//                 })}
//               />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="__none__">{t("common.not_available")}</SelectItem>
//               {wardOptions.map((item) => (
//                 <SelectItem key={item.value} value={item.value}>
//                   {item.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <Label>
//             {t("common.item_name", { item: t("admin.nav.collection_point") })} *
//           </Label>
//           <Input
//             value={cpName}
//             onChange={(e) => setCpName(e.target.value)}
//             placeholder="CP 1"
//             required
//           />
//         </div>

//         <div>
//           <Label>{t("common.latitude")} *</Label>
//           <Input
//             type="number"
//             step="0.000001"
//             value={latitude}
//             onChange={(e) => setLatitude(e.target.value)}
//             placeholder="13.083000"
//             required
//           />
//         </div>

//         <div>
//           <Label>{t("common.longitude")} *</Label>
//           <Input
//             type="number"
//             step="0.000001"
//             value={longitude}
//             onChange={(e) => setLongitude(e.target.value)}
//             placeholder="80.271000"
//             required
//           />
//         </div>

//         <div>
//           <Label>{t("common.status")}</Label>
//           <Select
//             value={isActive ? "true" : "false"}
//             onValueChange={(value) => setIsActive(value === "true")}
//           >
//             <SelectTrigger className="input-validate w-full">
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="true">{t("common.active")}</SelectItem>
//               <SelectItem value="false">{t("common.inactive")}</SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="md:col-span-2 flex justify-end gap-3">
//           <Button type="submit" disabled={loading}>
//             {loading
//               ? isEdit
//                 ? t("common.updating")
//                 : t("common.saving")
//               : isEdit
//                 ? t("common.update")
//                 : t("common.save")}
//           </Button>
//           <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH)}>
//             {t("common.cancel")}
//           </Button>
//         </div>
//       </form>
//     </ComponentCard>
//   );
// }



import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

import {
  cityApi,
  collectionPointApi,
  districtApi,
  panchayatApi,
  stateApi,
  wardApi,
  zoneApi,
} from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { getEncryptedRoute } from "@/utils/routeCache";

type SelectOption = { value: string; label: string };
type WithStateIdOption = SelectOption & { stateId: string };
type WithDistrictIdOption = SelectOption & {
  stateId: string;
  districtId: string;
};
type WithCityIdOption = SelectOption & {
  stateId: string;
  districtId: string;
  cityId: string;
};
// Ward carries zoneId so it can be filtered when a zone is selected
type WardOption = WithCityIdOption & { panchayatId: string; zoneId: string };
type UnknownRecord = Record<string, unknown>;

const toRecordList = (value: unknown): UnknownRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is UnknownRecord =>
        !!item && typeof item === "object" && !Array.isArray(item)
    );
  }

  if (value && typeof value === "object") {
    const maybeResults = (value as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults.filter(
        (item): item is UnknownRecord =>
          !!item && typeof item === "object" && !Array.isArray(item)
      );
    }
  }

  return [];
};

const getValueByPath = (record: UnknownRecord, path: string): unknown => {
  const segments = path.split(".");
  let current: unknown = record;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as UnknownRecord)[segment];
  }

  return current;
};

const hasValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};

const pickValue = (record: UnknownRecord, paths: string[]): unknown => {
  for (const path of paths) {
    const value = getValueByPath(record, path);
    if (hasValue(value)) {
      return value;
    }
  }
  return undefined;
};

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

const ensureSelectedOption = (
  options: SelectOption[],
  selectedValue: string
): SelectOption[] => {
  if (!selectedValue) return options;
  if (options.some((option) => option.value === selectedValue)) {
    return options;
  }
  return [...options, { value: selectedValue, label: selectedValue }];
};

const { encMasters, encCollectionPoints } = getEncryptedRoute();
const ENC_LIST_PATH = `/${encMasters}/${encCollectionPoints}`;

export default function CollectionPointForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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

  const extractErr = useCallback(
    (error: unknown): string => {
      const err = error as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;

      if (typeof data === "string") return data;
      if (data && typeof data === "object") {
        return Object.entries(data as Record<string, unknown>)
          .map(([key, value]) =>
            Array.isArray(value)
              ? `${key}: ${value.join(", ")}`
              : `${key}: ${String(value)}`
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

  const [states, setStates] = useState<SelectOption[]>([]);
  const [districts, setDistricts] = useState<WithStateIdOption[]>([]);
  const [cities, setCities] = useState<WithDistrictIdOption[]>([]);
  const [panchayats, setPanchayats] = useState<WithCityIdOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<SelectOption[]>([]);
  const [wards, setWards] = useState<WardOption[]>([]);
  const [loading, setLoading] = useState(false);

  const isPanchayatSelected = Boolean(panchayatId);
  const isZoneSelected = Boolean(zoneId);
  const isWardSelected = Boolean(wardId);

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

  // Ward options filtered by zone when a zone is selected
  const wardOptions = useMemo(() => {
    const filtered = wards
      .filter((option) => {
        if (stateId && option.stateId && option.stateId !== stateId) return false;
        if (districtId && option.districtId && option.districtId !== districtId) return false;
        if (cityId && option.cityId && option.cityId !== cityId) return false;
        if (panchayatId && option.panchayatId && option.panchayatId !== panchayatId) return false;
        // Filter by zone when zone is selected
        if (zoneId && option.zoneId && option.zoneId !== zoneId) return false;
        return true;
      })
      .map((option) => ({ value: option.value, label: option.label }));
    return ensureSelectedOption(filtered, wardId);
  }, [cityId, districtId, panchayatId, stateId, wardId, wards, zoneId]);

  useEffect(() => {
    Promise.all([
      stateApi.list(),
      districtApi.list(),
      cityApi.list(),
      panchayatApi.list(),
      zoneApi.list(),
      wardApi.list(),
    ])
      .then(([stateRes, districtRes, cityRes, panchayatRes, zoneRes, wardRes]) => {
        const stateOptions = toRecordList(stateRes)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: normalizeIdValue(
              pickValue(item, ["unique_id", "state_id", "id", "state.unique_id"])
            ),
            label: toStringOrEmpty(
              pickValue(item, ["state_name", "name", "state", "unique_id"])
            ),
          }))
          .filter((item) => item.value && item.label)
          .sort((a, b) => a.label.localeCompare(b.label));
        setStates(stateOptions);

        const districtOpts = toRecordList(districtRes)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: normalizeIdValue(
              pickValue(item, ["unique_id", "district_id", "id", "district.unique_id"])
            ),
            label: toStringOrEmpty(
              pickValue(item, ["district_name", "name", "district", "unique_id"])
            ),
            stateId: normalizeIdValue(
              pickValue(item, ["state_id", "state", "state.unique_id"])
            ),
          }))
          .filter((item) => item.value && item.label);
        setDistricts(districtOpts);

        const cityOpts = toRecordList(cityRes)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: normalizeIdValue(
              pickValue(item, ["unique_id", "city_id", "id", "city.unique_id"])
            ),
            label: toStringOrEmpty(
              pickValue(item, ["city_name", "name", "city", "unique_id"])
            ),
            stateId: normalizeIdValue(
              pickValue(item, ["state_id", "state", "state.unique_id"])
            ),
            districtId: normalizeIdValue(
              pickValue(item, ["district_id", "district", "district.unique_id"])
            ),
          }))
          .filter((item) => item.value && item.label);
        setCities(cityOpts);

        const panchayatOpts = toRecordList(panchayatRes)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: normalizeIdValue(
              pickValue(item, ["unique_id", "panchayat_id", "id", "panchayat.unique_id"])
            ),
            label: toStringOrEmpty(
              pickValue(item, ["panchayat_name", "name", "panchayat", "unique_id"])
            ),
            stateId: normalizeIdValue(
              pickValue(item, ["state_id", "state", "state.unique_id"])
            ),
            districtId: normalizeIdValue(
              pickValue(item, ["district_id", "district", "district.unique_id"])
            ),
            cityId: normalizeIdValue(
              pickValue(item, ["city_id", "city", "city.unique_id"])
            ),
          }))
          .filter((item) => item.value && item.label);
        setPanchayats(panchayatOpts);

        const zones = toRecordList(zoneRes)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: normalizeIdValue(
              pickValue(item, ["unique_id", "zone_id", "id"])
            ),
            label: toStringOrEmpty(
              pickValue(item, ["zone_name", "name", "unique_id"])
            ),
          }))
          .filter((item) => item.value && item.label);
        setZoneOptions(zones);

        const wardOpts = toRecordList(wardRes)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: normalizeIdValue(
              pickValue(item, ["unique_id", "ward_id", "id", "ward.unique_id"])
            ),
            label: toStringOrEmpty(
              pickValue(item, ["ward_name", "name", "ward", "unique_id"])
            ),
            stateId: normalizeIdValue(
              pickValue(item, ["state_id", "state", "state.unique_id"])
            ),
            districtId: normalizeIdValue(
              pickValue(item, ["district_id", "district", "district.unique_id"])
            ),
            cityId: normalizeIdValue(
              pickValue(item, ["city_id", "city", "city.unique_id"])
            ),
            panchayatId: normalizeIdValue(
              pickValue(item, ["panchayat_id", "panchayat", "panchayat.unique_id"])
            ),
            zoneId: normalizeIdValue(
              pickValue(item, ["zone_id", "zone", "zone.unique_id"])
            ),
          }))
          .filter((item) => item.value && item.label);
        setWards(wardOpts);
      })
      .catch((error) => {
        setStates([]);
        setDistricts([]);
        setCities([]);
        setPanchayats([]);
        setZoneOptions([]);
        setWards([]);
        Swal.fire(t("common.error"), extractErr(error), "error");
      });
  }, [extractErr, t]);

  useEffect(() => {
    if (!isEdit || !id) return;

    collectionPointApi
      .get(id)
      .then((response) => {
        const data = (response ?? {}) as UnknownRecord;

        setStateId(normalizeIdValue(pickValue(data, ["state_id", "state", "state.unique_id"])));
        setDistrictId(
          normalizeIdValue(pickValue(data, ["district_id", "district", "district.unique_id"]))
        );
        setCityId(normalizeIdValue(pickValue(data, ["city_id", "city", "city.unique_id"])));
        setPanchayatId(
          normalizeIdValue(pickValue(data, ["panchayat_id", "panchayat", "panchayat.unique_id"]))
        );
        setZoneId(normalizeIdValue(pickValue(data, ["zone_id", "zone", "zone.unique_id"])));
        setWardId(normalizeIdValue(pickValue(data, ["ward_id", "ward", "ward.unique_id"])));
        setCpName(toStringOrEmpty(pickValue(data, ["cp_name", "collection_point_name"])));
        setLatitude(toStringOrEmpty(pickValue(data, ["latitude"])));
        setLongitude(toStringOrEmpty(pickValue(data, ["longitude"])));
        setIsActive(toBoolean(pickValue(data, ["is_active"]), true));

        applyCompanyProjectFromRecord(data);
      })
      .catch((error) => {
        Swal.fire(t("common.error"), extractErr(error), "error");
      });
  }, [applyCompanyProjectFromRecord, extractErr, id, isEdit, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const missingFields: string[] = [];
    if (!companyUniqueId) missingFields.push(t("admin.nav.company"));
    if (!projectId) missingFields.push(t("admin.nav.project"));
    if (!stateId) missingFields.push(t("common.state"));
    if (!districtId) missingFields.push(t("common.district"));
    if (!cityId) missingFields.push(t("common.city"));
    if (!panchayatId && !wardId) {
      missingFields.push(`${t("admin.nav.panchayat")} / ${t("admin.nav.ward")}`);
    }
    if (!cpName.trim()) {
      missingFields.push(t("common.item_name", { item: t("admin.nav.collection_point") }));
    }
    if (!latitude.trim()) missingFields.push(t("common.latitude"));
    if (!longitude.trim()) missingFields.push(t("common.longitude"));

    const latitudeValid = isValidCoordinate(latitude, -90, 90);
    const longitudeValid = isValidCoordinate(longitude, -180, 180);
    if (latitude.trim() && !latitudeValid) missingFields.push("Valid Latitude");
    if (longitude.trim() && !longitudeValid) missingFields.push("Valid Longitude");

    if (missingFields.length > 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.bin.missing_fields", { fields: missingFields.join(", ") }),
        "warning"
      );
      return;
    }

    setLoading(true);
    const parsedLatitude = Number.parseFloat(latitude);
    const parsedLongitude = Number.parseFloat(longitude);

    const payload = {
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

    try {
      if (isEdit && id) {
        await collectionPointApi.update(id, payload);
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await collectionPointApi.create(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (error) {
      Swal.fire(t("common.save_failed"), extractErr(error), "error");
    } finally {
      setLoading(false);
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

        {/* State */}
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
              <SelectValue
                placeholder={t("common.select_item_placeholder", { item: t("common.state") })}
              />
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

        {/* District */}
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
              <SelectValue
                placeholder={t("common.select_item_placeholder", { item: t("common.district") })}
              />
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

        {/* City */}
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
              <SelectValue
                placeholder={t("common.select_item_placeholder", { item: t("common.city") })}
              />
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

        {/* Panchayat — disabled when zone or ward is selected */}
        <div>
          <Label>{t("admin.nav.panchayat")}</Label>
          <Select
            value={panchayatId || "__none__"}
            onValueChange={(value) => {
              const next = value === "__none__" ? "" : value;
              setPanchayatId(next);
              if (next) setWardId("");
            }}
            disabled={!cityId || isZoneSelected || isWardSelected}
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
              {panchayatOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
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
              // Reset ward when zone changes so it re-filters
              setWardId("");
            }}
            disabled={!cityId || isPanchayatSelected}
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
              {zoneOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ward — disabled when panchayat is selected; filtered by zone when zone is selected */}
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
              <SelectValue
                placeholder={t("common.select_item_placeholder", {
                  item: t("admin.nav.ward"),
                })}
              />
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

        {/* Collection Point Name */}
        <div>
          <Label>
            {t("common.item_name", { item: t("admin.nav.collection_point") })} *
          </Label>
          <Input
            value={cpName}
            onChange={(e) => setCpName(e.target.value)}
            placeholder="CP 1"
            required
          />
        </div>

        {/* Latitude */}
        <div>
          <Label>{t("common.latitude")} *</Label>
          <Input
            type="number"
            step="0.000001"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="13.083000"
            required
          />
        </div>

        {/* Longitude */}
        <div>
          <Label>{t("common.longitude")} *</Label>
          <Input
            type="number"
            step="0.000001"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="80.271000"
            required
          />
        </div>

        {/* Status */}
        <div>
          <Label>{t("common.status")}</Label>
          <Select
            value={isActive ? "true" : "false"}
            onValueChange={(value) => setIsActive(value === "true")}
          >
            <SelectTrigger className="input-validate w-full">
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
          <Button type="button" variant="destructive" onClick={() => navigate(ENC_LIST_PATH)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}