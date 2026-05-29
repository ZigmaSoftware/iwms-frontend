import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userScreenActionApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type UserScreenActionRecord = {
  unique_id: string | number;
  action_name: string;
  variable_name: string;
  is_active: boolean;
  company_id?: string | null;
  project_id?: string | null;
  company_name?: string | null;
  project_name?: string | null;
};

export type UserScreenActionPayload = {
  action_name: string;
  variable_name: string;
  is_active: boolean;
};

const normalizeUserScreenActionId = (id: string | number) => String(id);

const listUserScreenActions = () =>
  userScreenActionApi.list() as Promise<UserScreenActionRecord[]>;

const getUserScreenAction = (id: string | number) =>
  userScreenActionApi.get(id) as Promise<UserScreenActionRecord>;

const createUserScreenAction = (payload: UserScreenActionPayload) =>
  userScreenActionApi.create(payload) as Promise<UserScreenActionRecord>;

const updateUserScreenAction = (
  id: string | number,
  payload: UserScreenActionPayload
) =>
  userScreenActionApi.update(id, payload) as Promise<UserScreenActionRecord>;

const deleteUserScreenAction = (id: string | number) =>
  userScreenActionApi.remove(id) as Promise<void>;

const replaceUserScreenActionInList = (
  records: UserScreenActionRecord[] | undefined,
  record: UserScreenActionRecord
) => {
  if (!records) return records;

  const recordId = normalizeUserScreenActionId(record.unique_id);

  return records.map((item) =>
    normalizeUserScreenActionId(item.unique_id) === recordId ? record : item
  );
};

export const userScreenActionQueryKeys = {
  all: ["screen management", "userScreenActions"] as const,
  detail: (id: string | number) =>
    [
      "screen management",
      "userScreenActions",
      normalizeUserScreenActionId(id),
    ] as const,
};

export function useUserScreenActionsQuery() {
  return enterpriseQuery<UserScreenActionRecord[]>({
    queryKey: userScreenActionQueryKeys.all,
    queryFn: listUserScreenActions,
  });
}

export function useUserScreenActionQuery(
  id: string | number | null | undefined
) {
  return enterpriseQuery<UserScreenActionRecord>({
    queryKey: userScreenActionQueryKeys.detail(id ?? "new"),
    queryFn: () => getUserScreenAction(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateUserScreenActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserScreenAction,
    onSuccess: async (record) => {
      queryClient.setQueryData(
        userScreenActionQueryKeys.detail(record.unique_id),
        record
      );
      await queryClient.invalidateQueries({
        queryKey: userScreenActionQueryKeys.all,
      });
    },
  });
}

export function useUpdateUserScreenActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: UserScreenActionPayload;
    }) => updateUserScreenAction(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        userScreenActionQueryKeys.detail(variables.id),
        record
      );
      queryClient.setQueryData<UserScreenActionRecord[]>(
        userScreenActionQueryKeys.all,
        (current) => replaceUserScreenActionInList(current, record)
      );
      await queryClient.invalidateQueries({
        queryKey: userScreenActionQueryKeys.all,
      });
    },
  });
}

export function useDeleteUserScreenActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteUserScreenAction(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userScreenActionQueryKeys.all,
      });
    },
  });
}
