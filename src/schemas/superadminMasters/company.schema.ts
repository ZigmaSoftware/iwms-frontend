import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in companyForm: only `name` was required
 * before submit. The logo is a File upload handled separately (type/size
 * checked in its own onChange) and is not part of this schema.
 */
export const companySchema = z.object({
  name: requiredString("Company name"),
  is_active: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
