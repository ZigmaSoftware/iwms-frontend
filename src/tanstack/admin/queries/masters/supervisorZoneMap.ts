import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/helpers/admin/registry";

const api = adminApi;

export const supervisorZoneMapKeys = {
  all: ["user creations", "supervisor zone map"] as const,
  detail: (id: string | number) => [...supervisorZoneMapKeys.all, String(id)] as const,
  districts: ["masters", "districts"] as const,
  cities: ["masters", "cities"] as const,
  zones: ["masters", "zones"] as const,
  users: ["masters", "users"] as const,
};

export const useSupervisorZoneMapList = (params?: Record<string, any>) => {
  const query = useQuery({
    queryKey: supervisorZoneMapKeys.all,
    queryFn: () => api.supervisorZoneMap.list({ params }),
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

export const useSupervisorZoneMapQuery = (id?: string | number | null) =>
  useQuery({
    queryKey: supervisorZoneMapKeys.detail(id ?? "new"),
    queryFn: () => api.supervisorZoneMap.get(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateSupervisorZoneMap = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => api.supervisorZoneMap.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: supervisorZoneMapKeys.all }),
  });
};

export const useUpdateSupervisorZoneMap = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => api.supervisorZoneMap.update(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: supervisorZoneMapKeys.all });
      qc.invalidateQueries({ queryKey: supervisorZoneMapKeys.detail(vars.id) });
    },
  });
};

// Support hooks for related reference data used by the form
export const useDistrictsList = (params?: Record<string, any>) =>
  useQuery({ queryKey: supervisorZoneMapKeys.districts, queryFn: () => api.districts.list({ params }) });

export const useCitiesList = (params?: Record<string, any>) =>
  useQuery({ queryKey: supervisorZoneMapKeys.cities, queryFn: () => api.cities.list({ params }) });

export const useZonesList = (params?: Record<string, any>) =>
  useQuery({ queryKey: supervisorZoneMapKeys.zones, queryFn: () => api.zones.list({ params }) });

export const useUsersList = (params?: Record<string, any>) =>
  useQuery({ queryKey: supervisorZoneMapKeys.users, queryFn: () => api.usersCreation.list({ params }) });
