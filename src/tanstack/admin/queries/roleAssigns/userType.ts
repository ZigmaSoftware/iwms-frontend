import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userTypeApi } from "@/helpers/admin";
import type { UserType } from "@/pages/admin/modules/admin/types/admin.types";

import { enterpriseQuery } from "../enterpriseQuery";

export type UserTypePayload = {
  name: string;
  is_active: boolean;
  company_id?: string;
};

const listUserTypes = () => userTypeApi.list() as Promise<UserType[]>;
const getUserType = (id: string | number) => userTypeApi.get(id) as Promise<UserType>;
const createUserType = (payload: UserTypePayload) => userTypeApi.create(payload) as Promise<UserType>;
const updateUserType = (id: string | number, payload: UserTypePayload) =>
  userTypeApi.update(id, payload) as Promise<UserType>;

const replaceUserTypeInList = (items: UserType[] | undefined, updated: UserType) => {
  if (!items) return items;
  const uid = String(updated.unique_id);
  return items.map((item) => (String(item.unique_id) === uid ? updated : item));
};

export const userTypeQueryKeys = {
  all: ["role-assigns", "user-type"] as const,
  detail: (id: string | number) => ["role-assigns", "user-type", String(id)] as const,
};

export function useUserTypesQuery() {
  return enterpriseQuery<UserType[]>({ queryKey: userTypeQueryKeys.all, queryFn: listUserTypes });
}

export function useUserTypeQuery(id: string | number | null | undefined) {
  return enterpriseQuery<UserType>({
    queryKey: userTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getUserType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateUserTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserType,
    onSuccess: async (created) => {
      queryClient.setQueryData(userTypeQueryKeys.detail(created.unique_id), created);
      await queryClient.invalidateQueries({ queryKey: userTypeQueryKeys.all });
    },
  });
}

export function useUpdateUserTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: UserTypePayload }) =>
      updateUserType(id, payload),
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(userTypeQueryKeys.detail(variables.id), updated);
      queryClient.setQueryData<UserType[]>(
        userTypeQueryKeys.all,
        (current) => replaceUserTypeInList(current, updated),
      );
      await queryClient.invalidateQueries({ queryKey: userTypeQueryKeys.all });
    },
  });
}

