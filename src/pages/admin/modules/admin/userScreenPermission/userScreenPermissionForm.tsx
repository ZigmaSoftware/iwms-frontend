import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

import { encryptSegment } from "@/utils/routeCrypto";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import {
  useMainScreensQuery,
  useStaffUserTypesQuery,
  useSyncUserScreenPermissionMutation,
  useUserScreenActionsQuery,
  useUserScreenPermissionFormattedQuery,
  useUserScreensQuery,
} from "@/tanstack/admin";

const ENC_LIST_PATH = `/${encryptSegment("admins")}/${encryptSegment(
  "userscreenpermissions"
)}`;

/* -----------------------------------------------------------
   TYPES
----------------------------------------------------------- */

type StaffUserType = {
  unique_id?: unknown;
  name?: unknown;
  usertype_id?: unknown;
  usertype?: { unique_id?: unknown };
  [key: string]: unknown;
};

type MainScreen = {
  unique_id?: unknown;
  mainscreen_name?: unknown;
  [key: string]: unknown;
};

type UserScreenAction = {
  unique_id?: unknown;
  action_name?: unknown;
  [key: string]: unknown;
};

type Option = {
  value: string;
  label: string;
  userTypeId?: string;
};

type PermissionScreen = {
  userscreen_id: string;
  userscreen_name?: string;
  actions: string[];
};

type PermissionResponse = {
  screens: PermissionScreen[];
  description?: string;
};

type ScreenMatrixRow = {
  userscreen_id: string;
  userscreen_name: string;
  actions: string[];
};

type ApiUserScreen = {
  unique_id?: string;
  userscreen_name?: string;
  mainscreen_id?: string;
  order_no?: number;
  is_active?: boolean;
  is_deleted?: boolean;
  [key: string]: unknown;
};

const toId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const toOrder = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const uniqueIds = (values: unknown[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    const id = toId(value);
    if (!id || seen.has(id)) return;
    seen.add(id);
    normalized.push(id);
  });

  return normalized;
};

const buildByStaffFormatPath = (
  companyId: string,
  staffTypeId: string,
  mainScreenId: string
) =>
  `by-staff-format/?company_id=${encodeURIComponent(
    companyId
  )}&staffusertype_id=${encodeURIComponent(
    staffTypeId
  )}&mainscreen_id=${encodeURIComponent(mainScreenId)}`;

const firstErrorMessage = (value: unknown): string | undefined => {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
};

/* -----------------------------------------------------------
   HELPER — extract HTTP status from axios-style errors
----------------------------------------------------------- */
const getErrorStatus = (err: unknown): number | null => {
  return (
    (err as { response?: { status?: number } })?.response?.status ?? null
  );
};

