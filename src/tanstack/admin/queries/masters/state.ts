import { useMutation, useQueryClient } from "@tanstack/react-query";

import { stateApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type StateRecord = {
  unique_id: string | number;
  name: string;
  label?: string;
  is_active: boolean;
  country_id: string | number;
  continent_id: string | number;
  country?: string | number | null;
  continent?: string | number | null;
};

export type StatePayload = {
  name: string;
  label?: string;
  country_id?: string | number;
  continent_id?: string | number;
  is_active: boolean;
};

const listStates = () => stateApi.list() as Promise<StateRecord[]>;

const getState = (id: string | number) => stateApi.get(id) as Promise<StateRecord>;

const createState = (payload: StatePayload) => stateApi.create(payload) as Promise<StateRecord>;

const updateState = (id: string | number, payload: StatePayload) => stateApi.update(id, payload) as Promise<StateRecord>;

const replaceStateInList = (states: StateRecord[] | undefined, state: StateRecord) => {
  if (!states) return states;

  const sid = String(state.unique_id);
  return states.map((s) => (String(s.unique_id) === sid ? state : s));
};

export const stateQueryKeys = {
  all: ["masters", "states"] as const,
  detail: (id: string | number) => ["masters", "states", String(id)] as const,
};

export function useStatesQuery() {
  return enterpriseQuery<StateRecord[]>({ queryKey: stateQueryKeys.all, queryFn: listStates });
}

export function useStateQuery(id: string | number | null | undefined) {
  return enterpriseQuery<StateRecord>({ queryKey: stateQueryKeys.detail(id ?? "new"), queryFn: () => getState(id as string | number), enabled: Boolean(id) });
}

export function useCreateStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createState,
    onSuccess: async (state) => {
      queryClient.setQueryData(stateQueryKeys.detail(state.unique_id), state);
      await queryClient.invalidateQueries({ queryKey: stateQueryKeys.all });
    },
  });
}

export function useUpdateStateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: StatePayload }) => updateState(id, payload),
    onSuccess: async (state, variables) => {
      queryClient.setQueryData(stateQueryKeys.detail(variables.id), state);
      queryClient.setQueryData<StateRecord[]>(stateQueryKeys.all, (current) => replaceStateInList(current, state));
      await queryClient.invalidateQueries({ queryKey: stateQueryKeys.all });
    },
  });
}
