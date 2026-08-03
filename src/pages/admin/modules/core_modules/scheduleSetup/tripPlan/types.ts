import type { FilterMatchMode } from "primereact/api";

export type SelectOption = { value: string; label: string };

export type CollectionMode = "bin_collection" | "household_collection" | "bulk_waste_collection";

export type StopRow = {
  collection_type: CollectionMode;
  collection_point_id: string;
  bin_id: string;
  customer_id: string;
  sequence: number;
  is_active: boolean;
};

export type FormState = {
  district_id: string;
  city_id: string;
  zone_id: string;
  panchayat_id: string;
  ward_ids: string[];
  staff_template_id: string;
  vehicle_id: string;
  supervisor_id: string;
  waste_type_ids: string[];
  trip_trigger_weight_kg: string;
  max_vehicle_capacity_kg: string;
  scheduled_time: string;
  is_auto_assign: boolean;
  repeat_days: number[];
  approval_status: string;
  status: string;
  collection_type: CollectionMode;
};

export type TripPlanRecord = {
  unique_id: string;
  display_code?: string;
  company_id?: string | null;
  project_id?: string | null;
  district?: { name?: string };
  city?: { name?: string };
  panchayat?: { panchayat_name?: string };
  zone?: { name?: string };
  wards?: { unique_id?: string; ward_name?: string }[];
  staff_template?: { display_code?: string; driver?: string | null; operator?: string | null };
  vehicle?: { vehicle_no?: string };
  waste_type?: { waste_type_name?: string };
  waste_types?: { unique_id?: string; waste_type_name?: string }[];
  plan_collection_points?: unknown[];
  stop_count?: number | string;
  scheduled_time?: string;
  is_auto_assign?: boolean;
  repeat_days?: number[];
  approval_status?: string;
  status?: string;
  collection_type?: CollectionMode;
  active_breakdown?: {
    unique_id: string;
    status: string;
    trip_date: string;
    breakdown_vehicle_no?: string | null;
    replacement_vehicle_no?: string | null;
    replacement_driver?: string | null;
    replacement_operator?: string | null;
  } | null;
  [key: string]: unknown;
};

export type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  display_code: { value: string | null; matchMode: FilterMatchMode };
  _location: { value: string | null; matchMode: FilterMatchMode };
  _staff: { value: string | null; matchMode: FilterMatchMode };
  _vehicle: { value: string | null; matchMode: FilterMatchMode };
  _waste_type: { value: string | null; matchMode: FilterMatchMode };
  _stop_count: { value: string | null; matchMode: FilterMatchMode };
  _driver: { value: string | null; matchMode: FilterMatchMode };
  _operator: { value: string | null; matchMode: FilterMatchMode };
  _collection_type: { value: string | null; matchMode: FilterMatchMode };
  status: { value: string | null; matchMode: FilterMatchMode };
};
