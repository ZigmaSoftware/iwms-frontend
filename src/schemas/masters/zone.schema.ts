import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component. Mirrors the original
 * `getMissingRequiredFields` check in ZoneForm: continent_id, country_id,
 * state_id, city_id and zone_name were required before submit; district_id
 * and description carry no asterisk and were never required.
 */
export const zoneSchema = z.object({
  continent_id: requiredString("Continent"),
  country_id: requiredString("Country"),
  state_id: requiredString("State"),
  district_id: optionalString,
  city_id: requiredString("City"),
  zone_name: requiredString("Zone name"),
  description: optionalString,
  is_active: z.boolean(),
});

export type ZoneFormValues = z.infer<typeof zoneSchema>;
