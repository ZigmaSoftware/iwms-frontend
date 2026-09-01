import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import VerifyOTP from "@/pages/auth/VerifyOTP";
import ResetPassword from "@/pages/auth/ResetPassword";
import LocalBodyAuth from "@/pages/LocalBodyAuth";
import LocalBodyDashboard from "@/pages/localbody/LocalBodyDashboard";
import DistrictAuth from "@/pages/DistrictAuth";
import DistrictDashboard from "@/pages/district/DistrictDashboard";
import Dashboard from "@/pages/dashboard/pages/Dashboard";
import NotFound from "@/pages/dashboard/pages/NotFound";
import { HomeDashboard } from "@/pages/dashboard/pages/Dashboard/HomeDashboard";
import AdminHome from "@/pages/admin/AdminHome";
import AdminEncryptedRouter from "@/layouts/admin/encryptedRouting/AdminEncryptedRouter";
import CommonAuditList from "@/pages/admin/modules/superadmin/audits/commonAudit/commonAuditList";
import DailyTripLogReportPage from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripLog/DailyTripLogReportPage";
import DashboardEncryptedRouter from "@/layouts/dashboard/encryptedRouting/DashboardEncryptedRouter";

import { AdminLayout } from "@/layouts/admin/AdminLayout";
import { RoleBasedLayout } from "@/layouts/shared/RoleBasedLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { AdminViewMode, UserRole } from "@/types/roles";
import {
  ADMIN_ROLES,
  DEFAULT_ROLE,
  ADMIN_VIEW_MODE_ADMIN,
  ADMIN_VIEW_MODE_DASHBOARD,
  USER_ROLE_STORAGE_KEY,
  getAdminViewPreference,
  normalizeRole,
  isAdmin,
} from "@/types/roles";
import { hasAnyPermission } from "@/utils/permissions";

const ADMIN_ACCESS_ROLES: UserRole[] = [DEFAULT_ROLE, ...ADMIN_ROLES];

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
    <ProtectedRoute allowedRoles={ADMIN_ACCESS_ROLES}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function HomeRedirect() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedRole = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
  const preference = getAdminViewPreference();

  if (isAdmin(storedRole, hasAnyPermission("view"))) {
    if (preference === ADMIN_VIEW_MODE_DASHBOARD) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  const resolvedRole = storedRole ?? DEFAULT_ROLE;

  if (resolvedRole === DEFAULT_ROLE) {
    if (preference === ADMIN_VIEW_MODE_ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function DashboardRouteGuard({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [adminViewPreference, setAdminViewPreferenceState] = useState<AdminViewMode | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const storedRole = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
      setRole(storedRole);
      setAdminViewPreferenceState(getAdminViewPreference());
    } finally {
      setChecked(true);
    }
  }, []);

  if (!checked) {
    return null;
  }

  const preference = adminViewPreference ?? ADMIN_VIEW_MODE_ADMIN;

  if (isAdmin(role, hasAnyPermission("view")) && preference === ADMIN_VIEW_MODE_ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  if (role === DEFAULT_ROLE && preference === ADMIN_VIEW_MODE_ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public auth routes ── */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/verify-otp" element={<VerifyOTP />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />

      {/* ── Panchayat / district leader portals ── */}
      <Route path="/auth/localbody" element={<LocalBodyAuth />} />
      <Route path="/localbody" element={<LocalBodyDashboard />} />
      <Route path="/auth/district" element={<DistrictAuth />} />
      <Route path="/district" element={<DistrictDashboard />} />

      {/* ── Home redirect ── */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ── Staff / user dashboard ── */}
      <Route path="/dashboard" element={withDashboard(<HomeDashboard />)} />
      <Route path="/dashboard/overview" element={withDashboard(<Dashboard />)} />
      <Route path="/dashboard/:encModule" element={withDashboard(<DashboardEncryptedRouter />)} />

      {/* ── Admin panel (Company Admin, superadmin, etc.) ── */}
      <Route path="/admin" element={withAdmin(<AdminHome />)} />
      <Route path="/audits/common-audit" element={withAdmin(<CommonAuditList />)} />
      <Route path="/:encMaster/:encModule" element={withAdmin(<AdminEncryptedRouter />)} />
      <Route path="/:encMaster/:encModule/new" element={withAdmin(<AdminEncryptedRouter />)} />
      <Route path="/:encMaster/:encModule/:id/edit" element={withAdmin(<AdminEncryptedRouter />)} />
      <Route path="/:encMaster/:encModule/:id/report" element={withAdmin(<DailyTripLogReportPage />)} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
