import { useMutation, useQueryClient } from "@tanstack/react-query";

import { wardApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type WardRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
  zone_id?: string | number;
};

export type WardPayload = {
  name: string;
  is_active: boolean;
  zone_id?: string | number;
};

const listWards = () => wardApi.list() as Promise<WardRecord[]>;

const getWard = (id: string | number) => wardApi.get(id) as Promise<WardRecord>;

const createWard = (payload: WardPayload) => wardApi.create(payload) as Promise<WardRecord>;

const updateWard = (id: string | number, payload: WardPayload) => wardApi.update(id, payload) as Promise<WardRecord>;

const replaceWardInList = (wards: WardRecord[] | undefined, ward: WardRecord) => {
  if (!wards) return wards;
  const wid = String(ward.unique_id);
  return wards.map((w) => (String(w.unique_id) === wid ? ward : w));
};

export const wardQueryKeys = {
  all: ["masters", "wards"] as const,
  detail: (id: string | number) => ["masters", "wards", String(id)] as const,
};

export function useWardsQuery() {
  return enterpriseQuery<WardRecord[]>({ queryKey: wardQueryKeys.all, queryFn: listWards });
}

export function useWardQuery(id: string | number | null | undefined) {
  return enterpriseQuery<WardRecord>({ queryKey: wardQueryKeys.detail(id ?? "new"), queryFn: () => getWard(id as string | number), enabled: Boolean(id) });
}

export function useCreateWardMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createWard, onSuccess: async (ward) => { queryClient.setQueryData(wardQueryKeys.detail(ward.unique_id), ward); await queryClient.invalidateQueries({ queryKey: wardQueryKeys.all }); } });
}

export function useUpdateWardMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string | number; payload: WardPayload }) => updateWard(id, payload), onSuccess: async (ward, variables) => { queryClient.setQueryData(wardQueryKeys.detail(variables.id), ward); queryClient.setQueryData<WardRecord[]>(wardQueryKeys.all, (current) => replaceWardInList(current, ward)); await queryClient.invalidateQueries({ queryKey: wardQueryKeys.all }); } });
}
