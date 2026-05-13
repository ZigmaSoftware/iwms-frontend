import { adminApi } from "@/helpers/admin/registry";

import { enterpriseQuery } from "../enterpriseQuery";

export type CommonAuditJsonValue =
  | string
  | number
  | boolean
  | null
  | CommonAuditJsonValue[]
  | { [key: string]: CommonAuditJsonValue };

export type CommonAuditRecord = {
  uuid: string;
  module_name: string;
  endpoint_name: string;
  method: string;
  previous_data?: CommonAuditJsonValue;
  new_data?: CommonAuditJsonValue;
  object_id?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
};

const api = adminApi.commonAudits;

export const getCommonAuditList = () =>
  api.list() as Promise<CommonAuditRecord[]>;

export const commonAuditQueryKeys = {
  all: ["audit items", "common audit"] as const,
};

export function useCommonAuditsQuery() {
  return enterpriseQuery<CommonAuditRecord[]>({
    queryKey: commonAuditQueryKeys.all,
    queryFn: getCommonAuditList,
  });
}
