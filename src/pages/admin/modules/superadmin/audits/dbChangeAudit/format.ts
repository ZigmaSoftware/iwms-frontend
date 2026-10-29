import type { DbChangeOperation } from "./types";

export const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

export const OPERATION_COLORS: Record<DbChangeOperation, string> = {
  INSERT: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
};
