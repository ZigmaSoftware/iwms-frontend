import { decryptSegment } from "@/utils/routeCrypto";
import { adminEndpoints } from "@/helpers/admin/endpoints";

export type PermissionAction = "view" | "add" | "edit" | "delete" | "show" | string;
export type PermissionsMap = Record<string, Record<string, string[]>>;

type UnknownRecord = Record<string, unknown>;
let permissionApiUnavailable = false;

const ACTION_ALIASES: Record<string, string[]> = {
  // Sidebar checks use "show"; backend commonly stores "view".
  show: ["show", "display", "visible", "view", "list", "read"],
  view: ["view", "list", "read", "show", "display", "visible"],
  add: ["add", "create"],
  edit: ["edit", "update", "change"],
  delete: ["delete", "remove"],
};

const MODULE_ALIASES: Record<string, string[]> = {
  "customer-master": ["customers"],
  customers: ["customer-master"],
  "staff-masters": ["user-creation"],
  "user-creation": ["staff-masters"],
  "common-masters": ["masters"],  
  "masters": ["common-masters"],
};

export const PERMISSIONS_STORAGE_KEY = "permissions";

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

const decodeJwtPayload = (token: string): UnknownRecord | null => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return null;
    }

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const fallbackPermissionsFromTokenOrStorage = (token: string): PermissionsMap => {
  const tokenPayload = decodeJwtPayload(token);
  const tokenPermissions = sanitizePermissions(tokenPayload?.permissions);

  if (Object.keys(tokenPermissions).length > 0) {
    setStoredPermissions(tokenPermissions);
    console.log("[Permissions API] ℹ️ Using permissions from JWT token payload");
    return tokenPermissions;
  }

  const storedPermissions = getStoredPermissions();
  if (Object.keys(storedPermissions).length > 0) {
    console.log("[Permissions API] ℹ️ Using cached permissions from localStorage");
    return storedPermissions;
  }

  return {};
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

export const clearStoredPermissions = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
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

  const screenKey = Object.keys(moduleEntry).find((key) =>
    keysMatch(key, screenName),
  );

  return screenKey ? moduleEntry[screenKey] : undefined;
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
};

/**
 * Fetch permissions from the backend API
 * Requires Bearer token authentication
 */
export const fetchPermissionsFromAPI = async (): Promise<PermissionsMap> => {
  try {
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      console.warn("[Permissions API] ⚠️ No access token found");
      return {};
    }

    if (permissionApiUnavailable) {
      return fallbackPermissionsFromTokenOrStorage(token);
    }

    const apiBaseUrl = import.meta.env.VITE_API_LOCAL || import.meta.env.VITE_API_PROD;
    if (!apiBaseUrl) {
      console.error("[Permissions API] ❌ API base URL not configured");
      return fallbackPermissionsFromTokenOrStorage(token);
    }

    const url = `${apiBaseUrl}/${adminEndpoints.userpermission}/`;
    
    console.log(`[Permissions API] 📡 Fetching from: ${url}`);

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
      if (response.status === 404) {
        permissionApiUnavailable = true;
        console.warn("[Permissions API] ⚠️ /login/my-permissions endpoint not available (404). Falling back to token/storage.");
      }
      return fallbackPermissionsFromTokenOrStorage(token);
    }

    const data = (await response.json()) as PermissionsAPIResponse;
    
    const permissions = sanitizePermissions(data);
    console.log("[Permissions API] ✅ Permissions processed:", permissions);

    if (Object.keys(permissions).length === 0) {
      return fallbackPermissionsFromTokenOrStorage(token);
    }

    // Store as fallback
    setStoredPermissions(permissions);

    return permissions;
  } catch (error) {
    console.error("[Permissions API] ❌ Error fetching permissions:", error);
    const token = localStorage.getItem("access_token");
    if (!token) {
      return {};
    }
    return fallbackPermissionsFromTokenOrStorage(token);
  }
};
