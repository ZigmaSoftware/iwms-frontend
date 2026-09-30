export type SnapshotItem = { id: string; name: string };

export type AccessSnapshot = {
  app_modules: SnapshotItem[];
  modules: {
    id: string | null;
    name: string;
    screens: { id: string; name: string; actions: SnapshotItem[] }[];
  }[];
};

export type PermissionAuditRecord = {
  id?: number;
  source?: string;
  source_label?: string | null;
  target_id?: string | null;
  target_name?: string | null;
  app_module_id?: string | null;
  app_module_name?: string | null;
  column_id?: string | null;
  column_name?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  mainscreen_id?: string | null;
  mainscreen_name?: string | null;
  userscreen_id?: string | null;
  userscreen_name?: string | null;
  userscreenaction_id?: string | null;
  userscreenaction_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  is_active?: boolean | null;
  is_deleted?: boolean | null;
  previous_is_active?: boolean | null;
  previous_is_deleted?: boolean | null;
  action_type?: "CREATED" | "UPDATED" | "DELETED" | string;
  http_method?: string | null;
  /** Whole access before/after a Staff or Customer Access save; blank on
   *  per-change (company permission) rows. */
  old_permissions?: AccessSnapshot | null;
  new_permissions?: AccessSnapshot | null;
  granted_count?: number | null;
  revoked_count?: number | null;
  changed_modules?: string[] | null;
  timestamp?: string;
  [key: string]: unknown;
};

export type PermissionAuditFilterOption = {
  unique_id: string;
  name: string;
};

export type PermissionAuditFilterOptions = {
  companies: PermissionAuditFilterOption[];
  projects: PermissionAuditFilterOption[];
  mainscreens: PermissionAuditFilterOption[];
  sources?: PermissionAuditFilterOption[];
};
