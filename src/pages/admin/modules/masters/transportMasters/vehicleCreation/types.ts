export type VehicleCreationPayload = Record<string, unknown>;

export type VehicleCreationRecord = {
  unique_id: string;
  vehicle_no: string;
  vehicle_type_id?: string | null;
  fuel_type_id?: string | null;
  supervisor_id?: string | null;
  vehicle_type_name?: string | null;
  fuel_type_name?: string | null;
  supervisor_name?: string | null;
  capacity?: string | null;
  mileage_per_liter?: string | null;
  service_record?: string | null;
  vehicle_insurance?: string | null;
  insurance_expiry_date?: string | null;
  vehicle_condition?: "NEW" | "SECOND_HAND" | string | null;
  // Set by vehicle breakdowns; read-only here.
  operational_status?: "ACTIVE" | "BREAKDOWN" | null;
  fuel_tank_capacity?: string | null;
  rc_expiry_date?: string | null;
  rc_upload?: string | null;
  vehicle_insurance_file?: string | null;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

export type VehicleDocumentHistoryRecord = {
  unique_id: string;
  vehicle_id: string;
  vehicle_no: string;
  document_type: "RC" | "INSURANCE" | string;
  previous_document_number?: string | null;
  new_document_number?: string | null;
  previous_expiry_date?: string | null;
  new_expiry_date?: string | null;
  previous_file?: string | null;
  new_file?: string | null;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  changed_by_type?: string | null;
  changed_at?: string | null;
};
