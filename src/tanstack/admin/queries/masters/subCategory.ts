import { useMutation, useQueryClient } from "@tanstack/react-query";

import { subCategoryApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type SubCategoryRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
  mainCategory?: string | number;
  mainCategory_name?: string;
  company_id?: string | null;
};

export type SubCategoryPayload = {
  name?: string;
  is_active: boolean;
  mainCategory?: string | number;
  company_id?: string;
};

const normalizeSubCategoryId = (id: string | number) => String(id);

const listSubCategories = (companyId?: string) =>
  subCategoryApi.list({
    params: companyId ? { company_id: companyId } : undefined,
  }) as Promise<SubCategoryRecord[]>;

const getSubCategory = (id: string | number) =>
  subCategoryApi.get(id) as Promise<SubCategoryRecord>;

const createSubCategory = (payload: SubCategoryPayload) =>
  subCategoryApi.create(payload) as Promise<SubCategoryRecord>;

const updateSubCategory = (
  id: string | number,
  payload: SubCategoryPayload
) => subCategoryApi.update(id, payload) as Promise<SubCategoryRecord>;

const replaceSubCategoryInList = (
  records: SubCategoryRecord[] | undefined,
  record: SubCategoryRecord
) => {
  if (!records) {
    return records;
  }

  const recordId = normalizeSubCategoryId(record.unique_id);

  return records.map((item) =>
    normalizeSubCategoryId(item.unique_id) === recordId ? record : item
  );
};

export const subCategoryQueryKeys = {
  all: ["grievances", "sub-categories"] as const,
  list: (companyId?: string) =>
    [...subCategoryQueryKeys.all, "list", companyId ?? "all"] as const,
  detail: (id: string | number) =>
    [...subCategoryQueryKeys.all, "detail", normalizeSubCategoryId(id)] as const,
};

export function useSubCategoriesQuery(companyId?: string) {
  return enterpriseQuery<SubCategoryRecord[]>({
    queryKey: subCategoryQueryKeys.list(companyId),
    queryFn: () => listSubCategories(companyId),
  });
}

export function useSubCategoryQuery(id: string | number | null | undefined) {
  return enterpriseQuery<SubCategoryRecord>({
    queryKey: subCategoryQueryKeys.detail(id ?? "new"),
    queryFn: () => getSubCategory(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateSubCategoryMutation(companyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubCategory,
    onSuccess: async (record) => {
      queryClient.setQueryData(
        subCategoryQueryKeys.detail(record.unique_id),
        record
      );

      await queryClient.invalidateQueries({
        queryKey: subCategoryQueryKeys.list(companyId),
      });
    },
  });
}

export function useUpdateSubCategoryMutation(companyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: SubCategoryPayload;
    }) => updateSubCategory(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        subCategoryQueryKeys.detail(variables.id),
        record
      );
      queryClient.setQueryData<SubCategoryRecord[]>(
        subCategoryQueryKeys.list(companyId),
        (current) => replaceSubCategoryInList(current, record)
      );

      await queryClient.invalidateQueries({
        queryKey: subCategoryQueryKeys.list(companyId),
      });
    },
  });
}
