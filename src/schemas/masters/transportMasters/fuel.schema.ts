import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in FuelForm: only fuel_type was
 * validated as required before submit (guarded by showField); description
 * carries a red asterisk in the UI but was never enforced, so it stays
 * required here to match the visible contract, and is_active always has a
 * default value.
 */
export const fuelSchema = z.object({
  fuel_type: requiredString("Fuel type"),
  description: requiredString("Description"),
  is_active: z.boolean(),
});

export type FuelFormValues = z.infer<typeof fuelSchema>;
