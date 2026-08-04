import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in staffUserTypeForm: only the selected
 * user type and the chosen role (`name`) were required before submit
 * (`if (!selectedUserType || !name)`).
 */
export const staffUserTypeSchema = z.object({
  usertype_id: requiredString("User type"),
  name: requiredString("Role"),
  is_active: z.boolean(),
});

export type StaffUserTypeFormValues = z.infer<typeof staffUserTypeSchema>;
