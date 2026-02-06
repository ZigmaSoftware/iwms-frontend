import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Auth from "@/pages/Auth";
import Dashboard from "@/pages/dashboard/pages/Dashboard";
import NotFound from "@/pages/dashboard/pages/NotFound";
import { HomeDashboard } from "@/pages/dashboard/pages/Dashboard/HomeDashboard";
import AdminHome from "@/pages/admin/AdminHome";
import AdminEncryptedRouter from "@/layouts/admin/encryptedRouting/AdminEncryptedRouter";
import RoutePlanListPage from "@/pages/admin/modules/staffMasters/routeplan/routeplanlist";
import DashboardEncryptedRouter from "@/layouts/dashboard/encryptedRouting/DashboardEncryptedRouter";

import { AdminLayout } from "@/layouts/admin/AdminLayout";
import { RoleBasedLayout } from "@/layouts/shared/RoleBasedLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { AdminViewMode, UserRole } from "@/types/roles";
import {
  ADMIN_ROLE,
  ADMIN_VIEW_MODE_ADMIN,
  USER_ROLE_STORAGE_KEY,
  getAdminViewPreference,
  normalizeRole,
} from "@/types/roles";

function withDashboard(children: ReactNode) {
  return (
    <ProtectedRoute>
      <DashboardRouteGuard>
        <RoleBasedLayout>{children}</RoleBasedLayout>
      </DashboardRouteGuard>
    </ProtectedRoute>
  );
}

function withAdmin(children: ReactNode) {
  return (
    <ProtectedRoute allowedRoles={[ADMIN_ROLE]}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [adminViewPreference, setAdminViewPreferenceState] = useState<AdminViewMode | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const storedRole = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
      setRole(storedRole);
      if (storedRole === ADMIN_ROLE) {
        setAdminViewPreferenceState(getAdminViewPreference());
      }
    } finally {
      setChecked(true);
    }
  }, []);

  if (!checked) {
    return null;
  }

  if (role === ADMIN_ROLE && (adminViewPreference ?? ADMIN_VIEW_MODE_ADMIN) === ADMIN_VIEW_MODE_ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={withDashboard(<HomeDashboard />)} />
      <Route path="/dashboard/overview" element={withDashboard(<Dashboard />)} />
      <Route path="/dashboard/:encModule" element={withDashboard(<DashboardEncryptedRouter />)} />
      <Route path="/admin" element={withAdmin(<AdminHome />)} />
      <Route path="/:encMaster/:encModule" element={withAdmin(<AdminEncryptedRouter />)} />
      <Route path="/:encMaster/:encModule/new" element={withAdmin(<AdminEncryptedRouter />)} />
      <Route path="/:encMaster/:encModule/:id/edit" element={withAdmin(<AdminEncryptedRouter />)} />
      <Route path="/debug/route-plans" element={withAdmin(<RoutePlanListPage />)} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
