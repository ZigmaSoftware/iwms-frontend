export type NamedRef = Record<string, unknown> | null | undefined;

// A5: DailyTripHouseholdCollection.STATUS_CHOICES — STATUS_MISSED renamed to
// "Not Available"; "Not Collected"/"Skipped" kept only for legacy rows.
export type DailyTripHouseholdCollectionStatus =
  | "Pending"
  | "Collected"
  | "Collect Later"
  | "Not Available"
  | "Not Collected"
  | "Skipped";

// A5: collection_type (from A4, per stop row) distinguishes a household's
// regular door-to-door pickup from a one-off bulk waste pickup.
export type HouseholdCollectionType = "household_collection" | "bulk_waste_collection";

// A5: waste_breakdown — read-only SerializerMethodField sourced from the
// linked WasteCollection (wet/dry/mixed/sanitary/total), null if no
// WasteCollection row exists yet for this stop.
export type WasteBreakdown = {
  wet_waste?: number | string | null;
  dry_waste?: number | string | null;
  mixed_waste?: number | string | null;
  sanitary_waste?: number | string | null;
  total_quantity?: number | string | null;
} | null;

export type DailyTripHouseholdCollectionRecord = {
  unique_id: string;
  trip_assignment_id?: string;
  trip_assignment?: NamedRef;
  customer_id?: string;
  customer?: NamedRef;
  // A5
  collection_type?: HouseholdCollectionType | string;
  waste_breakdown?: WasteBreakdown;
  waste_collection_id?: string | null;
  panchayat?: { unique_id?: string; panchayat_name?: string } | null;
  ward?: { unique_id?: string; ward_name?: string } | null;
  sequence?: number;
  is_collected?: boolean;
  collected_at?: string | null;
  collected_weight_kg?: string | number | null;
  status?: DailyTripHouseholdCollectionStatus | string;
  status_reason?: string | null;
  status_latitude?: string | number | null;
  status_longitude?: string | number | null;
  company_id?: string | null;
  company_unique_id?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  [key: string]: unknown;
};
