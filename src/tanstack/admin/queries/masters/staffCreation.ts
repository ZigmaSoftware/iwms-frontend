import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffCreationApi } from "@/helpers/admin";

export const staffCreationKeys = {
  all: ["staffs"] as const,
  lists: () => [...staffCreationKeys.all, "list"] as const,
  list: (params?: Record<string, any>) => [...staffCreationKeys.lists(), params] as const,
  detail: (id: string | number) => [...staffCreationKeys.all, "detail", String(id)] as const,
};

export const useStaffCreationList = (params?: Record<string, any>) =>
  useQuery({
    queryKey: staffCreationKeys.list(params ?? {}),
    queryFn: () => staffCreationApi.list({ params }),
    keepPreviousData: true,
  });

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
    onSuccess: () => qc.invalidateQueries({ queryKey: staffCreationKeys.lists() }),
  });
};

export const useUpdateStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) => staffCreationApi.update(id, payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: staffCreationKeys.list() });
      qc.invalidateQueries({ queryKey: staffCreationKeys.detail(variables.id) });
    },
  });
};

export const useDeleteStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => staffCreationApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffCreationKeys.lists() }),
  });
};
