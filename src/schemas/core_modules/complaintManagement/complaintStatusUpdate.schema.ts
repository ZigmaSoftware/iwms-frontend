import { z } from "zod";

import { optionalString } from "@/schemas/shared/fields";

/**
 * ComplaintEditForm only updates an existing complaint's status, action
 * remarks and an optional closing file. Neither status nor remarks were
 * ever required by the old submit handler (no manual check, no asterisk in
 * the labels), so both stay optional here too.
 */
export const complaintStatusUpdateSchema = z.object({
  status: z.string(),
  remarks: optionalString,
});

export type ComplaintStatusUpdateFormValues = z.infer<typeof complaintStatusUpdateSchema>;
