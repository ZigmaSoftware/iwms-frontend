export type StaffRef = { unique_id?: string; staff_unique_id?: string; employee_name?: string };

export type NamedRef = { unique_id?: string; name?: string; [key: string]: unknown };

export type WasteTypeBreakdownItem = {
  waste_type_id?: string | null;
  waste_type_name?: string | null;
  collected_weight_kg?: string | number | null;
};

export type StaffTemplateDetail = {
  unique_id?: string;
  display_code?: string;
  driver?: StaffRef | null;
  operator?: StaffRef | null;
};

export type StaffTemplateInfo = {
  effective_display_code?: string;
  is_alt?: boolean;
  base?: StaffTemplateDetail | null;
  alt?: StaffTemplateDetail | null;
};

export type DailyTripLogRecord = {
  unique_id: string;
  location?: {
    district?: string | null;
    city?: string | null;
    panchayat?: string | null;
    zone?: string | null;
    local_body_name?: string | null;
    local_body_level?: string | null;
  } | null;
  trip_assignment_id?: string;
  trip_assignment?: NamedRef & {
    display_code?: string;
    zone?: { unique_id?: string; zone_name?: string } | null;
  };
  staff_template?: StaffTemplateInfo | null;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  panchayat?: { unique_id?: string; panchayat_name?: string } | null;
  zone?: { unique_id?: string; zone_name?: string } | null;
  ward?: { unique_id?: string; ward_name?: string }[] | { unique_id?: string; ward_name?: string } | null;
  wards_detail?: { unique_id?: string; ward_name?: string }[];
  collection_points?: {
    unique_id?: string;
    cp_name?: string;
    sequence?: number;
    is_collected?: boolean;
    status?: string;
    collected_weight_kg?: string | number | null;
    waste_type_breakdown?: WasteTypeBreakdownItem[];
  }[];
  waste_type?: NamedRef & { waste_type_name?: string };
  waste_types_detail?: { unique_id?: string; waste_type_name?: string }[];
  waste_type_id?: string;
  waste_type_breakdown?: WasteTypeBreakdownItem[];
  trip_date?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  driver?: StaffRef;
  operator?: StaffRef;
  extra_operators?: StaffRef[];
  collected_weight_kg?: string | number;
  household_collected_weight_kg?: string | number | null;
  household_collections?: {
    unique_id?: string;
    sequence?: number;
    customer_name?: string | null;
    customer_unique_id?: string | null;
    is_collected?: boolean;
    collected_weight_kg?: string | number | null;
    wet_waste?: string | number | null;
    dry_waste?: string | number | null;
    mixed_waste?: string | number | null;
    sanitary_waste?: string | number | null;
    waste_type_breakdown?: WasteTypeBreakdownItem[];
    collected_at?: string | null;
    status?: string;
  }[];
  vehicle?: NamedRef & { vehicle_no?: string };
  bin_ids?: string[];
  bins?: (NamedRef & { bin_name?: string })[];
  remarks?: string | null;
  log_status?: string;
  collection_status?: string;
  verified_by_name?: string | null;
  verified_at?: string | null;
  breakdown_info?: {
    unique_id: string;
    status: string;
    approval_status: string;
    breakdown_reason?: string | null;
    breakdown_time?: string | null;
    breakdown_vehicle_no?: string | null;
    replacement_vehicle_no?: string | null;
    replacement_driver?: string | null;
    replacement_operator?: string | null;
  } | null;
  [key: string]: unknown;
};

/** Log status values per A6 — no "Cancelled" log status exists. */
export type DailyTripLogStatus = "Unverified" | "Verified";

/** Body for `PATCH .../daily-trip-logs/<unique_id>/verify/` (DailyTripLogVerifySerializer). */
export type DailyTripLogVerifyPayload = {
  remarks?: string;
};

/** Body for `PATCH .../daily-trip-logs/<unique_id>/change-status/`. */
export type DailyTripLogChangeStatusPayload = {
  log_status: DailyTripLogStatus;
  remarks?: string;
};
