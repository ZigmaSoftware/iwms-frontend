import {
  getStoredProfile,
  getStoredProjectConfig,
  getStoredProjects,
  type ProjectConfig,
} from "@/utils/authStorage";
import {
  getCurrentCompanyUniqueId,
  getCurrentProjectId,
} from "@/utils/projectContext";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";

export type CompanyProjectScopeLevel = "company" | "project";

export type CompanyProjectScopeOption = {
  value: string;
  label: string;
};

// Short aliases keep the API familiar to callers migrating from the
// Government dataScopeOptions helper.
export type ScopeLevel = CompanyProjectScopeLevel;
export type ScopeOption = CompanyProjectScopeOption;

export type CompanyProjectScopeFieldMode =
  | "unrestricted"
  | "locked"
  | "choices";
export type ScopeFieldMode = CompanyProjectScopeFieldMode;

export type CompanyProjectScopeRecords = {
  companies: Record<string, unknown>[];
  projects: Record<string, unknown>[];
};

const nonEmptyString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const profileRecord = (): Record<string, unknown> | null => {
  const profile = getStoredProfile();
  return profile ? (profile as Record<string, unknown>) : null;
};

const nestedRecord = (
  record: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null => {
  const value = record?.[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

export const isPlatformSuperAdmin = (): boolean => {
  if (typeof window === "undefined") return false;

  const profile = profileRecord();
  const role = normalizeRole(
    localStorage.getItem(USER_ROLE_STORAGE_KEY) ??
      nonEmptyString(profile?.role),
  );
  return role === "superadmin" || role === "super_admin";
};

const companyOption = (): CompanyProjectScopeOption | null => {
  const companyId = getCurrentCompanyUniqueId();
  if (!companyId) return null;

  const profile = profileRecord();
  const company = nestedRecord(profile, "company");
  const label =
    nonEmptyString(profile?.company_name) ||
    nonEmptyString(company?.name) ||
    companyId;

  return { value: companyId, label };
};

const projectOption = (): CompanyProjectScopeOption | null => {
  const projectId = getCurrentProjectId();
  if (!projectId) return null;

  const stored = getStoredProjectConfig(projectId);
  const profileProject = nestedRecord(profileRecord(), "project");
  const label =
    nonEmptyString(stored?.name) ||
    nonEmptyString(profileProject?.name) ||
    projectId;

  return { value: projectId, label };
};

/** The logged-in user's current Company or Project scope value. */
export const companyProjectScopeOption = (
  level: CompanyProjectScopeLevel,
): CompanyProjectScopeOption | null =>
  level === "company" ? companyOption() : projectOption();

/**
 * Every option available from the login session at the requested level.
 * Platform superadmins are intentionally unrestricted; their full option
 * lists are loaded by useCompanyProjectSelection from the APIs.
 */
export const companyProjectScopeOptions = (
  level: CompanyProjectScopeLevel,
): CompanyProjectScopeOption[] => {
  if (isPlatformSuperAdmin()) return [];

  if (level === "company") {
    const company = companyOption();
    return company ? [company] : [];
  }

  const projects = getStoredProjects()
    .filter((project) => Boolean(nonEmptyString(project.unique_id)))
    .map((project) => ({
      value: project.unique_id,
      label: nonEmptyString(project.name) || project.unique_id,
    }));

  if (projects.length) return projects;
  const project = projectOption();
  return project ? [project] : [];
};

/**
 * Decide whether a Company/Project field is unrestricted, locked to one
 * login-scoped value, or restricted to several login-scoped choices.
 */
export const companyProjectScopeFieldState = (
  level: CompanyProjectScopeLevel,
): {
  mode: CompanyProjectScopeFieldMode;
  options: CompanyProjectScopeOption[];
} => {
  const options = companyProjectScopeOptions(level);
  if (options.length === 0) return { mode: "unrestricted", options };
  if (options.length === 1) return { mode: "locked", options };
  return { mode: "choices", options };
};

/** Lightweight records suitable for Company/Project dropdown fallbacks. */
export const companyProjectScopeRecords = (): CompanyProjectScopeRecords => {
  const company = companyOption();
  const projects = companyProjectScopeOptions("project");

  return {
    companies: company
      ? [{ unique_id: company.value, name: company.label }]
      : [],
    projects: projects.map((project) => ({
      unique_id: project.value,
      name: project.label,
      company_id: company?.value ?? null,
    })),
  };
};

/** Merge fetched options with login-scoped options without duplicates. */
export const mergeWithCompanyProjectScope = (
  fetched: CompanyProjectScopeOption[],
  level: CompanyProjectScopeLevel,
): CompanyProjectScopeOption[] => {
  const fetchedIds = new Set(fetched.map((option) => option.value));
  const scoped = companyProjectScopeOptions(level).filter(
    (option) => !fetchedIds.has(option.value),
  );
  return scoped.length ? [...scoped, ...fetched] : fetched;
};

/** Same merge helper for option types carrying extra metadata. */
export const mergeWithCompanyProjectScopeExtra = <
  T extends CompanyProjectScopeOption,
>(
  fetched: T[],
  level: CompanyProjectScopeLevel,
  extra: Partial<Omit<T, "value" | "label">>,
): T[] => {
  const fetchedIds = new Set(fetched.map((option) => option.value));
  const scoped = companyProjectScopeOptions(level)
    .filter((option) => !fetchedIds.has(option.value))
    .map((option) => ({ ...option, ...extra }) as T);
  return scoped.length ? [...scoped, ...fetched] : fetched;
};

/** Restrict an API project record list to the selected company when possible. */
export const filterProjectsForCompany = <
  T extends ProjectConfig & { company_id?: unknown; company_unique_id?: unknown },
>(projects: T[], companyId: string): T[] => {
  if (!companyId) return projects;
  return projects.filter((project) => {
    const rawCompany = project.company_unique_id ?? project.company_id;
    const projectCompanyId =
      rawCompany && typeof rawCompany === "object"
        ? nonEmptyString((rawCompany as Record<string, unknown>).unique_id)
        : nonEmptyString(rawCompany);
    return !projectCompanyId || projectCompanyId === companyId;
  });
};

export const scopeOption = companyProjectScopeOption;
export const scopeOptions = companyProjectScopeOptions;
export const scopeFieldState = companyProjectScopeFieldState;
export const scopeHierarchyRecords = companyProjectScopeRecords;
export const mergeWithScopeOption = mergeWithCompanyProjectScope;
export const mergeWithScopeOptionExtra = mergeWithCompanyProjectScopeExtra;
