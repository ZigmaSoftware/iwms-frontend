export type ContinentRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
};

export type CountryRecord = {
  name: string;
  mob_code: string;
  currency: string;
  continent_id?: string | number | null;
  continent?: string | number | null;
  is_active: boolean;
};

export type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};

