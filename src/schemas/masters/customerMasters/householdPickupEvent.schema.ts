import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the create-mode `getMissingRequiredFields` list in
 * HouseholdPickupEventForm: customer/zone/property/sub-property/pickup
 * time/collector/vehicle/source are all required when creating a new
 * event. Weight is captured once the pickup actually happens, so it stays
 * optional but must be a non-negative number when supplied. The form only
 * enforces these checks on create (edit is a partial update), which the
 * component applies via `.partial()` on this schema when `isEdit` is true.
 */
export const householdPickupEventSchema = z.object({
  customer_id: requiredString("Customer"),
  zone_id: requiredString("Zone"),
  property_id: requiredString("Property"),
  sub_property_id: requiredString("Sub Property"),
  pickup_time: requiredString("Pickup Time"),
  weight_kg: optionalString.refine(
    (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0),
    { message: "Weight (kg) cannot be negative" },
  ),
  collector_staff_id: requiredString("Collector"),
  vehicle_id: requiredString("Vehicle"),
  source: requiredString("Source"),
});

export type HouseholdPickupEventFormValues = z.infer<typeof householdPickupEventSchema>;
