import { useMutation, useQueryClient } from "@tanstack/react-query";

import { panchayatApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type PanchayatRecord = {
  unique_id: string | number;
  panchayat_name?: string;
  is_active?: boolean;
  company_id?: string | number | null;
  project_id?: string | number | null;
};

export type PanchayatPayload = {
  panchayat_name?: string;
  is_active?: boolean;
  company_id?: string | number | null;
  project_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  area_type_id?: string | number | null;
  hierarchy_id?: string | number | null;
  latitude?: string;
  longitude?: string;
  geofencing_type?: string;
};

const normalizeId = (id: string | number) => String(id);

const listPanchayats = () => panchayatApi.list() as Promise<PanchayatRecord[]>;

const getPanchayat = (id: string | number) => panchayatApi.get(id) as Promise<PanchayatRecord>;

const createPanchayat = (payload: PanchayatPayload) => panchayatApi.create(payload) as Promise<PanchayatRecord>;

const updatePanchayat = (id: string | number, payload: PanchayatPayload) => panchayatApi.update(id, payload) as Promise<PanchayatRecord>;

const replaceInList = (items: PanchayatRecord[] | undefined, item: PanchayatRecord) => {
  if (!items) return items;
  const id = normalizeId(item.unique_id);
  return items.map((r) => (normalizeId(r.unique_id) === id ? item : r));
};

export const panchayatQueryKeys = {
  all: ["masters", "panchayats"] as const,
  detail: (id: string | number) => ["masters", "panchayats", normalizeId(id)] as const,
};

export function usePanchayatsQuery() {
  return enterpriseQuery<PanchayatRecord[]>({ queryKey: panchayatQueryKeys.all, queryFn: listPanchayats });
}

export function usePanchayatQuery(id: string | number | null | undefined) {
  return enterpriseQuery<PanchayatRecord>({ queryKey: panchayatQueryKeys.detail(id ?? "new"), queryFn: () => getPanchayat(id as string | number), enabled: Boolean(id) });
}

export function useCreatePanchayatMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createPanchayat,
    onSuccess: async (data) => {
      qc.setQueryData(panchayatQueryKeys.detail(data.unique_id), data);
      await qc.invalidateQueries({ queryKey: panchayatQueryKeys.all });
    },
  });
}

export function useUpdatePanchayatMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: PanchayatPayload }) => updatePanchayat(id, payload),
    onSuccess: async (data, vars) => {
      qc.setQueryData(panchayatQueryKeys.detail(vars.id), data);
      qc.setQueryData<PanchayatRecord[]>(panchayatQueryKeys.all, (cur) => replaceInList(cur, data));
      await qc.invalidateQueries({ queryKey: panchayatQueryKeys.all });
    },
  });
}
