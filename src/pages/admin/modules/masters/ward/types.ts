import type { CompanyProjectFields } from "@/types";

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

export type DistrictMeta = {
  id: string;
  name: string;
  stateId: string | null;
  isActive: boolean;
};

export type CityMeta = {
  id: string;
  name: string;
  districtId: string | null;
  isActive: boolean;
};

export type ZoneMeta = {
  id: string;
  name: string;
  cityId: string | null;
  isActive: boolean;
};

export type WardRecord = {
  name?: string;
  is_active?: boolean;
  description?: string;
  continent_id?: string | number | null;
  country_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  zone_id?: string | number | null;
  continent?: string | number | null;
  country?: string | number | null;
  state?: string | number | null;
  district?: string | number | null;
  city?: string | number | null;
  zone?: string | number | null;
};

export type WardListRecord = CompanyProjectFields & {
  unique_id: string;
  ward_name: string;
  is_active: boolean;
  zone_name: string;
  city_name: string;
  district_name: string;
  state_name: string;
  country_name: string;
};
