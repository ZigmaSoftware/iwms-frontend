import { useMutation, useQueryClient } from "@tanstack/react-query";

import { countryApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type CountryRecord = {
  unique_id: string | number;
  name: string;
  mob_code?: string;
  currency?: string;
  continent_id?: string | number | null;
  continent?: string | number | null;
  is_active: boolean;
};

export type CountryPayload = {
  name: string;
  mob_code?: string;
  currency?: string;
  continent_id?: string | number | null;
  is_active: boolean;
};

const normalizeCountryId = (id: string | number) => String(id);

const listCountries = () => countryApi.list() as Promise<CountryRecord[]>;

const getCountry = (id: string | number) => countryApi.get(id) as Promise<CountryRecord>;

const createCountry = (payload: CountryPayload) => countryApi.create(payload) as Promise<CountryRecord>;

const updateCountry = (id: string | number, payload: CountryPayload) => countryApi.update(id, payload) as Promise<CountryRecord>;

const replaceCountryInList = (countries: CountryRecord[] | undefined, country: CountryRecord) => {
  if (!countries) return countries;

  const countryId = normalizeCountryId(country.unique_id);

  return countries.map((record) =>
    normalizeCountryId(record.unique_id) === countryId ? country : record
  );
};

export const countryQueryKeys = {
  all: ["masters", "countries"] as const,
  detail: (id: string | number) => ["masters", "countries", normalizeCountryId(id)] as const,
};

export function useCountriesQuery() {
  return enterpriseQuery<CountryRecord[]>({
    queryKey: countryQueryKeys.all,
    queryFn: listCountries,
  });
}

export function useCountryQuery(id: string | number | null | undefined) {
  return enterpriseQuery<CountryRecord>({
    queryKey: countryQueryKeys.detail(id ?? "new"),
    queryFn: () => getCountry(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateCountryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCountry,
    onSuccess: async (country) => {
      queryClient.setQueryData(countryQueryKeys.detail(country.unique_id), country);

      await queryClient.invalidateQueries({ queryKey: countryQueryKeys.all });
    },
  });
}

export function useUpdateCountryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: CountryPayload }) => updateCountry(id, payload),
    onSuccess: async (country, variables) => {
      queryClient.setQueryData(countryQueryKeys.detail(variables.id), country);
      queryClient.setQueryData<CountryRecord[]>(countryQueryKeys.all, (current) => replaceCountryInList(current, country));

      await queryClient.invalidateQueries({ queryKey: countryQueryKeys.all });
    },
  });
}
