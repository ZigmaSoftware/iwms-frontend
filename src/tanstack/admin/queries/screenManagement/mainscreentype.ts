import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mainScreenTypeApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type MainScreenTypeRecord = {
  unique_id: string | number;
  type_name: string;
  is_active: boolean;
  company_id?: string | null;
  project_id?: string | null;
  company_name?: string | null;
  project_name?: string | null;
};

export type MainScreenTypePayload = {
  company_id?: string | null;
  project_id?: string | null;
  type_name: string;
  is_active: boolean;
};

const normalizeMainScreenTypeId = (id: string | number) => String(id);

const listMainScreenTypes = () =>
  mainScreenTypeApi.list() as Promise<MainScreenTypeRecord[]>;

const getMainScreenType = (id: string | number) =>
  mainScreenTypeApi.get(id) as Promise<MainScreenTypeRecord>;

const createMainScreenType = (payload: MainScreenTypePayload) =>
  mainScreenTypeApi.create(payload) as Promise<MainScreenTypeRecord>;

const updateMainScreenType = (
  id: string | number,
  payload: MainScreenTypePayload
) =>
  mainScreenTypeApi.update(id, payload) as Promise<MainScreenTypeRecord>;

const deleteMainScreenType = (id: string | number) =>
  mainScreenTypeApi.remove(id) as Promise<void>;

const replaceMainScreenTypeInList = (
  records: MainScreenTypeRecord[] | undefined,
  record: MainScreenTypeRecord
) => {
  if (!records) return records;

  const recordId = normalizeMainScreenTypeId(record.unique_id);

  return records.map((item) =>
    normalizeMainScreenTypeId(item.unique_id) === recordId ? record : item
  );
};

export const mainScreenTypeQueryKeys = {
  all: ["screen management", "mainScreenTypes"] as const,
  detail: (id: string | number) =>
    ["screen management", "mainScreenTypes", normalizeMainScreenTypeId(id)] as const,
};

export function useMainScreenTypesQuery() {
  return enterpriseQuery<MainScreenTypeRecord[]>({
    queryKey: mainScreenTypeQueryKeys.all,
    queryFn: listMainScreenTypes,
  });
}

export function useMainScreenTypeQuery(
  id: string | number | null | undefined
) {
  return enterpriseQuery<MainScreenTypeRecord>({
    queryKey: mainScreenTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getMainScreenType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateMainScreenTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMainScreenType,
    onSuccess: async (record) => {
      queryClient.setQueryData(mainScreenTypeQueryKeys.detail(record.unique_id), record);
      await queryClient.invalidateQueries({
        queryKey: mainScreenTypeQueryKeys.all,
      });
    },
  });
}

export function useUpdateMainScreenTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: MainScreenTypePayload;
    }) => updateMainScreenType(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        mainScreenTypeQueryKeys.detail(variables.id),
        record
      );
      queryClient.setQueryData<MainScreenTypeRecord[]>(
        mainScreenTypeQueryKeys.all,
        (current) => replaceMainScreenTypeInList(current, record)
      );
      await queryClient.invalidateQueries({
        queryKey: mainScreenTypeQueryKeys.all,
      });
    },
  });
}

export function useDeleteMainScreenTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => deleteMainScreenType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mainScreenTypeQueryKeys.all,
      });
    },
  });
}
