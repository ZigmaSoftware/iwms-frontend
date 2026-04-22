import { useMutation, useQueryClient } from "@tanstack/react-query";

import { vehicleTypeApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VehicleTypeRecord = {
  unique_id: string | number;
  vehicleType: string;
  description?: string | null;
  is_active: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
};

export type VehicleTypePayload = {
  vehicleType: string;
  description?: string | null;
  is_active: boolean;
  company_id_input?: string | number | null;
  project_id_input?: string | number | null;
};

export type VehicleTypeListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

// ─── API wrappers ─────────────────────────────────────────────────────────────

const normalizeVehicleTypeId = (id: string | number) => String(id);

const listVehicleTypes = (filters?: VehicleTypeListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

  if (Object.keys(params).length === 0) {
    return vehicleTypeApi.list() as Promise<VehicleTypeRecord[]>;
  }

  return vehicleTypeApi.list({ params }) as Promise<VehicleTypeRecord[]>;
};

const getVehicleType = (id: string | number) =>
  vehicleTypeApi.get(id) as Promise<VehicleTypeRecord>;

const createVehicleType = (payload: VehicleTypePayload) =>
  vehicleTypeApi.create(payload) as Promise<VehicleTypeRecord>;

const updateVehicleType = (
  id: string | number,
  payload: VehicleTypePayload
) => vehicleTypeApi.update(id, payload) as Promise<VehicleTypeRecord>;

const replaceInList = (
  items: VehicleTypeRecord[] | undefined,
  item: VehicleTypeRecord
) => {
  if (!items) return items;
  const id = normalizeVehicleTypeId(item.unique_id);
  return items.map((r) =>
    normalizeVehicleTypeId(r.unique_id) === id ? item : r
  );
};

// ─── Query keys ───────────────────────────────────────────────────────────────

export const vehicleTypeQueryKeys = {
  all: ["transport", "vehicleTypes"] as const,
  list: (filters?: VehicleTypeListFilters | null) =>
    [
      "transport",
      "vehicleTypes",
      "list",
      String(filters?.company_id ?? ""),
      String(filters?.project_id ?? ""),
    ] as const,
  detail: (id: string | number) =>
    ["transport", "vehicleTypes", normalizeVehicleTypeId(id)] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useVehicleTypesQuery(filters?: VehicleTypeListFilters | null) {
  return enterpriseQuery<VehicleTypeRecord[]>({
    queryKey: vehicleTypeQueryKeys.list(filters),
    queryFn: () => listVehicleTypes(filters ?? undefined),
    enabled: filters !== null,
  });
}

export function useVehicleTypeQuery(id: string | number | null | undefined) {
  return enterpriseQuery<VehicleTypeRecord>({
    queryKey: vehicleTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getVehicleType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateVehicleTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVehicleType,
    onSuccess: async (data) => {
      queryClient.setQueryData(
        vehicleTypeQueryKeys.detail(data.unique_id),
        data
      );
      await queryClient.invalidateQueries({
        queryKey: vehicleTypeQueryKeys.all,
      });
    },
  });
}

export function useUpdateVehicleTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: VehicleTypePayload;
    }) => updateVehicleType(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(
        vehicleTypeQueryKeys.detail(variables.id),
        data
      );
      queryClient.setQueryData<VehicleTypeRecord[]>(
        vehicleTypeQueryKeys.all,
        (cur) => replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({
        queryKey: vehicleTypeQueryKeys.all,
      });
    },
  });
}