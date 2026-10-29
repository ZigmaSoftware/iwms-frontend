// Shapes returned by GET dashboards/fleet-status/ and
// dashboards/fleet-status/<vehicle_id>/ (app/services/vehicle_status.py).

export type VehicleState = "on_trip" | "breakdown" | "scheduled" | "completed" | "idle";

export type CollectionType = "bin_collection" | "household_collection" | "bulk_waste_collection";

export type StopCounts = {
  planned: number;
  collected: number;
  remaining: number;
  missed: number;
  carried: number;
  completion_rate: number;
};

export type StaffRef = {
  id: string;
  name: string;
  emp_id: string | null;
  designation: string | null;
  mobile: string | null;
};

export type Crew = {
  template_id: string;
  code: string | null;
  driver: StaffRef | null;
  operator: StaffRef | null;
  extra_operators: StaffRef[];
};

export type AltCrew = Crew & {
  staff_template_id: string | null;
  from_date: string | null;
  to_date: string | null;
  reason: string | null;
  remarks: string | null;
  approval_status: string;
};

export type StartTiming = {
  /** Minutes after the scheduled time the trip started (negative = early). */
  start_delay_min: number | null;
  /** Started (or still not started) more than 15 minutes after schedule. */
  late: boolean;
  /** Not started yet and this many minutes past schedule. */
  overdue_min: number | null;
};

export type TripBrief = StartTiming & {
  id: string;
  plan_code: string | null;
  /** The trip plan's supervisor. */
  supervisor: StaffRef | null;
  collection_type: CollectionType | null;
  status: string;
  scheduled_time: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
};

export type FleetRow = {
  vehicle_id: string;
  vehicle_no: string;
  vehicle_type: string | null;
  capacity: number | null;
  project_id: string | null;
  project_name: string | null;
  state: VehicleState;
  current_trip: TripBrief | null;
  trips: {
    total: number;
    completed: number;
    in_progress: number;
    scheduled: number;
    cancelled: number;
    late_starts: number;
  };
  first_scheduled_time: string | null;
  first_start_at: string | null;
  /** The vehicle master's supervisor (the trip plan's is on current_trip). */
  supervisor: StaffRef | null;
  driver: StaffRef | null;
  operator: StaffRef | null;
  on_alternative_staff: boolean;
  stops: StopCounts;
  weight_today_kg: number;
  weight_month_kg: number;
  breakdowns: number;
  open_breakdowns: number;
  delays: number;
  open_delays: number;
  delay_minutes: number;
  retrips: number;
  pending_retrips: number;
};

export type FleetData = {
  date: string;
  month_start: string;
  summary: {
    vehicles: number;
    states: Record<VehicleState, number>;
    trips: number;
    trips_completed: number;
    late_starts: number;
    stops: StopCounts;
    weight_today_kg: number;
    weight_month_kg: number;
    breakdowns: number;
    delays: number;
    retrips: number;
    on_alternative_staff: number;
  };
  vehicles: FleetRow[];
  /** True for a supervisor login: only the vehicles under their control. */
  viewer: { supervisor_only: boolean };
  filters: { projects: { id: string; name: string }[]; project_ids: string[] };
};

export type NamedKg = { name: string; kg: number; share?: number };

export type WeightSummary = {
  total_kg: number;
  by_collection_type: Record<CollectionType, number>;
  by_waste_type: NamedKg[];
  by_collection_and_waste_type: Record<CollectionType, NamedKg[]>;
};

export type TripDetail = StartTiming & {
  id: string;
  trip_number: number;
  plan_id: string | null;
  plan_code: string | null;
  supervisor: StaffRef | null;
  collection_type: CollectionType | null;
  waste_types: string[];
  panchayat: string | null;
  wards: string[];
  status: string;
  approval_status: string;
  scheduled_time: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  duration_min: number | null;
  stops: Partial<Record<CollectionType, StopCounts>>;
  stops_total: StopCounts;
  weight_kg: number;
  staff: Crew | null;
  alternative_staff: AltCrew | null;
  remarks: string | null;
};

export type BreakdownRow = {
  id: string;
  trip_id: string | null;
  role: "broke_down" | "replacement";
  date: string;
  reported_at: string | null;
  time: string | null;
  reason: string | null;
  remarks: string | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  approval_status: string;
  broken_vehicle_no: string | null;
  replacement_vehicle_no: string | null;
  replacement_driver: StaffRef | null;
  replacement_operator: StaffRef | null;
  collected_before_kg: number | null;
  continuation_trip_id: string | null;
};

export type RetripRow = {
  id: string;
  trip_id: string;
  trip_date: string;
  requested_at: string | null;
  requested_by: StaffRef | null;
  reason: string;
  status: string;
  pending_bins: number;
  pending_households: number;
  reviewed_at: string | null;
  review_remarks: string | null;
  continuation_trip_id: string | null;
};

export type DelayRow = {
  id: string;
  trip_id: string;
  trip_date: string;
  reported_at: string | null;
  reported_by: StaffRef | null;
  time: string | null;
  reason: string;
  remarks: string;
  estimated_minutes: number | null;
  location: string | null;
  status: string;
  supervisor_remarks: string | null;
};

export type VehicleDetailData = {
  date: string;
  month_start: string;
  vehicle: {
    id: string;
    vehicle_no: string;
    vehicle_type: string | null;
    capacity: number | null;
    condition: string | null;
    insurance_expiry_date: string | null;
    project_id: string | null;
    project_name: string | null;
    is_active: boolean;
    supervisor: StaffRef | null;
  };
  state: VehicleState;
  current_trip_id: string | null;
  last_seen: { lat: number; lng: number; at: string | null; source: string } | null;
  trips: TripDetail[];
  month_trips: { total: number; completed: number; late_starts: number };
  staff: { assigned: Crew[]; alternatives: AltCrew[] };
  stops: {
    total: StopCounts;
    by_collection_type: Record<CollectionType, StopCounts>;
    by_waste_type: (StopCounts & { name: string })[];
  };
  weight: {
    today: WeightSummary;
    month: WeightSummary;
    daily: { date: string; kg: number }[];
  };
  breakdowns: BreakdownRow[];
  retrips: RetripRow[];
  delays: DelayRow[];
};

/** A vehicle's position from the project's GPS provider. */
export type GpsFix = {
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  moving: "running" | "idle" | "parked" | "no_data";
  updatedAt: string;
  location?: string;
};
