export type SelectOption = { value: string; label: string; disabled?: boolean };

export type WardRef = { unique_id?: string; ward_name?: string; zone_id?: string; zone_name?: string };

export type FormState = {
  trip_plan_id: string;
  staff_template_id: string;
  alt_staff_template_id: string;
  zone_id: string;
  panchayat_id: string;
  ward_ids: string[];
  waste_type_ids: string[];
  household_waste_type_ids: string[];
  trip_date: string;
  scheduled_time: string;
  status: string;
  remarks: string;
};

export type CollectionTypeKey = "bin" | "household" | "both" | "unknown";

export type NamedRef = {
  unique_id?: string;
  name?: string;
  [key: string]: unknown;
};

export type DailyTripAssignmentRecord = {
  unique_id: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  trip_plan_id?: string;
  staff_template_id?: string;
  panchayat_id?: string;
  ward_ids?: string[];
  waste_type_ids?: string[];
  trip_plan?: {
    unique_id?: string;
    display_code?: string;
    staff_template_id?: string;
    staff_template?: { unique_id?: string; display_code?: string };
    scheduled_time?: string;
    zone?: NamedRef & { zone_name?: string };
    panchayat?: NamedRef & { panchayat_name?: string };
    wards?: WardRef[];
    has_bin?: boolean;
    has_household?: boolean;
  };
  household_waste_types?: { unique_id?: string; waste_type_name?: string }[];
  collection_types?: { has_bin: boolean; has_household: boolean };
  collection_points?: DailyTripCollectionPointInline[];
  household_collection_points?: DailyTripHouseholdCollectionInline[];
  staff_template?: { unique_id?: string; display_code?: string };
  alt_staff_template?: {
    unique_id?: string;
    display_code?: string;
    from_date?: string;
    to_date?: string;
  } | null;
  effective_staff?: { source?: string; unique_id?: string; display_code?: string } | null;
  panchayat?: NamedRef & { panchayat_name?: string };
  wards?: WardRef[];
  zone?: NamedRef & { zone_name?: string };
  waste_types?: { unique_id?: string; waste_type_name?: string }[];
  // A5: new M2M mirroring TripPlan.waste_types (read-only detail; write via
  // waste_types_ids). Coexists with the legacy JSON-derived `waste_types` above.
  waste_types_detail?: { unique_id?: string; waste_type_name?: string }[];
  trip_date?: string;
  scheduled_time?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  total_trip_time_seconds?: number | null;
  status?: string;
  remarks?: string | null;
  breakdown_info?: {
    unique_id: string;
    status: string;
    approval_status: string;
    breakdown_reason?: string | null;
    breakdown_time?: string | null;
    breakdown_location?: string | null;
    breakdown_vehicle_no?: string | null;
    replacement_vehicle_no?: string | null;
    replacement_driver?: string | null;
    replacement_operator?: string | null;
    new_assignment_id?: string | null;
  } | null;
  retrip_info?: {
    unique_id: string;
    status: "Pending" | "Approved" | "Rejected";
    new_assignment_id?: string | null;
  } | null;
  [key: string]: unknown;
};

export type DailyTripHouseholdCollectionInline = {
  unique_id?: string;
  customer_id?: string;
  customer?: NamedRef & { customer_name?: string; building_no?: string; street?: string };
  sequence?: number;
  is_collected?: boolean;
  collected_at?: string | null;
  collected_weight_kg?: string | number | null;
  wet_waste?: string | number | null;
  dry_waste?: string | number | null;
  mixed_waste?: string | number | null;
  sanitary_waste?: string | number | null;
  status?: string;
};

export type DailyTripCollectionPointInline = {
  unique_id?: string;
  collection_point_id?: string;
  collection_point?: NamedRef & { cp_name?: string };
  bin_id?: string;
  bin?: NamedRef & { bin_name?: string };
  sequence?: number;
  is_collected?: boolean;
  collected_at?: string | null;
  collected_weight_kg?: string | number | null;
  collected_by?: string | null;
  collected_by_staff?: NamedRef & { employee_name?: string };
  status?: string;
};

export type TripPlanRecord = {
  unique_id?: string;
  id?: string;
  zone_id?: unknown;
  ward_ids?: string[];
  panchayat_id?: unknown;
  zone?: NamedRef & { zone_name?: string };
  wards?: WardRef[];
  panchayat?: NamedRef & { panchayat_name?: string };
  waste_type_ids?: string[];
  [key: string]: unknown;
};
