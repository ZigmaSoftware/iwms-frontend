import { z } from "zod";

import { latitudeField, longitudeField, optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * `latitudeField`/`longitudeField` alone coerce an empty string to `0`
 * (which passes their range check), so the "required" case is enforced by a
 * string presence check first, then delegated to the shared field — same
 * approach as vehicleBreakdown.schema.ts's requiredLatitude/requiredLongitude.
 */
const requiredLatitude = z
  .string()
  .trim()
  .min(1, "Latitude is required")
  .transform((value, ctx) => {
    const result = latitudeField.safeParse(value);
    if (!result.success) {
      result.error.issues.forEach((issue) => ctx.addIssue({ code: "custom", message: issue.message }));
      return z.NEVER;
    }
    return result.data;
  });

const requiredLongitude = z
  .string()
  .trim()
  .min(1, "Longitude is required")
  .transform((value, ctx) => {
    const result = longitudeField.safeParse(value);
    if (!result.success) {
      result.error.issues.forEach((issue) => ctx.addIssue({ code: "custom", message: issue.message }));
      return z.NEVER;
    }
    return result.data;
  });

/**
 * Mirrors the original inline `missingFields` checks in
 * CollectionPointForm.tsx's handleSubmit: State, District, City, Name,
 * Latitude and Longitude (both required and range-checked) were each pushed
 * individually. Panchayat/Zone/Ward is enforced by a separate "at least one
 * of the three" cross-field check that stays in the component, since it
 * can't be expressed as a single field rule; company_id/project_id are
 * handled by useCompanyProjectSelection, not part of this schema.
 */
export const collectionPointSchema = z.object({
  state_id: requiredString("State"),
  district_id: requiredString("District"),
  city_id: requiredString("City"),
  panchayat_id: optionalString,
  zone_id: optionalString,
  cp_name: requiredString("Collection Point Name"),
  latitude: requiredLatitude,
  longitude: requiredLongitude,
});

export type CollectionPointFormValues = z.infer<typeof collectionPointSchema>;
