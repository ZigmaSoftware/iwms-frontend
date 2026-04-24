import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/helpers/admin/registry";

const api = adminApi;

export const unassignedStaffPoolKeys = {
  all: ["user creations", "unassigned staff pool"] as const,
  detail: (id: string | number) => [...unassignedStaffPoolKeys.all, String(id)] as const,
  users: ["masters", "users"] as const,
  zones: ["masters", "zones"] as const,
  wards: ["masters", "wards"] as const,
  tripInstances: ["masters", "trip_instances"] as const,
};

export const useUnassignedStaffPoolList = (params?: Record<string, any>) => {
  const query = useQuery({
    queryKey: unassignedStaffPoolKeys.all,
    queryFn: () => api.unassignedStaffPool.list({ params }),
    keepPreviousData: true,
  });

  const paramsSignature = useMemo(() => JSON.stringify(params ?? {}), [params]);
  const previousParamsRef = useRef(paramsSignature);

  useEffect(() => {
    if (previousParamsRef.current === paramsSignature) {
      return;
    }

    previousParamsRef.current = paramsSignature;
    void query.refetch();
  }, [paramsSignature, query.refetch]);

  return query;
};

export const useUnassignedStaffPoolQuery = (id?: string | number | null) =>
  useQuery({
    queryKey: unassignedStaffPoolKeys.detail(id ?? "new"),
    queryFn: () => api.unassignedStaffPool.get(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateUnassignedStaffPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.unassignedStaffPool.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: unassignedStaffPoolKeys.all }),
  });
};

export const useUpdateUnassignedStaffPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => api.unassignedStaffPool.update(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: unassignedStaffPoolKeys.all });
      qc.invalidateQueries({ queryKey: unassignedStaffPoolKeys.detail(vars.id) });
    },
  });
};

export const useUsersList = (params?: Record<string, any>) =>
  useQuery({ queryKey: unassignedStaffPoolKeys.users, queryFn: () => api.usersCreation.list({ params }) });

export const useZonesList = (params?: Record<string, any>) =>
  useQuery({ queryKey: unassignedStaffPoolKeys.zones, queryFn: () => api.zones.list({ params }) });

export const useWardsList = (params?: Record<string, any>) =>
  useQuery({ queryKey: unassignedStaffPoolKeys.wards, queryFn: () => api.wards.list({ params }) });

export const useTripInstancesList = (params?: Record<string, any>) =>
  useQuery({ queryKey: unassignedStaffPoolKeys.tripInstances, queryFn: () => api.tripInstances.list({ params }) });
