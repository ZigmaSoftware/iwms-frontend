import { apiForPortal, type Portal } from "@/api";
import {
  clearAdminViewPreference,
  USER_ROLE_STORAGE_KEY,
  normalizeRole,
} from "@/types/roles";
import {
  COLUMN_PERMISSIONS_STORAGE_KEY,
  clearStoredPermissions,
  PERMISSION_DETAILS_STORAGE_KEY,
  PERMISSIONS_STORAGE_KEY,
  setStoredColumnPermissions,
  setStoredPermissionDetails,
  setStoredPermissions,
} from "@/utils/permissions";
import {
  clearLoginSessionTracking,
  getSessionInfo,
  setSessionInfo,
  startLoginSession,
  type SessionResponse,
} from "@/utils/loginSession";
import { sessionStore } from "@/utils/sessionStore";

/* --------------------------------------------------------
   Signed-in user data, held in memory (sessionStore) — never in
   sessionStore. The access token itself is an HttpOnly cookie the
   browser manages; JS never sees it.
-------------------------------------------------------- */

export const USER_STORAGE_KEY = "user";
export const PROFILE_STORAGE_KEY = "profile";
export const PROJECTS_STORAGE_KEY = "projects_config";
export const CONTINENTS_STORAGE_KEY = "continents_config";
export const COUNTRIES_STORAGE_KEY = "countries_config";
export const STATES_STORAGE_KEY = "states_config";
export const DISTRICTS_STORAGE_KEY = "districts_config";
export const CITIES_STORAGE_KEY = "cities_config";
export const ZONES_STORAGE_KEY = "zones_config";
export const PANCHAYATS_STORAGE_KEY = "panchayats_config";
export const WARDS_STORAGE_KEY = "wards_config";

export type ProjectConfig = {
  unique_id: string;
  name: string;
  gps_api_url?: string | null;
  gps_vehicle_history_api?: string | null;
  gps_vehicle_tracking_api?: string | null;
  gps_trip_summary_api?: string | null;
  gps_user_id?: string | null;
  gps_group_name?: string | null;
  gps_provider_name?: string | null;
  gps_fcode?: string | null;
  gps_trip_user_id?: string | null;
  weighment_api_url?: string | null;
  day_wise_weighment_api_url?: string | null;
};

// Scoped location entries returned by login, keyed by whichever "name"
// field that master uses (name for continent/country/state/district/city,
// zone_name/panchayat_name/ward_name for the rest).
export type LocationConfig = {
  unique_id: string;
  name?: string;
  zone_name?: string;
  panchayat_name?: string;
  ward_name?: string;
};

export type AuthUser = {
  unique_id?: string;
  username?: string;
  email?: string;
  role?: string;
  name?: string;
  [key: string]: unknown;
};

export type AuthProfile = {
  company_name?: string;
  branch_name?: string;
  project_id?: string;
  project_unique_id?: string;
  project?: {
    unique_id?: string;
  };
  [key: string]: unknown;
};

export type LoginPayload = SessionResponse & {
  user?: AuthUser;
  role?: string;
  unique_id?: string;
  username?: string;
  name?: string;
  email?: string;
  permissions?: unknown;
  permission_details?: unknown;
  column_permissions?: unknown;
  profile?: AuthProfile;
  projects?: ProjectConfig[];
  continents?: LocationConfig[];
  countries?: LocationConfig[];
  states?: LocationConfig[];
  districts?: LocationConfig[];
  cities?: LocationConfig[];
  zones?: LocationConfig[];
  panchayats?: LocationConfig[];
  wards?: LocationConfig[];
};

export type LoginEnvelope = LoginPayload | {
  success?: boolean;
  message?: string;
  data?: LoginPayload;
};

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};


export const unwrapLoginPayload = (response: LoginEnvelope): LoginPayload => {
  if (response && "data" in response && response.data) {
    return response.data;
  }
  return response as LoginPayload;
};

export const getStoredAuthUser = (): AuthUser | null =>
  safeJsonParse<AuthUser | null>(sessionStore.getItem(USER_STORAGE_KEY), null);

export const getStoredProfile = (): AuthProfile | null =>
  safeJsonParse<AuthProfile | null>(sessionStore.getItem(PROFILE_STORAGE_KEY), null);

export const getStoredProjects = (): ProjectConfig[] =>
  safeJsonParse<ProjectConfig[]>(sessionStore.getItem(PROJECTS_STORAGE_KEY), []);

