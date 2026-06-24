import type { FilterMatchMode } from "primereact/api";

export type SelectOption = { value: string; label: string };

export type StopRow = {
  collection_type: "bin_collection" | "household_collection";
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
  ward_id: string;
  staff_template_id: string;
  vehicle_id: string;
  supervisor_id: string;
  property_id: string;
  sub_property_id: string;
  waste_type_ids: string[];
  trip_trigger_weight_kg: string;
  max_vehicle_capacity_kg: string;
  scheduled_time: string;
  approval_status: string;
  status: string;
};

export type TripPlanRecord = {
  unique_id: string;
  display_code?: string;
  company_id?: string | null;
  project_id?: string | null;
  district?: { name?: string };
  city?: { name?: string };
  panchayat?: { panchayat_name?: string };
  ward?: { ward_name?: string };
  staff_template?: { display_code?: string };
  vehicle?: { vehicle_no?: string };
  waste_type?: { waste_type_name?: string };
  waste_types?: { unique_id?: string; waste_type_name?: string }[];
  plan_collection_points?: unknown[];
  scheduled_time?: string;
  approval_status?: string;
  status?: string;
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
  status: { value: string | null; matchMode: FilterMatchMode };
};
