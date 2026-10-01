import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * `MasterForm` (complaintManagement/masters) is a single generic component
 * shared by every "reference data" entity in the complaint-ticketing module —
 * module, category, subcategory, priority, status, source and SLA rule —
 * selected at render time via a `kind` prop. Which fields are mandatory
 * therefore depends on `kind`, mirroring the old manual checks that used to
 * live in the component's submit handler:
 *  - every kind except "slaRule" required `code` + `name`
 *  - "subcategory" additionally required `category`
 *  - "slaRule" (which has no code/name inputs at all) required
 *    `category` + `priority` instead
 * All other fields (description, module, default_priority,
 * default_department, subcategory/source pickers on the SLA rule form, and
 * every boolean flag) were never blocked on and stay optional here too.
 */
export type MasterKind =
  | "module"
  | "category"
  | "subcategory"
  | "priority"
  | "status"
  | "source"
  | "slaRule";

const complaintMasterBaseSchema = z.object({
  code: optionalString,
  name: optionalString,
  description: optionalString,
  category_id: optionalString,
  module_id: optionalString,
  priority_id: optionalString,
  subcategory_id: optionalString,
  source_id: optionalString,
  default_priority_id: optionalString,
  default_department_id: optionalString,
  requires_location: z.boolean(),
  requires_media: z.boolean(),
  requires_address_change_detail: z.boolean(),
  is_sensitive: z.boolean(),
  is_final: z.boolean(),
  allow_reopen: z.boolean(),
  working_hours_only: z.boolean(),
  is_active: z.boolean(),
});

/** Builds the per-`kind` schema variant described above. */
export function buildComplaintMasterSchema(kind: MasterKind) {
  if (kind === "slaRule") {
    return complaintMasterBaseSchema.extend({
      category_id: requiredString("Category"),
      priority_id: requiredString("Priority"),
    });
  }
  if (kind === "subcategory") {
    return complaintMasterBaseSchema.extend({
      code: requiredString("Code"),
      name: requiredString("Name"),
      category_id: requiredString("Category"),
    });
  }
  return complaintMasterBaseSchema.extend({
    code: requiredString("Code"),
    name: requiredString("Name"),
  });
}

export type ComplaintMasterFormValues = z.infer<typeof complaintMasterBaseSchema>;
