export type Customer = {
  id: number;
  unique_id?: string;
  customer_name: string;
  building_no?: string;
  street?: string;
  area?: string;
  zone_name?: string;
  ward_name?: string;
  panchayat_name?: string;
  city_name?: string;
  district_name?: string;
  state_name?: string;
  country_name?: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
};

// Same vocabulary as DailyTripHouseholdCollection.STATUS_CHOICES (A5).
export type WasteCollectionStatus = "Pending" | "Collected" | "Not Available" | "Collect Later";

export type WasteCollection = {
  unique_id: string;
  customer: string;
  customer_id?: string | number;
  customer_unique_id?: string;
  customer_name: string;
  contact_no?: string;
  building_no?: string;
  zone_name?: string;
  ward_id?: string | null;
  ward_name?: string;
  panchayat_name?: string;
  city_name?: string;
  street?: string;
  area?: string;
  wet_waste: number;
  dry_waste: number;
  mixed_waste: number;
  // A5: sanitary_waste added; total_quantity now includes it.
  sanitary_waste?: number;
  total_quantity: number;
  // A5: status vocabulary (default Pending); collection_date now user-editable.
  status?: WasteCollectionStatus;
  collection_date?: string;
  collection_time?: string;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};