export const getStoredProjectConfig = (projectId: string): ProjectConfig | null =>
  getStoredProjects().find((p) => p.unique_id === projectId) ?? null;

export const getStoredContinents = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(CONTINENTS_STORAGE_KEY), []);

export const getStoredCountries = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(COUNTRIES_STORAGE_KEY), []);

export const getStoredStates = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(STATES_STORAGE_KEY), []);

export const getStoredDistricts = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(DISTRICTS_STORAGE_KEY), []);

export const getStoredCities = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(CITIES_STORAGE_KEY), []);

export const getStoredZones = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(ZONES_STORAGE_KEY), []);

export const getStoredPanchayats = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(PANCHAYATS_STORAGE_KEY), []);

export const getStoredWards = (): LocationConfig[] =>
  safeJsonParse<LocationConfig[]>(sessionStore.getItem(WARDS_STORAGE_KEY), []);

/** True while the admin / dashboard app has a live (unexpired) session. */
export const isAuthSessionActive = (): boolean => {
  const exp = getSessionInfo("admin")?.exp;
  if (exp === undefined || !getStoredAuthUser()) return false;
  return !exp || exp > Math.floor(Date.now() / 1000);
};

export const persistLoginSession = (payload: LoginPayload, isRestore = false): void => {
  sessionStore.removeItem(PERMISSIONS_STORAGE_KEY);
  sessionStore.removeItem(PERMISSION_DETAILS_STORAGE_KEY);
  sessionStore.removeItem(COLUMN_PERMISSIONS_STORAGE_KEY);

  const user: AuthUser = payload.user ?? {
    unique_id: payload.unique_id,
    username: payload.username ?? payload.name,
    email: payload.email,
    role: payload.role,
  };
  const profile = payload.profile ?? null;
  const role = normalizeRole(user.role ?? payload.role ?? null);

  // A restore keeps the idle clock where it was; a fresh login starts it.
  if (isRestore) setSessionInfo("admin", payload);
  else startLoginSession("admin", payload);
  sessionStore.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  if (role) sessionStore.setItem(USER_ROLE_STORAGE_KEY, role);
  if (user.unique_id) sessionStore.setItem("unique_id", String(user.unique_id));

  setStoredPermissions(payload.permissions ?? {});
  setStoredPermissionDetails(payload.permission_details ?? {});
  setStoredColumnPermissions(payload.column_permissions ?? {});

  if (profile) {
    sessionStore.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    const projectId =
      profile.project_id ??
      profile.project_unique_id ??
      profile.project?.unique_id;
    if (projectId) {
      sessionStore.setItem("project_id", String(projectId));
    } else {
      sessionStore.removeItem("project_id");
    }
  } else {
    sessionStore.removeItem(PROFILE_STORAGE_KEY);
    sessionStore.removeItem("project_id");
  }

  const projects = payload.projects ?? [];
  if (projects.length > 0) {
    sessionStore.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } else {
    sessionStore.removeItem(PROJECTS_STORAGE_KEY);
  }

  const locationEntries: [string, LocationConfig[] | undefined][] = [
    [CONTINENTS_STORAGE_KEY, payload.continents],
    [COUNTRIES_STORAGE_KEY, payload.countries],
    [STATES_STORAGE_KEY, payload.states],
    [DISTRICTS_STORAGE_KEY, payload.districts],
    [CITIES_STORAGE_KEY, payload.cities],
    [ZONES_STORAGE_KEY, payload.zones],
    [PANCHAYATS_STORAGE_KEY, payload.panchayats],
    [WARDS_STORAGE_KEY, payload.wards],
  ];
  for (const [key, entries] of locationEntries) {
    if (entries && entries.length > 0) {
      sessionStore.setItem(key, JSON.stringify(entries));
    } else {
      sessionStore.removeItem(key);
    }
  }
};

