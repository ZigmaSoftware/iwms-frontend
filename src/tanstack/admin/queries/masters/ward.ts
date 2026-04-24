import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { wardApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type WardRecord = {
  unique_id: string | number;
  name: string;
  ward_name?: string | null;
  description?: string | null;
  is_active: boolean;
  zone_id?: string | number | null;
  zone?: string | number | null;
  city_id?: string | number | null;
  city?: string | number | null;
  district_id?: string | number | null;
  district?: string | number | null;
  state_id?: string | number | null;
  state?: string | number | null;
  panchayat_id?: string | number | null;
  panchayat?: string | number | null;
  country_id?: string | number | null;
  continent_id?: string | number | null;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
};

export type WardPayload = {
  name?: string;
  ward_name?: string;
  description?: string | null;
  is_active: boolean;
  zone_id?: string | number | null;
  city_id?: string | number | null;
  district_id?: string | number | null;
  state_id?: string | number | null;
  country_id?: string | number | null;
  continent_id?: string | number | null;
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const listWards = (zoneId?: string) =>
  wardApi.list({ params: zoneId ? { zone_id: zoneId } : undefined }) as Promise<WardRecord[]>;

const getWard = (id: string | number) => wardApi.get(id) as Promise<WardRecord>;

const createWard = (payload: WardPayload) => wardApi.create(payload) as Promise<WardRecord>;

const updateWard = (id: string | number, payload: WardPayload) => wardApi.update(id, payload) as Promise<WardRecord>;

const replaceWardInList = (wards: WardRecord[] | undefined, ward: WardRecord) => {
  if (!wards) return wards;
  const wid = String(ward.unique_id);
  return wards.map((w) => (String(w.unique_id) === wid ? ward : w));
};

export const wardQueryKeys = {
  all: ["masters", "ward"] as const,
  detail: (id: string | number) => ["masters", "ward", String(id)] as const,
};

export function useWardsQuery(zoneId?: string | null) {
  const query = enterpriseQuery<WardRecord[]>({ queryKey: wardQueryKeys.all, queryFn: () => listWards(zoneId ?? undefined), enabled: zoneId !== null });
  const previousZoneIdRef = useRef(zoneId);

  useEffect(() => {
    if (previousZoneIdRef.current === zoneId) {
      return;
    }

    previousZoneIdRef.current = zoneId;

    if (zoneId !== null) {
      void query.refetch();
    }
  }, [query.refetch, zoneId]);

  return query;
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
