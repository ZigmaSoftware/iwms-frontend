import { z } from "zod";

import { latitudeField, longitudeField, requiredString } from "@/schemas/shared/fields";

/**
 * TripDelayReportForm mirrors TripDelayReportSerializer: Trip Assignment,
 * Delay Reason and Remarks are required (the backend rejects blank remarks);
 * Estimated Delay, coordinates and location are optional. Company and
 * Project are checked separately in the component (scoping, not a form
 * field on this schema).
 *
 * `latitudeField`/`longitudeField` coerce an empty string to `0`, so blanks
 * are let through untouched and only a filled-in value is range-checked.
 */
const optionalCoordinate = (field: typeof latitudeField | typeof longitudeField) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!value) return;
      const result = field.safeParse(value);
      if (!result.success) {
        result.error.issues.forEach((issue) => ctx.addIssue({ code: "custom", message: issue.message }));
      }
    });

export const tripDelayReportSchema = z.object({
  trip_assignment_id: requiredString("Trip Assignment"),
  delay_reason: requiredString("Delay Reason"),
  delay_remarks: requiredString("Delay Remarks"),
  estimated_delay_minutes: z
    .string()
    .trim()
    .refine((value) => !value || (/^\d+$/.test(value) && Number(value) > 0), {
      message: "Estimated delay must be a whole number of minutes",
    }),
  delay_lat: optionalCoordinate(latitudeField),
  delay_lng: optionalCoordinate(longitudeField),
});

export type TripDelayReportFormValues = z.infer<typeof tripDelayReportSchema>;
