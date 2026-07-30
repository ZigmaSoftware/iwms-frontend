// ─── Staff Access Configuration types ──────────────────────────────────────
// Matches StaffAccessConfigurationSerializer (backend) — read/write shapes.

export type DataScopeForm = {
  state_id?: string;
  district_id?: string;
  city_id?: string;
  zone_id?: string;
  panchayat_id?: string;
  ward_id?: string;
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
  project_id: string;
  state_id?: string | null;
  district_id?: string | null;
  city_id?: string | null;
  zone_id?: string | null;
  panchayat_id?: string | null;
  ward_id?: string | null;
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
  project_id?: string;
  state_id?: string | null;
  district_id?: string | null;
  city_id?: string | null;
  zone_id?: string | null;
  panchayat_id?: string | null;
  ward_id?: string | null;
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
  project_name?: string;
  state_name?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  zone_name?: string | null;
  panchayat_name?: string | null;
  ward_name?: string | null;
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

export type AvailablePermissionsResponse = {
  company_id: string;
  project_id: string;
  mainscreens: AvailableMainScreen[];
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

export type WithStateIdOption = SelectOption & { stateId?: string };
export type WithDistrictIdOption = SelectOption & {
  stateId?: string;
  districtId?: string;
};
export type WithCityIdOption = SelectOption & {
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
