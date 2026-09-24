import type { ReactNode } from "react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { PageLoader } from "@/components/ui/PageLoader";

// Route-level code splitting: each page's chunk is only fetched when its
// route is actually visited, instead of all of them shipping in the main
// bundle up front. See adminRoutes.ts/dashboardRoutes.ts for the same
// treatment applied to the much larger module route maps.
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const VerifyOTP = lazy(() => import("@/pages/auth/VerifyOTP"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const LocalBodyAuth = lazy(() => import("@/pages/LocalBodyAuth"));
const LocalBodyDashboard = lazy(() => import("@/pages/localbody/LocalBodyDashboard"));
const DistrictAuth = lazy(() => import("@/pages/DistrictAuth"));
const DistrictDashboard = lazy(() => import("@/pages/district/DistrictDashboard"));
const Dashboard = lazy(() => import("@/pages/dashboard/pages/Dashboard"));
const NotFound = lazy(() => import("@/pages/dashboard/pages/NotFound"));
const HomeDashboard = lazy(() =>
  import("@/pages/dashboard/pages/Dashboard/HomeDashboard").then((m) => ({ default: m.HomeDashboard })),
);
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const AdminEncryptedRouter = lazy(() => import("@/layouts/admin/encryptedRouting/AdminEncryptedRouter"));
const CommonAuditList = lazy(
  () => import("@/pages/admin/modules/superadmin/audits/commonAudit/commonAuditList"),
);
const DailyTripLogReportPage = lazy(
  () => import("@/pages/admin/modules/core_modules/dailyOperations/dailyTripLog/DailyTripLogReportPage"),
);
const DashboardEncryptedRouter = lazy(
  () => import("@/layouts/dashboard/encryptedRouting/DashboardEncryptedRouter"),
);
const AdminLayout = lazy(() =>
  import("@/layouts/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);

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
      <Suspense fallback={<PageLoader fullHeight />}>
        <AdminLayout>{children}</AdminLayout>
      </Suspense>
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
    <Suspense fallback={<PageLoader fullHeight />}>
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
    </Suspense>
  );
}
