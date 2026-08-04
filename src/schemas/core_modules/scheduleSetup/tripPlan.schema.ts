import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline `missingFields` checks in tripPlanForm.tsx's
 * handleSubmit: District, City, Staff Template, Vehicle, Supervisor, Waste
 * Type (at least one) and Start Time were all pushed to the same
 * "Please fill: ..." Swal warning when blank. Zone/Panchayat (either-or),
 * Ward (at least one), the trigger-weight-vs-capacity comparison, the
 * Collection Point Stops list, and the auto-assign/repeat-days rule are
 * cross-field or mode-dependent checks that stay as manual code in the
 * component. Company and Project are handled separately by
 * useCompanyProjectSelection.
 */
export const tripPlanSchema = z.object({
  district_id: requiredString("District"),
  city_id: requiredString("City"),
  staff_template_id: requiredString("Staff Template"),
  vehicle_id: requiredString("Vehicle"),
  supervisor_id: requiredString("Supervisor"),
  waste_type_ids: z.array(z.string()).min(1, "Waste Type is required"),
  scheduled_time: requiredString("Start Time"),
});

export type TripPlanFormValues = z.infer<typeof tripPlanSchema>;
