// Screens the backend puts under one heading in permission forms (e.g.
// "Daily Trip Plan" over its assignment, collection point and household
// screens) — see SCREEN_GROUPS in the backend's app/utils/screen_dependencies.py.
// Each screen keeps its own grant; the heading only ticks them together.

export type ScreenBlock<T> =
  | { kind: "screen"; item: T }
  | { kind: "group"; key: string; label: string; items: T[] };

/**
 * Collapse grouped screens into one block, placed where the group's first
 * screen appears. Ungrouped screens pass through in their original order.
 */
export function groupScreens<T>(
  items: T[],
  groupOf: (item: T) => { key?: string | null; label?: string | null },
): ScreenBlock<T>[] {
  const blocks: ScreenBlock<T>[] = [];
  const groups = new Map<string, Extract<ScreenBlock<T>, { kind: "group" }>>();

  items.forEach((item) => {
    const { key, label } = groupOf(item);
    if (!key) {
      blocks.push({ kind: "screen", item });
      return;
    }
    let group = groups.get(key);
    if (!group) {
      group = { kind: "group", key, label: label || key, items: [] };
      groups.set(key, group);
      blocks.push(group);
    }
    group.items.push(item);
  });

  return blocks;
}

/** How many of the group's screens hold an action: none, some or all. */
export function groupActionState(
  holders: boolean[],
): { checked: boolean; indeterminate: boolean } {
  const held = holders.filter(Boolean).length;
  return {
    checked: holders.length > 0 && held === holders.length,
    indeterminate: held > 0 && held < holders.length,
  };
}
