import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in WasteTypeForm's handleSubmit:
 * waste_type_name was required before submit; is_active was never
 * validated (it always carries a boolean default from useState).
 */
export const wasteTypeSchema = z.object({
  waste_type_name: requiredString("Waste type name"),
  is_active: z.boolean(),
});

export type WasteTypeFormValues = z.infer<typeof wasteTypeSchema>;
