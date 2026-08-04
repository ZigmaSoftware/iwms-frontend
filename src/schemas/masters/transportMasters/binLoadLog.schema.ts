import { z } from "zod";

import { nonNegativeNumberField, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in BinLoadLogForm: zone_id, vehicle_id,
 * property_id, sub_property_id, weight_kg, source_type and event_time were
 * all required before submit.
 */
export const binLoadLogSchema = z.object({
  zone_id: requiredString("Zone"),
  vehicle_id: requiredString("Vehicle"),
  property_id: requiredString("Property"),
  sub_property_id: requiredString("Sub property"),
  weight_kg: nonNegativeNumberField("Weight (kg)"),
  source_type: requiredString("Source type"),
  event_time: requiredString("Event time"),
});

export type BinLoadLogFormValues = z.infer<typeof binLoadLogSchema>;
