import { useMutation, useQueryClient } from "@tanstack/react-query";

import { districtApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type DistrictRecord = {
  unique_id: string | number;
  name: string;
  is_active: boolean;
  state_id?: string | number;
};

export type DistrictPayload = {
  name: string;
  is_active: boolean;
  state_id?: string | number;
};

const normalizeDistrictId = (id: string | number) => String(id);

const listDistricts = () => districtApi.list() as Promise<DistrictRecord[]>;

const getDistrict = (id: string | number) => districtApi.get(id) as Promise<DistrictRecord>;

const createDistrict = (payload: DistrictPayload) => districtApi.create(payload) as Promise<DistrictRecord>;

const updateDistrict = (id: string | number, payload: DistrictPayload) => districtApi.update(id, payload) as Promise<DistrictRecord>;

const replaceDistrictInList = (
  districts: DistrictRecord[] | undefined,
  district: DistrictRecord
) => {
  if (!districts) return districts;

  const districtId = normalizeDistrictId(district.unique_id);

  return districts.map((record) =>
    normalizeDistrictId(record.unique_id) === districtId ? district : record
  );
};

export const districtQueryKeys = {
  all: ["masters", "districts"] as const,
  detail: (id: string | number) => ["masters", "districts", normalizeDistrictId(id)] as const,
};

export function useDistrictsQuery() {
  return enterpriseQuery<DistrictRecord[]>({
    queryKey: districtQueryKeys.all,
    queryFn: listDistricts,
  });
}

export function useDistrictQuery(id: string | number | null | undefined) {
  return enterpriseQuery<DistrictRecord>({
    queryKey: districtQueryKeys.detail(id ?? "new"),
    queryFn: () => getDistrict(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateDistrictMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDistrict,
    onSuccess: async (district) => {
      queryClient.setQueryData(districtQueryKeys.detail(district.unique_id), district);
      await queryClient.invalidateQueries({ queryKey: districtQueryKeys.all });
    },
  });
}

export function useUpdateDistrictMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: DistrictPayload }) => updateDistrict(id, payload),
    onSuccess: async (district, variables) => {
      queryClient.setQueryData(districtQueryKeys.detail(variables.id), district);
      queryClient.setQueryData<DistrictRecord[]>(districtQueryKeys.all, (current) => replaceDistrictInList(current, district));
      await queryClient.invalidateQueries({ queryKey: districtQueryKeys.all });
    },
  });
}
