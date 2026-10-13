export type SessionState = "active" | "manual" | "idle_timeout" | "token_expired" | "failed";

export type LoginAuditRecord = {
  unique_id?: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  user_unique_id?: string | null;
  username?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  success?: boolean;
  reason?: string | null;
  timestamp?: string | null;
  last_activity_at?: string | null;
  logout_at?: string | null;
  logout_type?: "manual" | "idle_timeout" | "token_expired" | null;
  logout_type_display?: string | null;
  session_state?: SessionState | null;
  session_duration_seconds?: number | null;
  used_hours?: string | null;
  idle_timeout_seconds?: number | null;
  [key: string]: unknown;
};
