import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api";
import { dailyTripLogApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

type NamedRef = { unique_id?: string; name?: string; [key: string]: unknown };
type StaffRef = { unique_id?: string; staff_unique_id?: string; employee_name?: string };

export type DailyTripLogRecord = {
  unique_id: string;
  trip_assignment_id?: string;
  trip_assignment?: NamedRef & { display_code?: string; status?: string };
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  panchayat_id?: string;
  panchayat?: NamedRef & { panchayat_name?: string };
  collection_point_id?: string;
  collection_point?: NamedRef & { cp_name?: string };
  waste_type_id?: string;
  waste_type?: NamedRef & { waste_type_name?: string };
  trip_date?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  driver_id?: string;
  driver?: StaffRef;
  operator_id?: string;
  operator?: StaffRef;
  extra_operator_ids?: string[];
  extra_operators?: StaffRef[];
  collected_weight_kg?: string | number;
  vehicle_id?: string;
  vehicle?: NamedRef & { vehicle_no?: string; capacity?: string | number | null };
  bin_ids?: string[];
  bins?: (NamedRef & { bin_name?: string })[];
  remarks?: string | null;
  log_status?: "Draft" | "Submitted" | "Verified" | string;
  verified_by?: string | null;
  verified_by_name?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type DailyTripLogPayload = {
  company_id_input?: string | null;
  project_id_input?: string | null;
  trip_assignment_id?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  extra_operator_ids?: string[];
  collected_weight_kg?: number;
  bin_ids?: string[];
  remarks?: string;
  log_status?: string;
};

export type DailyTripLogListFilters = {
  company_id?: string | null;
  project_id?: string | null;
  trip_date?: string | null;
  log_status?: string | null;
  search?: string | null;
  ordering?: string | null;
};

export const dailyTripLogQueryKeys = {
  all: ["transport masters", "daily trip log"] as const,
  list: (filters?: DailyTripLogListFilters | null) =>
    ["transport masters", "daily trip log", "list", filters ?? {}] as const,
  detail: (id: string | number) =>
    ["transport masters", "daily trip log", String(id)] as const,
};

const cleanParams = (filters?: DailyTripLogListFilters | null) =>
  Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

const listDailyTripLogs = (filters?: DailyTripLogListFilters | null) => {
  const params = cleanParams(filters);
  return dailyTripLogApi.list(Object.keys(params).length ? { params } : undefined) as Promise<DailyTripLogRecord[]>;
};

const getDailyTripLog = (id: string | number) =>
  dailyTripLogApi.get(id) as Promise<DailyTripLogRecord>;

const createDailyTripLog = (payload: DailyTripLogPayload) =>
  dailyTripLogApi.create(payload) as Promise<DailyTripLogRecord>;

const updateDailyTripLog = (id: string | number, payload: DailyTripLogPayload) =>
  dailyTripLogApi.update(id, payload) as Promise<DailyTripLogRecord>;

const verifyDailyTripLog = (id: string | number, payload?: { remarks?: string }) =>
  api.patch<DailyTripLogRecord>(`/transport-masters/daily-trip-log/${id}/verify/`, payload ?? {}).then((r) => r.data);

export function useDailyTripLogsQuery(filters?: DailyTripLogListFilters | null) {
  return enterpriseQuery<DailyTripLogRecord[]>({
    queryKey: dailyTripLogQueryKeys.list(filters),
    queryFn: () => listDailyTripLogs(filters),
    enabled: filters !== null,
  });
}

export function useDailyTripLogQuery(id: string | number | null | undefined) {
  return enterpriseQuery<DailyTripLogRecord>({
    queryKey: dailyTripLogQueryKeys.detail(id ?? "new"),
    queryFn: () => getDailyTripLog(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateDailyTripLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDailyTripLog,
    onSuccess: async (data) => {
      queryClient.setQueryData(dailyTripLogQueryKeys.detail(data.unique_id), data);
      await queryClient.invalidateQueries({ queryKey: dailyTripLogQueryKeys.all });
    },
  });
}

export function useUpdateDailyTripLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: DailyTripLogPayload }) =>
      updateDailyTripLog(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(dailyTripLogQueryKeys.detail(variables.id), data);
      queryClient.setQueryData(dailyTripLogQueryKeys.detail(data.unique_id), data);
      await queryClient.invalidateQueries({ queryKey: dailyTripLogQueryKeys.all });
    },
  });
}

export function useVerifyDailyTripLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remarks }: { id: string | number; remarks?: string }) =>
      verifyDailyTripLog(id, { remarks }),
    onSuccess: async (data) => {
      queryClient.setQueryData(dailyTripLogQueryKeys.detail(data.unique_id), data);
      await queryClient.invalidateQueries({ queryKey: dailyTripLogQueryKeys.all });
    },
  });
}
