import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { dailyTripAssignmentApi } from "@/helpers/admin";
import { api } from "@/api";

import { enterpriseQuery } from "../enterpriseQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyTripAssignmentRecord = {
  unique_id: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  trip_definition_id?: string;
  staff_template_id?: string;
  alt_staff_template_id?: string | null;
  panchayat_id?: string;
  collection_point_id?: string;
  waste_type_id?: string;
  trip_definition?: { unique_id?: string; display_code?: string };
  staff_template?: { unique_id?: string; display_code?: string };
  alt_staff_template?: { unique_id?: string; display_code?: string } | null;
  effective_staff?: { unique_id?: string; display_code?: string; driver?: string; operator?: string } | null;
  panchayat?: { unique_id?: string; panchayat_name?: string; name?: string };
  collection_point?: { unique_id?: string; name?: string; cp_name?: string; collection_point_name?: string };
  waste_type?: { unique_id?: string; sub_property_name?: string; waste_type_name?: string; name?: string };
  trip_date?: string;
  scheduled_time?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  status?: string;
  approval_status?: string;
  remarks?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export type DailyTripAssignmentPayload = {
  company_id_input?: string | null;
  project_id_input?: string | null;
  trip_definition_id?: string;
  staff_template_id?: string;
  panchayat_id?: string;
  collection_point_id?: string;
  waste_type_id?: string;
  trip_date?: string;
  scheduled_time?: string;
  status?: string;
  approval_status?: string;
  remarks?: string;
};

export type DailyTripAssignmentListFilters = {
  company_id?: string | null;
  project_id?: string | null;
  trip_date?: string | null;
  status?: string | null;
};

// ─── API wrappers ─────────────────────────────────────────────────────────────

const listDailyTripAssignments = (filters?: DailyTripAssignmentListFilters) => {
  const params = Object.fromEntries(
    Object.entries(filters ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  if (Object.keys(params).length === 0) {
    return dailyTripAssignmentApi.list() as Promise<DailyTripAssignmentRecord[]>;
  }
  return dailyTripAssignmentApi.list({ params }) as Promise<DailyTripAssignmentRecord[]>;
};

const getDailyTripAssignment = (id: string | number) =>
  dailyTripAssignmentApi.get(id) as Promise<DailyTripAssignmentRecord>;

const createDailyTripAssignment = (payload: DailyTripAssignmentPayload) =>
  dailyTripAssignmentApi.create(payload) as Promise<DailyTripAssignmentRecord>;

const updateDailyTripAssignment = (id: string | number, payload: DailyTripAssignmentPayload) =>
  dailyTripAssignmentApi.update(id, payload) as Promise<DailyTripAssignmentRecord>;

const updateStatus = (id: string, status: string) =>
  api.patch<DailyTripAssignmentRecord>(`/trip-assignments/daily/${id}/status/`, { status }).then((r) => r.data);

const updateApproval = (id: string, approval_status: string) =>
  api.patch<DailyTripAssignmentRecord>(`/trip-assignments/daily/${id}/approval/`, { approval_status }).then((r) => r.data);

const replaceInList = (items: DailyTripAssignmentRecord[] | undefined, item: DailyTripAssignmentRecord) => {
  if (!items) return items;
  return items.map((r) => (r.unique_id === item.unique_id ? item : r));
};

// ─── Query keys ───────────────────────────────────────────────────────────────

export const dailyTripAssignmentQueryKeys = {
  all: ["transport masters", "daily trip assignment"] as const,
  detail: (id: string | number) =>
    ["transport masters", "daily trip assignment", String(id)] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDailyTripAssignmentsQuery(filters?: DailyTripAssignmentListFilters | null) {
  const query = enterpriseQuery<DailyTripAssignmentRecord[]>({
    queryKey: dailyTripAssignmentQueryKeys.all,
    queryFn: () => listDailyTripAssignments(filters ?? undefined),
    enabled: filters !== null,
  });

  const filterSignature = useMemo(
    () => JSON.stringify({ company_id: filters?.company_id ?? "", project_id: filters?.project_id ?? "" }),
    [filters?.company_id, filters?.project_id]
  );
  const prevRef = useRef(filterSignature);

  useEffect(() => {
    if (prevRef.current === filterSignature) return;
    prevRef.current = filterSignature;
    if (filters !== null) void query.refetch();
  }, [filterSignature, filters, query.refetch]);

  return query;
}

export function useDailyTripAssignmentQuery(id: string | number | null | undefined) {
  return enterpriseQuery<DailyTripAssignmentRecord>({
    queryKey: dailyTripAssignmentQueryKeys.detail(id ?? "new"),
    queryFn: () => getDailyTripAssignment(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateDailyTripAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDailyTripAssignment,
    onSuccess: async (data) => {
      queryClient.setQueryData(dailyTripAssignmentQueryKeys.detail(data.unique_id), data);
      await queryClient.invalidateQueries({ queryKey: dailyTripAssignmentQueryKeys.all });
    },
  });
}

export function useUpdateDailyTripAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: DailyTripAssignmentPayload }) =>
      updateDailyTripAssignment(id, payload),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(dailyTripAssignmentQueryKeys.detail(variables.id), data);
      queryClient.setQueryData<DailyTripAssignmentRecord[]>(
        dailyTripAssignmentQueryKeys.all,
        (cur) => replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({ queryKey: dailyTripAssignmentQueryKeys.all });
    },
  });
}

export function useUpdateDailyTripStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStatus(id, status),
    onSuccess: async (data) => {
      queryClient.setQueryData(dailyTripAssignmentQueryKeys.detail(data.unique_id), data);
      queryClient.setQueryData<DailyTripAssignmentRecord[]>(
        dailyTripAssignmentQueryKeys.all,
        (cur) => replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({ queryKey: dailyTripAssignmentQueryKeys.all });
    },
  });
}

export function useUpdateDailyTripApprovalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approval_status }: { id: string; approval_status: string }) =>
      updateApproval(id, approval_status),
    onSuccess: async (data) => {
      queryClient.setQueryData(dailyTripAssignmentQueryKeys.detail(data.unique_id), data);
      queryClient.setQueryData<DailyTripAssignmentRecord[]>(
        dailyTripAssignmentQueryKeys.all,
        (cur) => replaceInList(cur, data)
      );
      await queryClient.invalidateQueries({ queryKey: dailyTripAssignmentQueryKeys.all });
    },
  });
}
