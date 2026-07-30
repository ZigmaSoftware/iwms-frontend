import { FilterMatchMode, FilterOperator } from "primereact/api";

/**
 * applyTableFilters
 * =================
 * Small client-side helper so "Export to Excel" buttons on admin list pages
 * can export exactly the rows currently visible under the PrimeReact
 * DataTable's `filters` state (global search + any per-column filters),
 * instead of the full unfiltered dataset.
 *
 * PrimeReact's DataTable applies `filters` internally and doesn't expose the
 * filtered result, so this reproduces the same matching semantics against a
 * plain row array:
 *   - `global`         → CONTAINS across `globalFields` (case-insensitive).
 *   - Column filters use their configured PrimeReact match mode.
 *   - Multi-constraint filters respect their AND/OR operator.
 *
 * Rows are plain objects (already flattened/enriched the same way the table
 * renders them) — pass the same array you hand to `<DataTable value={...}>`.
 */
// Loosely typed on purpose: accepts PrimeReact's `DataTableFilterMeta` (whose
// per-field value can be either a plain { value, matchMode } entry or a
// multi-constraint "operator" entry with no top-level `value`) as well as the
// simpler ad-hoc filter-state shapes several list pages build by hand. Only
// the plain-entry shape is matched against; operator/constraint entries are
// safely skipped via the `in` check below rather than being typed away.
export type TableFilterMeta = Record<string, unknown>;

type FilterConstraint = {
  value?: unknown;
  matchMode?: string;
};

type FilterEntry = FilterConstraint & {
  constraints?: FilterConstraint[];
  operator?: string;
};

const getFieldValue = (row: object, field: string): unknown =>
  field.split(".").reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, row);

const isEmptyFilterValue = (value: unknown) =>
  value === null || value === undefined || value === "";

const normalizeText = (value: unknown) => String(value ?? "").toLocaleLowerCase();

const isEqual = (left: unknown, right: unknown) => {
  if (left instanceof Date || right instanceof Date) {
    const leftTime = left instanceof Date ? left.getTime() : new Date(String(left)).getTime();
    const rightTime = right instanceof Date ? right.getTime() : new Date(String(right)).getTime();
    return Number.isFinite(leftTime) && leftTime === rightTime;
  }
  return left === right;
};

const matchesConstraint = (
  cellValue: unknown,
  constraint: FilterConstraint,
): boolean => {
  const filterValue = constraint.value;
  if (isEmptyFilterValue(filterValue)) return true;

  const cellText = normalizeText(cellValue);
  const filterText = normalizeText(filterValue);

  switch (constraint.matchMode) {
    case FilterMatchMode.STARTS_WITH:
      return cellText.startsWith(filterText);
    case FilterMatchMode.NOT_CONTAINS:
      return !cellText.includes(filterText);
    case FilterMatchMode.ENDS_WITH:
      return cellText.endsWith(filterText);
    case FilterMatchMode.EQUALS:
    case FilterMatchMode.DATE_IS:
      return isEqual(cellValue, filterValue);
    case FilterMatchMode.NOT_EQUALS:
    case FilterMatchMode.DATE_IS_NOT:
      return !isEqual(cellValue, filterValue);
    case FilterMatchMode.IN:
      return Array.isArray(filterValue)
        ? filterValue.some((value) => isEqual(cellValue, value))
        : isEqual(cellValue, filterValue);
    case FilterMatchMode.LESS_THAN:
    case FilterMatchMode.DATE_BEFORE:
      return cellValue != null && cellValue < filterValue;
    case FilterMatchMode.LESS_THAN_OR_EQUAL_TO:
      return cellValue != null && cellValue <= filterValue;
    case FilterMatchMode.GREATER_THAN:
    case FilterMatchMode.DATE_AFTER:
      return cellValue != null && cellValue > filterValue;
    case FilterMatchMode.GREATER_THAN_OR_EQUAL_TO:
      return cellValue != null && cellValue >= filterValue;
    case FilterMatchMode.CONTAINS:
    default:
      return cellText.includes(filterText);
  }
};

const matchesEntry = (cellValue: unknown, entry: FilterEntry) => {
  if (!Array.isArray(entry.constraints)) {
    return matchesConstraint(cellValue, entry);
  }

  const populated = entry.constraints.filter(
    (constraint) => !isEmptyFilterValue(constraint.value),
  );
  if (populated.length === 0) return true;

  return entry.operator === FilterOperator.OR
    ? populated.some((constraint) => matchesConstraint(cellValue, constraint))
    : populated.every((constraint) => matchesConstraint(cellValue, constraint));
};

export function applyTableFilters<T extends object>(
  rows: readonly T[],
  filters: TableFilterMeta,
  globalFields: readonly string[],
): T[] {
  return rows.filter((row) => {
    for (const [field, entry] of Object.entries(filters)) {
      if (!entry || typeof entry !== "object") continue;
      const meta = entry as FilterEntry;

      if (field === "global") {
        if (isEmptyFilterValue(meta.value)) continue;
        const hit = globalFields.some((globalField) =>
          matchesConstraint(getFieldValue(row, globalField), {
            value: meta.value,
            matchMode: meta.matchMode ?? FilterMatchMode.CONTAINS,
          }),
        );
        if (!hit) return false;
        continue;
      }

      if (!matchesEntry(getFieldValue(row, field), meta)) return false;
    }
    return true;
  });
}
