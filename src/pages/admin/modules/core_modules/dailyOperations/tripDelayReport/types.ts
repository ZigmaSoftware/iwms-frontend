/** Mirrors TripDelayReportSerializer on the backend. */

export type TripDelayStatus = "REPORTED" | "ACKNOWLEDGED" | "RESOLVED";

export const DELAY_STATUS_LABELS: Record<TripDelayStatus, string> = {
  REPORTED: "Reported",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
};

/**
 * Reason codes as declared in TripDelayReport.DELAY_REASON_CHOICES. The API
 * also returns `delay_reason_display`, which is what the table renders — this
 * map exists for the filter dropdown, where we need the codes.
 */
export const DELAY_REASON_LABELS: Record<string, string> = {
  PUNCTURE: "Puncture / Tyre",
  MINOR_REPAIR: "Minor Repair",
  TRAFFIC: "Traffic",
  ROAD_BLOCKED: "Road Blocked",
  FUEL: "Refuelling",
  WEATHER: "Weather",
  PUBLIC_OBSTRUCTION: "Public Obstruction",
  WAITING_AT_PLANT: "Waiting at Plant",
  OTHER: "Other",
};

export interface TripDelayReportRecord {
  unique_id: string;
  trip_assignment_id: string;
  trip_date: string | null;
  vehicle_no: string | null;
  reported_by: string | null;
  reported_by_name: string | null;
  delay_reason: string;
  delay_reason_display: string;
  delay_remarks: string;
  estimated_delay_minutes: number | null;
  delay_time: string | null;
  delay_lat: string | null;
  delay_lng: string | null;
  delay_location: string | null;
  status: TripDelayStatus;
  status_display: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  supervisor_remarks: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}
