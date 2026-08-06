import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in UserScreenForm: mainscreenId,
 * userScreenName, and folderName were required before submit; orderNo
 * (edit-only, backend auto-assigns on create) and description were never
 * validated.
 */
export const userScreenSchema = z.object({
  mainscreen_id: requiredString("Main Screen"),
  userscreen_name: requiredString("User Screen Name"),
  folder_name: requiredString("Folder Path"),
  order_no: optionalString,
  description: optionalString,
  is_active: z.boolean(),
});

export type UserScreenFormValues = z.infer<typeof userScreenSchema>;
