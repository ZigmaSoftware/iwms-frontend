import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * BinCollectionEventForm's submit handler guarded these fields before save:
 *  - trip_assignment_id / bin_id: always required (the top-level `if` check).
 *  - collected_weight_kg: required only when status is "Collected"
 *    (nullable on the backend for Not Collected / Collect Later).
 * Every other field (trip_collection_point_id, collection_date, status_reason,
 * driver lat/lng, notes) was never blocked on and stays unvalidated here too.
 */
export const binCollectionEventSchema = z
  .object({
    trip_assignment_id: requiredString("Trip Assignment"),
    bin_id: requiredString("Bin"),
    status: z.string(),
    collected_weight_kg: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "Collected" && !data.collected_weight_kg.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["collected_weight_kg"],
        message: "Collected weight is required when status is Collected.",
      });
    }
  });

export type BinCollectionEventFormValues = z.infer<typeof binCollectionEventSchema>;
