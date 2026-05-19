import { decryptSegment } from "@/utils/routeCrypto";
import { adminEndpoints } from "@/helpers/admin/endpoints";

export type PermissionAction = "view" | "add" | "edit" | "delete" | "show" | string;
export type PermissionsMap = Record<string, Record<string, string[]>>;

export type PermissionDetailsColumn = {
  id: string;
  columnId: string;
  fieldName: string;
  displayName: string;
  dataType: string;
  dbColumn: string;
  canView: boolean;
  isRequired: boolean;
  orderNo: number;
};

export type PermissionDetailsScreen = {
  userScreenId: string;
  permissions: {
    show: boolean;
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
  };
  columns: PermissionDetailsColumn[];
};

export type PermissionDetailsMap = Record<string, Record<string, PermissionDetailsScreen>>;

export const PERMISSION_DETAILS_STORAGE_KEY = "permission_details";

type UnknownRecord = Record<string, unknown>;

const ACTION_ALIASES: Record<string, string[]> = {
  show: ["show", "display", "visible"],
  view: ["view", "list", "read"],
  add: ["add", "create"],
  edit: ["edit", "update", "change"],
  delete: ["delete", "remove"],
};

const MODULE_ALIASES: Record<string, string[]> = {
  admins: ["screen-managements", "role-assigns"],
  "screen-managements": ["admins"],
  "role-assigns": ["admins"],
  "customer-master": ["customer-masters", "customers"],
  "customer-masters": ["customer-master", "customers"],
  customers: ["customer-master", "customer-masters"],
  "staff-masters": ["user-creations", "process-items", "audits", "user-creation"],
  "user-creations": ["staff-masters", "user-creation"],
  "process-items": ["staff-masters"],
  audits: ["staff-masters"],
  "user-creation": ["staff-masters", "user-creations"],
  "transport-master": ["transport-masters"],
  "transport-masters": ["transport-master"],
  "citizen-grievance": ["grivences", "grievance"],
  grivences: ["citizen-grievance", "grievance"],
  grievance: ["citizen-grievance", "grivences"],
  "superadmin-masters": ["superadmin"],
  superadmin: ["superadmin-masters"],
  "common-masters": ["masters"],
  "waste-types": ["masters"],
  assets: ["masters"],
  masters: ["common-masters", "waste-types", "assets"],
  "waste-management": ["collections"],
  collections: ["waste-management"],
};

const SCREEN_ALIASES: Record<string, string[]> = {
  complaint: ["complaints"],
  "main-complaint-category": ["main-category"],
  "sub-complaint-category": ["sub-category"],
  feedback: ["feedbacks"],
  fuel: ["fuels"],
  panchayats: ["panchayat"],
  "area-types": ["areatypes"],
  hierarchies: ["hierarchy"],
  "collection-points": ["collection-point"],
  "sub-properties": ["subproperties"],
  "staff-user-type": ["staffusertypes"],
  "mainscreen-type": ["mainscreentype"],
  userscreenpermissions: ["companywisescreenpermissions"],
  "company-creation": ["company"],
  "project-creation": ["project"],
  "customer-creation": ["customercreations"],
};
export const PERMISSIONS_STORAGE_KEY = "permissions";
export const PERMISSION_DETAILS_STORAGE_KEY = "permission_details";
export const COLUMN_PERMISSIONS_STORAGE_KEY = "column_permissions";

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeKey = (value: string): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const singularize = (value: string): string =>
  value.endsWith("s") ? value.slice(0, -1) : value;

const keysMatch = (left: string, right: string): boolean => {
  const leftNormalized = normalizeKey(left);
  const rightNormalized = normalizeKey(right);

  if (!leftNormalized || !rightNormalized) {
    return false;
  }

  return (
    leftNormalized === rightNormalized ||
    singularize(leftNormalized) === singularize(rightNormalized)
  );
};

const normalizeAction = (action: string): string => normalizeKey(action);

const actionMatches = (storedAction: string, requiredAction: string): boolean => {
  const normalizedRequired = normalizeAction(requiredAction);
  const aliasCandidates = ACTION_ALIASES[normalizedRequired] ?? [requiredAction];

  return aliasCandidates.some((candidate) =>
    keysMatch(storedAction, candidate),
  );
};

