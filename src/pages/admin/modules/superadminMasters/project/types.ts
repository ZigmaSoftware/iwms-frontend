import type { FilterMatchMode } from "primereact/api";

export type CompanyOption = {
  unique_id: string;
  name: string;
};

export type ProjectRecord = {
  unique_id: string;
  company_unique_id: string;
  name: string;
  description: string | null;
  project_logo?: string | null;
  has_blocks?: boolean;
  gps_api_url: string | null;
  gps_vehicle_history_api: string | null;
  gps_vehicle_tracking_api: string | null;
  gps_trip_summary_api: string | null;
  gps_user_id: string | null;
  gps_group_name: string | null;
  gps_provider_name: string | null;
  gps_fcode: string | null;
  gps_trip_user_id: string | null;
  weighment_api_url: string | null;
  day_wise_weighment_api_url: string | null;
  attendance_api_url: string | null;
  attendance_api_configured?: boolean;
  is_active: boolean;
};

export type ProjectCreateResponse = {
  project?: ProjectRecord;
  company_admin?: {
    unique_id: string;
    username: string;
  };
};

export type Project = {
  unique_id: string;
  company_unique_id: string;
  company_name?: string;
  name: string;
  description: string | null;
  has_blocks?: boolean;
  is_active: boolean;
};

export type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  name: { value: string | null; matchMode: FilterMatchMode };
  company_name: { value: string | null; matchMode: FilterMatchMode };
  company_unique_id: { value: string | null; matchMode: FilterMatchMode };
  description: { value: string | null; matchMode: FilterMatchMode };
};
