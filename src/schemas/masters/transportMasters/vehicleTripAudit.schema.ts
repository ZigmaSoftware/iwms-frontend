import { z } from "zod";

import { requiredString } from "@/schemas/shared/fields";

/**
 * Mirrors the original inline check in VehicleTripAuditForm:
 * daily_trip_assignment_id, vehicle_id, gps_lat, gps_lon and avg_speed were
 * required before submit; idle_seconds and captured_at are read-only
 * (system-derived) and were never validated.
 */
export const vehicleTripAuditSchema = z.object({
  daily_trip_assignment_id: requiredString("Daily trip assignment"),
  vehicle_id: requiredString("Vehicle"),
  gps_lat: requiredString("GPS latitude"),
  gps_lon: requiredString("GPS longitude"),
  avg_speed: requiredString("Average speed"),
});

export type VehicleTripAuditFormValues = z.infer<typeof vehicleTripAuditSchema>;
