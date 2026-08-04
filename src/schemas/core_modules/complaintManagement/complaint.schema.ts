import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in ComplaintAddForm: customer, zone,
 * ward, main category, sub category and details were all required before
 * submit (missing any of them triggered a single "missing fields" Swal
 * warning). Contact and address are read-only fields derived from the
 * selected customer and were never validated; priority defaults to MEDIUM
 * and was never required.
 */
export const complaintSchema = z.object({
  customerId: requiredString("Customer"),
  zone: requiredString("Zone"),
  ward: requiredString("Ward"),
  mainCategoryId: requiredString("Main category"),
  subCategoryId: requiredString("Sub category"),
  details: requiredString("Details"),
  priority: optionalString,
});

export type ComplaintFormValues = z.infer<typeof complaintSchema>;
