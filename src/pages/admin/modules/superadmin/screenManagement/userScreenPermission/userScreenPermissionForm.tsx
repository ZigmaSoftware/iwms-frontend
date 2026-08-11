import type {
  ApiUserScreen,
  MainScreen,
  Option,
  PermissionType,
  UserScreenAction,
  UserScreenColumnRecord,
} from "./types";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Swal from "@/lib/notify";

import ComponentCard from "@/components/common/ComponentCard";
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

import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import {
  createColumnPermission,
  updateColumnPermission,
} from "@/helpers/admin/columnPermissionService";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { adminApi } from "@/helpers/admin/registry";
import PermissionSection, { type PermissionSectionData } from "./PermissionSection";
import { userScreenPermissionSchema } from "@/schemas/superadmin/screenManagement/userScreenPermission.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

const { encAdmins, encUserScreenPermission } = getEncryptedRoute();
const { listPath: ENC_LIST_PATH } = createCrudRoutePaths(
  encAdmins,
  encUserScreenPermission,
);

/** Green lock: primary key, foreign key, or any field whose name ends with _id */
const isLockedColumn = (col: UserScreenColumnRecord): boolean =>
  col.is_primary_key ||
  col.is_foreign_key ||
  col.field_name === "unique_id" ||
  col.field_name.endsWith("_id");

const toId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const capitalize = (value: string): string =>
  value
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(" ");

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

const firstErrorMessage = (value: unknown): string | undefined => {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
};

const getErrorStatus = (err: unknown): number | null =>
  (err as { response?: { status?: number } })?.response?.status ?? null;

const PERMISSION_TYPE_OPTIONS: Array<{ value: PermissionType; label: string }> = [
  { value: "screen", label: "Screen Permission" },
  { value: "field", label: "Field Permission" },
];

/** Radix Select can't hold an empty-string value, so the "no project" choice
 * (company-wide permission) uses this sentinel and is translated back to ""
 * wherever projectId state is set. */
const COMPANY_WIDE_VALUE = "__company_wide__";

