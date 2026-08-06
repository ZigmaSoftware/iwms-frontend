import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in MainScreenForm: mainscreenTypeId and
 * mainscreenName were required before submit; orderNo (edit-only, backend
 * auto-assigns on create) and description were never validated.
 */
export const mainScreenSchema = z.object({
  mainscreentype_id: requiredString("Main Screen Type"),
  mainscreen_name: requiredString("Main Screen Name"),
  order_no: optionalString,
  description: optionalString,
  is_active: z.boolean(),
});

export type MainScreenFormValues = z.infer<typeof mainScreenSchema>;
