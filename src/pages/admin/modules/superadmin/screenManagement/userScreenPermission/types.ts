/**
 * Row shape returned by the plain list/retrieve endpoint
 * (CompanyUserScreenPermissionSerializer) — project-based, no role dimension.
 */
export type PermissionRow = {
  unique_id?: unknown;
  company_id?: unknown;
  company_name?: unknown;
  project_id?: unknown;
  project_name?: unknown;
  mainscreen_id?: unknown;
  mainscreen_name?: unknown;
  userscreen_id?: unknown;
  userscreen_name?: unknown;
  userscreenaction_id?: unknown;
  userscreenaction_name?: unknown;
  permission_type?: unknown;
  state_id?: unknown;
  state_name?: unknown;
  district_id?: unknown;
  district_name?: unknown;
  city_id?: unknown;
  city_name?: unknown;
  zone_id?: unknown;
  zone_name?: unknown;
  panchayat_id?: unknown;
  panchayat_name?: unknown;
  ward_id?: unknown;
  ward_name?: unknown;
  order_no?: unknown;
  description?: unknown;
  is_active?: unknown;
  is_deleted?: unknown;
  [key: string]: unknown;
};

/** Screen Permission = action grants; Field Permission = column/field visibility grants. */
export type PermissionType = "screen" | "field";

/** Optional location-scope fields shared by the form and bulk-upload template. */
export type LocationScope = {
  state_id?: string;
  district_id?: string;
  city_id?: string;
  zone_id?: string;
  panchayat_id?: string;
  ward_id?: string;
};

export type LocationScopeNames = {
  state_name?: string;
  district_name?: string;
  city_name?: string;
  zone_name?: string;
  panchayat_name?: string;
  ward_name?: string;
};

/**
 * One row per company + project *name* in the redesigned Screen Management
 * list. A single project name can be backed by several distinct project_ids
 * (duplicate project records) and by both Screen and Field permission
 * types — this row merges all of that into one summary so the UI shows a
 * single "Masters (20)" / "Screens (8)" record instead of one row per
 * underlying (project_id, permission_type) combination.
 */
export type ProjectPermissionSummaryRow = {
  /** Project chosen as the Edit target — the first project_id encountered for this name. */
  project_id: string;
  project_name: string;
  company_id: string;
  company_name: string;
  main_screen_count: number;
  screen_count: number;
  permission_type_label: string;
  /** Permission type to default the edit form to (prefers "screen" when both are present). */
  edit_permission_type: string;
  /** Every (project_id, permission_type, mainscreen_id) triple folded into this row — needed to delete the whole merged group. */
  delete_targets: { project_id: string; permission_type: string; mainscreen_id: string }[];
  composite_key: string;
};

export type MainScreen = {
  unique_id?: unknown;
  mainscreen_name?: unknown;
  [key: string]: unknown;
};

export type UserScreenAction = {
  unique_id?: unknown;
  action_name?: unknown;
  [key: string]: unknown;
};

export type Option = {
  value: string;
  label: string;
  userTypeId?: string;
};

export type PermissionScreen = {
  userscreen_id: string;
  userscreen_name?: string;
  /** API returns actionIds (not actions) */
  actionIds?: string[];
  /** Backward-compat alias some callers may use */
  actions?: string[];
  /** Saved column permissions */
  columnIds?: string[];
};

export type PermissionResponse = {
  screens: PermissionScreen[];
  description?: string;
};

export type ScreenMatrixRow = {
  userscreen_id: string;
  userscreen_name: string;
  actions: string[];
  columnIds: string[];
};

export type ApiUserScreen = {
  unique_id?: string;
  userscreen_name?: string;
  mainscreen_id?: string;
  order_no?: number;
  is_active?: boolean;
  is_deleted?: boolean;
  [key: string]: unknown;
};

export type UserScreenColumnRecord = {
  unique_id: string;
  field_name: string;
  display_name: string;
  data_type: string;
  order_no: number;
  is_required: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
};
