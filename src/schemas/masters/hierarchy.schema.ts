import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component. Mirrors the original
 * `getMissingRequiredFields` check in HierarchyForm: level_name was
 * required before submit; is_active was never validated.
 */
export const hierarchySchema = z.object({
  level_name: requiredString("Level name"),
  is_active: z.boolean(),
});

export type HierarchyFormValues = z.infer<typeof hierarchySchema>;
