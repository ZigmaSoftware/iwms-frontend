import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { wasteTypeApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type WasteTypeRecord = {
  unique_id: string | number;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
  waste_type_name?: string;
  name?: string;
  property_name?: string;
  is_active?: boolean;
};

export type WasteTypePayload = {
  company_id?: string | number | null;
  project_id?: string | number | null;
  waste_type_name?: string;
  is_active?: boolean;
};

export type WasteTypeListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const normalizeWasteTypeId = (id: string | number) => String(id);

const listWasteTypes = (filters?: WasteTypeListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

  if (Object.keys(params).length === 0) {
    return wasteTypeApi.list() as Promise<WasteTypeRecord[]>;
  }

  return wasteTypeApi.list({ params }) as Promise<WasteTypeRecord[]>;
};

const getWasteType = (id: string | number) =>
  wasteTypeApi.get(id) as Promise<WasteTypeRecord>;
const createWasteType = (payload: WasteTypePayload) =>
  wasteTypeApi.create(payload) as Promise<WasteTypeRecord>;
const updateWasteType = (id: string | number, payload: WasteTypePayload) =>
  wasteTypeApi.update(id, payload) as Promise<WasteTypeRecord>;

const replaceInList = (
  items: WasteTypeRecord[] | undefined,
  item: WasteTypeRecord,
) => {
  if (!items) return items;
  const id = normalizeWasteTypeId(item.unique_id);
  return items.map((r) =>
    normalizeWasteTypeId(r.unique_id) === id ? item : r,
  );
};

export const wasteTypeQueryKeys = {
  all: ["assets", "waste type"] as const,
  detail: (id: string | number) =>
    ["assets", "waste type", normalizeWasteTypeId(id)] as const,
};

export function useWasteTypesQuery(filters?: WasteTypeListFilters | null) {
  const query = enterpriseQuery<WasteTypeRecord[]>({
    queryKey: wasteTypeQueryKeys.all,
    queryFn: () => listWasteTypes(filters ?? undefined),
    enabled: filters !== null,
  });

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        company_id: filters?.company_id ?? "",
        project_id: filters?.project_id ?? "",
      }),
    [filters?.company_id, filters?.project_id]
  );
  const previousFilterSignatureRef = useRef(filterSignature);

  useEffect(() => {
    if (previousFilterSignatureRef.current === filterSignature) {
      return;
    }

    previousFilterSignatureRef.current = filterSignature;

    if (filters !== null) {
      void query.refetch();
    }
  }, [filterSignature, filters, query.refetch]);

  return query;
}

export function useWasteTypeQuery(id: string | number | null | undefined) {
  return enterpriseQuery<WasteTypeRecord>({
    queryKey: wasteTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getWasteType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateWasteTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWasteType,
    onSuccess: async (data) => {
      queryClient.setQueryData(wasteTypeQueryKeys.detail(data.unique_id), data);
      await queryClient.invalidateQueries({ queryKey: wasteTypeQueryKeys.all });
    },
  });
}

export function useUpdateWasteTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: WasteTypePayload;
    }) => updateWasteType(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(wasteTypeQueryKeys.detail(variables.id), data);
      queryClient.setQueryData<WasteTypeRecord[]>(
        wasteTypeQueryKeys.all,
        (cur) => replaceInList(cur, data),
      );
      await queryClient.invalidateQueries({ queryKey: wasteTypeQueryKeys.all });
    },
  });
}
