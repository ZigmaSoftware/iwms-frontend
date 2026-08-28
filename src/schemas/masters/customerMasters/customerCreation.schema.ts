import { z } from "zod";

import {
  emailField,
  latitudeField,
  longitudeField,
  mobileField,
  optionalString,
  pincodeField,
  requiredString,
} from "@/schemas/shared/fields";

/**
 * Mirrors the manual `validateForm()` checks already in
 * customerCreationForm.tsx: the unconditional `requiredFields` list (which
 * `getMissingRequiredFields` checks against, skipping fields hidden by
 * column permissions) and the format checks that follow it. Password is
 * deliberately NOT part of this schema — it is required only when creating
 * (never on edit) and the component's own `!isEdit` length check handles
 * that condition; folding it in here would either always allow a blank
 * password on edit-with-typo or force a mismatched message. Company/project
 * scoping and the family-member/member-count relationship stay in the
 * component too, since neither is a plain per-field check.
 */

const SQFT_MESSAGE = "Please enter a valid square feet value";
const sqftField = z.coerce.number({ error: SQFT_MESSAGE }).positive(SQFT_MESSAGE);

const nonNegativeIfPresent = (label: string) =>
  optionalString.refine(
    (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0),
    { message: `Please enter a positive value for ${label}` },
  );

const familyMemberSchema = z.object({
  member_name: z.string(),
  id_proof_type: z.string(),
  id_no: z.string(),
});

export const customerCreationSchema = z.object({
  customer_name: requiredString("Customer Name"),
  contact_no: mobileField,
  username: requiredString("Username"),
  email: emailField,
  building_no: optionalString,
  street: optionalString,
  area: optionalString,
  pincode: pincodeField,
  latitude: latitudeField,
  longitude: longitudeField,
  sqft: sqftField,
  water_consumption_lpd: nonNegativeIfPresent("Water Consumption"),
  waste_collection_kg_per_day: nonNegativeIfPresent("Waste Collection"),
  property_id: requiredString("Property"),
  sub_property_id: requiredString("Sub Property"),
  waste_type_ids: z.array(z.string()),
  id_proof_type: requiredString("ID Proof Type"),
  id_no: requiredString("ID Number"),
  member_count: optionalString,
  family_members: z.array(familyMemberSchema),
  country_id: requiredString("Country"),
  state_id: requiredString("State"),
  district_id: requiredString("District"),
  city_id: requiredString("City"),
  zone_id: optionalString,
  ward_id: optionalString,
  panchayat_id: optionalString,
  is_active: z.boolean(),
  is_bulkwaste_generator: z.boolean(),
  apartment_name: optionalString,
  block_no: optionalString,
  block_id: optionalString,
  flat_no: optionalString,
  villa_no: optionalString,
  industry_name: optionalString,
  industry_type: optionalString,
});

export type CustomerCreationFormValues = z.infer<typeof customerCreationSchema>;
