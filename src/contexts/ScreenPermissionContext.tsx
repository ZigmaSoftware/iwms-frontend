import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  ScreenPermissionContext,
  useScreenAccess,
  type ScreenPermission,
} from "@/contexts/screenPermission";
import type { PermissionAction } from "@/utils/permissions";

// Hooks and helpers live in ./screenPermission.ts (kept apart so this file
// only exports components — react-refresh).
export function ScreenPermissionProvider({
  value,
  children,
}: {
  value: ScreenPermission | null;
  children: ReactNode;
}) {
  return (
    <ScreenPermissionContext.Provider value={value}>
      {children}
    </ScreenPermissionContext.Provider>
  );
}

/**
 * Renders its children only when the current page grants `action`
 * (optionally `fallback` otherwise).
 */
export function Can({
  action,
  children,
  fallback = null,
}: {
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useScreenAccess();
  return <>{can(action) ? children : fallback}</>;
}

export function AccessDenied() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-6 text-center">
      <i className="pi pi-lock text-4xl text-gray-400" aria-hidden="true" />
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        {t("common.access_denied_title", "Access denied")}
      </h1>
      <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
        {t(
          "common.access_denied_message",
          "You do not have permission to open this page. Ask your administrator to grant it in Staff Access Configuration.",
        )}
      </p>
    </div>
  );
}
