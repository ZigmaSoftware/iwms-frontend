import { useMutation, useQueryClient } from "@tanstack/react-query";

import { customerCreationApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type CustomerCreationRecord = {
  unique_id: string | number;
  customer_name: string;
  contact_no: string;
  username: string;
  email: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  sqft: string;
  property_id?: string | number;
  sub_property_id?: string | number;
  id_proof_type: string;
  id_no: string;
  country_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  zone_id?: string | number | null;
  ward_id?: string | number | null;
  panchayat_id?: string | number | null;
  company_id?: string | number | null;
  project_id?: string | number | null;
  is_active: boolean;
  is_bulkwaste_generator: boolean;
  apartment_name?: string;
  block_no?: string;
  flat_no?: string;
  villa_no?: string;
  industry_name?: string;
  industry_type?: string;
  qr_code?: string;
  country_name?: string;
  state_name?: string;
  district_name?: string;
  city_name?: string;
  zone_name?: string;
  ward_name?: string;
  panchayat_name?: string;
  property_name?: string;
  sub_property_name?: string;
  company_unique_id?: string | number | null;
  company_name?: string | null;
  project_unique_id?: string | number | null;
  project_name?: string | null;
};

export type CustomerCreationPayload = {
  customer_name: string;
  contact_no: string;
  username: string;
  email: string;
  password?: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  sqft: string;
  property_id: string | number;
  sub_property_id: string | number;
  id_proof_type: string;
  id_no: string;
  country_id?: string | number | null;
  state_id?: string | number | null;
  district_id?: string | number | null;
  city_id?: string | number | null;
  zone_id?: string | number | null;
  ward_id?: string | number | null;
  panchayat_id?: string | number | null;
  company_id?: string | number | null;
  project_id?: string | number | null;
  is_active: boolean;
  is_bulkwaste_generator: boolean;
  apartment_name?: string;
  block_no?: string;
  flat_no?: string;
  villa_no?: string;
  industry_name?: string;
  industry_type?: string;
};

export type CustomerCreationUploadResponse = {
  success?: number;
  errors?: number;
  message?: string;
  [key: string]: unknown;
};

const normalizeCustomerCreationId = (id: string | number) => String(id);

const listCustomerCreations = () => customerCreationApi.list() as Promise<CustomerCreationRecord[]>;

const getCustomerCreation = (id: string | number) => customerCreationApi.get(id) as Promise<CustomerCreationRecord>;

const createCustomerCreation = (payload: CustomerCreationPayload) => customerCreationApi.create(payload) as Promise<CustomerCreationRecord>;

const updateCustomerCreation = (id: string | number, payload: CustomerCreationPayload) => customerCreationApi.update(id, payload) as Promise<CustomerCreationRecord>;

const uploadCustomerCreations = (payload: FormData) => customerCreationApi.upload<CustomerCreationUploadResponse>(payload);

const replaceCustomerCreationInList = (
  customerCreations: CustomerCreationRecord[] | undefined,
  customerCreation: CustomerCreationRecord
) => {
  if (!customerCreations) return customerCreations;

  const customerId = normalizeCustomerCreationId(customerCreation.unique_id);

  return customerCreations.map((record) =>
    normalizeCustomerCreationId(record.unique_id) === customerId ? customerCreation : record
  );
};

export const customerCreationQueryKeys = {
  all: ["customer masters", "customerCreations"] as const,
  detail: (id: string | number) => ["customer masters", "customerCreations", normalizeCustomerCreationId(id)] as const,
};

export function useCustomerCreationsQuery() {
  return enterpriseQuery<CustomerCreationRecord[]>({
    queryKey: customerCreationQueryKeys.all,
    queryFn: () => listCustomerCreations(),
  });
}

export function useCustomerCreationQuery(id: string | number | null | undefined) {
  return enterpriseQuery<CustomerCreationRecord>({
    queryKey: customerCreationQueryKeys.detail(id ?? "new"),
    queryFn: () => getCustomerCreation(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateCustomerCreationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomerCreation,
    onSuccess: async (customerCreation) => {
      queryClient.setQueryData(customerCreationQueryKeys.detail(customerCreation.unique_id), customerCreation);
      await queryClient.invalidateQueries({ queryKey: ["customer masters", "customerCreations"] });
    },
  });
}

export function useUpdateCustomerCreationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: CustomerCreationPayload }) => updateCustomerCreation(id, payload),
    onSuccess: async (customerCreation, variables) => {
      queryClient.setQueryData(customerCreationQueryKeys.detail(variables.id), customerCreation);
      queryClient.setQueriesData<CustomerCreationRecord[]>(
        { queryKey: customerCreationQueryKeys.all },
        (current) => replaceCustomerCreationInList(current, customerCreation)
      );
      await queryClient.invalidateQueries({ queryKey: ["customer masters", "customerCreations"] });
    },
  });
}

export function useUploadCustomerCreationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadCustomerCreations,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerCreationQueryKeys.all });
    },
  });
}
