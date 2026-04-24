import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffTemplateApi } from "@/helpers/admin";

export const staffTemplateKeys = {
  all: ["user creations", "staff template"] as const,
  detail: (id: string | number) => [...staffTemplateKeys.all, String(id)] as const,
};

export const useStaffTemplateList = (params?: Record<string, any>) => {
  const query = useQuery({
    queryKey: staffTemplateKeys.all,
    queryFn: () => staffTemplateApi.list({ params }),
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

export const useStaffTemplateQuery = (id: string | number | null | undefined) =>
  useQuery({
    queryKey: staffTemplateKeys.detail(id ?? "new"),
    queryFn: () => staffTemplateApi.get(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateStaffTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => staffTemplateApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffTemplateKeys.all }),
  });
};

export const useUpdateStaffTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => staffTemplateApi.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: staffTemplateKeys.all });
      qc.invalidateQueries({ queryKey: staffTemplateKeys.detail(variables.id) });
    },
  });
};

export const useDeleteStaffTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => staffTemplateApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffTemplateKeys.all }),
  });
};
