import { z } from "zod";

import { optionalString, positiveIntField, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline `missingFields` checks in BinForm's
 * handleSubmit: bin_name, district_id, city_id, collection_point_id,
 * wastetype_id and bin_capacity (> 0) were required before submit.
 * panchayat_id and ward_id are mutually-exclusive optional location
 * refinements (Zone/Panchayat cascade), never required directly.
 */
export const binSchema = z.object({
  bin_name: requiredString("Bin name"),
  district_id: requiredString("District"),
  city_id: requiredString("City"),
  panchayat_id: optionalString,
  ward_id: optionalString,
  collection_point_id: requiredString("Collection point"),
  wastetype_id: requiredString("Waste type"),
  bin_capacity: positiveIntField("Bin capacity"),
});

export type BinFormValues = z.infer<typeof binSchema>;
