import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component. Mirrors the original
 * `getMissingRequiredFields` check in WardForm: continent_id, country_id,
 * state_id and ward_name were required before submit; district_id, city_id,
 * zone_id, panchayat_id and description carry no asterisk and were never
 * required (the zone-vs-panchayat exclusivity rule is a separate cross-field
 * check kept as-is in the component).
 */
export const wardSchema = z.object({
  continent_id: requiredString("Continent"),
  country_id: requiredString("Country"),
  state_id: requiredString("State"),
  district_id: optionalString,
  city_id: optionalString,
  zone_id: optionalString,
  panchayat_id: optionalString,
  ward_name: requiredString("Ward name"),
  description: optionalString,
  is_active: z.boolean(),
});

export type WardFormValues = z.infer<typeof wardSchema>;
