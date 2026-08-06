import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in MainCategoryEditor: main_categoryName
 * was required before submit (a trimmed-empty check triggered a Swal
 * warning); is_active was never validated.
 */
export const categorySchema = z.object({
  main_categoryName: requiredString("Category name"),
  is_active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
