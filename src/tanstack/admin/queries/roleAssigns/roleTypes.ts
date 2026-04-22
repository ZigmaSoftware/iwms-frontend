import { roleTypesApi } from "@/helpers/admin";

import { enterpriseQuery } from "../enterpriseQuery";

export type RoleTypeOption = {
  value: string;
  label: string;
};

const prettifyRoleLabel = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toRoleOption = (item: unknown): RoleTypeOption | null => {
  if (typeof item === "string") {
    const value = item.trim();
    if (!value) return null;
    return { value, label: prettifyRoleLabel(value) };
  }

  if (!item || typeof item !== "object") return null;

  const record = item as Record<string, unknown>;
  const rawValue =
    record.value ??
    record.key ??
    record.id ??
    record.unique_id ??
    record.name ??
    record.code;

  if (typeof rawValue !== "string" && typeof rawValue !== "number") {
    return null;
  }

  const value = String(rawValue).trim();
  if (!value) return null;

  const rawLabel =
    record.label ??
    record.display_name ??
    record.title ??
    record.name;

  const label =
    typeof rawLabel === "string" && rawLabel.trim()
      ? rawLabel
      : prettifyRoleLabel(value);

  return { value, label };
};

const normalizeRoleTypes = (raw: unknown): RoleTypeOption[] => {
  const payload =
    raw && typeof raw === "object" && raw !== null && "data" in (raw as Record<string, unknown>)
      ? (raw as Record<string, unknown>).data
      : raw;

  let source: unknown[] = [];

  if (Array.isArray(payload)) {
    source = payload;
  } else if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const arrayKeys = ["results", "choices", "role_choices", "items", "data"];

    for (const key of arrayKeys) {
      if (Array.isArray(record[key])) {
        source = record[key] as unknown[];
        break;
      }
    }

    if (source.length === 0) {
      const entries = Object.entries(record).filter(
        ([key]) => !["count", "next", "previous", "detail", "message"].includes(key),
      );

      if (entries.length > 0 && entries.every(([, value]) => typeof value === "string")) {
        source = entries.map(([value, label]) => ({ value, label }));
      }
    }
  }

  const parsed = source
    .map((item) => toRoleOption(item))
    .filter((item): item is RoleTypeOption => Boolean(item));

  const unique = new Map<string, RoleTypeOption>();
  for (const option of parsed) {
    if (!unique.has(option.value)) {
      unique.set(option.value, option);
    }
  }

  return Array.from(unique.values());
};

const listRoleTypeChoices = async (): Promise<RoleTypeOption[]> => {
  const res = (await roleTypesApi.list()) as unknown;
  return normalizeRoleTypes(res);
};

export const roleTypeQueryKeys = {
  all: ["role-assigns", "staff-user-type", "role-choices"] as const,
};

export function useRoleTypeChoicesQuery() {
  return enterpriseQuery<RoleTypeOption[]>({
    queryKey: roleTypeQueryKeys.all,
    queryFn: listRoleTypeChoices,
  });
}

