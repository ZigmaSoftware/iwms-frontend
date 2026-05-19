import { usePermission } from "@/contexts/PermissionContext";

/**
 * Returns the set of allowed column fieldNames for a given screen, or null
 * if no column permissions are configured (meaning show all columns).
 *
 * Usage:
 *   const allowed = useScreenColumnPermissions("masters", "districts");
 *   // null  → no restriction, show everything
 *   // Set   → only show columns whose fieldName is in the set
 */
export function useScreenColumnPermissions(
  mainScreenName: string,
  screenName: string
): Set<string> | null {
  const { permissionDetails } = usePermission();

  const mainScreen = permissionDetails?.[mainScreenName];
  if (!mainScreen) return null;

  const screen = mainScreen[screenName];
  if (!screen) return null;

  const { columns } = screen;
  if (!columns || columns.length === 0) return null;

  return new Set(columns.map((c) => c.fieldName));
}
