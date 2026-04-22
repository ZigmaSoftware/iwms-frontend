import { useMutation, useQueryClient } from "@tanstack/react-query";

import { subPropertiesApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type SubPropertyRecord = {
  unique_id: string | number;
  sub_property_name: string;
  property_id?: string | number | null;
  property?: string | number | null;
  property_name?: string | null;
  is_active: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
};

export type SubPropertyPayload = {
  sub_property_name: string;
  property_id?: string | number | null;
  is_active: boolean;
};

const normalizeSubPropertyId = (id: string | number) => String(id);

const listSubProperties = () =>
  subPropertiesApi.list() as Promise<SubPropertyRecord[]>;

const getSubProperty = (id: string | number) =>
  subPropertiesApi.get(id) as Promise<SubPropertyRecord>;

const createSubProperty = (payload: SubPropertyPayload) =>
  subPropertiesApi.create(payload) as Promise<SubPropertyRecord>;

const updateSubProperty = (
  id: string | number,
  payload: SubPropertyPayload
) => subPropertiesApi.update(id, payload) as Promise<SubPropertyRecord>;

const replaceSubPropertyInList = (
  subProperties: SubPropertyRecord[] | undefined,
  subProperty: SubPropertyRecord
) => {
  if (!subProperties) {
    return subProperties;
  }

  const subPropertyId = normalizeSubPropertyId(subProperty.unique_id);

  return subProperties.map((record) =>
    normalizeSubPropertyId(record.unique_id) === subPropertyId
      ? subProperty
      : record
  );
};

export const subPropertyQueryKeys = {
  all: ["masters", "subProperties"] as const,
  detail: (id: string | number) =>
    ["masters", "subProperties", normalizeSubPropertyId(id)] as const,
};

export function useSubPropertiesQuery() {
  return enterpriseQuery<SubPropertyRecord[]>({
    queryKey: subPropertyQueryKeys.all,
    queryFn: listSubProperties,
  });
}

export function useSubPropertyQuery(id: string | number | null | undefined) {
  return enterpriseQuery<SubPropertyRecord>({
    queryKey: subPropertyQueryKeys.detail(id ?? "new"),
    queryFn: () => getSubProperty(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateSubPropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubProperty,
    onSuccess: async (subProperty) => {
      queryClient.setQueryData(
        subPropertyQueryKeys.detail(subProperty.unique_id),
        subProperty
      );

      await queryClient.invalidateQueries({
        queryKey: subPropertyQueryKeys.all,
      });
    },
  });
}

export function useUpdateSubPropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: SubPropertyPayload;
    }) => updateSubProperty(id, payload),
    onSuccess: async (subProperty, variables) => {
      queryClient.setQueryData(
        subPropertyQueryKeys.detail(variables.id),
        subProperty
      );
      queryClient.setQueryData<SubPropertyRecord[]>(
        subPropertyQueryKeys.all,
        (current) => replaceSubPropertyInList(current, subProperty)
      );

      await queryClient.invalidateQueries({
        queryKey: subPropertyQueryKeys.all,
      });
    },
  });
}
