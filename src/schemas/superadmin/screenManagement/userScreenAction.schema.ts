import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in UserScreenActionForm: actionName and
 * variableName were required before submit; status was never validated.
 */
export const userScreenActionSchema = z.object({
  action_name: requiredString("Action Name"),
  variable_name: requiredString("Variable Name"),
  is_active: z.boolean(),
});

export type UserScreenActionFormValues = z.infer<typeof userScreenActionSchema>;
