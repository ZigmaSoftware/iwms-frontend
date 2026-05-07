import type { SelectOption } from "@/types";

export type WithStateIdOption = SelectOption & { stateId: string };

export type WithDistrictIdOption = SelectOption & { stateId: string; districtId: string };

export type WithCityIdOption = SelectOption & {
  stateId: string;
  districtId: string;
  cityId: string;
};

export type ZoneOption = WithCityIdOption;

export type WardOption = WithCityIdOption & { panchayatId: string; zoneId: string };

export type UnknownRecord = Record<string, unknown>;

