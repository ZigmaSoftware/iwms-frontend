import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { vehicleCreationApi, vehicleTypeApi, fuelApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VehicleCreationRecord = {
  unique_id: string | number;
  vehicle_no: string;
  vehicle_type_id?: string | null;
  fuel_type_id?: string | null;
  vehicle_type_name?: string | null;
  fuel_type_name?: string | null;
  capacity?: string | null;
  mileage_per_liter?: string | null;
  service_record?: string | null;
  vehicle_insurance?: string | null;
  insurance_expiry_date?: string | null;
  vehicle_condition?: "NEW" | "SECOND_HAND" | string | null;
  fuel_tank_capacity?: string | null;
  rc_upload?: string | null;
  vehicle_insurance_file?: string | null;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

export type VehicleCreationPayload = {
  vehicle_no: string;
  vehicle_type_id?: string | null;
  fuel_type_id?: string | null;
  capacity?: string | null;
  mileage_per_liter?: string | null;
  service_record?: string | null;
  vehicle_insurance?: string | null;
  insurance_expiry_date?: string | null;
  vehicle_condition?: string | null;
  fuel_tank_capacity?: string | null;
  is_active?: boolean;
  company_id_input?: string | null;
  project_id_input?: string | null;
  rc_upload?: File | null;
  vehicle_insurance_file?: File | null;
};

export type VehicleCreationListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

// ─── Supporting dropdown types ────────────────────────────────────────────────

export type VehicleTypeOption = {
  unique_id: string;
  vehicleType: string;
  is_active?: boolean;
};

export type FuelTypeOption = {
  unique_id: string;
  fuel_type: string;
  is_active?: boolean;
};

// ─── API wrappers ─────────────────────────────────────────────────────────────

const normalizeVehicleCreationId = (id: string | number) => String(id);

const listVehicleCreations = (filters?: VehicleCreationListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

  if (Object.keys(params).length === 0) {
    return vehicleCreationApi.list() as Promise<VehicleCreationRecord[]>;
  }

  return vehicleCreationApi.list({ params }) as Promise<VehicleCreationRecord[]>;
};

const getVehicleCreation = (id: string | number) =>
  vehicleCreationApi.get(id) as Promise<VehicleCreationRecord>;

const createVehicleCreation = (payload: VehicleCreationPayload | FormData) =>
  vehicleCreationApi.create(payload) as Promise<VehicleCreationRecord>;

const updateVehicleCreation = (
  id: string | number,
  payload: VehicleCreationPayload | FormData
) => vehicleCreationApi.update(id, payload) as Promise<VehicleCreationRecord>;

// Supporting dropdowns
export const listVehicleTypeOptions = () =>
  vehicleTypeApi.list() as Promise<VehicleTypeOption[]>;

export const listFuelTypeOptions = () =>
  fuelApi.list() as Promise<FuelTypeOption[]>;

const replaceInList = (
  items: VehicleCreationRecord[] | undefined,
  item: VehicleCreationRecord
) => {
  if (!items) return items;
  const id = normalizeVehicleCreationId(item.unique_id);
  return items.map((r) =>
    normalizeVehicleCreationId(r.unique_id) === id ? item : r
  );
};

// ─── Query keys ───────────────────────────────────────────────────────────────

export const vehicleCreationQueryKeys = {
  all: ["transport masters", "vehicle creation"] as const,
  detail: (id: string | number) =>
    ["transport masters", "vehicle creation", normalizeVehicleCreationId(id)] as const,
  vehicleTypeOptions: ["transport masters", "vehicle type"] as const,
  fuelTypeOptions: ["transport masters", "fuel"] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useVehicleCreationsQuery(
  filters?: VehicleCreationListFilters | null
) {
  const query = enterpriseQuery<VehicleCreationRecord[]>({
    queryKey: vehicleCreationQueryKeys.all,
    queryFn: () => listVehicleCreations(filters ?? undefined),
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

export function useVehicleCreationQuery(
  id: string | number | null | undefined
) {
  return enterpriseQuery<VehicleCreationRecord>({
    queryKey: vehicleCreationQueryKeys.detail(id ?? "new"),
    queryFn: () => getVehicleCreation(id as string | number),
    enabled: Boolean(id),
  });
}

// Dropdown data queries (used in form)
export function useVehicleTypeOptionsQuery() {
  return enterpriseQuery<VehicleTypeOption[]>({
    queryKey: vehicleCreationQueryKeys.vehicleTypeOptions,
    queryFn: listVehicleTypeOptions,
  });
}

export function useFuelTypeOptionsQuery() {
  return enterpriseQuery<FuelTypeOption[]>({
    queryKey: vehicleCreationQueryKeys.fuelTypeOptions,
    queryFn: listFuelTypeOptions,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateVehicleCreationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VehicleCreationPayload | FormData) =>
      createVehicleCreation(payload),
    onSuccess: async (data) => {
      queryClient.setQueryData(
        vehicleCreationQueryKeys.detail(data.unique_id),
        data
      );
      await queryClient.invalidateQueries({
        queryKey: vehicleCreationQueryKeys.all,
      });
    },
  });
}

export function useUpdateVehicleCreationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: VehicleCreationPayload | FormData;
    }) => updateVehicleCreation(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(
        vehicleCreationQueryKeys.detail(variables.id),
        data
      );
      queryClient.setQueryData<VehicleCreationRecord[]>(
        vehicleCreationQueryKeys.all,
        (cur) => replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({
        queryKey: vehicleCreationQueryKeys.all,
      });
    },
  });
}

export function useDeleteVehicleCreationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => vehicleCreationApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: vehicleCreationQueryKeys.all,
      });
    },
  });
}
