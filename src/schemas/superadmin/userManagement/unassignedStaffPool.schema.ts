import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in UnassignedStaffPoolForm: role,
 * zone_id, ward_id, and status were required before submit (each gated by
 * column-permission visibility). The role-conditional requirement that
 * operator_id/driver_id be filled in depending on the selected role is a
 * cross-field rule and stays as a manual check in the component, same as
 * before.
 */
export const unassignedStaffPoolSchema = z.object({
  role: requiredString("Role"),
  operator_id: optionalString,
  driver_id: optionalString,
  zone_id: requiredString("Zone"),
  ward_id: requiredString("Ward"),
  status: requiredString("Status"),
  daily_trip_assignment_id: optionalString,
});

export type UnassignedStaffPoolFormValues = z.infer<typeof unassignedStaffPoolSchema>;
