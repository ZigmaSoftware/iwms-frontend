import { createElement, Suspense, useMemo } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { decryptSegment } from "@/utils/routeCrypto";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  AccessDenied,
  ScreenPermissionProvider,
} from "@/contexts/ScreenPermissionContext";
import {
  useHasScreenPermission,
  type ScreenPermission,
} from "@/contexts/screenPermission";
import { SIDEBAR_PAGES } from "@/layouts/admin/sidebarMenu";
import {
  MASTER_ALIASES,
  MODULE_ALIASES,
  ROUTES,
  type ModuleComponent,
  type RouteConfig,
} from "./adminRoutes";

const resolveRouteConfig = (
  master: string,
  moduleName: string,
): RouteConfig | undefined => {
  const masterCandidates = [master, ...(MASTER_ALIASES[master] ?? [])];
  const moduleCandidates = [moduleName, ...(MODULE_ALIASES[moduleName] ?? [])];

  for (const masterCandidate of masterCandidates) {
    const routeGroup = ROUTES[masterCandidate];
    if (!routeGroup) {
      continue;
    }

    for (const moduleCandidate of moduleCandidates) {
      const routeConfig = routeGroup[moduleCandidate];
      if (routeConfig) {
        return routeConfig;
      }
    }
  }

  return undefined;
};

const resolveComponent = (
  config: RouteConfig | undefined,
  mode: "view" | "new" | "edit",
): ModuleComponent => {
  if (!config) return undefined;

  if (config.component) return config.component;
  if (mode === "edit") return config.editForm ?? config.form;
  if (mode === "new") return config.form;
  return config.list;
};

// The permission of every page the sidebar opens, keyed by the component it
// renders — so an alias route (legacy master/module names, the Complaint
// Types tab routes, "login-audits" vs "login-audit"...) that renders the same
// page needs the same permission. Built lazily on first use: the encrypted
// segments are only known at runtime.
let pagePermissions: Map<ModuleComponent, ScreenPermission> | undefined;

const buildPagePermissions = () => {
  const map = new Map<ModuleComponent, ScreenPermission>();
  for (const page of SIDEBAR_PAGES) {
    const [encMaster = "", encModule = ""] = page.path.split("/").filter(Boolean);
    const pageConfig = resolveRouteConfig(
      decryptSegment(encMaster) ?? "",
      decryptSegment(encModule) ?? "",
    );
    const component = pageConfig?.component ?? pageConfig?.list;
    if (!component) continue;
    const known = map.get(component);
    map.set(
      component,
      known && known.module === page.module
        ? {
            module: page.module,
            screens: [...new Set([...known.screens, ...page.screens])],
          }
        : known ?? { module: page.module, screens: page.screens },
    );
  }
  return map;
};

/** The sidebar permission of a route, or null when no sidebar entry opens it. */
const permissionForRoute = (
  config: RouteConfig,
): ScreenPermission | null => {
  pagePermissions ??= buildPagePermissions();
  const component = config.component ?? config.list;
  return (component && pagePermissions.get(component)) ?? null;
};

/**
 * The grant each mode needs: the list/page needs "view", its `/new` form
 * "add", its `/:id/edit` form "edit". A route whose `:id` page is a
 * dedicated `editForm` (e.g. the ticket detail screen, which every viewer
 * opens) only needs "view"; its own actions check their grants.
 */
const requiredAction = (
  config: RouteConfig,
  mode: "view" | "new" | "edit",
): "view" | "add" | "edit" => {
  if (config.component) return "view";
  if (mode === "new") return "add";
  if (mode === "edit") return config.editForm ? "view" : "edit";
  return "view";
};

export default function AdminEncryptedRouter() {
  const { encMaster, encModule, id } = useParams();
  const location = useLocation();
  const hasScreenPermission = useHasScreenPermission();

  const { master, moduleName } = useMemo(() => {
    return {
      master: decryptSegment(encMaster ?? ""),
      moduleName: decryptSegment(encModule ?? ""),
    };
  }, [encMaster, encModule]);

  if (!master || !moduleName) {
    return <Navigate to="/" replace />;
  }

  const moduleRoutes = resolveRouteConfig(master, moduleName);
  if (!moduleRoutes) {
    return <Navigate to="/" replace />;
  }

  const mode: "view" | "new" | "edit" = id
    ? "edit"
    : location.pathname.endsWith("/new")
      ? "new"
      : "view";
  const Component = resolveComponent(moduleRoutes, mode);

  if (!Component) {
    return <Navigate to="/" replace />;
  }

  // A page the sidebar gates needs the same grant here. Superadmins and
  // pages the sidebar does not list fall through (the API still checks).
  const permission = permissionForRoute(moduleRoutes);
  if (!hasScreenPermission(permission, requiredAction(moduleRoutes, mode))) {
    return <AccessDenied />;
  }

  return (
    <ScreenPermissionProvider value={permission}>
      <Suspense fallback={<PageLoader fullHeight />}>
        {createElement(Component)}
      </Suspense>
    </ScreenPermissionProvider>
  );
}
