export type RetripStatus = "Pending" | "Approved" | "Rejected" | "Expired";

export interface RetripPendingBin {
  unique_id: string;
  sequence: number | null;
  status: string;
  collection_point_id: string | null;
  name: string | null;
  bin_id: string | null;
}

export interface RetripPendingHousehold {
  unique_id: string;
  sequence: number | null;
  status: string;
  customer_id: string | null;
  name: string | null;
}

export interface RetripPendingSnapshot {
  collection_points: RetripPendingBin[];
  households: RetripPendingHousehold[];
}

export type TripRetripRequestRecord = {
  unique_id: string;
  company_id: string;
  project_id: string;
  assignment: string;
  assignment_unique_id: string;
  trip_date: string;
  scheduled_time: string | null;
  assignment_status: string;
  collection_type: "bin" | "household" | "bulk" | null;
  vehicle_no: string | null;
  area_name: string | null;

  reason: string;
  status: RetripStatus;

  pending_bin_count: number;
  pending_household_count: number;
  pending_snapshot: RetripPendingSnapshot;
  live_pending: RetripPendingSnapshot;

  requested_by: string | null;
  requested_by_name: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_remarks: string | null;

  new_assignment: string | null;

  expires_at: string | null;
  reminder_sent_at: string | null;
  escalated_at: string | null;
  time_remaining_seconds: number;
  urgency: "normal" | "reminder" | "urgent" | "expired" | "decided";

  created_at: string;
  updated_at: string;
};

export const RETRIP_STATUS_LABELS: Record<RetripStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  Expired: "Expired",
};
