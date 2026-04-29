import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mainCategoryApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type MainCategoryRecord = {
  unique_id: string | number;
  main_categoryName: string;
  is_active: boolean;
  company_id?: string | null;
};

export type MainCategoryPayload = {
  main_categoryName?: string;
  is_active: boolean;
  company_id?: string;
};

const normalizeMainCategoryId = (id: string | number) => String(id);

const listMainCategories = (companyId?: string) =>
  mainCategoryApi.list({
    params: companyId ? { company_id: companyId } : undefined,
  }) as Promise<MainCategoryRecord[]>;

const getMainCategory = (id: string | number) =>
  mainCategoryApi.get(id) as Promise<MainCategoryRecord>;

const createMainCategory = (payload: MainCategoryPayload) =>
  mainCategoryApi.create(payload) as Promise<MainCategoryRecord>;

const updateMainCategory = (
  id: string | number,
  payload: MainCategoryPayload
) => mainCategoryApi.update(id, payload) as Promise<MainCategoryRecord>;

const replaceMainCategoryInList = (
  records: MainCategoryRecord[] | undefined,
  record: MainCategoryRecord
) => {
  if (!records) {
    return records;
  }

  const recordId = normalizeMainCategoryId(record.unique_id);

  return records.map((item) =>
    normalizeMainCategoryId(item.unique_id) === recordId ? record : item
  );
};

export const mainCategoryQueryKeys = {
  all: ["citizen grievances", "main_categories"] as const,
  detail: (id: string | number) =>
    [...mainCategoryQueryKeys.all, normalizeMainCategoryId(id)] as const,
};

export function useMainCategoriesQuery(companyId?: string) {
  const query = enterpriseQuery<MainCategoryRecord[]>({
    queryKey: mainCategoryQueryKeys.all,
    queryFn: () => listMainCategories(companyId),
    // enabled: Boolean(companyId),
    enabled: true,
  });

  const previousCompanyIdRef = useRef(companyId);

  useEffect(() => {
    if (previousCompanyIdRef.current === companyId) {
      return;
    }

    previousCompanyIdRef.current = companyId;

    if (companyId) {
      void query.refetch();
    }
  }, [companyId, query.refetch]);

  return query;
}

export function useMainCategoryQuery(id: string | number | null | undefined) {
  return enterpriseQuery<MainCategoryRecord>({
    queryKey: mainCategoryQueryKeys.detail(id ?? "new"),
    queryFn: () => getMainCategory(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateMainCategoryMutation(companyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMainCategory,
    onSuccess: async (record) => {
      queryClient.setQueryData(
        mainCategoryQueryKeys.detail(record.unique_id),
        record
      );

      await queryClient.invalidateQueries({
        queryKey: mainCategoryQueryKeys.all,
      });
    },
  });
}

export function useUpdateMainCategoryMutation(companyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: MainCategoryPayload;
    }) => updateMainCategory(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        mainCategoryQueryKeys.detail(variables.id),
        record
      );
      queryClient.setQueryData<MainCategoryRecord[]>(
        mainCategoryQueryKeys.all,
        (current) => replaceMainCategoryInList(current, record)
      );

      await queryClient.invalidateQueries({
        queryKey: mainCategoryQueryKeys.all,
      });
    },
  });
}
