import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in ZonePropertyLoadTrackerForm's
 * handleSubmit: zone_id, vehicle_id, property_id, sub_property_id and
 * current_weight_kg were all required before submit (blank string is
 * rejected, but `0` is a legitimate current weight). `nonNegativeNumberField`
 * isn't used here because it coerces a blank string to `0`, which would
 * silently accept a missing value instead of rejecting it, so the presence
 * check is done via `requiredString` before the numeric refinement.
 */
export const zonePropertyLoadTrackerSchema = z.object({
  zone_id: requiredString("Zone"),
  vehicle_id: requiredString("Vehicle"),
  property_id: requiredString("Property"),
  sub_property_id: requiredString("Sub property"),
  current_weight_kg: requiredString("Current weight").refine(
    (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
    { message: "Current weight must be zero or greater" },
  ),
});

export type ZonePropertyLoadTrackerFormValues = z.infer<typeof zonePropertyLoadTrackerSchema>;
