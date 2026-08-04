import { z } from "zod";

import {
  latitudeField,
  longitudeField,
  nonNegativeNumberField,
  optionalString,
  requiredString,
} from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component. Mirrors the fields that carry a
 * red asterisk / `required` attribute in PanchayatForm today (state_id,
 * district_id, city_id, panchayat_name, agreed_weight_kg, latitude,
 * longitude); effective_from was never required, and weight_unit /
 * geofencing_type are select fields that always carry a default value.
 */
export const panchayatSchema = z.object({
  state_id: requiredString("State"),
  district_id: requiredString("District"),
  city_id: requiredString("City"),
  panchayat_name: requiredString("PLB name"),
  agreed_weight_kg: nonNegativeNumberField("Agreed weight"),
  weight_unit: z.string(),
  effective_from: optionalString,
  latitude: latitudeField,
  longitude: longitudeField,
  geofencing_type: z.string(),
  is_active: z.boolean(),
});

export type PanchayatFormValues = z.infer<typeof panchayatSchema>;
