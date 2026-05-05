import { useMutation, useQueryClient } from "@tanstack/react-query";

import { userScreenApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type UserScreenRecord = {
  unique_id: string | number;
  mainscreen_id: string;
  mainscreen_name?: string;
  userscreen_name: string;
  folder_name: string;
  icon_name?: string;
  order_no?: number;
  description?: string;
  is_active: boolean;
  company_id?: string | null;
  project_id?: string | null;
  company_name?: string | null;
  project_name?: string | null;
};

export type UserScreenPayload = {
  mainscreen_id: string;
  userscreen_name: string;
  folder_name: string;
  description?: string;
  icon_name?: string;
  order_no?: number;
  company_id?: string | null;
  project_id?: string | null;
  is_active: boolean;
};

const normalizeUserScreenId = (id: string | number) => String(id);

const listUserScreens = () =>
  userScreenApi.list() as Promise<UserScreenRecord[]>;

const getUserScreen = (id: string | number) =>
  userScreenApi.get(id) as Promise<UserScreenRecord>;

const createUserScreen = (payload: UserScreenPayload) =>
  userScreenApi.create(payload) as Promise<UserScreenRecord>;

const updateUserScreen = (id: string | number, payload: UserScreenPayload) =>
  userScreenApi.update(id, payload) as Promise<UserScreenRecord>;

const deleteUserScreen = (id: string | number) =>
  userScreenApi.remove(id) as Promise<void>;

const replaceUserScreenInList = (
  records: UserScreenRecord[] | undefined,
  record: UserScreenRecord
) => {
  if (!records) return records;

  const recordId = normalizeUserScreenId(record.unique_id);

  return records.map((item) =>
    normalizeUserScreenId(item.unique_id) === recordId ? record : item
  );
};

export const userScreenQueryKeys = {
  all: ["screen management", "userScreens"] as const,
  detail: (id: string | number) =>
    ["screen management", "userScreens", normalizeUserScreenId(id)] as const,
};

export function useUserScreensQuery() {
  return enterpriseQuery<UserScreenRecord[]>({
    queryKey: userScreenQueryKeys.all,
    queryFn: listUserScreens,
  });
}

export function useUserScreenQuery(id: string | number | null | undefined) {
  return enterpriseQuery<UserScreenRecord>({
    queryKey: userScreenQueryKeys.detail(id ?? "new"),
    queryFn: () => getUserScreen(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateUserScreenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserScreen,
    onSuccess: async (record) => {
      queryClient.setQueryData(userScreenQueryKeys.detail(record.unique_id), record);
      await queryClient.invalidateQueries({
        queryKey: userScreenQueryKeys.all,
      });
    },
  });
}

export function useUpdateUserScreenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: UserScreenPayload;
    }) => updateUserScreen(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(userScreenQueryKeys.detail(variables.id), record);
      queryClient.setQueryData<UserScreenRecord[]>(
        userScreenQueryKeys.all,
        (current) => replaceUserScreenInList(current, record)
      );
      await queryClient.invalidateQueries({
        queryKey: userScreenQueryKeys.all,
      });
    },
  });
}

export function useDeleteUserScreenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteUserScreen(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userScreenQueryKeys.all,
      });
    },
  });
}
