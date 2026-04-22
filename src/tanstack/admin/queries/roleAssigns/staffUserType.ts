import { useMutation, useQueryClient } from "@tanstack/react-query";

import { staffUserTypeApi } from "@/helpers/admin";
import type { StaffUserType } from "@/pages/admin/modules/admin/types/admin.types";

import { enterpriseQuery } from "../enterpriseQuery";

export type StaffUserTypePayload = {
  name: string;
  usertype_id: string | number;
  is_active: boolean;
};

const listStaffUserTypes = () => staffUserTypeApi.list() as Promise<StaffUserType[]>;
const getStaffUserType = (id: string | number) => staffUserTypeApi.get(id) as Promise<StaffUserType>;
const createStaffUserType = (payload: StaffUserTypePayload) =>
  staffUserTypeApi.create(payload) as Promise<StaffUserType>;
const updateStaffUserType = (id: string | number, payload: StaffUserTypePayload) =>
  staffUserTypeApi.update(id, payload) as Promise<StaffUserType>;

const replaceStaffUserTypeInList = (
  items: StaffUserType[] | undefined,
  updated: StaffUserType,
) => {
  if (!items) return items;
  const uid = String(updated.unique_id);
  return items.map((item) => (String(item.unique_id) === uid ? updated : item));
};

export const staffUserTypeQueryKeys = {
  all: ["role-assigns", "staff-user-type"] as const,
  detail: (id: string | number) =>
    ["role-assigns", "staff-user-type", String(id)] as const,
};

export function useStaffUserTypesQuery() {
  return enterpriseQuery<StaffUserType[]>({
    queryKey: staffUserTypeQueryKeys.all,
    queryFn: listStaffUserTypes,
  });
}

export function useStaffUserTypeQuery(id: string | number | null | undefined) {
  return enterpriseQuery<StaffUserType>({
    queryKey: staffUserTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getStaffUserType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateStaffUserTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStaffUserType,
    onSuccess: async (created) => {
      queryClient.setQueryData(staffUserTypeQueryKeys.detail(created.unique_id), created);
      await queryClient.invalidateQueries({ queryKey: staffUserTypeQueryKeys.all });
    },
  });
}

export function useUpdateStaffUserTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: StaffUserTypePayload }) =>
      updateStaffUserType(id, payload),
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(staffUserTypeQueryKeys.detail(variables.id), updated);
      queryClient.setQueryData<StaffUserType[]>(
        staffUserTypeQueryKeys.all,
        (current) => replaceStaffUserTypeInList(current, updated),
      );
      await queryClient.invalidateQueries({ queryKey: staffUserTypeQueryKeys.all });
    },
  });
}

