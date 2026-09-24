import { Suspense, useMemo } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { decryptSegment } from "@/utils/routeCrypto";
import { PageLoader } from "@/components/ui/PageLoader";
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

export default function AdminEncryptedRouter() {
  const { encMaster, encModule, id } = useParams();
  const location = useLocation();

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

  return (
    <Suspense fallback={<PageLoader fullHeight />}>
      <Component />
    </Suspense>
  );
}
