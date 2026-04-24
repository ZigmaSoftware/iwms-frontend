import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/helpers/admin/registry";
import { enterpriseQuery } from "../enterpriseQuery";

export type RoutePlanRecord = any;

export type RoutePlanFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const normalizeRoutePlanId = (id: string | number) => String(id);

const listRoutePlans = (filters?: RoutePlanFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

  if (Object.keys(params).length === 0) return adminApi.routePlans.list() as Promise<RoutePlanRecord[]>;

  return adminApi.routePlans.list({ params }) as Promise<RoutePlanRecord[]>;
};

const getRoutePlan = (id: string | number) => adminApi.routePlans.get(id) as Promise<RoutePlanRecord>;
const createRoutePlan = (payload: any) => adminApi.routePlans.create(payload) as Promise<RoutePlanRecord>;
const updateRoutePlan = (id: string | number, payload: any) => adminApi.routePlans.update(id, payload) as Promise<RoutePlanRecord>;
const deleteRoutePlan = (id: string | number) => adminApi.routePlans.remove(id);

const replaceInList = (items: RoutePlanRecord[] | undefined, item: RoutePlanRecord) => {
  if (!items) return items;
  const id = normalizeRoutePlanId(item.unique_id ?? item.id ?? "");
  return items.map((r) => (String(r.unique_id ?? r.id ?? "") === id ? item : r));
};

export const routePlanQueryKeys = {
  all: ["process items", "route plans"] as const,
  detail: (id: string | number) => [...routePlanQueryKeys.all, normalizeRoutePlanId(id)] as const,
};

export const useRoutePlansList = (filters?: RoutePlanFilters | null) => {
  const query = enterpriseQuery<RoutePlanRecord[]>({
    queryKey: routePlanQueryKeys.all,
    queryFn: () => listRoutePlans(filters ?? undefined),
    enabled: filters !== null,
  });

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        company_id: filters?.company_id ?? "",
        project_id: filters?.project_id ?? "",
      }),
    [filters?.company_id, filters?.project_id]
  );
  const previousFilterSignatureRef = useRef(filterSignature);

  useEffect(() => {
    if (previousFilterSignatureRef.current === filterSignature) {
      return;
    }

    previousFilterSignatureRef.current = filterSignature;

    if (filters !== null) {
      void query.refetch();
    }
  }, [filterSignature, filters, query.refetch]);

  return query;
};

export const useRoutePlanQuery = (id?: string | number | null) =>
  enterpriseQuery<RoutePlanRecord>({ queryKey: routePlanQueryKeys.detail(id ?? "new"), queryFn: () => getRoutePlan(id as string | number), enabled: Boolean(id) });

export function useCreateRoutePlanMutation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createRoutePlan, onSuccess: async (data) => { qc.setQueryData(routePlanQueryKeys.detail(data.unique_id), data); await qc.invalidateQueries({ queryKey: routePlanQueryKeys.all }); } });
}

export function useUpdateRoutePlanMutation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string | number; payload: any }) => updateRoutePlan(id, payload), onSuccess: async (data, vars) => { qc.setQueryData(routePlanQueryKeys.detail(vars.id), data); qc.setQueryData<RoutePlanRecord[]>(routePlanQueryKeys.all, (cur) => replaceInList(cur, data)); await qc.invalidateQueries({ queryKey: routePlanQueryKeys.all }); } });
}

export function useDeleteRoutePlanMutation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string | number) => deleteRoutePlan(id), onSuccess: async () => { await qc.invalidateQueries({ queryKey: routePlanQueryKeys.all }); } });
}
