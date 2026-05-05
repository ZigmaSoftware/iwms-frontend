// import { useEffect, useMemo, useState, type FormEvent } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import Swal from "sweetalert2";

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
// import { useTranslation } from "react-i18next";

// import { encryptSegment } from "@/utils/routeCrypto";


// /* ------------------------------
//     ROUTES
// ------------------------------ */
// const encAdmins = encryptSegment("admins");
// const encMainScreens = encryptSegment("mainscreens");
// const ENC_LIST_PATH = `/${encAdmins}/${encMainScreens}`;

// /* ------------------------------
//     APIs
// ------------------------------ */

// import {
//   mainScreenTypeApi,
//   mainScreenApi
// } from "@/helpers/admin";

// type MainScreenTypeOption = {
//   value: string;
//   label: string;
//   companyId: string;
//   projectId: string;
//   companyName: string;
//   projectName: string;
// };

// const toText = (value: unknown): string => {
//   if (value === null || value === undefined) return "";
//   return String(value).trim();
// };

// const firstErrorMessage = (value: unknown): string | undefined => {
//   if (Array.isArray(value) && typeof value[0] === "string") {
//     return value[0];
//   }

//   if (typeof value === "string") {
//     return value;
//   }

//   return undefined;
// };

// /* ==========================================================
//       COMPONENT
// ========================================================== */
// export default function MainScreenForm() {
//   const { t } = useTranslation();
//   /* FORM FIELDS */
//   const [mainscreenName, setMainScreenName] = useState("");
//   const [iconName, setIconName] = useState("");
//   const [orderNo, setOrderNo] = useState<number | string>("");
//   const [description, setDescription] = useState("");
//   const [mainscreenTypeId, setMainScreenTypeId] = useState<string>("");
//   const [fallbackCompanyId, setFallbackCompanyId] = useState("");
//   const [fallbackProjectId, setFallbackProjectId] = useState("");
//   const [fallbackCompanyName, setFallbackCompanyName] = useState("");
//   const [fallbackProjectName, setFallbackProjectName] = useState("");

//   /* DROPDOWN DATA */
//   const [mainScreenTypes, setMainScreenTypes] = useState<
//     MainScreenTypeOption[]
//   >([]);

//   /* STATE */
//   const [isActive, setIsActive] = useState(true);
//   const [loading, setLoading] = useState(false);

//   const { id } = useParams<{ id: string }>();
//   const isEdit = Boolean(id);

//   const navigate = useNavigate();
//   const selectedMainScreenType = useMemo(
//     () => mainScreenTypes.find((x) => x.value === mainscreenTypeId),
//     [mainScreenTypes, mainscreenTypeId]
//   );
//   const resolvedCompanyId = selectedMainScreenType
//     ? selectedMainScreenType.companyId
//     : fallbackCompanyId;
//   const resolvedProjectId = selectedMainScreenType
//     ? selectedMainScreenType.projectId
//     : fallbackProjectId;
//   const resolvedCompanyName = selectedMainScreenType
//     ? selectedMainScreenType.companyName
//     : fallbackCompanyName;
//   const resolvedProjectName = selectedMainScreenType
//     ? selectedMainScreenType.projectName
//     : fallbackProjectName;

//   /* ==========================================================
//       LOAD MAINSCREEN TYPES
//   ========================================================== */
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await mainScreenTypeApi.list();
//         const mapped = res
//           .filter((x: Record<string, unknown>) => Boolean(x.is_active))
//           .map((x: Record<string, unknown>) => ({
//             value: toText(x.unique_id),
//             label: toText(x.type_name),
//             companyId: toText(x.company_id),
//             projectId: toText(x.project_id),
//             companyName: toText(x.company_name),
//             projectName: toText(x.project_name),
//           }));
//         setMainScreenTypes(mapped);
//       } catch {
//         Swal.fire(t("common.error"), t("common.load_failed"), "error");
//       }
//     })();
//   }, [t]);

//   /* ==========================================================
//       EDIT MODE — LOAD RECORD
//   ========================================================== */
//   useEffect(() => {
//     if (!isEdit || !id) return;

//     (async () => {
//       try {
//         const data = await mainScreenApi.get(id);

//         setMainScreenName(data.mainscreen_name ?? "");
//         setIconName(data.icon_name ?? "");
//         setOrderNo(data.order_no ?? "");
//         setDescription(data.description ?? "");
//         setMainScreenTypeId(data.mainscreentype_id ?? "");
//         setFallbackCompanyId(toText(data.company_id));
//         setFallbackProjectId(toText(data.project_id));
//         setFallbackCompanyName(toText(data.company_name));
//         setFallbackProjectName(toText(data.project_name));
//         setIsActive(Boolean(data.is_active));
//       } catch {
//         Swal.fire(t("common.error"), t("common.load_failed"), "error");
//       }
//     })();
//   }, [isEdit, id, t]);

