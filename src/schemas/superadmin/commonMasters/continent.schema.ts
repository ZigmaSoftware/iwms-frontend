import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component.
 */
export const continentSchema = z.object({
  name: requiredString("Continent name"),
  is_active: z.boolean(),
});

export type ContinentFormValues = z.infer<typeof continentSchema>;
