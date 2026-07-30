import type { ChangeEvent, ReactNode } from "react";
import { InputText } from "primereact/inputtext";
import { cn } from "@/lib/utils";

/**
 * FilterBar
 * =========
 * One reusable filter toolbar for admin list pages, built to sit directly on
 * top of SafeDataTable's `DataTable` (see src/components/common/SafeDataTable.tsx)
 * and the FilterMatchMode / DataTableFilterMeta pattern already hand-rolled in
 * pages like ZoneListPage.tsx and projectListPage.tsx.
 *
 * It standardizes three concerns those pages each re-implement slightly
 * differently:
 *   1. A global search input (`global` filter, FilterMatchMode.CONTAINS).
 *   2. An optional status filter (active / inactive / all) — omit the props
 *      when an entity has no status column ("where applicable").
 *   3. Slot(s) for entity-specific dropdowns (company / project / hierarchy /
 *      city / ...), passed in as `children` so this component never needs to
 *      know about any particular entity's option-fetching logic (that stays
 *      in hooks like useCompanyProjectSelection).
 *
 * FilterBar itself is purely presentational/controlled — it renders the row
 * and reports value changes via callbacks. Own the `DataTableFilterMeta`
 * state however you like (as the reference pages do today), or use the
 * companion `useFilterBarFilters` hook (src/hooks/useFilterBarFilters.ts),
 * which reproduces exactly the `setFilters`/`onFilter` shape those pages
 * already use so plugging it in later does not change filtering semantics.
 *
 * Typical usage (mirrors ZoneListPage's header + toolbar, unified into one bar):
 *
 *   import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
 *
 *   const {
 *     filters, onFilter, globalFilterValue, onGlobalFilterChange,
 *     statusValue, onStatusFilterChange,
 *   } = useFilterBarFilters();
 *
 *   <FilterBar
 *     searchValue={globalFilterValue}
 *     onSearchChange={onGlobalFilterChange}
 *     searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.zone") })}
 *     statusValue={statusValue}
 *     onStatusChange={onStatusFilterChange}
 *   >
 *     <FilterBarSelect
 *       value={companyUniqueId}
 *       onChange={onFilterCompanyChange}
 *       options={companies}
 *       placeholder="All Companies"
 *       disabled={!isSuperAdmin || companies.length === 0}
 *     />
 *     <FilterBarSelect
 *       value={projectId}
 *       onChange={onFilterProjectChange}
 *       options={projects}
 *       placeholder={showAllProjectsOption ? "All Projects" : undefined}
 *       disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
 *     />
 *   </FilterBar>
 *
 *   <DataTable value={zones} filters={filters} onFilter={onFilter} ... />
 *
 * The bar can be placed either as the DataTable's `header` prop (as
 * projectListPage.tsx does today) or above the table next to an "Add" button
 * (as ZoneListPage.tsx does today) — its contract is the same either way.
 */

export type StatusFilterValue = "all" | "active" | "inactive";

export interface StatusFilterLabels {
  all?: string;
  active?: string;
  inactive?: string;
}

export interface FilterBarProps {
  /** Current value of the global search box. */
  searchValue: string;
  /** Called with the new raw text whenever the search box changes. */
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Accessible name when the placeholder is not sufficiently descriptive. */
  searchAriaLabel?: string;
  /** Hide the search box entirely (rare — e.g. a page with only column filters). */
  hideSearch?: boolean;

  /**
   * Status filter value/handler. Omit BOTH to omit the dropdown entirely —
   * use this for entities with no `is_active`-style column ("where applicable").
   */
  statusValue?: StatusFilterValue;
  onStatusChange?: (value: StatusFilterValue) => void;
  statusLabels?: StatusFilterLabels;
  statusAriaLabel?: string;

  /** Entity-specific dropdown slot(s) — company / project / hierarchy / etc. */
  children?: ReactNode;

  /** Optional trailing content rendered after everything else (e.g. a "filtered by X — view all" link). */
  trailing?: ReactNode;

  className?: string;
}

const DEFAULT_STATUS_LABELS: Required<StatusFilterLabels> = {
  all: "All Status",
  active: "Active",
  inactive: "Inactive",
};

const selectClassName =
  "border rounded px-3 py-2 text-sm bg-white dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100";

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  searchAriaLabel,
  hideSearch = false,
  statusValue,
  onStatusChange,
  statusLabels,
  statusAriaLabel,
  children,
  trailing,
  className,
}: FilterBarProps) {
  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };
  const showStatusFilter = statusValue !== undefined && !!onStatusChange;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 md:justify-end",
        className,
      )}
    >
      {!hideSearch && (
        <div className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={searchValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel ?? searchPlaceholder}
            className="p-inputtext-sm !border-0 !shadow-none !outline-none"
          />
        </div>
      )}

      {showStatusFilter && (
        <select
          value={statusValue}
          onChange={(e) => onStatusChange?.(e.target.value as StatusFilterValue)}
          className={selectClassName}
          aria-label={statusAriaLabel ?? "Status filter"}
        >
          <option value="all">{labels.all}</option>
          <option value="active">{labels.active}</option>
          <option value="inactive">{labels.inactive}</option>
        </select>
      )}

      {children}

      {trailing}
    </div>
  );
}

/**
 * FilterBarSelect
 * ===============
 * Presentational helper for the entity-specific dropdown slots (company,
 * project, hierarchy, city, ...). It only standardizes markup/styling to
 * match the plain `<select>` elements already used in ZoneListPage.tsx —
 * it does NOT fetch options or own selection state; pages keep using
 * whatever hook already supplies that (e.g. useCompanyProjectSelection).
 *
 * Passing `children` instead of `options` (e.g. to insert custom <option>
 * groups) is also supported — `options` is simply skipped when `children`
 * is provided.
 */
export interface FilterBarSelectOption {
  value: string;
  label: string;
}

export interface FilterBarSelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: readonly FilterBarSelectOption[];
  /** Rendered as a leading empty-value option (e.g. "All Companies"). Omit to require a real selection. */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
}

export function FilterBarSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  children,
  ...rest
}: FilterBarSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(selectClassName, className)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {children ??
        options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
    </select>
  );
}
