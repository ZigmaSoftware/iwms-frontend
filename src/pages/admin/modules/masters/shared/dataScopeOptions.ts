/**
 * Private-module scope compatibility entry point.
 *
 * Government report screens historically import this filename for their geo
 * hierarchy. Private is scoped by Company -> Project instead, so Company and
 * Project calls delegate to companyProjectScopeOptions while legacy geo calls
 * remain unrestricted until the calling screen removes those controls.
 */
import {
  companyProjectScopeFieldState,
  companyProjectScopeOption,
  companyProjectScopeOptions,
  mergeWithCompanyProjectScope,
  mergeWithCompanyProjectScopeExtra,
  type CompanyProjectScopeFieldMode,
  type CompanyProjectScopeLevel,
  type CompanyProjectScopeOption,
} from "./companyProjectScopeOptions";

export type ScopeOption = CompanyProjectScopeOption;
export type ScopeFieldMode = CompanyProjectScopeFieldMode;
export type ScopeLevel =
  | CompanyProjectScopeLevel
  | "state"
  | "district"
  | "area_type"
  | "corporation"
  | "municipality"
  | "town_panchayat"
  | "panchayat_union"
  | "panchayat"
  | "ward";

const isCompanyProjectLevel = (
  level: ScopeLevel,
): level is CompanyProjectScopeLevel =>
  level === "company" || level === "project";

export const scopeOption = (level: ScopeLevel): ScopeOption | null =>
  isCompanyProjectLevel(level) ? companyProjectScopeOption(level) : null;

export const scopeOptions = (level: ScopeLevel): ScopeOption[] =>
  isCompanyProjectLevel(level) ? companyProjectScopeOptions(level) : [];

export const scopeFieldState = (
  level: ScopeLevel,
): { mode: ScopeFieldMode; options: ScopeOption[] } =>
  isCompanyProjectLevel(level)
    ? companyProjectScopeFieldState(level)
    : { mode: "unrestricted", options: [] };

export type ScopeHierarchyRecords = {
  states: Record<string, unknown>[];
  districts: Record<string, unknown>[];
  areaTypes: Record<string, unknown>[];
  corporations: Record<string, unknown>[];
  municipalities: Record<string, unknown>[];
  townPanchayats: Record<string, unknown>[];
  panchayatUnions: Record<string, unknown>[];
  panchayats: Record<string, unknown>[];
  wards: Record<string, unknown>[];
};

/** Private has no Government geo hierarchy embedded in the login scope. */
export const scopeHierarchyRecords = (): ScopeHierarchyRecords => ({
  states: [],
  districts: [],
  areaTypes: [],
  corporations: [],
  municipalities: [],
  townPanchayats: [],
  panchayatUnions: [],
  panchayats: [],
  wards: [],
});

/** Geo local-body choices are not scope-restricted in Private. */
export const filterLocalBodyLevelsByScope = <T extends { value: string }>(
  levels: T[],
): T[] => levels;

export const mergeWithScopeOption = (
  fetched: ScopeOption[],
  level: ScopeLevel,
): ScopeOption[] =>
  isCompanyProjectLevel(level)
    ? mergeWithCompanyProjectScope(fetched, level)
    : fetched;

export const mergeWithScopeOptionExtra = <T extends ScopeOption>(
  fetched: T[],
  level: ScopeLevel,
  extra: Partial<Omit<T, "value" | "label">>,
): T[] =>
  isCompanyProjectLevel(level)
    ? mergeWithCompanyProjectScopeExtra(fetched, level, extra)
    : fetched;

export {
  companyProjectScopeFieldState,
  companyProjectScopeOption,
  companyProjectScopeOptions,
  companyProjectScopeRecords,
  filterProjectsForCompany,
  isPlatformSuperAdmin,
  mergeWithCompanyProjectScope,
  mergeWithCompanyProjectScopeExtra,
} from "./companyProjectScopeOptions";
