import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

export const blockSchema = z.object({
  ward_id: requiredString("Ward"),
  block_name: requiredString("Block name"),
  description: optionalString,
  latitude: optionalString,
  longitude: optionalString,
  is_active: z.boolean(),
});

export type BlockFormValues = z.infer<typeof blockSchema>;
