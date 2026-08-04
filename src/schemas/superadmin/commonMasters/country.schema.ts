import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in CountryForm: only `name` and
 * `continent_id` were required before submit (via getMissingRequiredFields).
 * `mob_code` (the country's ISD/dial code, e.g. "+91" — not a personal
 * 10-digit mobile number, so it deliberately does not use `mobileField`) and
 * `currency` carry a red asterisk in the UI but were never actually
 * enforced, so they stay optional here too.
 */
export const countrySchema = z.object({
  continent_id: requiredString("Continent"),
  name: requiredString("Country name"),
  mob_code: optionalString,
  currency: optionalString,
  is_active: z.boolean(),
});

export type CountryFormValues = z.infer<typeof countrySchema>;
