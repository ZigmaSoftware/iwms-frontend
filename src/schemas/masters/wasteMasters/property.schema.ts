import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in PropertyEditor's handleSubmit:
 * property_name was required before submit; is_active was never validated.
 */
export const propertySchema = z.object({
  property_name: requiredString("Property name"),
  is_active: z.boolean(),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
