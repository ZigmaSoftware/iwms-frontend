import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in TripExceptionLogForm:
 * daily_trip_assignment_id, exception_type and detected_by were required
 * before submit; remarks was never validated.
 */
export const tripExceptionLogSchema = z.object({
  daily_trip_assignment_id: requiredString("Daily trip assignment"),
  exception_type: requiredString("Exception type"),
  remarks: optionalString,
  detected_by: requiredString("Detected by"),
});

export type TripExceptionLogFormValues = z.infer<typeof tripExceptionLogSchema>;
