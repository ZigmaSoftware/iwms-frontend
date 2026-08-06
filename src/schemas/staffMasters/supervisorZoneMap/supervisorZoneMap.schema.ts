import { z } from "zod";

import { optionalString, requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in SupervisorZoneMapForm's handleSave:
 * company_id, project_id, supervisor_id, district_id, city_id and zone_ids
 * were each required before submit, but only when visible via
 * useFieldVisibility's showField — apply `requireWhenVisible` in the
 * component rather than hard-coding that here. status and remarks were
 * never required.
 */
export const supervisorZoneMapSchema = z.object({
  company_id: requiredString("Company"),
  project_id: requiredString("Project"),
  supervisor_id: requiredString("Supervisor"),
  district_id: requiredString("District"),
  city_id: requiredString("City"),
  zone_ids: z.array(z.string()).min(1, "Zones is required"),
  status: z.string(),
  remarks: optionalString,
});

export type SupervisorZoneMapFormValues = z.infer<typeof supervisorZoneMapSchema>;
