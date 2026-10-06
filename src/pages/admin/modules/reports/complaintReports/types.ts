export type ComplaintStatusBucket =
  | "open"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "rejected";

export type ComplaintsReportKpis = {
  total: number;
  open: number;
  in_progress: number;
  escalated: number;
  resolved: number;
  rejected: number;
  pending: number;
  resolved_percent: number;
  sla_compliance_percent: number;
  avg_resolution_hours: number | null;
  zone_count: number;
  ward_count: number;
};

export type ComplaintsReportRow = {
  unique_id: string;
  ticket_no: string;
  created: string;
  category_name: string;
  zone_name: string;
  ward_name: string;
  source_name: string;
  assigned_staff_name: string;
  status_code: string;
  status_name: string;
  status_bucket: ComplaintStatusBucket;
  sla_due_at: string | null;
  resolved_at: string | null;
  resolution_hours: number | null;
  is_breached: boolean;
};

export type DailyTrendPoint = { date: string; received: number; resolved: number };

export type CategoryBreakdownRow = {
  category_id: string;
  category_name: string;
  count: number;
  share_percent: number;
};

export type PendingAgingBucket = {
  key: "0_24" | "24_48" | "48_72" | "72_plus";
  label: string;
  count: number;
};

export type WardBreakdownRow = {
  ward_id: string;
  ward_name: string;
  zone_id: string;
  zone_name: string;
  received: number;
  resolved: number;
  pending: number;
  sla_compliance_percent: number;
};

export type FilterOption = { value: string; label: string };

export type ComplaintsReportResponse = {
  period: { from_date: string; to_date: string };
  kpis: ComplaintsReportKpis;
  status_counts: Record<"all" | "open" | "in_progress" | "escalated" | "resolved", number>;
  daily_trend: DailyTrendPoint[];
  category_breakdown: CategoryBreakdownRow[];
  pending_aging: PendingAgingBucket[];
  ward_breakdown: WardBreakdownRow[];
  filter_options: { categories: FilterOption[]; sources: FilterOption[] };
  results: ComplaintsReportRow[];
  count: number;
};
