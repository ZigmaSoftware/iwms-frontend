import { useMutation, useQueryClient } from "@tanstack/react-query";

import { hierarchyApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type HierarchyRecord = {
  unique_id: string | number;
  level_name?: string;
  area_type?: string | number | null;
  area_type_id?: string | number | null;
  is_active?: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  company_name?: string;
  project_name?: string;
};

export type HierarchyPayload = {
  level_name: string;
  area_type: string | number;
  is_active: boolean;
  company_id: string | number;
  project_id: string | number;
};

const normalizeId = (id: string | number) => String(id);

const listHierarchies = () => hierarchyApi.list() as Promise<HierarchyRecord[]>;
const getHierarchy = (id: string | number) => hierarchyApi.get(id) as Promise<HierarchyRecord>;
const createHierarchy = (payload: HierarchyPayload) => hierarchyApi.create(payload) as Promise<HierarchyRecord>;
const updateHierarchy = (id: string | number, payload: HierarchyPayload) => hierarchyApi.update(id, payload) as Promise<HierarchyRecord>;

const replaceInList = (items: HierarchyRecord[] | undefined, item: HierarchyRecord) => {
  if (!items) return items;
  const id = normalizeId(item.unique_id);
  return items.map((record) => (normalizeId(record.unique_id) === id ? item : record));
};

export const hierarchyQueryKeys = {
  all: ["masters", "hierarchies"] as const,
  detail: (id: string | number) => ["masters", "hierarchies", normalizeId(id)] as const,
};

export function useHierarchiesQuery() {
  return enterpriseQuery<HierarchyRecord[]>({
    queryKey: hierarchyQueryKeys.all,
    queryFn: listHierarchies,
  });
}

export function useHierarchyQuery(id: string | number | null | undefined) {
  return enterpriseQuery<HierarchyRecord>({
    queryKey: hierarchyQueryKeys.detail(id ?? "new"),
    queryFn: () => getHierarchy(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateHierarchyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createHierarchy,
    onSuccess: async (data) => {
      qc.setQueryData(hierarchyQueryKeys.detail(data.unique_id), data);
      await qc.invalidateQueries({ queryKey: hierarchyQueryKeys.all });
    },
  });
}

export function useUpdateHierarchyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: HierarchyPayload }) =>
      updateHierarchy(id, payload),
    onSuccess: async (data, vars) => {
      qc.setQueryData(hierarchyQueryKeys.detail(vars.id), data);
      qc.setQueryData<HierarchyRecord[]>(hierarchyQueryKeys.all, (cur) => replaceInList(cur, data));
      await qc.invalidateQueries({ queryKey: hierarchyQueryKeys.all });
    },
  });
}