//   /* ==========================================================
//       SUBMIT
//   ========================================================== */
//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();

//     if (!mainscreenName.trim() || !mainscreenTypeId) {
//       Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
//       return;
//     }

//     if (!resolvedCompanyId || !resolvedProjectId) {
//       Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
//       return;
//     }

//     setLoading(true);

//     try {
//       const payload = {
//         mainscreen_name: mainscreenName.trim(),
//         icon_name: iconName.trim(),
//         order_no: Number(orderNo) || 0,
//         description: description.trim(),
//         mainscreentype_id: mainscreenTypeId,
//         company_id: resolvedCompanyId,
//         project_id: resolvedProjectId,
//         is_active: isActive,
//       };

//       if (isEdit && id) {
//         await mainScreenApi.update(id, payload);
//         Swal.fire(t("common.success"), t("common.updated_success"), "success");
//       } else {
//         await mainScreenApi.create(payload);
//         Swal.fire(t("common.success"), t("common.added_success"), "success");
//       }

//       navigate(ENC_LIST_PATH);
//     } catch (err: unknown) {
//       const errorData =
//         (err as { response?: { data?: Record<string, unknown> } })?.response
//           ?.data ?? {};

//       Swal.fire(
//         t("common.save_failed"),
//         firstErrorMessage(errorData.detail) ||
//           firstErrorMessage(errorData.company_id) ||
//           firstErrorMessage(errorData.project_id) ||
//           t("common.save_failed_desc"),
//         "error"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ==========================================================
//       JSX
//   ========================================================== */
//   return (
//     <ComponentCard
//       title={
//         isEdit
//           ? t("common.edit_item", { item: t("admin.nav.main_screen") })
//           : t("common.add_item", { item: t("admin.nav.main_screen") })
//       }
//     >
//       <form onSubmit={handleSubmit} noValidate>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {/* Company (from MainScreen Type) */}
//           <div>
//             <Label>{t("admin.nav.company")}</Label>
//             <Input
//               value={resolvedCompanyName}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("admin.nav.main_screen_type"),
//               })}
//               className="input-validate w-full"
//               readOnly
//               disabled
//             />
//           </div>

//           {/* Project (from MainScreen Type) */}
//           <div>
//             <Label>{t("admin.nav.project")}</Label>
//             <Input
//               value={resolvedProjectName}
//               placeholder={t("common.select_item_placeholder", {
//                 item: t("admin.nav.main_screen_type"),
//               })}
//               className="input-validate w-full"
//               readOnly
//               disabled
//             />
//           </div>
          
//           {/* MainScreen Type */}
//           <div>
//             <Label>{t("admin.nav.main_screen_type")} *</Label>
//             <Select
//               value={mainscreenTypeId}
//               onValueChange={(v) => setMainScreenTypeId(v)}
//             >
//               <SelectTrigger className="input-validate w-full">
//                 <SelectValue
//                   placeholder={t("common.select_item_placeholder", {
//                     item: t("admin.nav.main_screen_type"),
//                   })}
//                 />
//               </SelectTrigger>
//               <SelectContent>
//                 {mainScreenTypes.length === 0 ? (
//                   <div className="px-3 py-2 text-sm text-muted-foreground">
//                     {t("common.no_items_found", {
//                       item: t("admin.nav.main_screen_type"),
//                     })}
//                   </div>
//                 ) : (
//                   mainScreenTypes.map((opt) => (
//                     <SelectItem key={opt.value} value={opt.value}>
//                       {opt.label}
//                     </SelectItem>
//                   ))
//                 )}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Name */}
//           <div>
//             <Label>
//               {t("common.item_name", {
//                 item: t("admin.nav.main_screen"),
//               })}{" "}
//               *
//             </Label>
//             <Input
//               value={mainscreenName}
//               onChange={(e) => setMainScreenName(e.target.value)}
//               placeholder={t("common.enter_item_name", {
//                 item: t("admin.nav.main_screen"),
//               })}
//               className="input-validate w-full"
//               required
//             />
//           </div>

//           {/* Icon Name */}
//           <div>
//             <Label>{t("common.icon_name")}</Label>
//             <Input
//               value={iconName}
//               onChange={(e) => setIconName(e.target.value)}
//               placeholder={t("common.enter_icon_name")}
//               className="input-validate w-full"
//             />
//           </div>

//           {/* Order No */}
//           <div>
//             <Label>{t("common.order_no")}</Label>
//             <Input
//               type="number"
//               value={orderNo}
//               onChange={(e) => setOrderNo(e.target.value)}
//               placeholder={t("common.order_no_placeholder")}
//               className="input-validate w-full"
//             />
//           </div>