const sanitizePermissions = (source: unknown): PermissionsMap => {
  if (!isRecord(source)) {
    return {};
  }

  const root = isRecord(source.permissions) ? source.permissions : source;
  const sanitized: PermissionsMap = {};

  Object.entries(root).forEach(([moduleName, screens]) => {
    if (!isRecord(screens)) {
      return;
    }

    const sanitizedScreens: Record<string, string[]> = {};

    Object.entries(screens).forEach(([screenName, actions]) => {
      if (!Array.isArray(actions)) {
        return;
      }

      const actionList = actions
        .map((action) => String(action ?? "").trim().toLowerCase())
        .filter(Boolean);

      if (actionList.length > 0) {
        sanitizedScreens[screenName] = actionList;
      }
    });

    if (Object.keys(sanitizedScreens).length > 0) {
      sanitized[moduleName] = sanitizedScreens;
    }
  });

  return sanitized;
};

const sanitizePermissionDetails = (source: unknown): PermissionDetailsMap => {
  if (!isRecord(source)) {
    return {};
  }

  const root = isRecord(source.permission_details) ? source.permission_details : source;
  const sanitized: PermissionDetailsMap = {};

  Object.entries(root).forEach(([moduleName, screens]) => {
    if (!isRecord(screens)) {
      return;
    }
    sanitized[moduleName] = screens;
  });

  return sanitized;
};

const sanitizeColumnPermissionEntry = (
  entry: unknown
): ColumnPermissionEntry | null => {
  if (!isRecord(entry)) {
    return null;
  }

  const fieldName = String(entry.fieldName ?? entry.field_name ?? "").trim();
  const columnId = String(entry.columnId ?? entry.column_id ?? entry.id ?? "").trim();
  const dbColumn = String(entry.dbColumn ?? entry.db_column ?? "").trim();
  const displayName = String(entry.displayName ?? entry.display_name ?? "").trim();

  if (!fieldName && !columnId && !dbColumn && !displayName) {
    return null;
  }

  return {
    ...entry,
    uniqueId: String(entry.uniqueId ?? entry.unique_id ?? "").trim() || undefined,
    columnId: columnId || undefined,
    fieldName: fieldName || undefined,
    displayName: displayName || undefined,
    dbColumn: dbColumn || undefined,
    mainScreenName: String(entry.mainScreenName ?? entry.main_screen_name ?? "").trim() || undefined,
    userScreenName: String(entry.userScreenName ?? entry.user_screen_name ?? "").trim() || undefined,
    canView: Boolean(entry.canView ?? entry.can_view ?? entry.is_active ?? true),
  };
};

const sanitizeColumnPermissions = (source: unknown): ColumnPermissionsPayload => {
  if (!isRecord(source)) {
    return { grouped: {}, flat: [] };
  }

  const root = isRecord(source.column_permissions) ? source.column_permissions : source;
  const flatSource = Array.isArray(root.flat) ? root.flat : [];
  const flat = flatSource
    .map(sanitizeColumnPermissionEntry)
    .filter((entry): entry is ColumnPermissionEntry => Boolean(entry));

  const grouped: ColumnPermissionsPayload["grouped"] = {};
  const groupedSource = isRecord(root.grouped) ? root.grouped : {};

  Object.entries(groupedSource).forEach(([moduleName, screens]) => {
    if (!isRecord(screens)) {
      return;
    }

    Object.entries(screens).forEach(([screenName, entries]) => {
      if (!Array.isArray(entries)) {
        return;
      }

      const sanitizedEntries = entries
        .map(sanitizeColumnPermissionEntry)
        .filter((entry): entry is ColumnPermissionEntry => Boolean(entry));

      if (sanitizedEntries.length > 0) {
        grouped[moduleName] = grouped[moduleName] ?? {};
        grouped[moduleName][screenName] = sanitizedEntries;
      }
    });
  });

  if (Object.keys(grouped).length === 0) {
    flat.forEach((entry) => {
      const moduleName = String(entry.mainScreenName ?? "").trim();
      const screenName = String(entry.userScreenName ?? "").trim();
      if (!moduleName || !screenName) {
        return;
      }
      grouped[moduleName] = grouped[moduleName] ?? {};
      grouped[moduleName][screenName] = grouped[moduleName][screenName] ?? [];
      grouped[moduleName][screenName].push(entry);
    });
  }

  return { grouped, flat };
};

export const getStoredPermissions = (): PermissionsMap => {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return sanitizePermissions(parsed);
  } catch {
    return {};
  }
};

