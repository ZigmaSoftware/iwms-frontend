import type { SelectOption } from "@/types";

export type CollectionPointOption = SelectOption & {
  districtId: string;
  cityId: string;
  panchayatId: string;
  wardId: string;
};

export type CityOption = SelectOption & { districtId: string };

export type LocationOption = SelectOption & { districtId: string; cityId: string };

export type WardOption = LocationOption & { panchayatId: string; zoneId: string };

export type BinRecord = Record<string, unknown>;

