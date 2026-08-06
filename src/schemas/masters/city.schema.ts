import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component (company_id/project_id are
 * handled separately by useCompanyProjectSelection, not part of this
 * schema). Mirrors the original `getMissingRequiredFields` check in
 * CityForm: continent_id, country_id, state_id, district_id and name were
 * required before submit.
 */
export const citySchema = z.object({
  continent_id: requiredString("Continent"),
  country_id: requiredString("Country"),
  state_id: requiredString("State"),
  district_id: requiredString("District"),
  name: requiredString("City name"),
  is_active: z.boolean(),
});

export type CityFormValues = z.infer<typeof citySchema>;