//           {/* Description */}
//           <div className="md:col-span-2">
//             <Label>{t("common.description")}</Label>
//             <Input
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               placeholder={t("common.description_optional")}
//               className="input-validate w-full"
//             />
//           </div>

//           {/* Status */}
//           <div>
//             <Label>{t("common.status")} *</Label>
//             <Select
//               value={isActive ? "true" : "false"}
//               onValueChange={(v) => setIsActive(v === "true")}
//             >
//               <SelectTrigger className="input-validate w-full">
//                 <SelectValue placeholder={t("common.select_status")} />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="true">{t("common.active")}</SelectItem>
//                 <SelectItem value="false">{t("common.inactive")}</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {/* Actions */}
//         <div className="flex justify-end gap-3 mt-6">
//           <Button type="submit" disabled={loading}>
//             {loading
//               ? isEdit
//                 ? t("common.updating")
//                 : t("common.saving")
//               : isEdit
//               ? t("common.update")
//               : t("common.save")}
//           </Button>

//           <Button
//             type="button"
//             variant="destructive"
//             onClick={() => navigate(ENC_LIST_PATH)}
//           >
//             {t("common.cancel")}
//           </Button>
//         </div>
//       </form>
//     </ComponentCard>
//   );
// }



import { useEffect, useMemo, useState, type FormEvent } from "react";
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

import { encryptSegment } from "@/utils/routeCrypto";

/* ------------------------------
    ROUTES
------------------------------ */
const encAdmins = encryptSegment("admins");
const encMainScreens = encryptSegment("mainscreens");
const ENC_LIST_PATH = `/${encAdmins}/${encMainScreens}`;

/* ------------------------------
    APIs
------------------------------ */
import {
  useCreateMainScreenMutation,
  useMainScreenQuery,
  useMainScreenTypesQuery,
  useUpdateMainScreenMutation,
} from "@/tanstack/admin";

