import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mainScreenApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type MainScreenRecord = {
  unique_id: string | number;
  mainscreen_name: string;
  mainscreentype_id: string;
  mainscreentype_name?: string;
  icon_name?: string;
  order_no?: number;
  description?: string;
  is_active: boolean;
  company_id?: string | null;
  project_id?: string | null;
  company_name?: string | null;
  project_name?: string | null;
};

export type MainScreenPayload = {
  mainscreen_name: string;
  mainscreentype_id: string;
  description?: string;
  icon_name?: string;
  order_no?: number;
  is_active: boolean;
};

const normalizeMainScreenId = (id: string | number) => String(id);

const listMainScreens = () =>
  mainScreenApi.list() as Promise<MainScreenRecord[]>;

const getMainScreen = (id: string | number) =>
  mainScreenApi.get(id) as Promise<MainScreenRecord>;

const createMainScreen = (payload: MainScreenPayload) =>
  mainScreenApi.create(payload) as Promise<MainScreenRecord>;

const updateMainScreen = (id: string | number, payload: MainScreenPayload) =>
  mainScreenApi.update(id, payload) as Promise<MainScreenRecord>;

const deleteMainScreen = (id: string | number) =>
  mainScreenApi.remove(id) as Promise<void>;

const replaceMainScreenInList = (
  records: MainScreenRecord[] | undefined,
  record: MainScreenRecord
) => {
  if (!records) return records;

  const recordId = normalizeMainScreenId(record.unique_id);

  return records.map((item) =>
    normalizeMainScreenId(item.unique_id) === recordId ? record : item
  );
};

export const mainScreenQueryKeys = {
  all: ["screen management", "mainScreens"] as const,
  detail: (id: string | number) =>
    ["screen management", "mainScreens", normalizeMainScreenId(id)] as const,
};

export function useMainScreensQuery() {
  return enterpriseQuery<MainScreenRecord[]>({
    queryKey: mainScreenQueryKeys.all,
    queryFn: listMainScreens,
  });
}

export function useMainScreenQuery(id: string | number | null | undefined) {
  return enterpriseQuery<MainScreenRecord>({
    queryKey: mainScreenQueryKeys.detail(id ?? "new"),
    queryFn: () => getMainScreen(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateMainScreenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMainScreen,
    onSuccess: async (record) => {
      queryClient.setQueryData(mainScreenQueryKeys.detail(record.unique_id), record);
      await queryClient.invalidateQueries({
        queryKey: mainScreenQueryKeys.all,
      });
    },
  });
}

export function useUpdateMainScreenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: MainScreenPayload;
    }) => updateMainScreen(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(mainScreenQueryKeys.detail(variables.id), record);
      queryClient.setQueryData<MainScreenRecord[]>(
        mainScreenQueryKeys.all,
        (current) => replaceMainScreenInList(current, record)
      );
      await queryClient.invalidateQueries({
        queryKey: mainScreenQueryKeys.all,
      });
    },
  });
}

export function useDeleteMainScreenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteMainScreen(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mainScreenQueryKeys.all,
      });
    },
  });
}
