import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { panchayatApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

type MasterRelation = {
  unique_id?: string | number | null;
  id?: string | number | null;
  name?: string | null;
  state_name?: string | null;
  district_name?: string | null;
  city_name?: string | null;
};

type MasterValue = string | number | MasterRelation | null;

export type PanchayatRecord = {
  unique_id: string | number;
  panchayat_name?: string;
  name?: string;
  is_active?: boolean;

  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company?: MasterRelation | null;

  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project?: MasterValue;

  state_id?: string | number | null;
  state_unique_id?: string | number | null;
  state?: MasterValue;
  state_name?: string | null;

  district_id?: string | number | null;
  district_unique_id?: string | number | null;
  district?: MasterValue;
  district_name?: string | null;

  city_id?: string | number | null;
  city_unique_id?: string | number | null;
  city?: MasterValue;
  city_name?: string | null;

  area_type_id?: string | number | null;
  area_type?: MasterValue;
  hierarchy_id?: string | number | null;
  hierarchy?: MasterValue;

  latitude?: string | null;
  longitude?: string | null;
  geofencing_type?: string | null;
  agreed_weight_kg?: string | number | null;
  weight_unit?: "kg" | "tonne" | string | null;
  effective_from?: string | null;

  [key: string]: unknown;
};

export type PanchayatPayload = {
  panchayat_name?: string;
  is_active?: boolean;
  company_id?: string | number | null;
  project_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  area_type_id?: string | number | null;
  hierarchy_id?: string | number | null;
  latitude?: string;
  longitude?: string;
  geofencing_type?: string;
  agreed_weight_kg?: string | number | null;
  weight_unit?: "kg" | "tonne" | string | null;
  effective_from?: string | null;
};

export type PanchayatListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
  district?: string | number | null;
  district_id?: string | number | null;
  city?: string | number | null;
  city_id?: string | number | null;
  state?: string | number | null;
  state_id?: string | number | null;
};

const normalizeId = (id: string | number) => String(id);

const compactFilters = (filters?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

const listPanchayats = (filters?: PanchayatListFilters) => {
  const params = compactFilters(filters);

  return panchayatApi.list(
    Object.keys(params).length ? { params } : undefined
  ) as Promise<PanchayatRecord[]>;
};

const getPanchayat = (id: string | number) =>
  panchayatApi.get(id) as Promise<PanchayatRecord>;

const createPanchayat = (payload: PanchayatPayload) =>
  panchayatApi.create(payload) as Promise<PanchayatRecord>;

const updatePanchayat = (id: string | number, payload: PanchayatPayload) =>
  panchayatApi.update(id, payload) as Promise<PanchayatRecord>;

const mergePanchayatRecord = (
  current: PanchayatRecord | undefined,
  incoming: PanchayatRecord
): PanchayatRecord => ({
  ...(current ?? ({} as PanchayatRecord)),
  ...incoming,

  // Keep edit dropdown relationship data when UPDATE returns a smaller record.
  company: incoming.company ?? current?.company,
  project: incoming.project ?? current?.project,

  state_id: incoming.state_id ?? current?.state_id,
  state_unique_id: incoming.state_unique_id ?? current?.state_unique_id,
  state: incoming.state ?? current?.state,
  state_name: incoming.state_name ?? current?.state_name,

  district_id: incoming.district_id ?? current?.district_id,
  district_unique_id: incoming.district_unique_id ?? current?.district_unique_id,
  district: incoming.district ?? current?.district,
  district_name: incoming.district_name ?? current?.district_name,

  city_id: incoming.city_id ?? current?.city_id,
  city_unique_id: incoming.city_unique_id ?? current?.city_unique_id,
  city: incoming.city ?? current?.city,
  city_name: incoming.city_name ?? current?.city_name,
});

const replaceInList = (
  items: PanchayatRecord[] | undefined,
  item: PanchayatRecord
) => {
  if (!items) return items;

  const id = normalizeId(item.unique_id);

  return items.map((record) =>
    normalizeId(record.unique_id) === id
      ? mergePanchayatRecord(record, item)
      : record
  );
};

export const panchayatQueryKeys = {
  all: ["masters", "panchayats"] as const,
  list: (filters?: PanchayatListFilters | null) =>
    ["masters", "panchayats", filters ?? {}] as const,
  detail: (id: string | number) =>
    ["masters", "panchayats", "detail", normalizeId(id)] as const,
};

export function usePanchayatsQuery(filters?: PanchayatListFilters | null) {
  return enterpriseQuery<PanchayatRecord[]>({
    queryKey: panchayatQueryKeys.list(filters),
    queryFn: () => listPanchayats(filters ?? undefined),
    enabled: filters !== null,
  });
}

export function usePanchayatQuery(
  id: string | number | null | undefined
) {
  return useQuery<PanchayatRecord>({
    queryKey: panchayatQueryKeys.detail(id ?? "new"),
    queryFn: () => getPanchayat(id as string | number),
    enabled: Boolean(id),

    // Always fetch complete edit details when the edit page opens.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useCreatePanchayatMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createPanchayat,
    onSuccess: async (data) => {
      qc.setQueryData(panchayatQueryKeys.detail(data.unique_id), data);

      await qc.invalidateQueries({
        queryKey: panchayatQueryKeys.all,
      });
    },
  });
}

export function useUpdatePanchayatMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: PanchayatPayload;
    }) => updatePanchayat(id, payload),

    onSuccess: async (data, variables) => {
      qc.setQueryData<PanchayatRecord>(
        panchayatQueryKeys.detail(variables.id),
        (current) => mergePanchayatRecord(current, data)
      );

      // Apply update to every cached filtered Panchayat list.
      qc.setQueriesData<PanchayatRecord[]>(
        { queryKey: panchayatQueryKeys.all },
        (current) => replaceInList(current, data)
      );

      await Promise.all([
        qc.invalidateQueries({
          queryKey: panchayatQueryKeys.detail(variables.id),
        }),
        qc.invalidateQueries({
          queryKey: panchayatQueryKeys.all,
        }),
      ]);
    },
  });
}