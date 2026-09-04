import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle2, ChevronDown, KeyRound, LayoutGrid, Loader2, MapPinned, ShieldCheck, UserRound } from "lucide-react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import ComponentCard from "@/components/common/ComponentCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/form/input/PasswordInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { staffAccessConfigurationApi, staffUserTypeApi, userTypeApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

import LocationScopeSelector, { type LocationScopeOptions } from "./LocationScopeSelector";
import { MultiSelect } from "@/components/form/MultiSelect";
import type {
  AvailableMainScreen,
  AvailablePermissionsResponse,
  DataScopeForm,
  EmployeeOption,
  GrantedScreenPermission,
  StaffAccessConfigPayload,
  StaffAccessConfigRecord,
  UnknownRecord,
} from "./types";
import {
  buildStaffAccessConfigSchema,
  staffDataScopeSchema,
  staffPermissionsSchema,
} from "@/schemas/superadmin/staffManagement/staffAccessConfiguration.schema";
import { parseWithSchema, type FieldErrors } from "@/schemas/shared/parseFormErrors";
import { FieldError } from "@/components/form/FieldError";

const { encAdmins, encStaffAccessConfiguration } = getEncryptedRoute();
const { listPath: ENC_LIST_PATH } = createCrudRoutePaths(encAdmins, encStaffAccessConfiguration);

const TABS = ["Basic Info", "Login", "Data Scope", "Permissions", "Review"] as const;
const DATA_SCOPE_TAB = 2;
const PERMISSIONS_TAB = 3;
const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-md border !border-[#22a855] !bg-[#22a855] px-5 py-2 text-sm font-semibold !text-white shadow-sm transition hover:!bg-[#1a8a44] disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-md border !border-[#22a855] !bg-white px-4 py-2 text-sm font-semibold !text-[#22a855] transition hover:!bg-[#e8f8ee] dark:!bg-transparent dark:hover:!bg-[#22a855]/10";
const CANCEL_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-md border !border-[#f7192b] !bg-[#f7192b] px-4 py-2 text-sm font-semibold !text-white transition hover:!bg-[#d91626]";

type Option = {
  value: string;
  label: string;
  userTypeId?: string;
};

const toId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const record = value as UnknownRecord;
    return toId(record.unique_id ?? record.id ?? record.value ?? "");
  }
  return String(value).trim();
};

const toRecordList = (value: unknown): UnknownRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is UnknownRecord => !!item && typeof item === "object" && !Array.isArray(item)
    );
  }
  if (value && typeof value === "object") {
    const maybeResults = (value as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults.filter(
        (item): item is UnknownRecord => !!item && typeof item === "object" && !Array.isArray(item)
      );
    }
  }
  return [];
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.permissions === "string") return record.permissions;
    if (typeof record.detail === "string") return record.detail;
    return Object.entries(record)
      .map(([key, value]) =>
        Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${String(value)}`
      )
      .join("\n");
  }
  return (error as { message?: string })?.message || fallback;
};

const Toggle = ({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) onChange(!checked);
    }}
    className={`relative h-5 w-10 shrink-0 rounded-full transition ${
      checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
        checked ? "left-5" : "left-0.5"
      }`}
    />
  </button>
);

export default function StaffAccessConfigForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: staffUniqueIdParam } = useParams<{ id?: string }>();
  const isEdit = Boolean(staffUniqueIdParam);
  const location = useLocation();
  const routeState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const {
    companyUniqueId,
    projects,
    projectsLoaded,
    companies,
    companiesLoaded,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  } = useCompanyProjectSelection({
    isEdit,
    initialCompanyId: routeState?.companyUniqueId,
    initialProjectId: routeState?.projectId,
  });

  const [projectIds, setProjectIds] = useState<string[]>(
    routeState?.projectId ? [routeState.projectId] : []
  );

  const [activeTab, setActiveTab] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [staffId, setStaffId] = useState(() => (isEdit && staffUniqueIdParam ? String(staffUniqueIdParam) : ""));
  const [employeeName, setEmployeeName] = useState("");
  const [staffConfigName, setStaffConfigName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [officeEmail, setOfficeEmail] = useState("");
  const [doj, setDoj] = useState("");
  const [activeStatus, setActiveStatus] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginEnabled, setLoginEnabled] = useState(true);
  const [userTypeId, setUserTypeId] = useState("");
  const [staffUserTypeId, setStaffUserTypeId] = useState("");
  const [userTypeOptions, setUserTypeOptions] = useState<Option[]>([]);
  const [staffUserTypeOptions, setStaffUserTypeOptions] = useState<Option[]>([]);
  const [userTypeOptionsLoaded, setUserTypeOptionsLoaded] = useState(false);
  const [staffUserTypeOptionsLoaded, setStaffUserTypeOptionsLoaded] = useState(false);
  const [dataScope, setDataScope] = useState<DataScopeForm>({});
  const [geoOptions, setGeoOptions] = useState<LocationScopeOptions>({
    states: [], districts: [], cities: [], zones: [], panchayats: [], wards: [],
  });
  const [description, setDescription] = useState("");
  const [availablePermissions, setAvailablePermissions] = useState<AvailablePermissionsResponse | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [selections, setSelections] = useState<Record<string, GrantedScreenPermission>>({});
  const [pendingGrantedPermissions, setPendingGrantedPermissions] = useState<
    { userScreenId: string; actionIds: string[] }[] | null
  >(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [loadingEmployeeOptions, setLoadingEmployeeOptions] = useState(false);

  // Project is the root-level scope field (no parent selection drives it),
  // so unlike the geo levels below it, loading its option list must never
  // auto-select every option — an empty selection here is a deliberate,
  // meaningful state ("all projects under the company"). Only drop ids that
  // are no longer valid for the current company.
  const eligibleProjectIds = useMemo(() => new Set(projects.map((p) => p.value)), [projects]);
  useEffect(() => {
    if (!projectsLoaded || (isEdit && fetching)) return;
    setProjectIds((current) => {
      const survived = current.filter((id) => eligibleProjectIds.has(id));
      return survived.length === current.length ? current : survived;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleProjectIds, projectsLoaded, isEdit, fetching]);

  useEffect(() => {
    let cancelled = false;

    userTypeApi.readAll()
      .then((data: unknown) => {
        if (cancelled) return;
        setUserTypeOptions(
          toRecordList(data)
            .map((item) => ({
              value: toId(item.unique_id),
              label: String(item.name ?? item.user_type_name ?? item.unique_id ?? ""),
            }))
            .filter((option) => option.value && option.label)
        );
      })
      .catch(() => {
        if (!cancelled) setUserTypeOptions([]);
      })
      .finally(() => {
        if (!cancelled) setUserTypeOptionsLoaded(true);
      });

    staffUserTypeApi.readAll()
      .then((data: unknown) => {
        if (cancelled) return;
        setStaffUserTypeOptions(
          toRecordList(data)
            .map((item) => ({
              value: toId(item.unique_id),
              label: String(item.name ?? item.role_name ?? item.unique_id ?? ""),
              userTypeId: toId(item.usertype_id ?? item.user_type_id),
            }))
            .filter((option) => option.value && option.label)
        );
      })
      .catch(() => {
        if (!cancelled) setStaffUserTypeOptions([]);
      })
      .finally(() => {
        if (!cancelled) setStaffUserTypeOptionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Employee dropdown is scoped to the selected company (and, if chosen, the
  // selected project) — re-fetch whenever either changes. Selecting a new
  // company/project invalidates the previously chosen employee the same way
  // it invalidates projects/permissions elsewhere in this form.
  useEffect(() => {
    if (!companyUniqueId) {
      setEmployeeOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingEmployeeOptions(true);

    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectIds.length > 0) params.project_id = projectIds[0];

    staffAccessConfigurationApi
      .action("employee-options", undefined, { params })
      .then((res: unknown) => {
        if (cancelled) return;
        setEmployeeOptions(Array.isArray(res) ? (res as EmployeeOption[]) : []);
      })
      .catch(() => {
        if (!cancelled) setEmployeeOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingEmployeeOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyUniqueId, projectIds]);

  useEffect(() => {
    if (!isEdit || !staffUniqueIdParam) return;
    let cancelled = false;
    setFetching(true);

    staffAccessConfigurationApi
      .read(staffUniqueIdParam)
      .then((record: unknown) => {
        if (cancelled) return;
        const data = record as StaffAccessConfigRecord;
        setStaffId(toId(data.staff_id ?? data.staff_unique_id ?? staffUniqueIdParam));
        setEmployeeName(String(data.employee_name ?? data.staff_name ?? ""));
        setStaffConfigName(String(data.staff_config_name ?? data.staffusertype_name ?? ""));
        setMobileNumber(String(data.contact_mobile ?? ""));
        setOfficeEmail(String(data.contact_email ?? ""));
        setDoj(data.doj ? String(data.doj) : "");
        setUsername(String(data.username ?? ""));
        const existingPassword = String(data.password ?? "");
        setPassword(existingPassword);
        setConfirmPassword(existingPassword);
        setUserTypeId(toId(data.user_type_id));
        setStaffUserTypeId(toId(data.staffusertype_id));
        setDescription(data.description ?? "");
        setProjectIds((data.project_ids ?? []).map((id) => toId(id)));
        setDataScope({
          state_ids: (data.state_ids ?? []).map((id) => toId(id)),
          district_ids: (data.district_ids ?? []).map((id) => toId(id)),
          city_ids: (data.city_ids ?? []).map((id) => toId(id)),
          zone_ids: (data.zone_ids ?? []).map((id) => toId(id)),
          panchayat_ids: (data.panchayat_ids ?? []).map((id) => toId(id)),
          ward_ids: (data.ward_ids ?? []).map((id) => toId(id)),
        });
        applyCompanyProjectFromRecord(data as UnknownRecord);
        setPendingGrantedPermissions(
          (data.granted_permissions ?? []).map((g) => ({
            userScreenId: toId(g.userScreenId),
            actionIds: (g.actionIds ?? []).map((a) => toId(a)),
          }))
        );
      })
      .catch((error) => {
        if (!cancelled) {
          Swal.fire(t("common.error"), extractErrorMessage(error, t("common.load_failed")), "error");
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, staffUniqueIdParam]);

  useEffect(() => {
    // In edit mode, companyUniqueId starts out seeded from the list page's
    // own filter selection (routeState), which may not match the row being
    // edited — wait for the staff record fetch to correct it via
    // applyCompanyProjectFromRecord before loading its permission catalog,
    // otherwise this can race against that correction and lose.
    if (isEdit && fetching) return;

    if (!companyUniqueId) {
      setAvailablePermissions(null);
      return;
    }

    let cancelled = false;
    setLoadingPermissions(true);

    // Omitting project_id entirely (no projects selected) means "every
    // project under the company" — matching the company-only-mandatory scope.
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectIds.length > 0) params.project_id = projectIds.join(",");

    staffAccessConfigurationApi
      .action("available-permissions", undefined, { params })
      .then((res: unknown) => {
        if (!cancelled) setAvailablePermissions(res as AvailablePermissionsResponse);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAvailablePermissions(null);
        Swal.fire(
          t("common.error"),
          extractErrorMessage(error, t("admin.staff_access_configuration.load_permissions_failed")),
          "error"
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingPermissions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEdit, fetching, companyUniqueId, projectIds, t]);

  useEffect(() => {
    if (!availablePermissions) return;
    // Union allowed actions for a screen across every project it appears in,
    // so a saved action stays checked regardless of which project's section
    // it renders under.
    const allowedActionsByScreen = new Map<string, Set<string>>();
    availablePermissions.projects.forEach((project) => {
      project.mainscreens.forEach((ms) => {
        ms.screens.forEach((scr) => {
          const screenId = toId(scr.userScreenId);
          const existing = allowedActionsByScreen.get(screenId) ?? new Set<string>();
          scr.actions.forEach((a) => existing.add(toId(a.actionId)));
          allowedActionsByScreen.set(screenId, existing);
        });
      });
    });

    setSelections((prev) => {
      const base: Record<string, GrantedScreenPermission> = { ...prev };
      pendingGrantedPermissions?.forEach((g) => {
        if (!base[g.userScreenId]) base[g.userScreenId] = { userScreenId: g.userScreenId, actionIds: g.actionIds };
      });

      const next: Record<string, GrantedScreenPermission> = {};
      Object.values(base).forEach((sel) => {
        const allowedActions = allowedActionsByScreen.get(sel.userScreenId);
        if (!allowedActions) return;
        const filteredActionIds = sel.actionIds.filter((a) => allowedActions.has(a));
        if (filteredActionIds.length > 0) next[sel.userScreenId] = { userScreenId: sel.userScreenId, actionIds: filteredActionIds };
      });
      return next;
    });

    if (pendingGrantedPermissions) setPendingGrantedPermissions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePermissions]);

  const screenInfoById = useMemo(() => {
    const map = new Map<string, { name: string; actionNameById: Map<string, string> }>();
    availablePermissions?.projects.forEach((project) => {
      project.mainscreens.forEach((ms) => {
        ms.screens.forEach((screen) => {
          const screenId = toId(screen.userScreenId);
          const entry = map.get(screenId) ?? { name: screen.userScreenName, actionNameById: new Map<string, string>() };
          screen.actions.forEach((action) => entry.actionNameById.set(toId(action.actionId), action.actionName));
          map.set(screenId, entry);
        });
      });
    });
    return map;
  }, [availablePermissions]);

  const filteredStaffUserTypeOptions = useMemo(() => {
    if (!userTypeId) return staffUserTypeOptions;
    return staffUserTypeOptions.filter((option) => !option.userTypeId || option.userTypeId === userTypeId);
  }, [staffUserTypeOptions, userTypeId]);

  // Selecting an existing employee autofills whatever details already exist
  // on their record — fields left blank on the employee stay editable so the
  // admin can still fill in what's missing.
  const handleEmployeeSelect = useCallback((value: string) => {
    setStaffId(value);
    setFieldErrors((prev) => ({ ...prev, employeeName: "" }));

    const employee = employeeOptions.find((option) => option.unique_id === value);
    if (!employee) {
      setEmployeeName("");
      return;
    }

    setEmployeeName(employee.employee_name ?? "");
    if (employee.mobile_number) setMobileNumber(employee.mobile_number);
    if (employee.office_email) setOfficeEmail(employee.office_email);
    if (employee.doj) setDoj(employee.doj);
    if (employee.username) setUsername(employee.username);
    if (employee.user_type_id) setUserTypeId(employee.user_type_id);
    if (employee.staffusertype_id) setStaffUserTypeId(employee.staffusertype_id);
    if (employee.staffusertype_name) setStaffConfigName(employee.staffusertype_name);
    if (employee.password) {
      setPassword(employee.password);
      setConfirmPassword(employee.password);
    }
    if (typeof employee.active_status === "boolean") setActiveStatus(employee.active_status);
  }, [employeeOptions]);

  const totalSelectedScreens = Object.keys(selections).length;
  const totalSelectedActions = Object.values(selections).reduce((sum, sel) => sum + sel.actionIds.length, 0);

  const toggleAction = useCallback((userScreenId: string, actionId: string, checked: boolean) => {
    setSelections((prev) => {
      const currentActionIds = prev[userScreenId]?.actionIds ?? [];
      const nextActionIds = checked
        ? Array.from(new Set([...currentActionIds, actionId]))
        : currentActionIds.filter((a) => a !== actionId);
      if (nextActionIds.length === 0) {
        const { [userScreenId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [userScreenId]: { userScreenId, actionIds: nextActionIds } };
    });
  }, []);

  const toggleAllActionsForScreen = useCallback((userScreenId: string, allActionIds: string[], checked: boolean) => {
    setSelections((prev) => {
      if (!checked) {
        const { [userScreenId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [userScreenId]: { userScreenId, actionIds: allActionIds } };
    });
  }, []);

  const toggleModule = useCallback((screens: AvailableMainScreen["screens"], checked: boolean) => {
    setSelections((prev) => {
      const next = { ...prev };
      screens.forEach((screen) => {
        const screenId = toId(screen.userScreenId);
        if (checked) {
          next[screenId] = { userScreenId: screenId, actionIds: screen.actions.map((a) => toId(a.actionId)) };
        } else {
          delete next[screenId];
        }
      });
      return next;
    });
  }, []);

  // Field keys each tab is responsible for gating — used to pick which schema
  // error (if any) should block advancing past that specific tab.
  const TAB_FIELD_KEYS: Record<number, string[]> = {
    0: ["companyUniqueId", "employeeName", "staffConfigName", "mobileNumber", "officeEmail", "doj"],
    1: ["username", "password", "confirmPassword", "userTypeId", "staffUserTypeId"],
  };

  const validateTab = (tab: number): boolean => {
    setStepError(null);

    if (tab === 0) {
      const scopeValidation = parseWithSchema(staffDataScopeSchema, { companyUniqueId });
      if (!scopeValidation.success) {
        setFieldErrors((prev) => ({ ...prev, ...scopeValidation.errors }));
        setStepError(scopeValidation.errors.companyUniqueId);
        return false;
      }
    }

    if (tab === 0 || tab === 1) {
      const schema = buildStaffAccessConfigSchema(isEdit);
      const validation = parseWithSchema(schema, {
        employeeName,
        staffConfigName,
        mobileNumber,
        officeEmail,
        doj,
        username,
        password,
        confirmPassword,
        userTypeId,
        staffUserTypeId,
      });
      if (!validation.success) {
        setFieldErrors((prev) => ({ ...prev, ...validation.errors }));
        const relevantKey = TAB_FIELD_KEYS[tab].find((key) => validation.errors[key]);
        if (relevantKey) {
          setStepError(validation.errors[relevantKey]);
          return false;
        }
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          TAB_FIELD_KEYS[tab].forEach((key) => delete next[key]);
          return next;
        });
      }
    }

    if (tab === PERMISSIONS_TAB) {
      const validation = parseWithSchema(staffPermissionsSchema, { selections });
      if (!validation.success) {
        setFieldErrors(validation.errors);
        setStepError(validation.errors.selections);
        return false;
      }
    }

    return true;
  };

  const nextTab = () => {
    if (!validateTab(activeTab)) return;
    setActiveTab((current) => Math.min(current + 1, TABS.length - 1));
  };

  const goToTab = (index: number) => {
    if (isEdit || index <= activeTab || validateTab(activeTab)) setActiveTab(index);
  };

  const buildPayload = (): StaffAccessConfigPayload => ({
    ...(staffId ? { staff_id: staffId } : {}),
    company_id: companyUniqueId,
    project_ids: projectIds,
    state_ids: dataScope.state_ids ?? [],
    district_ids: dataScope.district_ids ?? [],
    city_ids: dataScope.city_ids ?? [],
    zone_ids: dataScope.zone_ids ?? [],
    panchayat_ids: dataScope.panchayat_ids ?? [],
    ward_ids: dataScope.ward_ids ?? [],
    description: description.trim(),
    permissions: Object.values(selections).map((sel) => ({
      userscreen_id: sel.userScreenId,
      action_ids: sel.actionIds,
    })),
    basicInfo: {
      employeeName: employeeName.trim(),
      staffConfigName: staffConfigName.trim(),
      mobileNumber: mobileNumber.trim() || null,
      officeEmail: officeEmail.trim() || null,
      doj: doj || null,
      activeStatus,
    },
    loginConfig: {
      username: username.trim(),
      password: password || null,
      confirmPassword: confirmPassword || null,
      userTypeId,
      staffUserTypeId,
      loginEnabled,
    },
    dataScope: {
      companyId: companyUniqueId,
      projectIds,
      stateIds: dataScope.state_ids ?? [],
      districtIds: dataScope.district_ids ?? [],
      cityIds: dataScope.city_ids ?? [],
      zoneIds: dataScope.zone_ids ?? [],
      panchayatIds: dataScope.panchayat_ids ?? [],
      wardIds: dataScope.ward_ids ?? [],
    },
  });

  const handleSave = async () => {
    for (let index = 0; index <= PERMISSIONS_TAB; index += 1) {
      if (!validateTab(index)) {
        setActiveTab(index);
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit && staffUniqueIdParam) {
        await staffAccessConfigurationApi.update(staffUniqueIdParam, buildPayload());
      } else {
        await staffAccessConfigurationApi.create(buildPayload());
      }
      await Swal.fire("Saved", "Staff access configuration saved successfully.", "success");
      navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId: projectIds[0] } });
    } catch (error) {
      Swal.fire("Error", extractErrorMessage(error, "Unable to save staff access configuration."), "error");
    } finally {
      setSaving(false);
    }
  };

  const labelFromOptions = (options: Option[], value: string) =>
    options.find((option) => option.value === value)?.label || "";

  const labelsFromOptions = (options: Option[], values: string[]) =>
    values.map((value) => labelFromOptions(options, value) || value);

  const scopeSummary = [
    companyUniqueId && labelFromOptions(companies, companyUniqueId),
    projectIds.length > 0
      ? `Projects: ${labelsFromOptions(projects, projectIds).join(", ")}`
      : "Projects: All (company-wide)",
    (dataScope.state_ids?.length ?? 0) > 0 && `State: ${labelsFromOptions(geoOptions.states, dataScope.state_ids!).join(", ")}`,
    (dataScope.district_ids?.length ?? 0) > 0 && `District: ${labelsFromOptions(geoOptions.districts, dataScope.district_ids!).join(", ")}`,
    (dataScope.city_ids?.length ?? 0) > 0 && `City: ${labelsFromOptions(geoOptions.cities, dataScope.city_ids!).join(", ")}`,
    (dataScope.zone_ids?.length ?? 0) > 0 && `Zone: ${labelsFromOptions(geoOptions.zones, dataScope.zone_ids!).join(", ")}`,
    (dataScope.panchayat_ids?.length ?? 0) > 0 && `Panchayat: ${labelsFromOptions(geoOptions.panchayats, dataScope.panchayat_ids!).join(", ")}`,
    (dataScope.ward_ids?.length ?? 0) > 0 && `Ward: ${labelsFromOptions(geoOptions.wards, dataScope.ward_ids!).join(", ")}`,
  ].filter(Boolean).join(", ");

  const reviewRow = (label: string, value?: string | null) => (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0 dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="max-w-[65%] truncate text-right font-medium text-gray-800 dark:text-gray-100">
        {value || "-"}
      </span>
    </div>
  );

  const reviewCard = (title: string, icon: ReactNode, children: ReactNode) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
        {icon}
        {title}
      </h4>
      <div className="text-sm">{children}</div>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>Company</Label>
        {isEdit && !companiesLoaded ? (
          <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <Select
            value={companyUniqueId}
            onValueChange={(value) => {
              onCompanyChange(value);
              setStaffId("");
              setEmployeeName("");
              setSelections({});
              setAvailablePermissions(null);
            }}
            disabled={Boolean(loggedInCompanyUniqueId) || (!isSuperAdmin && !loggedInCompanyUniqueId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.value} value={company.value}>{company.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <FieldError message={fieldErrors.companyUniqueId} />
      </div>
      <div>
        <Label>Project <span className="font-normal text-gray-400">(optional — leave blank for all projects under the company)</span></Label>
        {isEdit && (!companiesLoaded || !projectsLoaded) ? (
          <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <MultiSelect
            value={projectIds}
            onChange={(next) => {
              setProjectIds(next);
              setStaffId("");
              setEmployeeName("");
              setSelections({});
              setAvailablePermissions(null);
            }}
            options={projects}
            placeholder="Select project(s)"
            disabled={!companyUniqueId || projects.length === 0}
          />
        )}
      </div>
      <div>
        <Label htmlFor="employeeName">Employee Name</Label>
        {isEdit ? (
          <Input id="employeeName" value={employeeName} disabled />
        ) : (
          <Select
            value={staffId}
            onValueChange={handleEmployeeSelect}
            disabled={!companyUniqueId || loadingEmployeeOptions}
          >
            <SelectTrigger id="employeeName" className="w-full">
              <SelectValue placeholder={
                !companyUniqueId
                  ? "Select company first"
                  : loadingEmployeeOptions
                    ? "Loading employees…"
                    : "Select employee"
              } />
            </SelectTrigger>
            <SelectContent>
              {employeeOptions.map((option) => (
                <SelectItem
                  key={option.unique_id}
                  value={option.unique_id}
                  disabled={option.has_access_configuration}
                >
                  {option.employee_name}
                  {option.has_access_configuration ? " (Permission Already Assigned)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <FieldError message={fieldErrors.employeeName} />
      </div>
      <div>
        <Label htmlFor="staffConfigName">Staff Config Name</Label>
        <Input id="staffConfigName" value={staffConfigName} onChange={(event) => setStaffConfigName(event.target.value)} placeholder="e.g. Project Supervisor" />
      </div>
      <div>
        <Label htmlFor="mobileNumber">Mobile Number</Label>
        <Input
          id="mobileNumber"
          value={mobileNumber}
          onChange={(event) => {
            setMobileNumber(event.target.value);
            setFieldErrors((prev) => ({ ...prev, mobileNumber: "" }));
          }}
        />
        <FieldError message={fieldErrors.mobileNumber} />
      </div>
      <div>
        <Label htmlFor="officeEmail">Office Email</Label>
        <Input
          id="officeEmail"
          type="email"
          value={officeEmail}
          onChange={(event) => {
            setOfficeEmail(event.target.value);
            setFieldErrors((prev) => ({ ...prev, officeEmail: "" }));
          }}
        />
        <FieldError message={fieldErrors.officeEmail} />
      </div>
      <div>
        <Label htmlFor="doj">Date Of Joining</Label>
        <Input id="doj" type="date" value={doj} onChange={(event) => setDoj(event.target.value)} />
      </div>
      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
        <input type="checkbox" className="h-4 w-4" checked={activeStatus} onChange={(event) => setActiveStatus(event.target.checked)} />
        Active
      </label>
    </div>
  );

  const renderLogin = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setFieldErrors((prev) => ({ ...prev, username: "" }));
          }}
        />
        <FieldError message={fieldErrors.username} />
      </div>
      <div>
        <Label htmlFor="userTypeId">User Type</Label>
        <Select key={userTypeOptionsLoaded ? "loaded" : "loading"} value={userTypeId} onValueChange={(value) => {
          setUserTypeId(value);
          setStaffUserTypeId("");
          setFieldErrors((prev) => ({ ...prev, userTypeId: "" }));
        }}>
          <SelectTrigger id="userTypeId" className="w-full">
            <SelectValue placeholder="Select user type" />
          </SelectTrigger>
          <SelectContent>
            {userTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={fieldErrors.userTypeId} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, password: "" }));
          }}
          placeholder="Enter password"
        />
        <FieldError message={fieldErrors.password} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
          }}
          placeholder="Repeat password"
        />
        <FieldError message={fieldErrors.confirmPassword} />
      </div>
      <div>
        <Label htmlFor="staffUserTypeId">Staff User Type</Label>
        <Select key={staffUserTypeOptionsLoaded ? "loaded" : "loading"} value={staffUserTypeId} onValueChange={(value) => {
          setStaffUserTypeId(value);
          setFieldErrors((prev) => ({ ...prev, staffUserTypeId: "" }));
        }}>
          <SelectTrigger id="staffUserTypeId" className="w-full">
            <SelectValue placeholder={userTypeId ? "Select staff user type" : "Select user type first"} />
          </SelectTrigger>
          <SelectContent>
            {filteredStaffUserTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={fieldErrors.staffUserTypeId} />
      </div>
      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
        <input type="checkbox" className="h-4 w-4" checked={loginEnabled} onChange={(event) => setLoginEnabled(event.target.checked)} />
        Login Enabled
      </label>
    </div>
  );

  const renderDataScope = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Geographic scope
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Company</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              {labelFromOptions(companies, companyUniqueId) || "-"}
            </div>
          </div>
          <div>
            <Label>Project</Label>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
              {projectIds.length > 0 ? labelsFromOptions(projects, projectIds).join(", ") : "All (company-wide)"}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        <div className="mt-4">
          <LocationScopeSelector
            value={dataScope}
            onChange={(patch) => setDataScope((prev) => ({ ...prev, ...patch }))}
            companyUniqueId={companyUniqueId}
            projectIds={projectIds}
            disabled={!companyUniqueId}
            readyForReconcile={!isEdit || !fetching}
            isEdit={isEdit}
            onOptionsResolved={setGeoOptions}
          />
        </div>
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="space-y-5">
      {!companyUniqueId ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Select a company on the Data Scope tab first.
        </div>
      ) : loadingPermissions ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading permissions
        </div>
      ) : !availablePermissions?.projects.some((project) => project.mainscreens.length > 0) ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No screens are enabled for the selected project(s).
        </div>
      ) : (
        <>
          <div className="border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
            Only screens and actions enabled by Super Admin are shown, grouped by project.
          </div>
          {availablePermissions.projects
            .filter((project) => project.mainscreens.length > 0)
            .map((project) => (
              <div key={project.projectId} className="space-y-2">
                <p className="text-xs font-semibold uppercase text-gray-500">{project.projectName}</p>
                {project.mainscreens.map((module, moduleIndex) => {
                  const screenIds = module.screens.map((screen) => toId(screen.userScreenId));
                  const moduleChecked = screenIds.length > 0 && screenIds.every((screenId) => {
                    const screen = module.screens.find((item) => toId(item.userScreenId) === screenId);
                    return screen && selections[screenId]?.actionIds.length === screen.actions.length;
                  });
                  return (
                    <details key={`${project.projectId}-${module.mainScreenId}`} className="group overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950" open={moduleIndex === 0}>
                      <summary className="flex cursor-pointer list-none items-center gap-3 bg-stone-50 px-3 py-2.5 dark:bg-gray-900">
                        <LayoutGrid className="h-3.5 w-3.5 text-gray-500" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {module.mainScreenName}
                        </span>
                        <Toggle checked={moduleChecked} onChange={(checked) => toggleModule(module.screens, checked)} />
                        <ChevronDown className="h-4 w-4 text-gray-400 transition group-open:rotate-180" />
                      </summary>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {module.screens.map((screen) => {
                          const screenId = toId(screen.userScreenId);
                          const selectedActionIds = selections[screenId]?.actionIds ?? [];
                          const allActionIds = screen.actions.map((action) => toId(action.actionId));
                          const allChecked = allActionIds.length > 0 && selectedActionIds.length === allActionIds.length;
                          return (
                            <div key={screenId} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(190px,1fr)_minmax(360px,2fr)]">
                              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                                {screen.userScreenName}
                              </span>
                              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 rounded border-gray-300 accent-gray-900 dark:accent-gray-100"
                                    checked={allChecked}
                                    onChange={(event) => toggleAllActionsForScreen(screenId, allActionIds, event.target.checked)}
                                  />
                                  All
                                </label>
                                {screen.actions.map((action) => {
                                  const actionId = toId(action.actionId);
                                  return (
                                    <label key={actionId} className="flex items-center gap-1.5 text-xs capitalize text-gray-600 dark:text-gray-300">
                                      <input
                                        type="checkbox"
                                        className="h-3.5 w-3.5 rounded border-gray-300 accent-gray-900 dark:accent-gray-100"
                                        checked={selectedActionIds.includes(actionId)}
                                        onChange={(event) => toggleAction(screenId, actionId, event.target.checked)}
                                      />
                                      {action.actionName}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            ))}
        </>
      )}
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      {reviewCard("Basic info", <UserRound className="h-4 w-4 text-gray-500" />, (
        <>
          {reviewRow("Name", employeeName)}
          {reviewRow("Staff config", staffConfigName)}
          {reviewRow("Mobile", mobileNumber)}
          {reviewRow("Email", officeEmail)}
          {reviewRow("Date of joining", doj)}
          {reviewRow("Status", activeStatus ? "Active" : "Inactive")}
        </>
      ))}
      {reviewCard("Role & login", <ShieldCheck className="h-4 w-4 text-gray-500" />, (
        <>
          {reviewRow("Username", username)}
          {reviewRow("User type", labelFromOptions(userTypeOptions, userTypeId))}
          {reviewRow("Staff user type", labelFromOptions(staffUserTypeOptions, staffUserTypeId))}
          {reviewRow("Account", loginEnabled ? "Enabled" : "Disabled")}
        </>
      ))}
      {reviewCard("Permissions granted", <KeyRound className="h-4 w-4 text-gray-500" />, (
        totalSelectedActions ? (
          <div className="flex flex-wrap gap-2">
            {Object.values(selections).slice(0, 18).map((screen) => {
              const info = screenInfoById.get(screen.userScreenId);
              const actionNames = screen.actionIds
                .map((actionId) => info?.actionNameById.get(actionId) ?? actionId)
                .join(", ");
              return (
                <span key={screen.userScreenId} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
                  {info?.name ?? screen.userScreenId} ({actionNames})
                </span>
              );
            })}
          </div>
        ) : <p className="text-gray-500">No screens enabled</p>
      ))}
      {reviewCard("Data scope", <MapPinned className="h-4 w-4 text-gray-500" />, (
        <>
          {reviewRow("Company", labelFromOptions(companies, companyUniqueId))}
          {reviewRow("Project", labelsFromOptions(projects, projectIds).join(", "))}
          {reviewRow("Scope", scopeSummary)}
          {reviewRow("Description", description)}
        </>
      ))}
      {reviewCard("Summary", <CheckCircle2 className="h-4 w-4 text-gray-500" />, (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {totalSelectedScreens} screens
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {totalSelectedActions} actions
          </span>
        </div>
      ))}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => setActiveTab(PERMISSIONS_TAB)} className={SECONDARY_BUTTON_CLASS}>
          Back
        </button>
        <button type="button" onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId: projectIds[0] } })} className={CANCEL_BUTTON_CLASS}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className={PRIMARY_BUTTON_CLASS}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm &amp; Save
        </button>
      </div>
    </div>
  );

  if (fetching) {
    return (
      <ComponentCard title="Staff Access Configuration">
        <div className="flex justify-center items-center py-12 text-gray-500">Loading</div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Staff Access Configuration">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        {TABS.map((tab, index) => {
          const isActive = activeTab === index;
          const isCompleted = index < activeTab;
          const isLocked = index > activeTab && !isEdit;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => goToTab(index)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "!bg-[#22a855] !text-white shadow-sm"
                  : isCompleted
                    ? "!bg-[#e8f8ee] !text-[#22a855] hover:opacity-90"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : isCompleted
                      ? "!bg-[#22a855] !text-white"
                      : "bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </span>
              {tab}
              {isLocked && <span className="text-[10px] opacity-60">locked</span>}
            </button>
          );
        })}
      </div>

      <form className="space-y-6 pt-6" onSubmit={(event) => event.preventDefault()}>
        {activeTab === 0 && renderBasicInfo()}
        {activeTab === 1 && renderLogin()}
        {activeTab === DATA_SCOPE_TAB && renderDataScope()}
        {activeTab === PERMISSIONS_TAB && renderPermissions()}
        {activeTab === 4 && renderReview()}

        {activeTab < TABS.length - 1 && (
          <div className="flex flex-col gap-2">
            {stepError && (
              <p className="max-w-full whitespace-normal break-words text-left text-sm font-medium text-red-600 dark:text-red-400">
                {stepError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate(ENC_LIST_PATH, { state: { companyUniqueId, projectId: projectIds[0] } })} className={CANCEL_BUTTON_CLASS}>
                Cancel
              </button>
              {activeTab > 0 && (
                <button type="button" onClick={() => setActiveTab((current) => Math.max(current - 1, 0))} className={SECONDARY_BUTTON_CLASS}>
                  Back
                </button>
              )}
              <button type="button" onClick={nextTab} className={PRIMARY_BUTTON_CLASS}>
                Next
              </button>
            </div>
          </div>
        )}
      </form>
    </ComponentCard>
  );
}
