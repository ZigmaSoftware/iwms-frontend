import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";
import { leaderSchemaBase } from "./leaderBase.schema";

/**
 * Mirrors PanchayatLeaderForm's manual checks: panchayat_id and username
 * are always required; password is required only when creating a new
 * leader (editing leaves it blank to keep the current password). The
 * "panchayat already has a leader" cross-check stays in the component —
 * it needs a network call and isn't a plain field check.
 */
export const buildPanchayatLeaderSchema = (isEdit: boolean) =>
  z
    .object({
      ...leaderSchemaBase,
      panchayat_id: requiredString("Panchayat"),
      password: optionalString,
    })
    .superRefine((data, ctx) => {
      if (!isEdit && !data.password.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: "Password is required when creating a new leader.",
        });
      }
    });

export type PanchayatLeaderFormValues = z.infer<ReturnType<typeof buildPanchayatLeaderSchema>>;
