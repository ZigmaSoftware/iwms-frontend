import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { collectionPointApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type CollectionPointRecord = {
  unique_id: string | number;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
  state_id?: string | number | null;
  state_name?: string | null;
  district_id?: string | number | null;
  district_name?: string | null;
  city_id?: string | number | null;
  city_name?: string | null;
  panchayat_id?: string | number | null;
  panchayat_name?: string | null;
  zone_id?: string | number | null;
  zone_name?: string | null;
  ward_id?: string | number | null;
  ward_name?: string | null;
  cp_name?: string;
  collection_point_name?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
};

export type CollectionPointPayload = {
  company_id?: string | number | null;
  project_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  panchayat_id?: string | number | null;
  zone_id?: string | number | null;
  ward_id?: string | number | null;
  cp_name?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_active?: boolean;
};

export type CollectionPointListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
  district?: string | number | null;
  district_id?: string | number | null;
  city?: string | number | null;
  city_id?: string | number | null;
  panchayat?: string | number | null;
  panchayat_id?: string | number | null;
  zone?: string | number | null;
  zone_id?: string | number | null;
  ward?: string | number | null;
  ward_id?: string | number | null;
};

const normalizeCollectionPointId = (id: string | number) => String(id);

const listCollectionPoints = (filters?: CollectionPointListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  if (Object.keys(params).length === 0) {
    return collectionPointApi.list() as Promise<CollectionPointRecord[]>;
  }

  return collectionPointApi.list({ params }) as Promise<CollectionPointRecord[]>;
};

const getCollectionPoint = (id: string | number) => collectionPointApi.get(id) as Promise<CollectionPointRecord>;
const createCollectionPoint = (payload: CollectionPointPayload) => collectionPointApi.create(payload) as Promise<CollectionPointRecord>;
const updateCollectionPoint = (id: string | number, payload: CollectionPointPayload) => collectionPointApi.update(id, payload) as Promise<CollectionPointRecord>;

export const collectionPointQueryKeys = {
  all: ["assets", "collection point"] as const,
  list: (filters?: CollectionPointListFilters | null) => ["assets", "collection point", filters ?? {}] as const,
  detail: (id: string | number) => ["assets", "collection point", normalizeCollectionPointId(id)] as const,
};

export function useCollectionPointsQuery(filters?: CollectionPointListFilters | null) {
  const query = enterpriseQuery<CollectionPointRecord[]>({
    queryKey: collectionPointQueryKeys.list(filters),
    queryFn: () => listCollectionPoints(filters ?? undefined),
    enabled: filters !== null,
  });

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        company_id: filters?.company_id ?? "",
        project_id: filters?.project_id ?? "",
        district: filters?.district ?? filters?.district_id ?? "",
        city: filters?.city ?? filters?.city_id ?? "",
        panchayat: filters?.panchayat ?? filters?.panchayat_id ?? "",
        zone: filters?.zone ?? filters?.zone_id ?? "",
        ward: filters?.ward ?? filters?.ward_id ?? "",
      }),
    [
      filters?.city,
      filters?.city_id,
      filters?.company_id,
      filters?.district,
      filters?.district_id,
      filters?.panchayat,
      filters?.panchayat_id,
      filters?.project_id,
      filters?.ward,
      filters?.ward_id,
      filters?.zone,
      filters?.zone_id,
    ]
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

export function useCollectionPointQuery(id: string | number | null | undefined) {
  return enterpriseQuery<CollectionPointRecord>({
    queryKey: collectionPointQueryKeys.detail(id ?? "new"),
    queryFn: () => getCollectionPoint(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateCollectionPointMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCollectionPoint,
    onSuccess: async (collectionPoint) => {
      queryClient.setQueryData(collectionPointQueryKeys.detail(collectionPoint.unique_id), collectionPoint);
      await queryClient.invalidateQueries({ queryKey: collectionPointQueryKeys.all });
    },
  });
}

export function useUpdateCollectionPointMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: CollectionPointPayload }) => updateCollectionPoint(id, payload),
    onSuccess: async (collectionPoint, variables) => {
      queryClient.setQueryData(collectionPointQueryKeys.detail(variables.id), collectionPoint);
      await queryClient.invalidateQueries({ queryKey: collectionPointQueryKeys.all });
    },
  });
}
