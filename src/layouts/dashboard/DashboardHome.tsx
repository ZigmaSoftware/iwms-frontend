import { lazy } from "react";
import { Navigate } from "react-router-dom";

import { AccessDenied } from "@/contexts/ScreenPermissionContext";
import { menuItems, useDashboardMenuItems } from "@/layouts/dashboard/dashboardMenu";

const HomeDashboard = lazy(() =>
  import("@/pages/dashboard/pages/Dashboard/HomeDashboard").then((m) => ({ default: m.HomeDashboard })),
);

/** /dashboard: the home dashboard when granted, otherwise the first dashboard
 * tab the user holds, otherwise "Access denied". */
export default function DashboardHome() {
  const { items } = useDashboardMenuItems();
  const home = menuItems[0];

  if (items.includes(home)) return <HomeDashboard />;
  if (items.length > 0) return <Navigate to={items[0].url} replace />;
  return <AccessDenied />;
}
