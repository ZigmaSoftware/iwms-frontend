import { LayoutDashboard, FileText, Scale, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";

import { usePermission } from "@/contexts/PermissionContext";
import { permissionFor } from "@/generated/permissionCatalog";
import { getEncryptedRoute } from "@/utils/routeCache";
import { decryptSegment } from "@/utils/routeCrypto";

const {
  encDashboardGrievances,
  encDashboardReports,
  encDashboardWeighBridge,
} = getEncryptedRoute();

// Each tab is shown to staff granted its User Dashboard screen in Staff
// Access Configuration (backend permission_catalog.py, "user-dashboard").
export const menuItems = [
  { labelKey: "dashboard.nav.dashboard", url: "/dashboard", icon: LayoutDashboard, moduleName: null, ...permissionFor("user-dashboard", "home-dashboard") },
  { labelKey: "dashboard.nav.grievances", url: `/dashboard/${encDashboardGrievances}`, icon: MessageSquare, moduleName: "dashboard-grievances", ...permissionFor("user-dashboard", "dashboard-grievances") },
  { labelKey: "dashboard.nav.reports", url: `/dashboard/${encDashboardReports}`, icon: FileText, moduleName: "dashboard-reports", ...permissionFor("user-dashboard", "dashboard-reports") },
  { labelKey: "dashboard.nav.weighbridge", url: `/dashboard/${encDashboardWeighBridge}`, icon: Scale, moduleName: "dashboard-weighbridge", ...permissionFor("user-dashboard", "dashboard-weighbridge") },
];

export type DashboardMenuItem = (typeof menuItems)[number];

/** The dashboard tabs the signed-in user may open, plus a check for one. */
export function useDashboardMenuItems() {
  const { hasPermission } = usePermission();
  const canOpen = (item: DashboardMenuItem) =>
    item.screens.some((screen) => hasPermission(item.module, screen, "view"));
  return { items: menuItems.filter(canOpen), canOpen };
}

export function useDashboardActiveNav() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentModuleName = pathSegments[0] === "dashboard" && pathSegments[1]
    ? decryptSegment(pathSegments[1])
    : null;
  const isDashboardHome = location.pathname === "/dashboard";

  return (item: DashboardMenuItem) =>
    item.moduleName === null ? isDashboardHome : currentModuleName === item.moduleName;
}
