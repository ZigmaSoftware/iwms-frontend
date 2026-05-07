import type { CompanyProjectFields } from "@/types/admin";

export type DistrictListRecord = CompanyProjectFields & {
  unique_id: string;
  countryName: string;
  stateName: string;
  name: string;
  is_active: boolean;
};

export type DistrictFormRecord = {
  name?: string;
  is_active?: boolean;
  continent_id?: string | number | null;
  country_id?: string | number | null;
  state_id?: string | number | null;
};

export type CountryMeta = {
  id: string;
  name: string;
  continentId: string | null;
  isActive: boolean;
};

export type StateMeta = {
  id: string;
  name: string;
  countryId: string | null;
  isActive: boolean;
};