export default function UserScreenPermissionForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const location = useLocation();

  const routeProjectId = params.id;
  // "none" is the sentinel used for company-wide (no-project) permissions,
  // since a URL path segment can't be empty.
  const isCompanyWideRoute = routeProjectId === "none";
  const companyIdFromQuery = searchParams.get("company_unique_id") ?? "";
  const permissionTypeFromQuery = searchParams.get("permission_type") ?? "";
  const isEdit = Boolean(routeProjectId);
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    onCompanyChange,
    setProjectId,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId ?? companyIdFromQuery,
    initialProjectId: isCompanyWideRoute
      ? ""
      : routeState?.projectId ?? (isEdit ? String(routeProjectId) : undefined),
    // Blank projectId is a valid, meaningful choice here (company-wide
    // permission) — don't let the hook auto-select the first project.
    defaultToAll: true,
  });

  const [permissionType, setPermissionType] = useState<PermissionType>(() =>
    permissionTypeFromQuery === "field" ? "field" : "screen"
  );
  const [mainScreenIds, setMainScreenIds] = useState<string[]>([]);
  const [addSectionValue, setAddSectionValue] = useState("");
  const [loadingExistingSections, setLoadingExistingSections] = useState(isEdit);

  const [mainScreens, setMainScreens] = useState<Option[]>([]);
  const [allUserScreens, setAllUserScreens] = useState<ApiUserScreen[]>([]);
  const [actions, setActions] = useState<Option[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const sectionDataRef = useRef<Record<string, PermissionSectionData>>({});

  const effectiveCompanyId = companyIdFromQuery || companyUniqueId;
  const effectiveProjectId = isEdit
    ? (isCompanyWideRoute ? "" : String(routeProjectId))
    : projectId;
  // A blank project means "company-wide" — the permission applies to the
  // company as a whole rather than to a specific project. The "none" sentinel
  // is only used at the API-path level (see effectiveProjectIdParam below).
  const hasProjectScope = Boolean(effectiveCompanyId);
  const effectiveProjectIdParam = effectiveProjectId || "none";

  const isEditContextLocked = isEdit && Boolean(companyIdFromQuery);
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

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [mainScreensRes, userScreensRes, userScreenActionsRes] = await Promise.allSettled([
          adminApi.mainScreens.readAll(),
          adminApi.userScreens.readAll(),
          adminApi.userScreenActions.readAll(),
        ]);

        if (cancelled) return;

        const mainScreensData = mainScreensRes.status === "fulfilled" ? (mainScreensRes.value as any[]) : [];
        const userScreensData = userScreensRes.status === "fulfilled" ? (userScreensRes.value as any[]) : [];
        const userScreenActionsData = userScreenActionsRes.status === "fulfilled" ? (userScreenActionsRes.value as any[]) : [];

        const firstError =
          (mainScreensRes.status === "rejected" ? mainScreensRes.reason : null) ??
          (userScreensRes.status === "rejected" ? userScreensRes.reason : null) ??
          (userScreenActionsRes.status === "rejected" ? userScreenActionsRes.reason : null);

        if (firstError) {
          if (getErrorStatus(firstError) === 403) {
            Swal.fire({
              icon: "error",
              title: t("common.access_denied"),
              text: t("common.no_permission"),
              confirmButtonText: t("common.ok"),
            }).then(() => navigate(ENC_LIST_PATH));
            return;
          }
          Swal.fire(t("common.error"), t("common.load_failed"), "error");
        }

        setMainScreens(
          mainScreensData.map((x: MainScreen) => ({
            value: toId(x.unique_id),
            label: String(x.mainscreen_name ?? ""),
          }))
        );

        setAllUserScreens(Array.isArray(userScreensData) ? (userScreensData as ApiUserScreen[]) : []);

        setActions(
          userScreenActionsData.map((x: UserScreenAction) => ({
            value: toId(x.unique_id),
            label: String(x.action_name ?? ""),
          }))
        );
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!companyIdFromQuery || companyUniqueId === companyIdFromQuery) return;
    onCompanyChange(companyIdFromQuery);
  }, [companyIdFromQuery, companyUniqueId, onCompanyChange]);

  useEffect(() => {
    if (!isEdit || !routeProjectId || isCompanyWideRoute) return;
    if (projectId !== String(routeProjectId)) {
      setProjectId(String(routeProjectId));
      sectionDataRef.current = {};
      setMainScreenIds([]);
    }
  }, [isEdit, routeProjectId, isCompanyWideRoute, projectId, setProjectId]);

  useEffect(() => {
    if (!isEdit || !hasProjectScope) return;
    let cancelled = false;
    setLoadingExistingSections(true);

    adminApi.companyWiseScreenPermissions
      .readAll({
        params: {
          company_id: effectiveCompanyId,
          project_id: effectiveProjectIdParam,
          permission_type: permissionType,
          limit: 6000,
          offset: 0,
        },
      })
      .then((rows: any) => {
        if (cancelled) return;
        const ids = uniqueIds(
          (Array.isArray(rows) ? rows : []).map((r: any) => r.mainscreen_id)
        );
        sectionDataRef.current = {};
        setMainScreenIds(ids);
      })
      .catch(() => {
        // Non-fatal: user can still add main screens manually.
      })
      .finally(() => {
        if (!cancelled) setLoadingExistingSections(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEdit, hasProjectScope, effectiveCompanyId, effectiveProjectIdParam, permissionType]);

  const availableMainScreens = useMemo(
    () => mainScreens.filter((opt) => !mainScreenIds.includes(opt.value)),
    [mainScreens, mainScreenIds]
  );

  const resetSections = () => {
    sectionDataRef.current = {};
    setMainScreenIds([]);
    setAddSectionValue("");
  };

  const handleAddSection = (nextMainScreenId: string) => {
    if (!nextMainScreenId || mainScreenIds.includes(nextMainScreenId)) return;
    setMainScreenIds((prev) => [...prev, nextMainScreenId]);
    setAddSectionValue("");
    setFieldErrors((prev) => ({ ...prev, mainScreenIds: "" }));
  };

  const handleRemoveSection = (targetMainScreenId: string) => {
    setMainScreenIds((prev) => prev.filter((id) => id !== targetMainScreenId));
    delete sectionDataRef.current[targetMainScreenId];
  };

  const handleSectionDataChange = useCallback(
    (id: string, data: PermissionSectionData) => {
      sectionDataRef.current[id] = data;
    },
    []
  );

  const handleAccessDenied = useCallback(() => {
    Swal.fire({
      icon: "error",
      title: t("common.access_denied"),
      text: t("common.no_permission"),
      confirmButtonText: t("common.ok"),
    }).then(() => navigate(ENC_LIST_PATH));
  }, [navigate, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validation = parseWithSchema(userScreenPermissionSchema, {
      permissionType,
      mainScreenIds,
    });
    if (!validation.success) {
      setFieldErrors(validation.errors);
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }
    setFieldErrors({});

    if (!effectiveCompanyId) {
      Swal.fire(t("common.warning"), t("common.missing_fields"), "warning");
      return;
    }

    const missingScreens = mainScreenIds.some(
      (id) => (sectionDataRef.current[id]?.screenMatrix.length ?? 0) === 0
    );
    if (missingScreens) {
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

    setLoading(true);

    try {
      const actionPath = `bulk-sync-multi-project/${effectiveProjectIdParam}`;

      for (const mainScreenId of mainScreenIds) {
        const sectionData = sectionDataRef.current[mainScreenId];
        if (!sectionData) continue;

        const normalizedScreens = sectionData.screenMatrix
          .map((screen) => {
            const base: Record<string, unknown> = {
              userScreenId: toId(screen.userscreen_id),
              actionIds: uniqueIds(screen.actions).filter(
                (actionId) =>
                  validActionIds.size === 0 || validActionIds.has(actionId)
              ),
            };
            if (
              permissionType === "field" &&
              sectionData.screenColumns[screen.userscreen_id] !== undefined
            ) {
              const lockedIds = sectionData.screenColumns[screen.userscreen_id]
                .filter(isLockedColumn)
                .map((c) => c.unique_id);
              base.columnIds = uniqueIds([...lockedIds, ...screen.columnIds]);
            }
            return base;
          })
          .filter((screen) => Boolean(screen.userScreenId));

        const payload = {
          companyId: effectiveCompanyId,
          projectId: effectiveProjectId,
          permissionType,
          mainScreenId,
          description: sectionData.description.trim(),
          userScreens: normalizedScreens,
        };

        await adminApi.companyWiseScreenPermissions.action(actionPath, payload);
      }

      if (permissionType === "field") {
        const colSyncTasks: Promise<unknown>[] = [];
        mainScreenIds.forEach((mainScreenId) => {
          const sectionData = sectionDataRef.current[mainScreenId];
          if (!sectionData) return;

          sectionData.screenMatrix.forEach((screen) => {
            const availableCols = sectionData.screenColumns[screen.userscreen_id];
            if (!availableCols) return;

            const permIds = sectionData.columnPermissionIds[screen.userscreen_id] ?? {};

            availableCols.forEach((col) => {
              const permId = permIds[col.unique_id] ?? null;
              const isChecked = screen.columnIds.includes(col.unique_id);

              if (permId) {
                colSyncTasks.push(updateColumnPermission(permId, { is_active: isChecked }));
              } else if (isChecked) {
                colSyncTasks.push(
                  createColumnPermission({
                    userscreen_id: screen.userscreen_id,
                    column_id: col.unique_id,
                    project_id: effectiveProjectId,
                    company_id: effectiveCompanyId,
                    is_active: true,
                  })
                );
              }
            });
          });
        });

        await Promise.all(colSyncTasks);
      }

      Swal.fire(
        t("common.success"),
        isEdit ? t("common.updated_success") : t("common.added_success"),
        "success"
      );

      navigate(ENC_LIST_PATH, { state: { companyUniqueId: effectiveCompanyId, projectId: effectiveProjectId } });
    } catch (err: unknown) {
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
          firstErrorMessage(errorData.companyId) ||
          firstErrorMessage(errorData.project_id) ||
          firstErrorMessage(errorData.projectId) ||
          firstErrorMessage(errorData.mainscreen_id) ||
          firstErrorMessage(errorData.mainScreenId) ||
          firstErrorMessage(errorData.screens) ||
          firstErrorMessage(errorData.userScreens) ||
          firstErrorMessage((errorData as any).columnIds) ||
          t("common.save_failed_desc"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

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
                resetSections();
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
            <Label>{t("admin.nav.project")}</Label>
            <Select
              value={projectId || COMPANY_WIDE_VALUE}
              onValueChange={(value) => {
                setProjectId(value === COMPANY_WIDE_VALUE ? "" : value);
                if (!isEdit) resetSections();
              }}
              disabled={isEdit || !companyUniqueId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("common.select_item_placeholder", {
                    item: t("admin.nav.project"),
                  })}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COMPANY_WIDE_VALUE}>
                  {t("admin.user_screen_permission.company_wide")}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Permission Type *</Label>
            <Select
              value={permissionType}
              onValueChange={(value) => {
                setPermissionType(value as PermissionType);
                setFieldErrors((prev) => ({ ...prev, permissionType: "" }));
                if (!isEdit) resetSections();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Permission Type" />
              </SelectTrigger>
              <SelectContent>
                {PERMISSION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {capitalize(opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.permissionType} />
          </div>
        </div>

        {isEdit && loadingExistingSections && (
          <div className="mt-6 p-8 border rounded-lg bg-gray-50 text-center text-gray-500">
            {t("admin.user_screen_permission.loading_message")}
          </div>
        )}

        {!(isEdit && loadingExistingSections) && mainScreenIds.length === 0 && (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <div>
              <Label>{t("admin.nav.main_screen")} *</Label>
              <Select
                value={addSectionValue}
                onValueChange={handleAddSection}
                disabled={!hasProjectScope}
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
                      {capitalize(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.mainScreenIds} />
            </div>
          </div>
        )}

        {!(isEdit && loadingExistingSections) && mainScreenIds.map((id) => (
          <PermissionSection
            key={id}
            mainScreenId={id}
            mainScreenLabel={
              mainScreens.find((opt) => opt.value === id)?.label
                ? capitalize(mainScreens.find((opt) => opt.value === id)!.label)
                : id
            }
            permissionType={permissionType}
            companyId={effectiveCompanyId}
            projectId={effectiveProjectIdParam}
            hasScope={hasProjectScope}
            allUserScreens={allUserScreens}
            actions={actions}
            canRemove
            onRemove={() => handleRemoveSection(id)}
            onDataChange={handleSectionDataChange}
            onAccessDenied={handleAccessDenied}
          />
        ))}

        {!(isEdit && loadingExistingSections) && mainScreenIds.length > 0 && (
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <div>
              <Label>{t("admin.user_screen_permission.add_another_main_screen")}</Label>
              <Select
                value={addSectionValue}
                onValueChange={handleAddSection}
                disabled={!hasProjectScope || availableMainScreens.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      availableMainScreens.length === 0
                        ? t("admin.user_screen_permission.all_main_screens_added")
                        : t("common.select_item_placeholder", {
                            item: t("admin.nav.main_screen"),
                          })
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableMainScreens.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {capitalize(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="submit"
            disabled={
              loading ||
              !hasProjectScope ||
              mainScreenIds.length === 0 ||
              (isEdit && loadingExistingSections)
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
