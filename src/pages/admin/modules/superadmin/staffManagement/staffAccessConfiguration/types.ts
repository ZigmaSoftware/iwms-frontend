// ─── Staff Access Configuration types ──────────────────────────────────────
// Matches StaffAccessConfigurationSerializer (backend) — read/write shapes.

export type DataScopeForm = {
  project_ids?: string[];
  state_ids?: string[];
  district_ids?: string[];
  city_ids?: string[];
  zone_ids?: string[];
  panchayat_ids?: string[];
  ward_ids?: string[];
};

/** One granted screen's actions — {userscreen_id, action_ids} in write payload. */
export type PermissionGrant = {
  userscreen_id: string;
  action_ids: string[];
};

/** Write payload — POST/PUT body for create/update. */
export type StaffAccessConfigPayload = {
  staff_id?: string;
  company_id: string;
  project_ids: string[];
  state_ids?: string[];
  district_ids?: string[];
  city_ids?: string[];
  zone_ids?: string[];
  panchayat_ids?: string[];
  ward_ids?: string[];
  description?: string;
  permissions: PermissionGrant[];
  basicInfo?: Record<string, unknown>;
  loginConfig?: Record<string, unknown>;
  dataScope?: Record<string, unknown>;
};

/** Currently-saved grant for a screen, as returned in granted_permissions[]. */
export type GrantedPermissionRecord = {
  mainScreenId: string;
  mainScreenName: string;
  userScreenId: string;
  userScreenName: string;
  actionIds: string[];
};

/** Full read response — GET list/retrieve. */
export type StaffAccessConfigRecord = {
  unique_id?: string;
  staff_id?: string;
  staff_unique_id?: string;
  company_id?: string;
  project_ids?: string[];
  state_ids?: string[];
  district_ids?: string[];
  city_ids?: string[];
  zone_ids?: string[];
  panchayat_ids?: string[];
  ward_ids?: string[];
  description?: string;
  permissions?: PermissionGrant[];

  // Read-only derived fields
  staff_name?: string;
  employee_name?: string;
  username?: string;
  contact_mobile?: string | null;
  contact_email?: string | null;
  doj?: string | null;
  user_type_id?: string | null;
  staffusertype_id?: string | null;
  staffusertype_name?: string | null;
  company_name?: string;
  project_names?: string[];
  state_names?: string[];
  district_names?: string[];
  city_names?: string[];
  zone_names?: string[];
  panchayat_names?: string[];
  ward_names?: string[];
  granted_permissions?: GrantedPermissionRecord[];
  main_screen_count?: number;
  screen_count?: number;

  [key: string]: unknown;
};

// ─── available-permissions ceiling response ────────────────────────────────

export type AvailableAction = {
  actionId: string;
  actionName: string;
};

export type AvailableScreen = {
  userScreenId: string;
  userScreenName: string;
  actions: AvailableAction[];
};

export type AvailableMainScreen = {
  mainScreenId: string;
  mainScreenName: string;
  screens: AvailableScreen[];
};

export type AvailableProjectPermissions = {
  projectId: string;
  projectName: string;
  mainscreens: AvailableMainScreen[];
};

export type AvailablePermissionsResponse = {
  company_id: string;
  project_ids: string[];
  projects: AvailableProjectPermissions[];
};

/** Selections tracked by the permission checkbox-tree UI, keyed by userScreenId. */
export type GrantedScreenPermission = {
  userScreenId: string;
  actionIds: string[];
};

// ─── Location option shapes (used by LocationScopeSelector) ────────────────

export type SelectOption = {
  value: string;
  label: string;
};

export type WithStateIdOption = SelectOption & { projectId?: string; stateId?: string };
export type WithDistrictIdOption = SelectOption & {
  projectId?: string;
  stateId?: string;
  districtId?: string;
};
export type WithCityIdOption = SelectOption & {
  projectId?: string;
  stateId?: string;
  districtId?: string;
  cityId?: string;
};
export type ZoneOption = WithCityIdOption;
export type WardOption = WithCityIdOption & {
  panchayatId?: string;
  zoneId?: string;
};

export type UnknownRecord = Record<string, unknown>;

// ─── employee-options (Basic Info tab employee picker) ─────────────────────

export type EmployeeOption = {
  unique_id: string;
  employee_name: string;
  mobile_number?: string | null;
  office_email?: string | null;
  doj?: string | null;
  staffusertype_id?: string | null;
  staffusertype_name?: string | null;
  username?: string | null;
  active_status?: boolean;
  has_access_configuration?: boolean;
};
