import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/helpers/admin/registry";
import { enterpriseQuery } from "../enterpriseQuery";

export type ZonePropertyLoadTrackerRecord = any;

export type ZonePropertyLoadTrackerFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const normalizeId = (id: string | number) => String(id);

const listZonePropertyLoadTrackers = (filters?: ZonePropertyLoadTrackerFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

  if (Object.keys(params).length === 0) return adminApi.zonePropertyLoadTrackers.list() as Promise<ZonePropertyLoadTrackerRecord[]>;

  return adminApi.zonePropertyLoadTrackers.list({ params }) as Promise<ZonePropertyLoadTrackerRecord[]>;
};

const getZonePropertyLoadTracker = (id: string | number) => adminApi.zonePropertyLoadTrackers.get(id) as Promise<ZonePropertyLoadTrackerRecord>;
const createZonePropertyLoadTracker = (payload: any) => adminApi.zonePropertyLoadTrackers.create(payload) as Promise<ZonePropertyLoadTrackerRecord>;
const updateZonePropertyLoadTracker = (id: string | number, payload: any) => adminApi.zonePropertyLoadTrackers.update(id, payload) as Promise<ZonePropertyLoadTrackerRecord>;
const deleteZonePropertyLoadTracker = (id: string | number) => adminApi.zonePropertyLoadTrackers.remove(id);

const replaceInList = (items: ZonePropertyLoadTrackerRecord[] | undefined, item: ZonePropertyLoadTrackerRecord) => {
  if (!items) return items;
  const id = normalizeId(item.unique_id ?? item.id ?? "");
  return items.map((r) => (String(r.unique_id ?? r.id ?? "") === id ? item : r));
};

export const zonePropertyLoadTrackerQueryKeys = {
  all: ["process items", "zone load tracker"] as const,
  detail: (id: string | number) => [...zonePropertyLoadTrackerQueryKeys.all, normalizeId(id)] as const,
  zones: ["masters", "zones"] as const,
  vehicles: ["masters", "vehicle_creations"] as const,
  properties: ["masters", "properties"] as const,
  subProperties: ["masters", "sub_properties"] as const,
};

export const useZonePropertyLoadTrackerList = (filters?: ZonePropertyLoadTrackerFilters | null) => {
  const query = enterpriseQuery<ZonePropertyLoadTrackerRecord[]>({
    queryKey: zonePropertyLoadTrackerQueryKeys.all,
    queryFn: () => listZonePropertyLoadTrackers(filters ?? undefined),
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

export const useZonePropertyLoadTrackerQuery = (id?: string | number | null) =>
  enterpriseQuery<ZonePropertyLoadTrackerRecord>({ queryKey: zonePropertyLoadTrackerQueryKeys.detail(id ?? "new"), queryFn: () => getZonePropertyLoadTracker(id as string | number), enabled: Boolean(id) });

export function useCreateZonePropertyLoadTracker() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createZonePropertyLoadTracker, onSuccess: async (data) => { qc.setQueryData(zonePropertyLoadTrackerQueryKeys.detail(data.unique_id), data); await qc.invalidateQueries({ queryKey: zonePropertyLoadTrackerQueryKeys.all }); } });
}

export function useUpdateZonePropertyLoadTracker() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string | number; payload: any }) => updateZonePropertyLoadTracker(id, payload), onSuccess: async (data, vars) => { qc.setQueryData(zonePropertyLoadTrackerQueryKeys.detail(vars.id), data); qc.setQueryData<ZonePropertyLoadTrackerRecord[]>(zonePropertyLoadTrackerQueryKeys.all, (cur) => replaceInList(cur, data)); await qc.invalidateQueries({ queryKey: zonePropertyLoadTrackerQueryKeys.all }); } });
}

export function useDeleteZonePropertyLoadTracker() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string | number) => deleteZonePropertyLoadTracker(id), onSuccess: async () => { await qc.invalidateQueries({ queryKey: zonePropertyLoadTrackerQueryKeys.all }); } });
}

// Support hooks for related reference data used by the form
export const usePropertiesList = (params?: Record<string, any>) =>
  useQuery({ queryKey: zonePropertyLoadTrackerQueryKeys.properties, queryFn: () => adminApi.properties.list({ params }) });

export const useSubPropertiesList = (params?: Record<string, any>) =>
  useQuery({ queryKey: zonePropertyLoadTrackerQueryKeys.subProperties, queryFn: () => adminApi.subProperties.list({ params }) });
