import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component (company_id/project_id are
 * handled separately by useCompanyProjectSelection, not part of this schema).
 */
export const districtSchema = z.object({
  continent_id: requiredString("Continent"),
  country_id: requiredString("Country"),
  state_id: requiredString("State"),
  name: requiredString("District name"),
  is_active: z.boolean(),
});

export type DistrictFormValues = z.infer<typeof districtSchema>;
