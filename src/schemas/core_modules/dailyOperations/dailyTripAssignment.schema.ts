import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * DailyTripAssignmentForm's submit handler guarded, as a single combined
 * `if`: Trip Plan, Staff Template, at least one Ward, Trip Date and Start
 * Time — always required. Waste Type was also required in that same `if`,
 * but only when the selected trip plan has bin and/or household stops
 * (`hasBinStops || hasHouseholdStops`, component state outside `formData`),
 * so that part stays a manual cross-field check in the component alongside
 * the company/project scoping check. Alternative Staff Template, Zone/
 * Panchayat, Status, Remarks and the inline collection-point/household-stop
 * editors were never blocked on and stay unvalidated here too.
 */
export const dailyTripAssignmentSchema = z.object({
  trip_plan_id: requiredString("Trip Plan"),
  staff_template_id: requiredString("Staff Template"),
  ward_ids: z.array(z.string()).min(1, "Ward is required"),
  trip_date: requiredString("Trip Date"),
  scheduled_time: requiredString("Start Time"),
});

export type DailyTripAssignmentFormValues = z.infer<typeof dailyTripAssignmentSchema>;
