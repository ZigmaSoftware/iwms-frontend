import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";


export const userScreenPermissionSchema = z.object({
  permissionType: requiredString("Permission Type"),
  mainScreenIds: z
    .array(z.string())
    .min(1, "At least one Main Screen is required"),
});

export type UserScreenPermissionFormValues = z.infer<typeof userScreenPermissionSchema>;
