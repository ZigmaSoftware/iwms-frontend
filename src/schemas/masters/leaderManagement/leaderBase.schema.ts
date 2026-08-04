import { z } from "zod";

import { optionalEmailField, optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Fields shared by every leader-type form (district leader, panchayat
 * leader, ...): a required login username, an email that's optional but
 * must be a valid address when supplied, an optional display name, and the
 * is_active toggle — stored as the string "1"/"0" by these forms' own
 * Select, not a boolean.
 */
export const leaderSchemaBase = {
  username: requiredString("Username"),
  email: optionalEmailField,
  leader_name: optionalString,
  is_active: z.string(),
};
