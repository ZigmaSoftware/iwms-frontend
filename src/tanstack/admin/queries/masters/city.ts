import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cityApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type CityRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
  state_id?: string | number;
  district_id?: string | number | null;
  state?: string | number | null;
  district?: string | number | null;
  country_id?: string | number | null;
  country?: string | number | null;
  continent_id?: string | number | null;
  continent?: string | number | null;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
};

export type CityPayload = {
  name: string;
  is_active: boolean;
  state_id?: string | number;
  district_id?: string | number | null;
  country_id?: string | number | null;
  continent_id?: string | number | null;
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const normalizeCityId = (id: string | number) => String(id);

const listCities = () => cityApi.list() as Promise<CityRecord[]>;

const getCity = (id: string | number) => cityApi.get(id) as Promise<CityRecord>;

const createCity = (payload: CityPayload) => cityApi.create(payload) as Promise<CityRecord>;

const updateCity = (id: string | number, payload: CityPayload) => cityApi.update(id, payload) as Promise<CityRecord>;

const replaceCityInList = (cities: CityRecord[] | undefined, city: CityRecord) => {
  if (!cities) return cities;

  const cityId = normalizeCityId(city.unique_id);

  return cities.map((record) => (normalizeCityId(record.unique_id) === cityId ? city : record));
};

export const cityQueryKeys = {
  all: ["masters", "cities"] as const,
  detail: (id: string | number) => ["masters", "cities", normalizeCityId(id)] as const,
};

export function useCitiesQuery() {
  return enterpriseQuery<CityRecord[]>({ queryKey: cityQueryKeys.all, queryFn: listCities });
}

export function useCityQuery(id: string | number | null | undefined) {
  return enterpriseQuery<CityRecord>({ queryKey: cityQueryKeys.detail(id ?? "new"), queryFn: () => getCity(id as string | number), enabled: Boolean(id) });
}

export function useCreateCityMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createCity, onSuccess: async (city) => { queryClient.setQueryData(cityQueryKeys.detail(city.unique_id), city); await queryClient.invalidateQueries({ queryKey: cityQueryKeys.all }); } });
}

export function useUpdateCityMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string | number; payload: CityPayload }) => updateCity(id, payload), onSuccess: async (city, variables) => { queryClient.setQueryData(cityQueryKeys.detail(variables.id), city); queryClient.setQueryData<CityRecord[]>(cityQueryKeys.all, (current) => replaceCityInList(current, city)); await queryClient.invalidateQueries({ queryKey: cityQueryKeys.all }); } });
}
