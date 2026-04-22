import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fuelApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelRecord = {
  unique_id: string | number;
  fuel_type: string;
  description?: string;
  is_active: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
};

export type FuelPayload = {
  fuel_type: string;
  description?: string;
  is_active: boolean;
};

export type FuelListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

// ─── API wrappers ─────────────────────────────────────────────────────────────

const normalizeFuelId = (id: string | number) => String(id);

const listFuels = (filters?: FuelListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

  if (Object.keys(params).length === 0) {
    return fuelApi.list() as Promise<FuelRecord[]>;
  }

  return fuelApi.list({ params }) as Promise<FuelRecord[]>;
};

const getFuel = (id: string | number) =>
  fuelApi.get(id) as Promise<FuelRecord>;

const createFuel = (payload: FuelPayload) =>
  fuelApi.create(payload) as Promise<FuelRecord>;

const updateFuel = (id: string | number, payload: FuelPayload) =>
  fuelApi.update(id, payload) as Promise<FuelRecord>;

const replaceInList = (
  items: FuelRecord[] | undefined,
  item: FuelRecord
) => {
  if (!items) return items;
  const id = normalizeFuelId(item.unique_id);
  return items.map((r) => (normalizeFuelId(r.unique_id) === id ? item : r));
};

// ─── Query keys ───────────────────────────────────────────────────────────────

export const fuelQueryKeys = {
  all: ["transport", "fuels"] as const,
  list: (filters?: FuelListFilters | null) =>
    [
      "transport",
      "fuels",
      "list",
      String(filters?.company_id ?? ""),
      String(filters?.project_id ?? ""),
    ] as const,
  detail: (id: string | number) =>
    ["transport", "fuels", normalizeFuelId(id)] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFuelsQuery(filters?: FuelListFilters | null) {
  return enterpriseQuery<FuelRecord[]>({
    queryKey: fuelQueryKeys.list(filters),
    queryFn: () => listFuels(filters ?? undefined),
    enabled: filters !== null,
  });
}

export function useFuelQuery(id: string | number | null | undefined) {
  return enterpriseQuery<FuelRecord>({
    queryKey: fuelQueryKeys.detail(id ?? "new"),
    queryFn: () => getFuel(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateFuelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFuel,
    onSuccess: async (data) => {
      queryClient.setQueryData(fuelQueryKeys.detail(data.unique_id), data);
      await queryClient.invalidateQueries({ queryKey: fuelQueryKeys.all });
    },
  });
}

export function useUpdateFuelMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: FuelPayload;
    }) => updateFuel(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(fuelQueryKeys.detail(variables.id), data);
      queryClient.setQueryData<FuelRecord[]>(fuelQueryKeys.all, (cur) =>
        replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({ queryKey: fuelQueryKeys.all });
    },
  });
}