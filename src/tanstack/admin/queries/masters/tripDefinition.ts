import { useMutation, useQueryClient } from "@tanstack/react-query";

import { tripDefinitionApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TripDefinitionRecord = {
  unique_id: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  routeplan_id?: string;
  staff_template_id?: string;
  property_id?: string;
  sub_property_id?: string;
  routeplan?: { unique_id?: string; display_code?: string };
  staff_template?: { unique_id?: string; display_code?: string };
  property?: { unique_id?: string; property_name?: string };
  sub_property?: { unique_id?: string; sub_property_name?: string };
  trip_trigger_weight_kg?: number | string;
  max_vehicle_capacity_kg?: number | string;
  approval_status?: string;
  status?: string;
  created_at?: string;
  // Enriched name fields used for table filtering
  _routeplan_name?: string;
  _staff_template_name?: string;
  _property_name?: string;
  _sub_property_name?: string;
  [key: string]: unknown;
};

export type TripDefinitionPayload = {
  company_id_input?: string | null;
  project_id_input?: string | null;
  routeplan_id?: string;
  staff_template_id?: string;
  property_id?: string;
  sub_property_id?: string;
  trip_trigger_weight_kg?: number;
  max_vehicle_capacity_kg?: number;
  approval_status?: string;
  status?: string;
};

export type TripDefinitionListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

// ─── API wrappers ─────────────────────────────────────────────────────────────

const normalizeTripDefinitionId = (id: string | number) => String(id);

const listTripDefinitions = (filters?: TripDefinitionListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

  if (Object.keys(params).length === 0) {
    return tripDefinitionApi.list() as Promise<TripDefinitionRecord[]>;
  }

  return tripDefinitionApi.list({ params }) as Promise<TripDefinitionRecord[]>;
};

const getTripDefinition = (id: string | number) =>
  tripDefinitionApi.get(id) as Promise<TripDefinitionRecord>;

const createTripDefinition = (payload: TripDefinitionPayload) =>
  tripDefinitionApi.create(payload) as Promise<TripDefinitionRecord>;

const updateTripDefinition = (
  id: string | number,
  payload: TripDefinitionPayload
) => tripDefinitionApi.update(id, payload) as Promise<TripDefinitionRecord>;

const replaceInList = (
  items: TripDefinitionRecord[] | undefined,
  item: TripDefinitionRecord
) => {
  if (!items) return items;
  const id = normalizeTripDefinitionId(item.unique_id);
  return items.map((r) =>
    normalizeTripDefinitionId(r.unique_id) === id ? item : r
  );
};

// ─── Query keys ───────────────────────────────────────────────────────────────

export const tripDefinitionQueryKeys = {
  all: ["transport", "tripDefinitions"] as const,
  list: (filters?: TripDefinitionListFilters | null) =>
    [
      "transport",
      "tripDefinitions",
      "list",
      String(filters?.company_id ?? ""),
      String(filters?.project_id ?? ""),
    ] as const,
  detail: (id: string | number) =>
    ["transport", "tripDefinitions", normalizeTripDefinitionId(id)] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useTripDefinitionsQuery(
  filters?: TripDefinitionListFilters | null
) {
  return enterpriseQuery<TripDefinitionRecord[]>({
    queryKey: tripDefinitionQueryKeys.list(filters),
    queryFn: () => listTripDefinitions(filters ?? undefined),
    enabled: filters !== null,
  });
}

export function useTripDefinitionQuery(
  id: string | number | null | undefined
) {
  return enterpriseQuery<TripDefinitionRecord>({
    queryKey: tripDefinitionQueryKeys.detail(id ?? "new"),
    queryFn: () => getTripDefinition(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateTripDefinitionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTripDefinition,
    onSuccess: async (data) => {
      queryClient.setQueryData(
        tripDefinitionQueryKeys.detail(data.unique_id),
        data
      );
      await queryClient.invalidateQueries({
        queryKey: tripDefinitionQueryKeys.all,
      });
    },
  });
}

export function useUpdateTripDefinitionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: TripDefinitionPayload;
    }) => updateTripDefinition(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(
        tripDefinitionQueryKeys.detail(variables.id),
        data
      );
      queryClient.setQueryData<TripDefinitionRecord[]>(
        tripDefinitionQueryKeys.all,
        (cur) => replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({
        queryKey: tripDefinitionQueryKeys.all,
      });
    },
  });
}