/** One row of the Complaint Audit list — app/services/complaint_audit.py
 *  `summarize_tickets`. Durations are in seconds. */
export type ComplaintAuditRecord = {
  unique_id: string;
  ticket_no: string;
  title?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  priority_name?: string | null;
  source_name?: string | null;
  status_code?: string | null;
  status_name?: string | null;
  reporter_name?: string | null;
  created_by_name?: string | null;
  assigned_staff_name?: string | null;
  created: string;
  first_resolved_at?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  first_resolution_seconds?: number | null;
  total_resolution_seconds?: number | null;
  open_seconds?: number | null;
  resolution_remarks?: string | null;
  reopen_count: number;
  last_reopen_reason?: string | null;
  escalation_count: number;
  max_escalation_level?: number | null;
  auto_escalation_count: number;
  feedback_rating?: number | null;
  feedback_issue_solved?: boolean | null;
  is_deleted: boolean;
  delete_reason?: string | null;
};

export type ComplaintAuditEventType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "ESCALATED"
  | "ASSIGNED"
  | "FEEDBACK"
  | "DELETED";

export type ComplaintAuditEvent = {
  type: ComplaintAuditEventType;
  /** Null only for a delete made before deletes were audited. */
  at: string | null;
  elapsed_seconds?: number | null;
  title: string;
  actor_name?: string | null;
  remarks?: string | null;
  details: Record<string, string | number | boolean | null | undefined>;
};

export type ComplaintStatusDuration = {
  status_code?: string | null;
  status_name?: string | null;
  seconds: number;
  times_entered: number;
};

export type ComplaintAuditDetail = ComplaintAuditRecord & {
  timeline: ComplaintAuditEvent[];
  status_durations: ComplaintStatusDuration[];
};

type Option = { unique_id: string; name: string };

export type ComplaintAuditFilterOptions = {
  companies: Option[];
  projects: Option[];
  statuses: Option[];
  categories: Option[];
};
