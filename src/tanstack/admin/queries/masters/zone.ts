import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { zoneApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type ZoneRecord = {
  unique_id: string | number;
  name: string;
  zone_name?: string | null;
  description?: string | null;
  is_active: boolean;
  city_id?: string | number;
  district_id?: string | number | null;
  state_id?: string | number | null;
  country_id?: string | number | null;
  continent_id?: string | number | null;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
};

export type ZonePayload = {
  name?: string;
  zone_name?: string;
  description?: string | null;
  is_active: boolean;
  city_id?: string | number;
  district_id?: string | number | null;
  state_id?: string | number | null;
  country_id?: string | number | null;
  continent_id?: string | number | null;
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const normalizeZoneId = (id: string | number) => String(id);

const listZones = (customerId?: string) =>
  zoneApi.list({ params: customerId ? { customer_id: customerId } : undefined }) as Promise<ZoneRecord[]>;

const getZone = (id: string | number) => zoneApi.get(id) as Promise<ZoneRecord>;

const createZone = (payload: ZonePayload) => zoneApi.create(payload) as Promise<ZoneRecord>;

const updateZone = (id: string | number, payload: ZonePayload) => zoneApi.update(id, payload) as Promise<ZoneRecord>;

const replaceZoneInList = (zones: ZoneRecord[] | undefined, zone: ZoneRecord) => {
  if (!zones) return zones;
  const zid = normalizeZoneId(zone.unique_id);
  return zones.map((z) => (String(z.unique_id) === zid ? zone : z));
};

export const zoneQueryKeys = {
  all: ["masters", "zone"] as const,
  detail: (id: string | number) => ["masters", "zone", normalizeZoneId(id)] as const,
};

export function useZonesQuery(customerId?: string | null) {
  const query = enterpriseQuery<ZoneRecord[]>({ queryKey: zoneQueryKeys.all, queryFn: () => listZones(customerId ?? undefined), enabled: customerId !== null });
  const previousCustomerIdRef = useRef(customerId);

  useEffect(() => {
    if (previousCustomerIdRef.current === customerId) {
      return;
    }

    previousCustomerIdRef.current = customerId;

    if (customerId !== null) {
      void query.refetch();
    }
  }, [customerId, query.refetch]);

  return query;
}

export function useZoneQuery(id: string | number | null | undefined) {
  return enterpriseQuery<ZoneRecord>({ queryKey: zoneQueryKeys.detail(id ?? "new"), queryFn: () => getZone(id as string | number), enabled: Boolean(id) });
}

export function useCreateZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createZone, onSuccess: async (zone) => { queryClient.setQueryData(zoneQueryKeys.detail(zone.unique_id), zone); await queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all }); } });
}

export function useUpdateZoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string | number; payload: ZonePayload }) => updateZone(id, payload), onSuccess: async (zone, variables) => { queryClient.setQueryData(zoneQueryKeys.detail(variables.id), zone); queryClient.setQueryData<ZoneRecord[]>(zoneQueryKeys.all, (current) => replaceZoneInList(current, zone)); await queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all }); } });
}
