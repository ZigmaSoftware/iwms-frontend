import { complaintPriorityApi, complaintTicketApi } from "@/helpers/admin";
import type { ComplaintPriority, ComplaintTicket } from "@/features/complaintTicketing/types";

// Server-side filters understood by ComplaintTicketViewSet.get_queryset:
// search, status (bucket or code), priority (codes, comma-separated), created_on.
export type GrievanceParams = Record<string, string>;

export async function fetchGrievancePage(
  page: number,
  limit: number,
  params: GrievanceParams,
  signal?: AbortSignal,
) {
  const response = await complaintTicketApi.readAllwithPaginated(page, limit, { params, signal });
  const rows = (Array.isArray(response) ? response : response?.results ?? []) as ComplaintTicket[];
  return {
    rows,
    total: typeof response?.count === "number" ? response.count : rows.length,
  };
}

// Same filters as the list, but only the total — feeds the KPI tiles.
export async function fetchGrievanceCount(params: GrievanceParams, signal?: AbortSignal) {
  const data = await complaintTicketApi.action<{ all?: number }>("counts", undefined, { params, signal });
  return data?.all ?? 0;
}

export async function fetchGrievancePriorities(signal?: AbortSignal) {
  const rows = (await complaintPriorityApi.readAllForExport({ signal })) as ComplaintPriority[];
  return rows
    .filter((p) => p.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
