import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";
import { retripReasonError } from "@/pages/admin/modules/core_modules/dailyOperations/tripRetripRequest/types";

/**
 * TripRetripRequestForm mirrors TripRetripRequestViewSet.create: the trip and
 * a reason category are required, and "Other" must be described in words
 * (retrip_service.resolve_reason, the same rule as the driver app's End
 * Trip). Company and Project are checked separately in the component
 * (scoping, not a form field on this schema).
 */
export const tripRetripRequestSchema = z
  .object({
    assignment_id: requiredString("Trip Assignment"),
    reason_code: requiredString("Reason"),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (!value.reason_code) return;
    const error = retripReasonError(value.reason_code, value.reason);
    if (error) ctx.addIssue({ code: "custom", path: ["reason"], message: error });
  });