export const clearAuthSession = (): void => {
  clearLoginSessionTracking("admin");
  sessionStore.removeItem(USER_STORAGE_KEY);
  sessionStore.removeItem(PROFILE_STORAGE_KEY);
  sessionStore.removeItem(USER_ROLE_STORAGE_KEY);
  sessionStore.removeItem("unique_id");
  sessionStore.removeItem("user_name");
  sessionStore.removeItem("user_email");
  // Company context keys (used by useCompanyProjectSelection)
  sessionStore.removeItem("company_unique_id");
  sessionStore.removeItem("current_company_unique_id");
  sessionStore.removeItem("selected_company_unique_id");
  // Project context keys
  sessionStore.removeItem("project_id");
  sessionStore.removeItem("project_unique_id");
  sessionStore.removeItem("current_project_id");
  sessionStore.removeItem("selected_project_id");
  sessionStore.removeItem(PROJECTS_STORAGE_KEY);
  sessionStore.removeItem(CONTINENTS_STORAGE_KEY);
  sessionStore.removeItem(COUNTRIES_STORAGE_KEY);
  sessionStore.removeItem(STATES_STORAGE_KEY);
  sessionStore.removeItem(DISTRICTS_STORAGE_KEY);
  sessionStore.removeItem(CITIES_STORAGE_KEY);
  sessionStore.removeItem(ZONES_STORAGE_KEY);
  sessionStore.removeItem(PANCHAYATS_STORAGE_KEY);
  sessionStore.removeItem(WARDS_STORAGE_KEY);
  clearStoredPermissions();
  clearAdminViewPreference();
};

/* --------------------------------------------------------
   District and local body portals keep their own, smaller sessions
   alongside the admin one.
-------------------------------------------------------- */
export const DISTRICT_KEYS = {
  uniqueId: "district_unique_id",
  name: "district_name",
  userName: "district_user_name",
} as const;

export const LOCAL_BODY_KEYS = {
  panchayatId: "lb_panchayat_unique_id",
  panchayatName: "lb_panchayat_name",
  leaderName: "lb_leader_name",
  role: "lb_role",
} as const;

/** Store a district login. Throws when the user has no district. */
export const persistDistrictSession = (payload: LoginPayload, isRestore = false): void => {
  const profile = (payload.profile ?? {}) as Record<string, string | undefined>;
  const districtId = profile.district_unique_id;
  const districtName = profile.district_name;
  if (!districtId || !districtName) {
    throw new Error("This user is not assigned to a district.");
  }
  sessionStore.setItem(DISTRICT_KEYS.uniqueId, districtId);
  sessionStore.setItem(DISTRICT_KEYS.name, districtName);
  sessionStore.setItem(
    DISTRICT_KEYS.userName,
    profile.employee_name ?? profile.name ?? payload.name ?? "",
  );
  if (isRestore) setSessionInfo("district", payload);
  else startLoginSession("district", payload);
};

export const clearDistrictSession = (): void => {
  clearLoginSessionTracking("district");
  Object.values(DISTRICT_KEYS).forEach((key) => sessionStore.removeItem(key));
};

export const persistLocalBodySession = (payload: LoginPayload, isRestore = false): void => {
  const profile = (payload.profile ?? {}) as Record<string, string | undefined>;
  if (profile.panchayat_unique_id) {
    sessionStore.setItem(LOCAL_BODY_KEYS.panchayatId, profile.panchayat_unique_id);
    sessionStore.setItem(LOCAL_BODY_KEYS.panchayatName, profile.panchayat_name ?? "");
  }
  sessionStore.setItem(
    LOCAL_BODY_KEYS.leaderName,
    profile.leader_name ?? profile.name ?? payload.name ?? "",
  );
  sessionStore.setItem(LOCAL_BODY_KEYS.role, "panchayat_leader");
  if (isRestore) setSessionInfo("localbody", payload);
  else startLoginSession("localbody", payload);
};

export const clearLocalBodySession = (): void => {
  clearLoginSessionTracking("localbody");
  Object.values(LOCAL_BODY_KEYS).forEach((key) => sessionStore.removeItem(key));
};

const PERSIST_BY_PORTAL: Record<Portal, (payload: LoginPayload, isRestore: boolean) => void> = {
  admin: persistLoginSession,
  district: persistDistrictSession,
  localbody: persistLocalBodySession,
};

/** The portal a URL belongs to, or null for the public /auth pages. */
const portalForPath = (pathname: string): Portal | null => {
  const [first] = pathname.split("/").filter(Boolean);
  if (first === "auth") return null;
  if (first === "district") return "district";
  if (first === "localbody") return "localbody";
  return "admin";
};

/**
 * Rebuild the current portal's session from the auth cookie after a page
 * load. Run once before the app renders; a missing or expired cookie just
 * leaves the user signed out.
 */
export const restoreAuthSession = async (
  pathname = window.location.pathname,
): Promise<void> => {
  const portal = portalForPath(pathname);
  if (!portal) return;
  try {
    const { data } = await apiForPortal(portal).get<LoginPayload>("/login/me/", {
      silent: true,
    });
    PERSIST_BY_PORTAL[portal](data, true);
  } catch {
    /* not signed in */
  }
};
