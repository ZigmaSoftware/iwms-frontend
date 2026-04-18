import { useMutation, useQueryClient } from "@tanstack/react-query";

import { continentApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type ContinentRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
};

export type ContinentPayload = {
  name: string;
  is_active: boolean;
};

const normalizeContinentId = (id: string | number) => String(id);

const listContinents = () =>
  continentApi.list() as Promise<ContinentRecord[]>;

const getContinent = (id: string | number) =>
  continentApi.get(id) as Promise<ContinentRecord>;

const createContinent = (payload: ContinentPayload) =>
  continentApi.create(payload) as Promise<ContinentRecord>;

const updateContinent = (
  id: string | number,
  payload: ContinentPayload
) => continentApi.update(id, payload) as Promise<ContinentRecord>;

const replaceContinentInList = (
  continents: ContinentRecord[] | undefined,
  continent: ContinentRecord
) => {
  if (!continents) {
    return continents;
  }

  const continentId = normalizeContinentId(continent.unique_id);

  return continents.map((record) =>
    normalizeContinentId(record.unique_id) === continentId ? continent : record
  );
};

export const continentQueryKeys = {
  all: ["masters", "continents"] as const,
  detail: (id: string | number) =>
    ["masters", "continents", normalizeContinentId(id)] as const,
};

export function useContinentsQuery() {
  return enterpriseQuery<ContinentRecord[]>({
    queryKey: continentQueryKeys.all,
    queryFn: listContinents,
  });
}

export function useContinentQuery(id: string | number | null | undefined) {
  return enterpriseQuery<ContinentRecord>({
    queryKey: continentQueryKeys.detail(id ?? "new"),
    queryFn: () => getContinent(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateContinentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContinent,
    onSuccess: async (continent) => {
      queryClient.setQueryData(
        continentQueryKeys.detail(continent.unique_id),
        continent
      );

      await queryClient.invalidateQueries({
        queryKey: continentQueryKeys.all,
      });
    },
  });
}

export function useUpdateContinentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: ContinentPayload;
    }) => updateContinent(id, payload),
    onSuccess: async (continent, variables) => {
      queryClient.setQueryData(
        continentQueryKeys.detail(variables.id),
        continent
      );
      queryClient.setQueryData<ContinentRecord[]>(
        continentQueryKeys.all,
        (current) => replaceContinentInList(current, continent)
      );

      await queryClient.invalidateQueries({
        queryKey: continentQueryKeys.all,
      });
    },
  });
}
