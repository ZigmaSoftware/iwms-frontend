import type { SelectOption } from "@/types";

export type BinOption = SelectOption & {
  districtId: string;
  cityId: string;
  panchayatId: string;
  wardId: string;
  collectionPointId: string;
};

export type CollectionPointOption = SelectOption & {
  districtId: string;
  cityId: string;
  panchayatId: string;
  wardId: string;
};

export type CityOption = SelectOption & { districtId: string };

export type LocationOption = SelectOption & { districtId: string; cityId: string };

export type WardOption = LocationOption & { panchayatId: string; zoneId: string };
