import { useState } from "react";
import { FilterSection, type ActiveFilterChip } from "@/components/common/ListToolbar";
import type { FilterPart } from "@/components/filters/useOptionFilter";

const DATE_INPUT_CLASS = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

type DateRange = { from: string; to: string };

/**
 * "From / To date" for the list-page Filters panel: a draft committed on
 * Apply. `applied` holds the query params (`date_from` / `date_to` unless
 * renamed) — spread it into the API call.
 *
 *   const dates = useDateRangeFilter({ section: "Raised on", onAppliedChange: () => setFirst(0) });
 *   params = { ...dates.applied, … }
 */
export function useDateRangeFilter({
  section = "Date",
  fromLabel = "From date",
  toLabel = "To date",
  fromParam = "date_from",
  toParam = "date_to",
  onAppliedChange,
}: {
  section?: string;
  fromLabel?: string;
  toLabel?: string;
  fromParam?: string;
  toParam?: string;
  onAppliedChange?: () => void;
} = {}) {
  const [applied, setApplied] = useState<DateRange>({ from: "", to: "" });
  const [draft, setDraft] = useState<DateRange>({ from: "", to: "" });

  const commit = (next: DateRange) => {
    setDraft(next);
    if (next.from !== applied.from || next.to !== applied.to) {
      setApplied(next);
      onAppliedChange?.();
    }
  };

  const chips: ActiveFilterChip[] = [
    ...(applied.from
      ? [{ key: fromParam, label: fromLabel, value: applied.from, onRemove: () => commit({ ...applied, from: "" }) }]
      : []),
    ...(applied.to
      ? [{ key: toParam, label: toLabel, value: applied.to, onRemove: () => commit({ ...applied, to: "" }) }]
      : []),
  ];

  return {
    from: applied.from,
    to: applied.to,
    /** applied range as query params — spread into the API call */
    applied: {
      ...(applied.from ? { [fromParam]: applied.from } : {}),
      ...(applied.to ? { [toParam]: applied.to } : {}),
    } as Record<string, string>,
    field: (
      <FilterSection label={section}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            className={DATE_INPUT_CLASS}
            aria-label={fromLabel}
          />
          <input
            type="date"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            className={DATE_INPUT_CLASS}
            aria-label={toLabel}
          />
        </div>
      </FilterSection>
    ),
    chips,
    count: chips.length,
    apply: () => commit(draft),
    reset: () => commit({ from: "", to: "" }),
  } satisfies FilterPart & Record<string, unknown>;
}
