import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in user-typeForm: `name` had a required
 * attribute/red asterisk; `is_active` always carries a default value.
 */
export const userTypeSchema = z.object({
  name: requiredString("User type name"),
  is_active: z.boolean(),
});

export type UserTypeFormValues = z.infer<typeof userTypeSchema>;
