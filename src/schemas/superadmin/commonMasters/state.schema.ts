import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in StateForm: continent_id, country_id,
 * name, and label were all required before submit (via
 * getMissingRequiredFields).
 */
export const stateSchema = z.object({
  continent_id: requiredString("Continent"),
  country_id: requiredString("Country"),
  name: requiredString("State name"),
  label: requiredString("Label"),
  is_active: z.boolean(),
});

export type StateFormValues = z.infer<typeof stateSchema>;
