import { contractorRoleTypesApi } from "@/helpers/admin";
import { enterpriseQuery } from "../enterpriseQuery";
import type { RoleTypeOption } from "./roleTypes";

const normalizeContractorRoleTypes = (raw: unknown): RoleTypeOption[] => {
  const payload =
    raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
      ? (raw as Record<string, unknown>).data
      : raw;

  let source: unknown[] = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["results", "choices", "items", "data"]) {
      if (Array.isArray(record[key])) {
        source = record[key] as unknown[];
        break;
      }
    }
  }

  return source
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      value: String(item.value ?? "").trim(),
      label: String(item.label ?? item.value ?? "").trim(),
    }))
    .filter((opt) => opt.value);
};

const listContractorRoleChoices = async (): Promise<RoleTypeOption[]> => {
  const res = (await contractorRoleTypesApi.list()) as unknown;
  return normalizeContractorRoleTypes(res);
};

export const contractorRoleTypeQueryKeys = {
  all: ["role-assigns", "contractor-user-type", "role-choices"] as const,
};

export function useContractorRoleTypesQuery() {
  return enterpriseQuery<RoleTypeOption[]>({
    queryKey: contractorRoleTypeQueryKeys.all,
    queryFn: listContractorRoleChoices,
  });
}
