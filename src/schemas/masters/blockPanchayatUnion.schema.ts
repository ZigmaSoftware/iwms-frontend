import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Fully-required base schema. Per-instance visibility relaxation is applied
 * via `requireWhenVisible` in the component. Mirrors the fields that carry a
 * red asterisk / `required` attribute in BlockPanchayatUnionForm today
 * (state_id, district_id, block_name); description/latitude/longitude were
 * never required.
 */
export const blockPanchayatUnionSchema = z.object({
  state_id: requiredString("State"),
  district_id: requiredString("District"),
  block_name: requiredString("Block / Panchayat Union name"),
  description: optionalString,
  latitude: optionalString,
  longitude: optionalString,
  is_active: z.boolean(),
});

export type BlockPanchayatUnionFormValues = z.infer<typeof blockPanchayatUnionSchema>;
