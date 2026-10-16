import { createContext, useCallback, useContext } from "react";

import { usePermission } from "@/contexts/PermissionContext";
import { isStoredSuperAdmin, type PermissionAction } from "@/utils/permissions";

/**
 * The permission of the admin page being shown, as its sidebar entry names it
 * (layouts/admin/sidebarMenu.tsx, `permissionFor(module, ...screens)`).
 * AdminEncryptedRouter provides it; the shared list widgets (ActionMenu,
 * SafeDataTable, `<Can>`) read it to hide the actions the user may not take.
 * The backend middleware refuses them regardless — this keeps the UI from
 * offering them.
 */
export type ScreenPermission = { module: string; screens: string[] };

export const ScreenPermissionContext = createContext<ScreenPermission | null>(null);

export const isSuperAdminUser = (): boolean => isStoredSuperAdmin();

/**
 * Returns a checker: whether `permission` grants `action` on any of its
 * screens. `null` (a page the sidebar does not know) and superadmins → true.
 */
export function useHasScreenPermission() {
  const { hasPermission } = usePermission();
  return useCallback(
    (permission: ScreenPermission | null, action: PermissionAction): boolean =>
      !permission ||
      isSuperAdminUser() ||
      permission.screens.some((screen) =>
        hasPermission(permission.module, screen, action),
      ),
    [hasPermission],
  );
}

/** The ScreenPermission of the current admin page, or null outside one. */
export function useScreenPermission(): ScreenPermission | null {
  return useContext(ScreenPermissionContext);
}

/**
 * Actions allowed on the current admin page. Outside a page the sidebar
 * knows (no provider), everything is allowed and the backend decides.
 *
 *   const { canAdd, canEdit } = useScreenAccess();
 *   {canAdd && <Button label="Add" … />}
 *   <Switch disabled={!canEdit || busy} … />
 */
export function useScreenAccess() {
  const permission = useContext(ScreenPermissionContext);
  const check = useHasScreenPermission();
  const can = useCallback(
    (action: PermissionAction) => check(permission, action),
    [check, permission],
  );
  return {
    can,
    canView: can("view"),
    canAdd: can("add"),
    canEdit: can("edit"),
    canDelete: can("delete"),
    canImport: can("import"),
    canExport: can("export"),
  };
}
