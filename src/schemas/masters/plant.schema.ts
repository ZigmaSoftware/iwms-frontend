import { z } from "zod";

import { latitudeField, longitudeField, requiredString } from "@/schemas/shared/fields";

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

export const plantSchema = z.object({
  name: requiredString("Plant Name"),
  latitude: requiredLatitude,
  longitude: requiredLongitude,
});

export type PlantFormValues = z.infer<typeof plantSchema>;
