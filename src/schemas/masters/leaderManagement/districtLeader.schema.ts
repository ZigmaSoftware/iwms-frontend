import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";
import { leaderSchemaBase } from "./leaderBase.schema";

/**
 * Mirrors DistrictLeaderForm's manual checks: district_id and username are
 * always required; password is required only when creating a new leader
 * (editing leaves it blank to keep the current password).
 */
export const buildDistrictLeaderSchema = (isEdit: boolean) =>
  z
    .object({
      ...leaderSchemaBase,
      district_id: requiredString("District"),
      password: optionalString,
    })
    .superRefine((data, ctx) => {
      if (!isEdit && !data.password.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Password is required when creating a new district leader.",
        });
      }
    });

export type DistrictLeaderFormValues = z.infer<ReturnType<typeof buildDistrictLeaderSchema>>;
