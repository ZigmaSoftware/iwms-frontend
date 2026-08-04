import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in FeedBackForm: only the customer
 * selection was required before submit (company/project are handled
 * separately by useCompanyProjectSelection, not part of this schema).
 * Category defaults to "Excellent" and feedback details are free text, so
 * both stay optional.
 */
export const feedbackSchema = z.object({
  customer: requiredString("Customer"),
  category: optionalString,
  feedback_details: optionalString,
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;
