import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffTemplateApi } from "@/helpers/admin";

export const staffTemplateKeys = {
  all: ["staff-templates"] as const,
  lists: () => [...staffTemplateKeys.all, "list"] as const,
  list: (params?: Record<string, any>) => [...staffTemplateKeys.lists(), params] as const,
  detail: (id: string | number) => [...staffTemplateKeys.all, "detail", String(id)] as const,
};

export const useStaffTemplateList = (params?: Record<string, any>) =>
  useQuery({
    queryKey: staffTemplateKeys.list(params ?? {}),
    queryFn: () => staffTemplateApi.list({ params }),
    keepPreviousData: true,
  });

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
    onSuccess: () => qc.invalidateQueries({ queryKey: staffTemplateKeys.lists() }),
  });
};

export const useUpdateStaffTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => staffTemplateApi.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: staffTemplateKeys.list() });
      qc.invalidateQueries({ queryKey: staffTemplateKeys.detail(variables.id) });
    },
  });
};

export const useDeleteStaffTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => staffTemplateApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffTemplateKeys.lists() }),
  });
};
