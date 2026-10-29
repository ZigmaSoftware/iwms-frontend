import { useState } from "react";
import type { ActiveFilterChip } from "@/components/common/ListToolbar";

/** How one key of a useDraftFilter group shows as an active-filter chip. */
export type DraftChipSpec<T extends Record<string, string>> = {
  [K in keyof T]?: {
    label: string;
    /** display text for a value (an option's name); the value itself otherwise */
    format?: (value: string) => string;
    /** keys cleared along with this one when its chip is removed (cascades) */
    clears?: (keyof T)[];
    /** no ✕ on the chip (e.g. a level pinned by the user's own scope) */
    locked?: boolean;
  };
};

/**
 * Several related Filters-panel fields (cascading dropdowns, a few selects …)
 * edited as one draft and committed together on Apply.
 *
 *   const loc = useDraftFilter({
 *     empty: { state: "", district: "" },
 *     chips: { state: { label: "State", format: stateName, clears: ["district"] },
 *              district: { label: "District", format: districtName } },
 *     onAppliedChange: () => setFirst(0),
 *   });
 *   loc.draft.state / loc.setField("state", v)    // panel fields
 *   loc.applied.state / loc.params                // what the list sends
 *   combineFilters({ ...loc, field: <FilterSection …/> }, …)
 *
 * Chip names are captured when a value is applied, so they stay right even
 * after the draft moves on and the option lists reload for another parent.
 */
export function useDraftFilter<T extends Record<string, string>>({
  empty,
  chips: chipSpec = {},
  onAppliedChange,
}: {
  empty: T;
  chips?: DraftChipSpec<T>;
  onAppliedChange?: () => void;
}) {
  const [applied, setApplied] = useState<T>(empty);
  const [draft, setDraft] = useState<T>(empty);
  const [labels, setLabels] = useState<Partial<Record<keyof T, string>>>({});

  const commit = (next: T) => {
    setDraft(next);
    const keys = Object.keys(next) as (keyof T)[];
    if (keys.every((key) => next[key] === applied[key])) return;
    const nextLabels: Partial<Record<keyof T, string>> = {};
    for (const key of keys) {
      const value = next[key];
      if (!value) continue;
      nextLabels[key] =
        value === applied[key] && labels[key]
          ? labels[key]
          : (chipSpec[key]?.format?.(value) ?? value);
    }
    setApplied(next);
    setLabels(nextLabels);
    onAppliedChange?.();
  };

  const chips: ActiveFilterChip[] = (Object.keys(applied) as (keyof T)[])
    .filter((key) => applied[key] && chipSpec[key])
    .map((key) => {
      const spec = chipSpec[key]!;
      return {
        key: String(key),
        label: spec.label,
        value: labels[key] ?? applied[key],
        onRemove: spec.locked
          ? undefined
          : () => {
              const next = { ...applied, [key]: "" } as T;
              for (const dependent of spec.clears ?? []) {
                (next as Record<keyof T, string>)[dependent] = "";
              }
              commit(next);
            },
      };
    });

  return {
    draft,
    setDraft,
    /** set one draft field */
    setField: <K extends keyof T>(key: K, value: T[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    applied,
    /** non-empty applied values, keyed as in `empty` */
    params: Object.fromEntries(
      Object.entries(applied).filter(([, value]) => value),
    ) as Partial<T>,
    commit,
    chips,
    count: chips.length,
    apply: () => commit(draft),
    reset: () => commit(empty),
  };
}
