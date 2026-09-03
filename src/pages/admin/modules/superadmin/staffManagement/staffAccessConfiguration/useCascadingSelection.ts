import { useEffect, useRef } from "react";

type Options = {
  /** Only reconcile once the underlying option data (and, in edit mode, the
   * saved record) has actually loaded. Before this flips true the effect is
   * a no-op, so it never touches a value that hasn't been hydrated yet. */
  canReconcile: boolean;
  /** When true, the very first reconcile pass after `canReconcile` becomes
   * true only records a baseline (no auto-select) instead of treating the
   * whole eligible set as "newly eligible". Pass `isEdit` here: an existing
   * record's saved selection (including a deliberately empty one, meaning
   * "unrestricted") must be shown exactly as saved when the form opens —
   * auto-select-all should only kick in when the admin actively changes a
   * parent field afterward, not merely because the page loaded. Pass
   * `false` for create forms so the very first parent selection still
   * auto-checks its children immediately. */
  skipFirstReconcile: boolean;
};

/**
 * Keeps a multi-select level in sync with its "eligible" id set (the ids
 * allowed given the currently-selected parent level(s)): ids no longer
 * eligible are dropped, ids that just became eligible are auto-checked, and
 * ids the user manually unchecked that are still eligible stay unchecked.
 *
 * `eligible === null` means "not applicable yet" (e.g. no project chosen) —
 * the hook does nothing until a concrete Set is provided.
 */
export function useCascadingSelection(
  selected: string[],
  eligible: Set<string> | null,
  onReconciled: (next: string[]) => void,
  { canReconcile, skipFirstReconcile }: Options
) {
  const prevEligible = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (!canReconcile || eligible === null) return;

    const current = selectedRef.current;

    if (skipFirstReconcile && !initialized.current) {
      // First pass after hydration: leave the saved selection exactly as-is.
      // `eligible` on this very first pass can still be an under-populated
      // or empty Set purely because of async load ordering between the two
      // independent option fetches this widget depends on (global states
      // list vs. company-scoped districts/cities/etc) — pruning against that
      // transient snapshot would wipe a genuinely-saved selection before the
      // real eligible set has had a chance to catch up. Only take a baseline
      // here; actual pruning starts from the next (post-hydration) pass,
      // once `eligible` reflects a settled parent selection.
      prevEligible.current = eligible;
      initialized.current = true;
      return;
    }
    initialized.current = true;

    const survived = current.filter((id) => eligible.has(id));

    const newlyEligible = [...eligible].filter((id) => !prevEligible.current.has(id));
    const next = Array.from(new Set([...survived, ...newlyEligible]));
    prevEligible.current = eligible;

    const changed = next.length !== current.length || !next.every((id) => current.includes(id));
    if (changed) onReconciled(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, canReconcile]);
}
