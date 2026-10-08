// Response shapes of GET /dashboards/admin/ and /dashboards/superadmin/
// (iwms-backend app/viewsets/dashboard/*_dashboard_viewset.py and
// app/services/dashboard_metrics.py).

export type CountMap = Record<string, number>;

export type TripKpis = {
  total: number;
  completed: number;
  in_progress: number;
  scheduled: number;
  cancelled: number;
  completion_rate: number;
  approval: CountMap;
  by_collection_type: Record<string, { total: number; completed: number }>;
  vehicles_used: number;
  teams_used: number;
  avg_duration_min: number;
  on_time: number;
  late_start: number;
  on_time_rate: number;
  per_day: number;
};

export type Operations = {
  trips: TripKpis;
  trip_logs: {
    total: number;
    verified: number;
    unverified: number;
    verification_rate: number;
    bin_kg: number;
    household_kg: number;
    total_kg: number;
  };
  waste: {
    total_kg: number;
    total_tons: number;
    household_kg: number;
    bin_kg: number;
    avg_kg_per_day: number;
    avg_kg_per_trip: number;
    by_waste_type: { name: string; kg: number; share: number }[];
  };
  households: {
    weighments: number;
    customers_served: number;
    planned_stops: number;
    collected: number;
    status: CountMap;
    coverage_rate: number;
  };
  bins: {
    events: number;
    collected: number;
    distinct_bins_collected: number;
    status: CountMap;
  };
  collection_points: {
    planned: number;
    collected: number;
    status: CountMap;
    coverage_rate: number;
  };
  exceptions: {
    breakdowns: number;
    breakdown_status: CountMap;
    breakdown_reasons: CountMap;
    retrips: number;
    retrip_status: CountMap;
    delays: number;
    delay_status: CountMap;
    delay_reasons: CountMap;
    avg_delay_min: number;
  };
  complaints: {
    raised: number;
    resolved: number;
    closed: number;
    open: number;
    escalated_open: number;
    overdue_open: number;
    reopened: number;
    by_status: CountMap;
  };
  attendance: {
    staff: number;
    avg_present: number;
    attendance_rate: number;
    present_last_day: number;
  };
};

export type Fleet = {
  total: number;
  active: number;
  on_trip_last_day: number;
  idle_last_day: number;
  insurance_expired: number;
  insurance_due_30d: number;
  open_breakdowns: number;
};

export type StaffSummary = {
  total: number;
  active: number;
  login_enabled: number;
  approved: number;
  pending: number;
  by_role: CountMap;
};

export type DailyRow = {
  date: string;
  trips: number;
  trips_completed: number;
  trip_logs: number;
  household_kg: number;
  bin_kg: number;
  total_kg: number;
  households_collected: number;
  bins_collected: number;
  breakdowns: number;
  complaints: number;
  present: number;
};

export type Ranked = { id: string; name: string; kg: number; trips?: number; collections?: number };

export type ProjectRow = {
  project_id: string;
  project_name: string;
  company_id: string;
  company_name?: string;
  is_active?: boolean;
  trips: number;
  trips_completed: number;
  completion_rate: number;
  trip_logs: number;
  household_kg: number;
  bin_kg: number;
  total_kg: number;
  bins_collected: number;
  breakdowns: number;
  open_complaints: number;
  staff: number;
  vehicles: number;
  customers: number;
  bins: number;
  screens_enabled?: number;
  integrations?: Record<"gps" | "weighment" | "attendance", boolean>;
};

export type MasterRow = {
  key: string;
  label: string;
  group: string;
  level: "project" | "company" | "global";
  total: number;
  active: number;
  inactive: number;
  by_project?: CountMap;
  by_company?: CountMap;
};

export type DateScope = { from_date: string; to_date: string; days: number };

export type AdminDashboardData = {
  scope: DateScope & {
    company_id: string | null;
    company_name: string;
    /** Companies picked in the filter; empty = all. */
    company_ids: string[];
    project_id: string | null;
    project_name: string;
    /** Projects picked in the filter; empty = all. */
    project_ids: string[];
  };
  filters: {
    can_pick_company: boolean;
    companies: { id: string; name: string }[];
    projects: { id: string; name: string; company_id: string; company_name: string }[];
  };
  operations: Operations;
  fleet: Fleet;
  staff: StaffSummary;
  daily: DailyRow[];
  top: { vehicles: Ranked[]; drivers: Ranked[]; plbs: Ranked[]; wards: Ranked[] };
  projects: ProjectRow[];
  masters: MasterRow[];
  generated_at: string;
};

export type CompanyRow = {
  company_id: string;
  company_name: string;
  is_active: boolean;
  projects: number;
  projects_active: number;
  staff: number;
  staff_active: number;
  staff_login_enabled: number;
  staff_pending: number;
  staff_configured: number;
  staff_without_grants: number;
  avg_grants_per_staff: number;
  screens_enabled: number;
  modules_enabled: number;
  screen_coverage: number;
  customers: number;
  vehicles: number;
  bins: number;
  trips: number;
  trips_completed: number;
  completion_rate: number;
  trip_logs: number;
  total_kg: number;
  breakdowns: number;
  open_complaints: number;
  logins: number;
  failed_logins: number;
  last_login: string | null;
};

export type CompanyGrant = {
  company_id: string;
  company_name: string;
  project_id: string | null;
  project_name: string;
  screens_enabled: number;
  coverage: number;
  modules: {
    module: string;
    label: string;
    screens: { name: string; label: string; actions: string[] }[];
  }[];
};

export type SuperadminDashboardData = {
  scope: DateScope;
  platform: {
    companies: number;
    companies_active: number;
    projects: number;
    projects_active: number;
    customers: number;
    vehicles: number;
    platform_admins: number;
    staff_access_configs: number;
    modules: number;
    screens: number;
    screens_seeded: number;
    app_modules: number;
    integrations: Record<"gps" | "weighment" | "attendance", number>;
  };
  operations: Operations;
  staff: StaffSummary;
  fleet: Fleet;
  daily: DailyRow[];
  companies: CompanyRow[];
  projects: ProjectRow[];
  staff_by_role: {
    company_id: string;
    company_name: string;
    project_id: string | null;
    project_name: string;
    role: string;
    staff: number;
  }[];
  permissions: {
    catalog: { module: string; label: string; screens: { name: string; label: string }[] }[];
    company_grants: CompanyGrant[];
    staff_grants: {
      company_id: string;
      company_name: string;
      module: string;
      module_label: string;
      screen: string;
      screen_label: string;
      staff_with_view: number;
    }[];
    changes: {
      total: number;
      by_source: CountMap;
      by_action: CountMap;
      by_company: CountMap;
      per_day: { date: string; changes: number }[];
    };
  };
  activity: {
    logins: number;
    failed_logins: number;
    active_users: number;
    per_day: { date: string; success: number; failed: number }[];
    by_company: {
      company_id: string;
      company_name: string;
      success: number;
      failed: number;
      users: number;
    }[];
  };
  masters: MasterRow[];
  generated_at: string;
};
