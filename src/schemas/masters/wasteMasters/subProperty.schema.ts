import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in SubPropertyEditor's handleSubmit:
 * sub_property_name and property_id were required before submit; is_active
 * was never validated.
 */
export const subPropertySchema = z.object({
  property_id: requiredString("Property"),
  sub_property_name: requiredString("Sub property name"),
  is_active: z.boolean(),
});

export type SubPropertyFormValues = z.infer<typeof subPropertySchema>;
