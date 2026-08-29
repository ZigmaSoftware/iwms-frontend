export type PlantRecord = {
  unique_id: string;
  company_id?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  name?: string;
  latitude?: string | number;
  longitude?: string | number;
  is_active: boolean;
  [key: string]: unknown;
};
