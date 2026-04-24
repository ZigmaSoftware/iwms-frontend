import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/helpers/admin/registry";

import { enterpriseQuery } from "../enterpriseQuery";

export type VehicleTripAuditRecord = {
  id: number;
  trip_instance_id: string;
  vehicle_id: string;
  gps_lat: number[];
  gps_lon: number[];
  avg_speed: number;
  idle_seconds: number;
  captured_at: string;
  created_at?: string | null;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

export type VehicleTripAuditPayload = {
  trip_instance_id?: string;
  vehicle_id?: string;
  gps_lat?: number[];
  gps_lon?: number[];
  avg_speed?: number;
  idle_seconds?: number;
  captured_at?: string;
};

export type VehicleTripAuditListFilters = {
  company_id?: string | number | null;
  project_id?: string | number | null;
};

const api = adminApi.vehicleTripAudits;

const normalizeVehicleTripAuditId = (id: string | number) => String(id);

const listVehicleTripAudits = (filters?: VehicleTripAuditListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

  if (Object.keys(params).length === 0) {
    return api.list() as Promise<VehicleTripAuditRecord[]>;
  }

  return api.list({ params }) as Promise<VehicleTripAuditRecord[]>;
};

const getVehicleTripAudit = (id: string | number) =>
  api.get(id) as Promise<VehicleTripAuditRecord>;

const createVehicleTripAudit = (payload: VehicleTripAuditPayload) =>
  api.create(payload) as Promise<VehicleTripAuditRecord>;

const updateVehicleTripAudit = (
  id: string | number,
  payload: VehicleTripAuditPayload
) => api.update(id, payload) as Promise<VehicleTripAuditRecord>;

const replaceVehicleTripAuditInList = (
  items: VehicleTripAuditRecord[] | undefined,
  item: VehicleTripAuditRecord
) => {
  if (!items) {
    return items;
  }

  const itemId = normalizeVehicleTripAuditId(item.id);

  return items.map((record) =>
    normalizeVehicleTripAuditId(record.id) === itemId ? item : record
  );
};

export const vehicleTripAuditQueryKeys = {
  all: ["audit items", "vehicle trip audit"] as const,
  detail: (id: string | number) =>
    [
      ...vehicleTripAuditQueryKeys.all,
      normalizeVehicleTripAuditId(id),
    ] as const,
};

export function useVehicleTripAuditsQuery(
  filters?: VehicleTripAuditListFilters | null
) {
  const query = enterpriseQuery<VehicleTripAuditRecord[]>({
    queryKey: vehicleTripAuditQueryKeys.all,
    queryFn: () => listVehicleTripAudits(filters ?? undefined),
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

export function useVehicleTripAuditQuery(
  id: string | number | null | undefined
) {
  return enterpriseQuery<VehicleTripAuditRecord>({
    queryKey: vehicleTripAuditQueryKeys.detail(id ?? "new"),
    queryFn: () => getVehicleTripAudit(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateVehicleTripAuditMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVehicleTripAudit,
    onSuccess: async (record) => {
      queryClient.setQueryData(
        vehicleTripAuditQueryKeys.detail(record.id),
        record
      );

      await queryClient.invalidateQueries({
        queryKey: vehicleTripAuditQueryKeys.all,
      });
    },
  });
}

export function useUpdateVehicleTripAuditMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: VehicleTripAuditPayload;
    }) => updateVehicleTripAudit(id, payload),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        vehicleTripAuditQueryKeys.detail(variables.id),
        record
      );
      queryClient.setQueryData<VehicleTripAuditRecord[]>(
        vehicleTripAuditQueryKeys.all,
        (current) => replaceVehicleTripAuditInList(current, record)
      );

      await queryClient.invalidateQueries({
        queryKey: vehicleTripAuditQueryKeys.all,
      });
    },
  });
}
