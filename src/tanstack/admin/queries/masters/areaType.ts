import { useMutation, useQueryClient } from "@tanstack/react-query";

import { areaTypeApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type AreaTypeRecord = {
  unique_id: string | number;
  name?: string;
  area_type_name?: string;
  is_active?: boolean;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  company_name?: string;
  project_name?: string;
};

export type AreaTypePayload = {
  name: string;
  is_active: boolean;
  state_id: string | number;
  district_id: string | number;
  city_id: string | number;
  company_id: string | number;
  project_id: string | number;
};

const normalizeId = (id: string | number) => String(id);

const listAreaTypes = () => areaTypeApi.list() as Promise<AreaTypeRecord[]>;
const getAreaType = (id: string | number) => areaTypeApi.get(id) as Promise<AreaTypeRecord>;
const createAreaType = (payload: AreaTypePayload) => areaTypeApi.create(payload) as Promise<AreaTypeRecord>;
const updateAreaType = (id: string | number, payload: AreaTypePayload) => areaTypeApi.update(id, payload) as Promise<AreaTypeRecord>;

const replaceInList = (items: AreaTypeRecord[] | undefined, item: AreaTypeRecord) => {
  if (!items) return items;
  const id = normalizeId(item.unique_id);
  return items.map((record) => (normalizeId(record.unique_id) === id ? item : record));
};

export const areaTypeQueryKeys = {
  all: ["masters", "areatypes"] as const,
  detail: (id: string | number) => ["masters", "areatypes", normalizeId(id)] as const,
};

export function useAreaTypesQuery() {
  return enterpriseQuery<AreaTypeRecord[]>({
    queryKey: areaTypeQueryKeys.all,
    queryFn: listAreaTypes,
  });
}

export function useAreaTypeQuery(id: string | number | null | undefined) {
  return enterpriseQuery<AreaTypeRecord>({
    queryKey: areaTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getAreaType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateAreaTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAreaType,
    onSuccess: async (data) => {
      qc.setQueryData(areaTypeQueryKeys.detail(data.unique_id), data);
      await qc.invalidateQueries({ queryKey: areaTypeQueryKeys.all });
    },
  });
}

export function useUpdateAreaTypeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: AreaTypePayload }) =>
      updateAreaType(id, payload),
    onSuccess: async (data, vars) => {
      qc.setQueryData(areaTypeQueryKeys.detail(vars.id), data);
      qc.setQueryData<AreaTypeRecord[]>(areaTypeQueryKeys.all, (cur) => replaceInList(cur, data));
      await qc.invalidateQueries({ queryKey: areaTypeQueryKeys.all });
    },
  });
}
