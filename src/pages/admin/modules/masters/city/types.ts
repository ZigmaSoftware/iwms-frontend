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

export type CityRecord = {
  name?: string;
  is_active?: boolean;
  continent_id?: string | number | null;
  continent?: string | number | null;
  country_id?: string | number | null;
  country?: string | number | null;
  state_id?: string | number | null;
  state?: string | number | null;
  district_id?: string | number | null;
  district?: string | number | null;
};
