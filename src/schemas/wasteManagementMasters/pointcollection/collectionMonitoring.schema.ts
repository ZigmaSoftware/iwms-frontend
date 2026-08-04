import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline `missingFields` check in
 * CollectionMonitoringForm's handleSubmit: tripCollectionPointId and weight
 * were required before submit. Driver latitude/longitude and notes were
 * never required, but latitude/longitude are validated as coordinates when
 * present, matching the government app's equivalent schema.
 */
export const collectionMonitoringSchema = z.object({
  tripCollectionPointId: requiredString("Trip Collection Point"),
  weight: requiredString("Collected Weight"),
  driverLatitude: optionalString
    .optional()
    .refine(
      (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= -90 && Number(value) <= 90),
      { message: "Latitude must be between -90 and 90" },
    ),
  driverLongitude: optionalString
    .optional()
    .refine(
      (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= -180 && Number(value) <= 180),
      { message: "Longitude must be between -180 and 180" },
    ),
  notes: optionalString.optional(),
});

export type CollectionMonitoringFormValues = z.infer<typeof collectionMonitoringSchema>;
