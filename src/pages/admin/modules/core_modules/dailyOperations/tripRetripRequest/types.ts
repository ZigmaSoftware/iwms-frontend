export type RetripStatus = "Pending" | "Approved" | "Rejected" | "Expired";

/** Mirrors TripRetripRequest.REASON_CODE_CHOICES (backend). */
export type RetripReasonCode =
  | "VEHICLE_FULL"
  | "SHIFT_END"
  | "ROAD_BLOCKED"
  | "WEIGHMENT"
  | "OTHER";

export const RETRIP_REASON_OPTIONS: { value: RetripReasonCode; label: string }[] = [
  { value: "VEHICLE_FULL", label: "Vehicle full" },
  { value: "SHIFT_END", label: "Shift ending" },
  { value: "ROAD_BLOCKED", label: "Road blocked" },
  { value: "WEIGHMENT", label: "Going for weighment" },
  { value: "OTHER", label: "Other" },
];

/** "Other" must be explained in at least this many characters
 *  (TripRetripRequest.OTHER_REASON_MIN_LENGTH). */
export const RETRIP_OTHER_REASON_MIN_LENGTH = 10;

/** Client-side copy of retrip_service.resolve_reason's rule; returns an
 *  error message, or null when the reason is acceptable. */
export const retripReasonError = (code: string, note: string): string | null => {
  if (!code) return "Select a reason.";
  if (code === "OTHER" && note.trim().length < RETRIP_OTHER_REASON_MIN_LENGTH) {
    return `Describe the reason in at least ${RETRIP_OTHER_REASON_MIN_LENGTH} characters.`;
  }
  return null;
};

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

  reason_code: RetripReasonCode | null;
  reason_code_label: string | null;
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
