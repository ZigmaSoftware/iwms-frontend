export type CountryMeta = {
  id: string;
  name: string;
  continentId: string | null;
  isActive: boolean;
};

export type StateRecord = {
  name: string;
  label: string;
  is_active: boolean;
  country_id: string | number;
  continent_id: string | number;
};

export type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};

