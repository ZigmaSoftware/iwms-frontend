import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema for the fields visibility can gate; per-instance
 * relaxation is applied via `requireWhenVisible` in the component
 * (company_id_input/project_id_input are handled separately by
 * useCompanyProjectSelection, not part of this schema). Mirrors
 * VehicleCreationForm today: only vehicle_no carries a red asterisk and a
 * manual required check before submit — every other field is optional.
 */
export const vehicleCreationSchema = z.object({
  vehicle_no: requiredString("Vehicle no"),
  vehicle_type_id: optionalString,
  fuel_type_id: optionalString,
  supervisor_id: optionalString,
  capacity: optionalString,
  mileage_per_liter: optionalString,
  service_record: optionalString,
  vehicle_insurance: optionalString,
  insurance_expiry_date: optionalString,
  vehicle_condition: optionalString,
  fuel_tank_capacity: optionalString,
  is_active: optionalString,
});

export type VehicleCreationFormValues = z.infer<typeof vehicleCreationSchema>;
