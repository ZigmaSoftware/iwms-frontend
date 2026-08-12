import { z } from "zod";

import {
  optionalEmailField,
  optionalMobileField,
  optionalString,
  PASSWORD_POLICY_MESSAGE,
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
      } else if (
        data.password &&
        !(
          data.password.length >= 8 &&
          /[A-Z]/.test(data.password) &&
          /[a-z]/.test(data.password) &&
          /[0-9]/.test(data.password) &&
          /[^A-Za-z0-9]/.test(data.password)
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: PASSWORD_POLICY_MESSAGE,
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

/**
 * Data Scope tab: mirrors the original `tab === DATA_SCOPE_TAB && !companyUniqueId`
 * check in validateTab, now routed through the same schema/FieldError pipeline.
 */
export const staffDataScopeSchema = z.object({
  companyUniqueId: requiredString("Company"),
});

export type StaffDataScopeFormValues = z.infer<typeof staffDataScopeSchema>;

/**
 * Permissions tab: previously had no validation at all before final submit,
 * so any staff record could be saved with zero granted screens. Requires at
 * least one screen with at least one selected action.
 */
export const staffPermissionsSchema = z.object({
  selections: z
    .record(z.string(), z.object({ userScreenId: z.string(), actionIds: z.array(z.string()) }))
    .refine(
      (selections) => Object.values(selections).some((sel) => sel.actionIds.length > 0),
      { message: "Select at least one permission before saving." },
    ),
});

export type StaffPermissionsFormValues = z.infer<typeof staffPermissionsSchema>;
