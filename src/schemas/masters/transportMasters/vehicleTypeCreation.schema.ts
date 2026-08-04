import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in VehicleTypeCreationForm: only
 * vehicleType (labelled "Vehicle Type") carried a red asterisk and a manual
 * required check before submit; description and is_active were never
 * validated.
 */
export const vehicleTypeCreationSchema = z.object({
  vehicleType: requiredString("Vehicle type"),
  description: optionalString,
  is_active: z.boolean(),
});

export type VehicleTypeCreationFormValues = z.infer<typeof vehicleTypeCreationSchema>;
