import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the fields already marked mandatory in
 * alternativeStaffTemplateForm.tsx (red-asterisk label + HTML `required` on
 * From Date, To Date, Driver, Operator and Change Reason). Staff Template,
 * Effective Date, Extra Operator and Remarks carry no such marker in the
 * form today, so they stay optional here. company_id/project_id are handled
 * separately by the form's own company/project state, not part of this
 * schema.
 */
export const alternativeStaffTemplateSchema = z.object({
  staff_template: optionalString,
  effective_date: optionalString,
  from_date: requiredString("From Date"),
  to_date: requiredString("To Date"),
  driver: requiredString("Driver"),
  operator: requiredString("Operator"),
  extra_operator: z.array(z.string()),
  change_reason: requiredString("Change Reason"),
  change_remarks: optionalString,
});

export type AlternativeStaffTemplateFormValues = z.infer<typeof alternativeStaffTemplateSchema>;
