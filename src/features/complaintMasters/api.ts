/**
 * API layer for the SUPER ADMIN "complaint-masters" module.
 *
 * These are the *writable* handles for global complaint configuration —
 * Category, Sub-category, SLA rule and the seeded reference tables. None of
 * the underlying tables carry a company/project FK, so a single edit changes
 * behaviour for every tenant; that is why they live behind their own
 * superadmin-only module key instead of inside `complaint-ticket` with the
 * per-company entry screens.
 *
 * The same tables are also reachable through `features/complaintTicketing/api`
 * at their `complaint-ticket/*` paths, but the backend middleware downgrades
 * that module to view-only (see `MODULE_READONLY_RESOURCES` in
 * `module_permission_middleware.py`). Rule of thumb:
 *
 *   - editing configuration  -> import from here
 *   - filling a Desk dropdown -> import from `complaintTicketing/api`
 */
import { adminApi } from "@/helpers/admin/registry";
import type {
  ComplaintCategory,
  ComplaintLanguage,
  ComplaintModule,
  ComplaintPriority,
  ComplaintSlaRule,
  ComplaintSource,
  ComplaintStatus,
  ComplaintSubcategory,
} from "../complaintTicketing/types";

/** Category CRUD — tab 1 of the Complaint Types screen. */
export const complaintMasterCategoryApi =
  adminApi.complaintMasterCategories as typeof adminApi.complaintMasterCategories;

/** Sub-category CRUD — tab 2. Supports `?category=<unique_id>` filtering. */
export const complaintMasterSubcategoryApi =
  adminApi.complaintMasterSubcategories as typeof adminApi.complaintMasterSubcategories;

/** SLA rule CRUD — tab 3. */
export const complaintMasterSlaRuleApi =
  adminApi.complaintMasterSlaRules as typeof adminApi.complaintMasterSlaRules;

/** Routing rules stay API-only: the routing service now falls back to the
 *  category's `default_team`, so rules are an opt-in override rather than a
 *  required setup step and get no screen until a tenant needs geo routing. */
export const complaintMasterRoutingRuleApi =
  adminApi.complaintMasterRoutingRules as typeof adminApi.complaintMasterRoutingRules;

// ── Seeded reference tables (System Reference screen; read-only in the UI) ──
export const complaintMasterModuleApi =
  adminApi.complaintMasterModules as typeof adminApi.complaintMasterModules;
export const complaintMasterPriorityApi =
  adminApi.complaintMasterPriorities as typeof adminApi.complaintMasterPriorities;
export const complaintMasterStatusApi =
  adminApi.complaintMasterStatuses as typeof adminApi.complaintMasterStatuses;
export const complaintMasterSourceApi =
  adminApi.complaintMasterSources as typeof adminApi.complaintMasterSources;
export const complaintMasterLanguageApi =
  adminApi.complaintMasterLanguages as typeof adminApi.complaintMasterLanguages;

export const complaintMastersApi = {
  categories: complaintMasterCategoryApi,
  subcategories: complaintMasterSubcategoryApi,
  slaRules: complaintMasterSlaRuleApi,
  routingRules: complaintMasterRoutingRuleApi,
  modules: complaintMasterModuleApi,
  priorities: complaintMasterPriorityApi,
  statuses: complaintMasterStatusApi,
  sources: complaintMasterSourceApi,
  languages: complaintMasterLanguageApi,
};

export type {
  ComplaintCategory,
  ComplaintLanguage,
  ComplaintModule,
  ComplaintPriority,
  ComplaintSlaRule,
  ComplaintSource,
  ComplaintStatus,
  ComplaintSubcategory,
};
