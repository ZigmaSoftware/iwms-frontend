import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { binApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type BinRecord = {
  unique_id: string | number;
  bin_name?: string;
  bin_capacity?: number | string;
  bin_type?: string | null;
  bin_image?: string | null;
  bin_qr?: string | null;
  is_active?: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
  district_id?: string | number | null;
  district?: string | number | null;
  district_name?: string | null;
  city_id?: string | number | null;
  city?: string | number | null;
  city_name?: string | null;
  panchayat_id?: string | number | null;
  panchayat?: string | number | null;
  panchayat_name?: string | null;
  zone_id?: string | number | null;
  zone?: string | number | null;
  ward_id?: string | number | null;
  ward?: string | number | null;
  ward_name?: string | null;
  collection_point_id?: string | number | null;
  collection_point?: string | number | null;
  wastetype_id?: string | number | null;
  waste_type_id?: string | number | null;
  waste_type?: string | number | null;
  waste_type_name?: string | null;
  wastetype_name?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type BinPayload = {
  company_id?: string | number | null;
  project_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  panchayat_id?: string | number | null;
  zone_id?: string | number | null;
  ward_id?: string | number | null;
  collection_point_id?: string | number | null;
  bin_capacity?: number | string | null;
  bin_name?: string;
  bin_type?: string | null;
  bin_image?: string | null;
  bin_qr?: string | null;
  wastetype_id?: string | number | null;
  waste_type_id?: string | number | null;
  is_active?: boolean;
};

export type BinListFilters = {
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
  collection_point?: string | number | null;
  collection_point_id?: string | number | null;
};

const normalizeBinId = (id: string | number) => String(id);

const listBins = (filters?: BinListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  if (Object.keys(params).length === 0) {
    return binApi.list() as Promise<BinRecord[]>;
  }

  return binApi.list({ params }) as Promise<BinRecord[]>;
};

const getBin = (id: string | number) => binApi.get(id) as Promise<BinRecord>;
const createBin = (payload: BinPayload) => binApi.create(payload) as Promise<BinRecord>;
const updateBin = (id: string | number, payload: BinPayload) => binApi.update(id, payload) as Promise<BinRecord>;

export const binQueryKeys = {
  all: ["assets", "bin creation"] as const,
  list: (filters?: BinListFilters | null) => ["assets", "bin creation", filters ?? {}] as const,
  detail: (id: string | number) => ["assets", "bin creation", normalizeBinId(id)] as const,
};

export function useBinsQuery(filters?: BinListFilters | null) {
  const query = enterpriseQuery<BinRecord[]>({
    queryKey: binQueryKeys.list(filters),
    queryFn: () => listBins(filters ?? undefined),
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
        collection_point: filters?.collection_point ?? filters?.collection_point_id ?? "",
      }),
    [
      filters?.city,
      filters?.city_id,
      filters?.collection_point,
      filters?.collection_point_id,
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

export function useBinQuery(id: string | number | null | undefined) {
  return enterpriseQuery<BinRecord>({
    queryKey: binQueryKeys.detail(id ?? "new"),
    queryFn: () => getBin(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateBinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBin,
    onSuccess: async (bin) => {
      queryClient.setQueryData(binQueryKeys.detail(bin.unique_id), bin);
      await queryClient.invalidateQueries({ queryKey: binQueryKeys.all });
    },
  });
}

export function useUpdateBinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: BinPayload }) => updateBin(id, payload),
    onSuccess: async (bin, variables) => {
      queryClient.setQueryData(binQueryKeys.detail(variables.id), bin);
      await queryClient.invalidateQueries({ queryKey: binQueryKeys.all });
    },
  });
}
