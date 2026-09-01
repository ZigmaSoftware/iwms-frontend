import { z } from "zod";

import { optionalEmailField, optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in projectForm: only `name` was required
 * before submit. The admin_username/admin_password/admin_employee_name
 * "required together" rule is a cross-field check enforced separately in the
 * component and is left untouched here; this schema only adds field-level
 * validation (all optional) plus email format checking for admin_email.
 */
export const projectSchema = z.object({
  name: requiredString("Project name"),
  description: optionalString,
  is_active: z.boolean(),
  gps_api_url: optionalString,
  gps_user_id: optionalString,
  gps_group_name: optionalString,
  gps_provider_name: optionalString,
  gps_fcode: optionalString,
  gps_trip_user_id: optionalString,
  weighment_api_url: optionalString,
  day_wise_weighment_api_url: optionalString,
  attendance_api_url: optionalString,
  attendance_api_key: optionalString,
  admin_username: optionalString,
  admin_password: optionalString,
  admin_employee_name: optionalString,
  admin_email: optionalEmailField,
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
