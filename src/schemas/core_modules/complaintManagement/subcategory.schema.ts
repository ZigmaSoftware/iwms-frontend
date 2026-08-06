import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original UI requirements in SubCategoryEditor: Main Category
 * and Sub Category Name are marked required (red asterisk + `required`
 * attribute) even though the old submit handler never enforced this in code;
 * is_active was never validated.
 */
export const subcategorySchema = z.object({
  mainCategory: requiredString("Main category"),
  name: requiredString("Sub category name"),
  is_active: z.boolean(),
});

export type SubcategoryFormValues = z.infer<typeof subcategorySchema>;
