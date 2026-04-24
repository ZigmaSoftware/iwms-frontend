import { useEffect, useRef } from "react";
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
import { useZonesQuery } from "./zone";
import { useWardsQuery } from "./ward";

/* ================= HELPERS ================= */

const listFromResponse = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

/* ================= QUERY KEYS ================= */

export const complaintKeys = {
  all: ["citizen grievances", "complaints"] as const,
  detail: (id: string | number) => [...complaintKeys.all, String(id)] as const,
  customers: ["customer masters", "customers"] as const,
  mainCategories: ["citizen grievances", "main_categories"] as const,
  allSubCategories: ["citizen grievances", "sub_categories"] as const,
};

/* ================= LIST QUERY ================= */

export const useComplaintsList = () =>
  useQuery({
    queryKey: complaintKeys.all,
    queryFn: () => complaintApi.list(),
  });

/* ================= FORM QUERIES ================= */

export const useComplaintCustomers = () =>
  useQuery({
    queryKey: complaintKeys.customers,
    queryFn: async () => {
      const res = await customerCreationApi.list();
      const normalized = normalizeCustomerArray(res);
      return filterActiveCustomers(normalized);
    },
  });

export const useComplaintMainCategories = (companyId: string) => {
  const query = useQuery({
    queryKey: complaintKeys.mainCategories,
    queryFn: async () => {
      const res = await mainCategoryApi.list({
        params: { company_id: companyId },
      });
      const normalized = listFromResponse(res);
      return filterActiveRecords(normalized);
    },
    enabled: !!companyId,
  });

  const previousCompanyIdRef = useRef(companyId);

  useEffect(() => {
    if (previousCompanyIdRef.current === companyId) {
      return;
    }

    previousCompanyIdRef.current = companyId;

    if (companyId) {
      void query.refetch();
    }
  }, [companyId, query.refetch]);

  return query;
};

export const useComplaintAllSubCategories = (companyId: string) => {
  const query = useQuery({
    queryKey: complaintKeys.allSubCategories,
    queryFn: async () => {
      const res = await subCategoryApi.list({
        params: { company_id: companyId },
      });
      const normalized = listFromResponse(res);
      return filterActiveRecords(normalized);
    },
    enabled: !!companyId,
  });

  const previousCompanyIdRef = useRef(companyId);

  useEffect(() => {
    if (previousCompanyIdRef.current === companyId) {
      return;
    }

    previousCompanyIdRef.current = companyId;

    if (companyId) {
      void query.refetch();
    }
  }, [companyId, query.refetch]);

  return query;
};

export const useComplaintZones = (customerId: string) => useZonesQuery(customerId);

export const useComplaintWards = (zoneId: string) => useWardsQuery(zoneId);

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
      queryClient.setQueryData<any[]>(complaintKeys.all, (current) =>
        replaceComplaintInList(current, complaint)
      );

      await queryClient.invalidateQueries({ queryKey: complaintKeys.all });
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
      queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    },
  });
};
