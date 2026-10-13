/** Shapes served by audits/audit-dashboard — app/services/audit_dashboard.py. */

export type AuditModuleKey = "common" | "login" | "access" | "route" | "complaint";

export type AuditDashboardSummary = {
  date_from: string;
  date_to: string;
  days: number;
  /** Keyed per trail, e.g. common: total / updates / deletions / active_users. */
  kpis: Record<string, number | null>;
  previous_total: number;
  trend: { date: string; count: number }[];
  breakdown: { key: string; label: string; count: number }[];
};

/** One table row, flattened per trail; the column definitions pick fields. */
export type AuditDashboardRow = {
  id: string | number;
  date: string | null;
  [field: string]: string | number | boolean | null | undefined;
};

export type AuditDashboardPage = {
  count: number;
  page: number;
  total_pages: number;
  results: AuditDashboardRow[];
};

export type AuditDashboardFilterOptions = {
  companies: { unique_id: string; name: string }[];
  projects: {
    unique_id: string;
    name: string;
    company_id: string;
    company_name: string | null;
  }[];
};