export default function UserScreenPermissionForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();

  const staffTypeId = params.id;
  const companyIdFromQuery = searchParams.get("company_unique_id") ?? "";
  const mainScreenIdFromQuery = searchParams.get("mainscreen_id") ?? "";

  const isEdit = Boolean(staffTypeId);

  const {
    companyUniqueId,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit });

  const [staffUserTypeId, setStaffUserTypeId] = useState("");
  const [mainScreenId, setMainScreenId] = useState("");
  const [description, setDescription] = useState("");
  const [userTypeId, setUserTypeId] = useState("");

  const [staffUserTypes, setStaffUserTypes] = useState<Option[]>([]);
  const [mainScreens, setMainScreens] = useState<Option[]>([]);
  const [allUserScreens, setAllUserScreens] = useState<ApiUserScreen[]>([]);
  const [actions, setActions] = useState<Option[]>([]);

  const [screenMatrix, setScreenMatrix] = useState<ScreenMatrixRow[]>([]);

  const [loading, setLoading] = useState(false);
  const staffUserTypesQuery = useStaffUserTypesQuery();
  const mainScreensQuery = useMainScreensQuery();
  const userScreensQuery = useUserScreensQuery();
  const userScreenActionsQuery = useUserScreenActionsQuery();
  const formattedPermissionQuery = useUserScreenPermissionFormattedQuery(
    companyUniqueId,
    staffUserTypeId,
    mainScreenId
  );
  const syncPermissionMutation = useSyncUserScreenPermissionMutation();
  const loadingData =
    staffUserTypesQuery.isPending ||
    mainScreensQuery.isPending ||
    userScreensQuery.isPending ||
    userScreenActionsQuery.isPending;

  const isEditContextLocked =
    isEdit && Boolean(companyIdFromQuery) && Boolean(mainScreenIdFromQuery);
  const isCompanyLocked =
    Boolean(loggedInCompanyUniqueId) ||
    Boolean(companyIdFromQuery) ||
    isEditContextLocked;
  const selectedCompanyLabel =
    companies.find((company) => company.value === companyUniqueId)?.label ||
    companyUniqueId;
  const companyOptions =
    isCompanyLocked && companyUniqueId
      ? [{ value: companyUniqueId, label: selectedCompanyLabel }]
      : companies;

  /* -----------------------------------------------------------
     LOAD DROPDOWNS
  ----------------------------------------------------------- */

  useEffect(() => {
    setStaffUserTypes(
      (staffUserTypesQuery.data ?? []).map((x: StaffUserType) => ({
            value: toId(x.unique_id),
            label: String(x.name ?? ""),
            userTypeId: toId(x.usertype_id ?? x.usertype?.unique_id),
      }))
    );

    setMainScreens(
      (mainScreensQuery.data ?? []).map((x: MainScreen) => ({
            value: toId(x.unique_id),
            label: String(x.mainscreen_name ?? ""),
      }))
    );

    setAllUserScreens(
      Array.isArray(userScreensQuery.data)
        ? (userScreensQuery.data as ApiUserScreen[])
        : []
    );

    setActions(
      (userScreenActionsQuery.data ?? []).map((x: UserScreenAction) => ({
            value: toId(x.unique_id),
            label: String(x.action_name ?? ""),
      }))
    );
  }, [
    mainScreensQuery.data,
    staffUserTypesQuery.data,
    userScreenActionsQuery.data,
    userScreensQuery.data,
  ]);

  useEffect(() => {
    const error =
      staffUserTypesQuery.error ??
      mainScreensQuery.error ??
      userScreensQuery.error ??
      userScreenActionsQuery.error;

    if (!error) return;

    if (getErrorStatus(error) === 403) {
          Swal.fire({
            icon: "error",
            title: t("common.access_denied"),
            text: t("common.no_permission"),
            confirmButtonText: t("common.ok"),
          }).then(() => navigate(ENC_LIST_PATH));
      return;
    }

    Swal.fire(t("common.error"), t("common.load_failed"), "error");
  }, [
    mainScreensQuery.error,
    navigate,
    staffUserTypesQuery.error,
    t,
    userScreenActionsQuery.error,
    userScreensQuery.error,
  ]);

  /* -----------------------------------------------------------
     PREFILL COMPANY
  ----------------------------------------------------------- */

  useEffect(() => {
    if (!companyIdFromQuery || loggedInCompanyUniqueId) return;
    if (companyUniqueId === companyIdFromQuery) return;
    onCompanyChange(companyIdFromQuery);
  }, [
    companyIdFromQuery,
    companyUniqueId,
    loggedInCompanyUniqueId,
    onCompanyChange,
  ]);

  /* -----------------------------------------------------------
     EDIT MODE
  ----------------------------------------------------------- */

  useEffect(() => {
    if (!isEdit || !staffTypeId) return;
    setStaffUserTypeId(staffTypeId);
    setMainScreenId(mainScreenIdFromQuery);
    setScreenMatrix([]);
  }, [isEdit, staffTypeId, mainScreenIdFromQuery]);

  /* -----------------------------------------------------------
     LOAD PERMISSIONS
  ----------------------------------------------------------- */

  useEffect(() => {
    if (!companyUniqueId || !staffUserTypeId || !mainScreenId) return;
    if (!formattedPermissionQuery.data) return;

    if (formattedPermissionQuery.isError) {
      const err = formattedPermissionQuery.error;
      if (getErrorStatus(err) === 403) {
        Swal.fire({
          icon: "error",
          title: t("common.access_denied"),
          text: t("common.no_permission"),
          confirmButtonText: t("common.ok"),
        }).then(() => navigate(ENC_LIST_PATH));
        return;
      }
    }

    try {
        const formatted: PermissionResponse = formattedPermissionQuery.data ?? {
          screens: [],
          description: "",
        };

        const actionsByScreen = new Map<string, PermissionScreen>();
        formatted.screens.forEach((scr: PermissionScreen) => {
          const screenId = toId(scr.userscreen_id);
          if (!screenId) return;

          actionsByScreen.set(screenId, {
            userscreen_id: screenId,
            userscreen_name: String(scr.userscreen_name ?? "").trim(),
            actions: uniqueIds(scr.actions ?? []),
          });
        });

        // const selectedMainScreens = allUserScreens
        //   .filter((screen) => !screen.is_deleted)
        //   .filter((screen) => toId(screen.mainscreen_id) === mainScreenId)
        //   .sort((a, b) => toOrder(a.order_no) - toOrder(b.order_no));
        const selectedMainScreens = allUserScreens
        .filter((screen) => !screen.is_deleted)
        .filter(
          (screen) =>
            toId(screen.mainscreen_id) === mainScreenId ||
            toId((screen as any).mainscreen?.unique_id) === mainScreenId
        )

        const matrix: ScreenMatrixRow[] = [];

        selectedMainScreens.forEach((screen) => {
          const screenId = toId(screen.unique_id);
          if (!screenId) return;

          const existing = actionsByScreen.get(screenId);
          matrix.push({
            userscreen_id: screenId,
            userscreen_name: String(
              screen.userscreen_name ?? existing?.userscreen_name ?? screenId
            ).trim(),
            actions: uniqueIds(existing?.actions ?? []),
          });
        });

        actionsByScreen.forEach((existing, screenId) => {
          if (matrix.some((row) => row.userscreen_id === screenId)) return;

          matrix.push({
            userscreen_id: screenId,
            userscreen_name: String(existing.userscreen_name ?? screenId).trim(),
            actions: uniqueIds(existing.actions ?? []),
          });
        });

        setDescription(formatted.description || "");
        setScreenMatrix(matrix);
      } catch (err) {
        console.error("Permission Load Failed:", err);

        // ✅ Access denied on outer try
        if (getErrorStatus(err) === 403) {
          Swal.fire({
            icon: "error",
            title: t("common.access_denied"),
            text: t("common.no_permission"),
            confirmButtonText: t("common.ok"),
          }).then(() => navigate(ENC_LIST_PATH));
          return;
        }

        Swal.fire(
          t("common.error"),
          t("admin.user_screen_permission.load_matrix_failed"),
          "error"
        );
      }
  }, [
    allUserScreens,
    companyUniqueId,
    formattedPermissionQuery.data,
    formattedPermissionQuery.error,
    formattedPermissionQuery.isError,
    formattedPermissionQuery.isPending,
    mainScreenId,
    navigate,
    staffUserTypeId,
    t,
  ]);

  /* -----------------------------------------------------------
     AUTO USER TYPE
  ----------------------------------------------------------- */

  useEffect(() => {
    if (!staffUserTypeId || staffUserTypes.length === 0) return;
    const sut = staffUserTypes.find((s) => s.value === staffUserTypeId);
    setUserTypeId(sut?.userTypeId || "");
  }, [staffUserTypeId, staffUserTypes]);

  /* -----------------------------------------------------------
     TOGGLE ACTIONS
  ----------------------------------------------------------- */

  const handleActionToggle = (
    screenId: string,
    actionId: string,
    checked: boolean
  ) => {
    setScreenMatrix((prev) =>
      prev.map((row) =>
        row.userscreen_id === screenId
          ? {
              ...row,
              actions: checked
                ? uniqueIds([...row.actions, actionId])
                : row.actions.filter((a) => a !== actionId),
            }
          : row
      )
    );
  };

  const handleSelectAll = (screenId: string, checked: boolean) => {
    const allActions = actions.map((a) => a.value);
    setScreenMatrix((prev) =>
      prev.map((row) =>
        row.userscreen_id === screenId
          ? { ...row, actions: checked ? allActions : [] }
          : row
      )
    );
  };

  const handleMainScreenChange = (nextMainScreenId: string) => {
    if (nextMainScreenId === mainScreenId) return;
    setDescription("");
    setScreenMatrix([]);
    setMainScreenId(nextMainScreenId);
  };

  /* -----------------------------------------------------------
     SUBMIT
  ----------------------------------------------------------- */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!companyUniqueId || !staffUserTypeId || !mainScreenId || !userTypeId) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    if (screenMatrix.length === 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.user_screen_permission.no_screens"),
        "warning"
      );
      return;
    }

    const validActionIds = new Set(
      actions.map((item) => toId(item.value)).filter(Boolean)
    );

    const normalizedScreens = screenMatrix
      .map((screen) => ({
        userscreen_id: toId(screen.userscreen_id),
        actions: uniqueIds(screen.actions).filter(
          (actionId) =>
            validActionIds.size === 0 || validActionIds.has(actionId)
        ),
      }))
      .filter((screen) => Boolean(screen.userscreen_id));

    const payload = {
      company_id: companyUniqueId,
      staffusertype_id: staffUserTypeId,
      mainscreen_id: mainScreenId,
      description: description.trim(),
      usertype_id: userTypeId,
      screens: normalizedScreens,
    };

    setLoading(true);

    try {
      if (isEdit) {
        await syncPermissionMutation.mutateAsync({ staffTypeId: staffUserTypeId, payload, isEdit: true });
        Swal.fire(t("common.success"), t("common.updated_success"), "success");
      } else {
        await syncPermissionMutation.mutateAsync({ staffTypeId: staffUserTypeId, payload, isEdit: false });
        Swal.fire(t("common.success"), t("common.added_success"), "success");
      }

      navigate(ENC_LIST_PATH);
    } catch (err: unknown) {
      // ✅ Access denied on save/update
      if (getErrorStatus(err) === 403) {
        Swal.fire({
          icon: "error",
          title: t("common.access_denied"),
          text: t("common.no_permission"),
          confirmButtonText: t("common.ok"),
        });
        return;
      }

      const errorData =
        (err as { response?: { data?: Record<string, unknown> } })?.response
          ?.data ?? {};

      Swal.fire(
        t("common.save_failed"),
        firstErrorMessage(errorData.detail) ||
          firstErrorMessage(errorData.company_id) ||
          firstErrorMessage(errorData.staffusertype_id) ||
          firstErrorMessage(errorData.mainscreen_id) ||
          firstErrorMessage(errorData.screens) ||
          t("common.save_failed_desc"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */

  if (loadingData) {
    return (
      <ComponentCard title={t("common.loading")}>
        <div className="flex justify-center items-center py-12 text-gray-500">
          {t("admin.user_screen_permission.loading_message")}
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard
      title={
        isEdit
          ? t("common.edit_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })
          : t("common.add_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <Label>{t("admin.nav.company")} *</Label>
            <Select
              value={companyUniqueId}
              onValueChange={(value) => {
                onCompanyChange(value);
                setMainScreenId("");
                setScreenMatrix([]);
                setDescription("");
                if (!isEdit) setStaffUserTypeId("");
              }}
              disabled={
                isCompanyLocked ||
                (!isSuperAdmin && !loggedInCompanyUniqueId) ||
                companyOptions.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.company"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {companyOptions.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("admin.nav.staff_user_type")} *</Label>
            <Select
              value={staffUserTypeId}
              onValueChange={setStaffUserTypeId}
              disabled={isEdit || !companyUniqueId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.staff_user_type"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {staffUserTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>{t("admin.nav.main_screen")} *</Label>
            <Select
              value={mainScreenId}
              onValueChange={handleMainScreenChange}
              disabled={!companyUniqueId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.main_screen"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                {mainScreens.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* PERMISSION TABLE */}
        {screenMatrix.length > 0 && (
          <div className="mt-6 border rounded-lg overflow-x-auto bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("common.s_no")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    {t("admin.nav.user_screen")}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">
                    {t("admin.user_screen_permission.all")}
                  </th>
                  {actions.map((act) => (
                    <th
                      key={act.value}
                      className="px-4 py-3 text-center text-sm font-semibold"
                    >
                      {act.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {screenMatrix.map((row, i) => {
                  const allChecked = row.actions.length === actions.length;
                  return (
                    <tr
                      key={row.userscreen_id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {row.userscreen_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) =>
                            handleSelectAll(row.userscreen_id, e.target.checked)
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      {actions.map((act) => (
                        <td key={act.value} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.actions.includes(act.value)}
                            onChange={(e) =>
                              handleActionToggle(
                                row.userscreen_id,
                                act.value,
                                e.target.checked
                              )
                            }
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {screenMatrix.length === 0 && mainScreenId && (
          <div className="mt-6 p-8 border rounded-lg bg-gray-50 text-center text-gray-500">
            {t("admin.user_screen_permission.no_screens")}
          </div>
        )}

        {mainScreenId && (
          <div className="mt-6">
            <Label>{t("common.description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("common.description_optional")}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="submit"
            disabled={
              loading || !companyUniqueId || !staffUserTypeId || !mainScreenId
            }
          >
            {loading
              ? t("common.saving")
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
