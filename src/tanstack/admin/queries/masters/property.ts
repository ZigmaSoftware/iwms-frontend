import { useMutation, useQueryClient } from "@tanstack/react-query";

import { propertiesApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type PropertyRecord = {
  unique_id: string | number;
  property_name: string;
  is_active: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
};

export type PropertyPayload = {
  property_name: string;
  is_active: boolean;
};

const normalizePropertyId = (id: string | number) => String(id);

const listProperties = () =>
  propertiesApi.list() as Promise<PropertyRecord[]>;

const getProperty = (id: string | number) =>
  propertiesApi.get(id) as Promise<PropertyRecord>;

const createProperty = (payload: PropertyPayload) =>
  propertiesApi.create(payload) as Promise<PropertyRecord>;

const updateProperty = (
  id: string | number,
  payload: PropertyPayload
) => propertiesApi.update(id, payload) as Promise<PropertyRecord>;

const replacePropertyInList = (
  properties: PropertyRecord[] | undefined,
  property: PropertyRecord
) => {
  if (!properties) {
    return properties;
  }

  const propertyId = normalizePropertyId(property.unique_id);

  return properties.map((record) =>
    normalizePropertyId(record.unique_id) === propertyId ? property : record
  );
};

export const propertyQueryKeys = {
  all: ["masters", "properties"] as const,
  detail: (id: string | number) =>
    ["masters", "properties", normalizePropertyId(id)] as const,
};

export function usePropertiesQuery() {
  return enterpriseQuery<PropertyRecord[]>({
    queryKey: propertyQueryKeys.all,
    queryFn: listProperties,
  });
}

export function usePropertyQuery(id: string | number | null | undefined) {
  return enterpriseQuery<PropertyRecord>({
    queryKey: propertyQueryKeys.detail(id ?? "new"),
    queryFn: () => getProperty(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreatePropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProperty,
    onSuccess: async (property) => {
      queryClient.setQueryData(
        propertyQueryKeys.detail(property.unique_id),
        property
      );

      await queryClient.invalidateQueries({
        queryKey: propertyQueryKeys.all,
      });
    },
  });
}

export function useUpdatePropertyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: PropertyPayload;
    }) => updateProperty(id, payload),
    onSuccess: async (property, variables) => {
      queryClient.setQueryData(
        propertyQueryKeys.detail(variables.id),
        property
      );
      queryClient.setQueryData<PropertyRecord[]>(
        propertyQueryKeys.all,
        (current) => replacePropertyInList(current, property)
      );

      await queryClient.invalidateQueries({
        queryKey: propertyQueryKeys.all,
      });
    },
  });
}
