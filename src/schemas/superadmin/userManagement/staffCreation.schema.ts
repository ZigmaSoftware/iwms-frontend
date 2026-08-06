import { z } from "zod";

import {
  optionalEmailField,
  optionalMobileField,
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
 * their shape before. `password` is never required or format-checked in
 * this form (unlike StaffAccessConfigForm), so it stays a plain optional
 * string. company_id/project_id are handled separately by
 * useCompanyProjectSelection (not part of this schema, same as the district
 * pilot); `department`/`designation` are derived display labels auto-set
 * from the selected *_id, not directly editable, so they're excluded too.
 * Applied via `requireWhenVisible` since this form calls useFieldVisibility.
 */
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
  password: optionalString,
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
