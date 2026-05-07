import { useMutation, useQueryClient } from "@tanstack/react-query";

import { panchayatApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type PanchayatRecord = {
  unique_id: string | number;
  panchayat_name?: string;
  name?: string;
  is_active?: boolean;
  state_id?: string | number | null;
  state?: string | number | null;
  district_id?: string | number | null;
  district?: string | number | null;
  city_id?: string | number | null;
  city?: string | number | null;
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

export type PanchayatListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
  district?: string | number | null;
  district_id?: string | number | null;
  city?: string | number | null;
  city_id?: string | number | null;
  state?: string | number | null;
  state_id?: string | number | null;
};

const normalizeId = (id: string | number) => String(id);

const compactFilters = (filters?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

const listPanchayats = (filters?: PanchayatListFilters) => {
  const params = compactFilters(filters);
  return panchayatApi.list(Object.keys(params).length ? { params } : undefined) as Promise<PanchayatRecord[]>;
};

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
  list: (filters?: PanchayatListFilters | null) => ["masters", "panchayats", filters ?? {}] as const,
  detail: (id: string | number) => ["masters", "panchayats", normalizeId(id)] as const,
};

export function usePanchayatsQuery(filters?: PanchayatListFilters | null) {
  return enterpriseQuery<PanchayatRecord[]>({
    queryKey: panchayatQueryKeys.list(filters),
    queryFn: () => listPanchayats(filters ?? undefined),
    enabled: filters !== null,
  });
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