export const getStoredPermissionDetails = (): PermissionDetailsMap => {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(PERMISSION_DETAILS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return sanitizePermissionDetails(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const getStoredColumnPermissions = (): ColumnPermissionsPayload => {
  if (typeof window === "undefined") {
    return { grouped: {}, flat: [] };
  }

  const raw = localStorage.getItem(COLUMN_PERMISSIONS_STORAGE_KEY);
  if (!raw) {
    return { grouped: {}, flat: [] };
  }

  try {
    return sanitizeColumnPermissions(JSON.parse(raw));
  } catch {
    return { grouped: {}, flat: [] };
  }
};

export const setStoredPermissions = (permissions: unknown): void => {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizePermissions(permissions);
  if (Object.keys(sanitized).length === 0) {
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    return;
  }

  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(sanitized));
};

export const setStoredPermissionDetails = (permissionDetails: unknown): void => {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizePermissionDetails(permissionDetails);
  if (Object.keys(sanitized).length === 0) {
    localStorage.removeItem(PERMISSION_DETAILS_STORAGE_KEY);
    return;
  }

  localStorage.setItem(PERMISSION_DETAILS_STORAGE_KEY, JSON.stringify(sanitized));
};

export const setStoredColumnPermissions = (columnPermissions: unknown): void => {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeColumnPermissions(columnPermissions);
  if (sanitized.flat.length === 0 && Object.keys(sanitized.grouped).length === 0) {
    localStorage.removeItem(COLUMN_PERMISSIONS_STORAGE_KEY);
    return;
  }

  localStorage.setItem(COLUMN_PERMISSIONS_STORAGE_KEY, JSON.stringify(sanitized));
};

export const clearStoredPermissions = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
};

export const getStoredPermissionDetails = (): PermissionDetailsMap => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(PERMISSION_DETAILS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PermissionDetailsMap;
  } catch {
    return {};
  }
};

export const setStoredPermissionDetails = (details: unknown): void => {
  if (typeof window === "undefined") return;
  if (!details || typeof details !== "object") {
    localStorage.removeItem(PERMISSION_DETAILS_STORAGE_KEY);
    return;
  }
  localStorage.setItem(PERMISSION_DETAILS_STORAGE_KEY, JSON.stringify(details));
};

const resolveModuleEntry = (
  permissions: PermissionsMap,
  moduleName: string,
): Record<string, string[]> | undefined => {
  if (permissions[moduleName]) {
    return permissions[moduleName];
  }

  const aliasCandidates = [
    moduleName,
    ...(MODULE_ALIASES[moduleName] ?? []),
    ...(MODULE_ALIASES[normalizeKey(moduleName)] ?? []),
  ];

  const moduleKey = Object.keys(permissions).find((key) =>
    aliasCandidates.some((candidate) => keysMatch(key, candidate)),
  );

  return moduleKey ? permissions[moduleKey] : undefined;
};

const resolveScreenActions = (
  moduleEntry: Record<string, string[]>,
  screenName: string,
): string[] | undefined => {
  if (moduleEntry[screenName]) {
    return moduleEntry[screenName];
  }

  const aliasCandidates = [
    screenName,
    ...(SCREEN_ALIASES[screenName] ?? []),
    ...(SCREEN_ALIASES[normalizeKey(screenName)] ?? []),
  ];

  const screenKey = Object.keys(moduleEntry).find((key) =>
    aliasCandidates.some((candidate) => keysMatch(key, candidate)),
  );

  return screenKey ? moduleEntry[screenKey] : undefined;
};

const isStoredSuperAdmin = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const role = String(localStorage.getItem("user_role") ?? "").trim().toLowerCase();
  return role === "superadmin" || role === "super_admin";
};

const resolveColumnEntries = (
  columnPermissions: ColumnPermissionsPayload,
  moduleName: string,
  screenName: string,
): ColumnPermissionEntry[] => {
  const moduleEntry = resolveModuleEntry(
    columnPermissions.grouped as unknown as Record<string, Record<string, string[]>>,
    moduleName,
  ) as unknown as Record<string, ColumnPermissionEntry[]> | undefined;

  if (!moduleEntry) {
    return [];
  }

  if (Array.isArray(moduleEntry[screenName])) {
    return moduleEntry[screenName];
  }

  const aliasCandidates = [
    screenName,
    ...(SCREEN_ALIASES[screenName] ?? []),
    ...(SCREEN_ALIASES[normalizeKey(screenName)] ?? []),
  ];

  const screenKey = Object.keys(moduleEntry).find((key) =>
    aliasCandidates.some((candidate) => keysMatch(key, candidate)),
  );

  return screenKey ? moduleEntry[screenKey] ?? [] : [];
};