type MainScreenTypeOption = {
  value: string;
  label: string;
  companyId: string;
  projectId: string;
  companyName: string;
  projectName: string;
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const firstErrorMessage = (value: unknown): string | undefined => {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
};

/* ==========================================================
      COMPONENT
========================================================== */
export default function MainScreenForm() {
  const { t } = useTranslation();

  /* FORM FIELDS */
  const [mainscreenName, setMainScreenName] = useState("");
  const [orderNo, setOrderNo] = useState<number | string>("");
  const [description, setDescription] = useState("");
  const [mainscreenTypeId, setMainScreenTypeId] = useState<string>("");

  // ✅ Fallback company/project from the loaded record (may be null from API)
  const [fallbackCompanyId, setFallbackCompanyId] = useState("");
  const [fallbackProjectId, setFallbackProjectId] = useState("");
  const [fallbackCompanyName, setFallbackCompanyName] = useState("");
  const [fallbackProjectName, setFallbackProjectName] = useState("");

  const [isActive, setIsActive] = useState(true);

  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const mainScreenTypesQuery = useMainScreenTypesQuery();
  const mainScreenQuery = useMainScreenQuery(isEdit ? id : null);
  const createMutation = useCreateMainScreenMutation();
  const updateMutation = useUpdateMainScreenMutation();
  const loading = createMutation.isPending || updateMutation.isPending;
  const mainScreenTypes = useMemo<MainScreenTypeOption[]>(
    () =>
      (mainScreenTypesQuery.data ?? [])
        .filter((x) => Boolean(x.is_active))
        .map((x) => ({
          value: toText(x.unique_id),
          label: toText(x.type_name),
          companyId: toText(x.company_id),
          projectId: toText(x.project_id),
          companyName: toText(x.company_name),
          projectName: toText(x.project_name),
        })),
    [mainScreenTypesQuery.data]
  );

  // ✅ Prefer values from the selected MainScreen Type; fall back to whatever
  //    came from the record itself (which may be null/empty).
  const selectedMainScreenType = useMemo(
    () => mainScreenTypes.find((x) => x.value === mainscreenTypeId),
    [mainScreenTypes, mainscreenTypeId]
  );

  const resolvedCompanyId = selectedMainScreenType?.companyId || fallbackCompanyId;
  const resolvedProjectId = selectedMainScreenType?.projectId || fallbackProjectId;
  const resolvedCompanyName = selectedMainScreenType?.companyName || fallbackCompanyName;
  const resolvedProjectName = selectedMainScreenType?.projectName || fallbackProjectName;

  /* ==========================================================
      EDIT MODE — LOAD RECORD
      Wait for types to load first so selectedMainScreenType resolves correctly.
  ========================================================== */
  useEffect(() => {
    if (!mainScreenQuery.data) return;
    const data = mainScreenQuery.data;
    setMainScreenName(data.mainscreen_name ?? "");
    setOrderNo(data.order_no ?? "");
    setDescription(data.description ?? "");
    setMainScreenTypeId(data.mainscreentype_id ?? "");
    setFallbackCompanyId(toText(data.company_id));
    setFallbackProjectId(toText(data.project_id));
    setFallbackCompanyName(toText(data.company_name));
    setFallbackProjectName(toText(data.project_name));
    setIsActive(Boolean(data.is_active));
  }, [mainScreenQuery.data]);

  useEffect(() => {
    if (!mainScreenQuery.isError && !mainScreenTypesQuery.isError) return;
    Swal.fire(t("common.error"), t("common.load_failed"), "error");
  }, [mainScreenQuery.isError, mainScreenTypesQuery.isError, t]);

  /* ==========================================================
      SUBMIT
  ========================================================== */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // ✅ Only validate fields that are truly required
    if (!mainscreenName.trim() || !mainscreenTypeId) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    // ✅ REMOVED the strict company/project check — they can be null in the API
    //    and are derived from the MainScreenType, not entered by the user directly.

    try {
      const payload = {
        mainscreen_name: mainscreenName.trim(),
        description: description.trim(),
        mainscreentype_id: mainscreenTypeId,
        // ✅ Send resolved values; send null if still empty (API accepts null)
        company_id: resolvedCompanyId || null,
        project_id: resolvedProjectId || null,
        is_active: isActive,
      };

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload: {
          ...payload,
          order_no: Number(orderNo) || 0,
        }});
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await createMutation.mutateAsync(payload);
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (err: unknown) {
      const errorData =
        (err as { response?: { data?: Record<string, unknown> } })?.response
          ?.data ?? {};

      Swal.fire(
        t("common.save_failed"),
        firstErrorMessage(errorData.detail) ||
          firstErrorMessage(errorData.company_id) ||
          firstErrorMessage(errorData.project_id) ||
          t("common.save_failed_desc"),
        "error"
      );
    }
  };

  /* ==========================================================
      JSX
  ========================================================== */
  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", { item: t("admin.nav.main_screen") })
          : t("common.add_item", { item: t("admin.nav.main_screen") })
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company (resolved from MainScreen Type) */}
          <div>
            <Label>{t("admin.nav.company")}</Label>
            <Input
              value={resolvedCompanyName}
              placeholder={t("common.select_item_placeholder", {
                item: t("admin.nav.main_screen_type"),
              })}
              className="input-validate w-full"
              readOnly
              disabled
            />
          </div>

          {/* Project (resolved from MainScreen Type) */}
          <div>
            <Label>{t("admin.nav.project")}</Label>
            <Input
              value={resolvedProjectName}
              placeholder={t("common.select_item_placeholder", {
                item: t("admin.nav.main_screen_type"),
              })}
              className="input-validate w-full"
              readOnly
              disabled
            />
          </div>

          {/* MainScreen Type */}
          <div>
            <Label>{t("admin.nav.main_screen_type")} *</Label>
            <Select
              value={mainscreenTypeId}
              onValueChange={(v) => setMainScreenTypeId(v)}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.main_screen_type"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {mainScreenTypes.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {!mainScreenTypesQuery.isPending
                      ? t("common.no_items_found", {
                          item: t("admin.nav.main_screen_type"),
                        })
                      : t("common.loading")}
                  </div>
                ) : (
                  mainScreenTypes.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div>
            <Label>
              {t("common.item_name", {
                item: t("admin.nav.main_screen"),
              })}{" "}
              *
            </Label>
            <Input
              value={mainscreenName}
              onChange={(e) => setMainScreenName(e.target.value)}
              placeholder={t("common.enter_item_name", {
                item: t("admin.nav.main_screen"),
              })}
              className="input-validate w-full"
              required
            />
          </div>

          {/* Icon Name */}
          {/* Icon Name removed: backend-controlled */}

          {/* Order No (backend-controlled) */}
          {isEdit ? (
            <div>
              <Label>{t("common.order_no")}</Label>
              <Input
                type="number"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder={t("common.order_no_placeholder")}
                className="input-validate w-full"
              />
            </div>
          ) : null}

          {/* Description */}
          <div className="md:col-span-2">
            <Label>{t("common.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("common.description_optional")}
              className="input-validate w-full"
            />
          </div>

          {/* Status */}
          <div>
            <Label>{t("common.status")} *</Label>
            <Select
              value={isActive ? "true" : "false"}
              onValueChange={(v) => setIsActive(v === "true")}
            >
              <SelectTrigger className="input-validate w-full">
                <SelectValue placeholder={t("common.select_status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading
              ? isEdit
                ? t("common.updating")
                : t("common.saving")
              : isEdit
              ? t("common.update")
              : t("common.save")}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => navigate(ENC_LIST_PATH)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </ComponentCard>
  );
}
