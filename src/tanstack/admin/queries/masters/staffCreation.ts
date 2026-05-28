import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffCreationApi } from "@/helpers/admin";

export const staffCreationKeys = {
  all: ["user creations", "staff creation"] as const,
  detail: (id: string | number) => [...staffCreationKeys.all, String(id)] as const,
};

export const useStaffCreationList = (params?: Record<string, any>) => {
  const query = useQuery({
    queryKey: staffCreationKeys.all,
    queryFn: () => staffCreationApi.list({ params }),
    keepPreviousData: true,
  });
  console.log("query",query);

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

export const useStaffCreationQuery = (id: string | number | null | undefined) =>
  useQuery({
    queryKey: staffCreationKeys.detail(id ?? "new"),
    queryFn: () => staffCreationApi.get(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => staffCreationApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffCreationKeys.all }),
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => staffCreationApi.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: staffCreationKeys.all });
      qc.invalidateQueries({ queryKey: staffCreationKeys.detail(variables.id) });
    },
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => staffCreationApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffCreationKeys.all }),
  });
};
