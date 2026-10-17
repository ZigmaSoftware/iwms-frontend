import { Suspense, useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";

import { decryptSegment } from "@/utils/routeCrypto";
import { PageLoader } from "@/components/ui/PageLoader";
import { AccessDenied } from "@/contexts/ScreenPermissionContext";
import { menuItems, useDashboardMenuItems } from "@/layouts/dashboard/dashboardMenu";
import { ROUTES } from "./dashboardRoutes";

export default function DashboardEncryptedRouter() {
  const { encModule } = useParams();
  const { canOpen } = useDashboardMenuItems();

  const moduleName = useMemo(
    () => decryptSegment(encModule ?? ""),
    [encModule],
  );

  if (!moduleName) {
    return <Navigate to="/dashboard" replace />;
  }

  const Component = ROUTES[moduleName];

  if (!Component) {
    return <Navigate to="/dashboard" replace />;
  }

  // Tabs in the dashboard nav need their User Dashboard grant.
  const tab = menuItems.find((item) => item.moduleName === moduleName);
  if (tab && !canOpen(tab)) {
    return <AccessDenied />;
  }

  return (
    <Suspense fallback={<PageLoader fullHeight />}>
      <Component />
    </Suspense>
  );
}