const columnEntryMatches = (
  entry: ColumnPermissionEntry,
  fieldName: string,
): boolean => {
  const candidates = [
    entry.fieldName,
    entry.dbColumn,
    entry.displayName,
    entry.columnId,
    entry.uniqueId,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return candidates.some((candidate) => keysMatch(candidate, fieldName));
};

export const hasPermission = (
  moduleName: string,
  screenName: string,
  action: PermissionAction,
  permissions: PermissionsMap = getStoredPermissions(),
): boolean => {
  if (!moduleName || !screenName || !action) {
    return false;
  }

  const moduleEntry = resolveModuleEntry(permissions, moduleName);
  if (!moduleEntry) {
    return false;
  }

  const actionList = resolveScreenActions(moduleEntry, screenName);
  if (!actionList?.length) {
    return false;
  }

  const normalizedAction = String(action).trim().toLowerCase();
  if (actionList?.includes(normalizedAction)) {
    return true;
  }

  return actionList.some((storedAction) => actionMatches(storedAction, action));
};

export const hasColumnPermission = (
  moduleName: string,
  screenName: string,
  fieldName: string,
  columnPermissions: ColumnPermissionsPayload = getStoredColumnPermissions(),
): boolean => {
  if (!moduleName || !screenName || !fieldName) {
    return false;
  }

  if (isStoredSuperAdmin()) {
    return true;
  }

  const entries = resolveColumnEntries(columnPermissions, moduleName, screenName);
  if (entries.length === 0) {
    return true;
  }

  const matched = entries.find((entry) => columnEntryMatches(entry, fieldName));
  return matched ? matched.canView !== false : false;
};

export const filterVisibleColumns = <TColumn>(
  moduleName: string,
  screenName: string,
  columns: TColumn[],
  getFieldName: (column: TColumn) => string,
  columnPermissions: ColumnPermissionsPayload = getStoredColumnPermissions(),
): TColumn[] =>
  columns.filter((column) =>
    hasColumnPermission(moduleName, screenName, getFieldName(column), columnPermissions),
  );

export const hasSidebarPermission = (
  moduleName: string,
  screenName: string,
  permissions: PermissionsMap = getStoredPermissions(),
): boolean => hasPermission(moduleName, screenName, "show", permissions);

const decodeSegmentOrRaw = (segment: string | undefined): string => {
  if (!segment) {
    return "";
  }
  return decryptSegment(segment) ?? segment;
};

export const hasAnyPermission = (
  action: PermissionAction = "view",
  permissions: PermissionsMap = getStoredPermissions(),
): boolean =>
  Object.entries(permissions).some(([, screens]) =>
    Object.entries(screens).some(([, actions]) =>
      actions?.some((storedAction) => actionMatches(storedAction, action)),
    ),
  );

export const hasRoutePermission = (
  pathName: string,
  action: PermissionAction = "view",
  permissions: PermissionsMap = getStoredPermissions(),
): boolean => {
  const safePath = String(pathName ?? "").trim();
  if (!safePath) {
    return false;
  }

  if (safePath === "/admin") {
    return true;
  }

  const [masterSegment, moduleSegment] = safePath.split("/").filter(Boolean);
  const master = decodeSegmentOrRaw(masterSegment);
  const moduleName = decodeSegmentOrRaw(moduleSegment);

  if (!master || !moduleName) {
    return false;
  }

  const moduleCandidates = [
    master,
    ...(MODULE_ALIASES[master] ?? []),
    ...(MODULE_ALIASES[normalizeKey(master)] ?? []),
  ];

  const hasScopedPermission = moduleCandidates.some((candidateModule) =>
    hasPermission(candidateModule, moduleName, action, permissions),
  );

  return hasScopedPermission;
};

/* ========================
   API Integration
======================== */

type PermissionsAPIResponse = {
  permissions?: PermissionsMap;
  permission_details?: PermissionDetailsMap;
};

/**
 * Fetch permissions from the backend API
 * Requires Bearer token authentication
 */
export const fetchPermissionsFromAPI = async (): Promise<PermissionsMap> => {
  try {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      // console.warn("[Permissions API] ⚠️ No access token found");
      return {};
    }

    const apiBaseUrl = import.meta.env.VITE_API_LOCAL || import.meta.env.VITE_API_PROD;
    if (!apiBaseUrl) {
      console.error("[Permissions API] ❌ API base URL not configured");
      return {};
    }

    const url = `${apiBaseUrl}/${adminEndpoints.userpermission}/`;
    
    // console.log(`[Permissions API] 📡 Fetching from: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[Permissions API] ❌ HTTP ${response.status}: ${response.statusText}`);
      return {};
    }

    const data = (await response.json()) as PermissionsAPIResponse;

    const permissions = sanitizePermissions(data);

    // Store as fallback
    setStoredPermissions(permissions);

    if (data.permission_details) {
      setStoredPermissionDetails(data.permission_details);
    }

    return permissions;
  } catch (error) {
    console.error("[Permissions API] ❌ Error fetching permissions:", error);
    return {};
  }
};

