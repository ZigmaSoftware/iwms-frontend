import type { StatusFilterValue } from "@/components/common/FilterBar";
import { FilterMatchMode } from "primereact/api";
import { applyTableFilters } from "@/utils/tableFilterMatch";

/**
 * filterRowsForExport
 * ====================
 * Small helper used by admin/audits list pages so the "Download All Excel"
 * button (wired automatically by SafeDataTable) exports rows that reflect
 * the currently applied FilterBar search/status state, instead of the full
 * unfiltered dataset. Mirrors PrimeReact's own CONTAINS/EQUALS matching
 * closely enough for export purposes.
 *
 * Not a Stage-0 shared component — safe to extend independently per page.
 */
export function filterRowsForExport<T extends object>(
  rows: readonly T[],
  searchFields: readonly string[],
  search: string,
  status?: StatusFilterValue,
  statusField: string = "is_active",
): T[] {
  return applyTableFilters(
    rows,
    {
      global: {
        value: search.trim() || null,
        matchMode: FilterMatchMode.CONTAINS,
      },
      ...(status && status !== "all"
        ? {
            [statusField]: {
              value: status === "active",
              matchMode: FilterMatchMode.EQUALS,
            },
          }
        : {}),
    },
    searchFields,
  );
}
