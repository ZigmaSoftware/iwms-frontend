import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  customerCreationApi,
  zoneApi,
  wardApi,
  complaintApi,
  mainCategoryApi,
  subCategoryApi,
} from "@/helpers/admin";
import {
  filterActiveCustomers,
  filterActiveRecords,
  normalizeCustomerArray,
} from "@/utils/customerUtils";

/* ================= HELPERS ================= */

const listFromResponse = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

/* ================= QUERY KEYS ================= */

export const complaintKeys = {
  all: ["complaints"] as const,
  lists: () => [...complaintKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) =>
    [...complaintKeys.lists(), filters] as const,

  detail: (id: string | number) => [...complaintKeys.all, "detail", String(id)] as const,

  customers: () => ["complaint-customers"] as const,

  mainCategories: (companyId: string) =>
    ["complaint-main-categories", companyId] as const,

  allSubCategories: (companyId: string) =>
    ["complaint-all-sub-categories", companyId] as const,

  zones: (customerId: string) =>
    ["complaint-zones", customerId] as const,

  wards: (zoneId: string) =>
    ["complaint-wards", zoneId] as const,
};

/* ================= LIST QUERY ================= */

export const useComplaintsList = () =>
  useQuery({
    queryKey: complaintKeys.lists(),
    queryFn: () => complaintApi.list(),
  });

/* ================= FORM QUERIES ================= */

export const useComplaintCustomers = () =>
  useQuery({
    queryKey: complaintKeys.customers(),
    queryFn: async () => {
      const res = await customerCreationApi.list();
      const normalized = normalizeCustomerArray(res);
      return filterActiveCustomers(normalized);
    },
  });

export const useComplaintMainCategories = (companyId: string) =>
  useQuery({
    queryKey: complaintKeys.mainCategories(companyId),
    queryFn: async () => {
      const res = await mainCategoryApi.list({
        params: { company_id: companyId },
      });
      const normalized = listFromResponse(res);
      return filterActiveRecords(normalized);
    },
    enabled: !!companyId,
  });

export const useComplaintAllSubCategories = (companyId: string) =>
  useQuery({
    queryKey: complaintKeys.allSubCategories(companyId),
    queryFn: async () => {
      const res = await subCategoryApi.list({
        params: { company_id: companyId },
      });
      const normalized = listFromResponse(res);
      return filterActiveRecords(normalized);
    },
    enabled: !!companyId,
  });

export const useComplaintZones = (customerId: string) =>
  useQuery({
    queryKey: complaintKeys.zones(customerId),
    queryFn: async () => {
      console.log("=== Loading Zones ===");
      console.log("Customer ID:", customerId);
      const res = await zoneApi.list({ params: { customer_id: customerId } });
      console.log("Zone API raw response:", res);
      const normalized = listFromResponse(res);
      console.log("Normalized zones:", normalized);
      const filtered = filterActiveRecords(normalized);
      console.log("Filtered active zones:", filtered);
      return filtered;
    },
    enabled: !!customerId,
  });

export const useComplaintWards = (zoneId: string) =>
  useQuery({
    queryKey: complaintKeys.wards(zoneId),
    queryFn: async () => {
      console.log("=== Loading Wards ===");
      console.log("Zone ID:", zoneId);
      const res = await wardApi.list({ params: { zone_id: zoneId } });
      console.log("Ward API raw response:", res);
      const normalized = listFromResponse(res);
      console.log("Normalized wards:", normalized);
      const filtered = filterActiveRecords(normalized);
      console.log("Filtered active wards:", filtered);
      return filtered;
    },
    enabled: !!zoneId,
  });

/* ================= DETAIL + MUTATIONS ================= */

const normalizeComplaintId = (id: string | number) => String(id);

const getComplaint = (id: string | number) =>
  complaintApi.get(id) as Promise<any>;

const updateComplaint = (id: string | number, payload: any) =>
  complaintApi.update(id, payload) as Promise<any>;

const replaceComplaintInList = (
  complaints: any[] | undefined,
  complaint: any
) => {
  if (!complaints) return complaints;

  const cid = normalizeComplaintId(complaint.unique_id ?? complaint.id ?? "");

  return complaints.map((rec) =>
    normalizeComplaintId(rec.unique_id ?? rec.id ?? "") === cid ? complaint : rec
  );
};

export function useComplaintQuery(id: string | number | null | undefined) {
  return useQuery({
    queryKey: complaintKeys.detail(id ?? "new"),
    queryFn: () => getComplaint(id as string | number),
    enabled: Boolean(id),
  });
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: any }) =>
      updateComplaint(id, payload),
    onSuccess: async (complaint, variables) => {
      queryClient.setQueryData(complaintKeys.detail(variables.id), complaint);
      queryClient.setQueryData<any[]>(complaintKeys.lists(), (current) =>
        replaceComplaintInList(current, complaint)
      );

      await queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
}

/* ================= MUTATIONS ================= */

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      complaintApi.create(formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
};