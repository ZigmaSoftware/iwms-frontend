import { useMutation, useQueryClient } from "@tanstack/react-query";

import { contractorUserTypeApi } from "@/helpers/admin";
import { enterpriseQuery } from "../enterpriseQuery";

export type ContractorUserType = {
  unique_id: string;
  name: string;
  usertype_id: string | null;
  usertype_name?: string;
  is_active: boolean;
  is_deleted: boolean;
};

export type ContractorUserTypePayload = {
  name: string;
  usertype_id: string | number;
  is_active: boolean;
};

const listContractorUserTypes = () =>
  contractorUserTypeApi.list() as Promise<ContractorUserType[]>;

const getContractorUserType = (id: string | number) =>
  contractorUserTypeApi.get(id) as Promise<ContractorUserType>;

const createContractorUserType = (payload: ContractorUserTypePayload) =>
  contractorUserTypeApi.create(payload) as Promise<ContractorUserType>;

const updateContractorUserType = (id: string | number, payload: ContractorUserTypePayload) =>
  contractorUserTypeApi.update(id, payload) as Promise<ContractorUserType>;

const replaceInList = (items: ContractorUserType[] | undefined, updated: ContractorUserType) => {
  if (!items) return items;
  const uid = String(updated.unique_id);
  return items.map((item) => (String(item.unique_id) === uid ? updated : item));
};

export const contractorUserTypeQueryKeys = {
  all: ["role-assigns", "contractor-user-type"] as const,
  detail: (id: string | number) =>
    ["role-assigns", "contractor-user-type", String(id)] as const,
};

export function useContractorUserTypesQuery() {
  return enterpriseQuery<ContractorUserType[]>({
    queryKey: contractorUserTypeQueryKeys.all,
    queryFn: listContractorUserTypes,
  });
}

export function useContractorUserTypeQuery(id: string | number | null | undefined) {
  return enterpriseQuery<ContractorUserType>({
    queryKey: contractorUserTypeQueryKeys.detail(id ?? "new"),
    queryFn: () => getContractorUserType(id as string | number),
    enabled: Boolean(id),
  });
}

export function useCreateContractorUserTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContractorUserType,
    onSuccess: async (created) => {
      queryClient.setQueryData(contractorUserTypeQueryKeys.detail(created.unique_id), created);
      await queryClient.invalidateQueries({ queryKey: contractorUserTypeQueryKeys.all });
    },
  });
}

export function useUpdateContractorUserTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: ContractorUserTypePayload;
    }) => updateContractorUserType(id, payload),
    onSuccess: async (updated, variables) => {
      queryClient.setQueryData(contractorUserTypeQueryKeys.detail(variables.id), updated);
      queryClient.setQueryData<ContractorUserType[]>(
        contractorUserTypeQueryKeys.all,
        (current) => replaceInList(current, updated),
      );
      await queryClient.invalidateQueries({ queryKey: contractorUserTypeQueryKeys.all });
    },
  });
}
