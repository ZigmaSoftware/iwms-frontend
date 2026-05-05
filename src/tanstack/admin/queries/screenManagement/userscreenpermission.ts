import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userScreenPermissionApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export const userScreenPermissionQueryKeys = {
  all: ["screen management", "userScreenPermissions"] as const,
  byCompany: (companyId: string) =>
    [
      "screen management",
      "userScreenPermissions",
      companyId,
    ] as const,
  formatted: (
    companyId: string,
    staffTypeId: string,
    mainScreenId: string
  ) =>
    [
      "screen management",
      "userScreenPermissions",
      "formatted",
      companyId,
      staffTypeId,
      mainScreenId,
    ] as const,
};

export function useUserScreenPermissionsByCompanyQuery(companyId?: string) {
  return enterpriseQuery<any[]>({
    queryKey: userScreenPermissionQueryKeys.byCompany(companyId ?? ""),
    queryFn: () =>
      userScreenPermissionApi.list({
        params: { company_id: companyId, limit: 6000, offset: 0 },
      }) as Promise<any[]>,
    enabled: Boolean(companyId),
  });
}

export function useUserScreenPermissionFormattedQuery(
  companyId?: string,
  staffTypeId?: string,
  mainScreenId?: string
) {
  return enterpriseQuery<any>({
    queryKey: userScreenPermissionQueryKeys.formatted(
      companyId ?? "",
      staffTypeId ?? "",
      mainScreenId ?? ""
    ),
    queryFn: async () => {
      const res = await userScreenPermissionApi.get(
        `by-staff-format/?company_id=${encodeURIComponent(companyId ?? "")}&staffusertype_id=${encodeURIComponent(staffTypeId ?? "")}&mainscreen_id=${encodeURIComponent(mainScreenId ?? "")}`
      );
      return res.data;
    },
    enabled: Boolean(companyId && staffTypeId && mainScreenId),
  });
}

export function useSyncUserScreenPermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      staffTypeId,
      payload,
      isEdit,
    }: {
      staffTypeId: string;
      payload: any;
      isEdit: boolean;
    }) =>
      userScreenPermissionApi.action(
        isEdit
          ? `update-by-staffusertype/${staffTypeId}`
          : `bulk-sync-multi/${staffTypeId}`,
        payload
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userScreenPermissionQueryKeys.all,
      });
    },
  });
}

export function useDeleteUserScreenPermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => userScreenPermissionApi.remove(path),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userScreenPermissionQueryKeys.all,
      });
    },
  });
}
