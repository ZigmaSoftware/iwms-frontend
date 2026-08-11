import { z } from "zod";

import {
  optionalEmailField,
  optionalMobileField,
  optionalPasswordField,
  optionalPincodeField,
  optionalString,
  requiredString,
} from "@/schemas/shared/fields";

/**
 * Mirrors the original inline checks in StaffCreationForm's handleSubmit:
 * employee_name carries an HTML `required` attribute, and department_id /
 * designation_id were required whenever visible
 * (`if (showField("department_id") && !formData.department_id)` etc). Every
 * other office/personal/address field has no required-ness signal in the
 * component and stays optional; contact_mobile/contact_email/pincode fields
 * get format validation since the form collects them but never validated
 * their shape before. `password` is never required in this form (blank means
 * "keep existing password" on edit), but when a value is entered it must
 * satisfy the same strength policy as StaffAccessConfigForm.
 * company_id/project_id are handled separately by
 * useCompanyProjectSelection (not part of this schema, same as the district
 * pilot); `department`/`designation` are derived display labels auto-set
 * from the selected *_id, not directly editable, so they're excluded too.
 * Applied via `requireWhenVisible` since this form calls useFieldVisibility.
 */
/**
 * Extra context needed to validate the company selection and file uploads,
 * which live outside `formData` (companyUniqueId comes from
 * useCompanyProjectSelection; photo/licence are raw File state). Passed
 * alongside formData so these checks can move out of the manual Swal.fire
 * calls in handleSubmit and into the same schema/FieldError pipeline as
 * every other field.
 */
export type StaffCreationFileContext = {
  companyUniqueId: string | null | undefined;
  showPhoto: boolean;
  photoFile: File | null;
  showDrivingLicenceFile: boolean;
  isDriverSelected: boolean;
  licenceFile: File | null;
  licencePreview: string | null | undefined;
};

export const buildStaffCreationFileSchema = (context: StaffCreationFileContext) =>
  z.object({}).superRefine((_data, ctx) => {
    if (!context.companyUniqueId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company_id"],
        message: "Company is required",
      });
    }

    if (
      context.showPhoto &&
      context.photoFile &&
      !context.photoFile.type.startsWith("image/")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["photo"],
        message: "Please upload a valid image file.",
      });
    }

    if (
      context.showDrivingLicenceFile &&
      context.isDriverSelected &&
      !context.licenceFile &&
      !context.licencePreview
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["driving_licence_file"],
        message: "Please upload the driving licence file (JPG, JPEG, PNG or PDF).",
      });
    }
  });

export const staffCreationSchema = z.object({
  employee_name: requiredString("Employee Name"),
  doj: optionalString,
  department_id: requiredString("Department"),
  designation_id: requiredString("Designation"),
  grade: optionalString,
  site_name: optionalString,
  staff_head: optionalString,
  staff_head_id: optionalString,
  employee_known: optionalString,
  salary_type: optionalString,
  active_status: optionalString,
  staffusertype_id: optionalString,
  contractorusertype_id: optionalString,
  username: optionalString,
  password: optionalPasswordField,
  login_enabled: optionalString,
  marital_status: optionalString,
  dob: optionalString,
  age: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (/^\d+$/.test(value) && Number(value) >= 18 && Number(value) <= 120),
      "Age must be a whole number between 18 and 120.",
    ),
  blood_group: optionalString,
  gender: optionalString,
  physically_challenged: optionalString,
  present_country: optionalString,
  present_state: optionalString,
  present_district: optionalString,
  present_city: optionalString,
  present_building_no: optionalString,
  present_street: optionalString,
  present_area: optionalString,
  present_pincode: optionalPincodeField,
  permanent_country: optionalString,
  permanent_state: optionalString,
  permanent_district: optionalString,
  permanent_city: optionalString,
  permanent_building_no: optionalString,
  permanent_street: optionalString,
  permanent_area: optionalString,
  permanent_pincode: optionalPincodeField,
  contact_mobile: optionalMobileField,
  contact_email: optionalEmailField,
  driving_licence_no: optionalString,
  driving_licence_expiry_date: optionalString,
});

export type StaffCreationFormValues = z.infer<typeof staffCreationSchema>;
