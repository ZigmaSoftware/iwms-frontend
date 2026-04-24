import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { alternativeStaffTemplateApi } from "@/helpers/admin";

export const alternativeStaffTemplateKeys = {
  all: ["user creations", "alternative staff template"] as const,
  detail: (id: string | number) =>
    [...alternativeStaffTemplateKeys.all, String(id)] as const,
};

export const useAlternativeStaffTemplateList = (params?: Record<string, any>) => {
  const query = useQuery({
    queryKey: alternativeStaffTemplateKeys.all,
    queryFn: () => alternativeStaffTemplateApi.list({ params }),
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

export const useAlternativeStaffTemplateQuery = (
  id?: string | number | null
) =>
  useQuery({
    queryKey: alternativeStaffTemplateKeys.detail(id ?? "new"),
    queryFn: () => alternativeStaffTemplateApi.get(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateAlternativeStaffTemplate = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: any) => alternativeStaffTemplateApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: alternativeStaffTemplateKeys.all }),
  });
};

export const useUpdateAlternativeStaffTemplate = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
      alternativeStaffTemplateApi.update(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: alternativeStaffTemplateKeys.all });
      qc.invalidateQueries({ queryKey: alternativeStaffTemplateKeys.detail(vars.id) });
    },
  });
};
