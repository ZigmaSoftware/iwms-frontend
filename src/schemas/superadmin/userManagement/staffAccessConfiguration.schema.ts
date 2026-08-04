import { z } from "zod";

import {
  optionalEmailField,
  optionalMobileField,
  optionalString,
  requiredString,
} from "@/schemas/shared/fields";

/**
 * Mirrors the original per-tab checks in StaffAccessConfigForm's
 * `validateTab`: employeeName (Basic Info tab) and username/userTypeId/
 * staffUserTypeId (Login tab) were required before advancing. `password` is
 * required only when creating a new record (isEdit=false) — editing prefills
 * both password/confirmPassword from the existing record — and must match
 * confirmPassword whenever either is filled in, exactly as the original
 * `validateTab` checked. companyUniqueId (Data Scope tab) is handled
 * separately by useCompanyProjectSelection, same as the district pilot, so
 * it stays out of this schema. Mobile/email get format validation since the
 * form collects them but never validated their shape before.
 */
export const buildStaffAccessConfigSchema = (isEdit: boolean) =>
  z
    .object({
      employeeName: requiredString("Employee name"),
      staffConfigName: optionalString,
      mobileNumber: optionalMobileField,
      officeEmail: optionalEmailField,
      doj: optionalString,
      username: requiredString("Username"),
      password: optionalString,
      confirmPassword: optionalString,
      userTypeId: requiredString("User type"),
      staffUserTypeId: requiredString("Staff user type"),
    })
    .superRefine((data, ctx) => {
      if (!isEdit && !data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Password is required.",
        });
      }
      if ((data.password || data.confirmPassword) && data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "Passwords do not match.",
        });
      }
    });

export type StaffAccessConfigFormValues = z.infer<
  ReturnType<typeof buildStaffAccessConfigSchema>
>;
