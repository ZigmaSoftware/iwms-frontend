import { z } from "zod";

import { nonNegativeNumberField, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline checks in WasteCollectedForm's handleSubmit:
 * only customerId was required before submit (company/project scoping is
 * checked separately). The four waste-quantity inputs were never blocked on
 * either — a blank input becomes `0` via `parseFloat(...) || 0` in the
 * payload — but their HTML inputs already carry `min={0}`, so
 * `nonNegativeNumberField` enforces that same non-negative constraint here
 * too while still treating a blank value as `0`, not an error.
 */
export const wasteCollectedDataSchema = z.object({
  customer_id: requiredString("Customer"),
  wet_waste: nonNegativeNumberField("Wet Waste"),
  dry_waste: nonNegativeNumberField("Dry Waste"),
  mixed_waste: nonNegativeNumberField("Mixed Waste"),
  sanitary_waste: nonNegativeNumberField("Sanitary Waste"),
});

export type WasteCollectedDataFormValues = z.infer<typeof wasteCollectedDataSchema>;
