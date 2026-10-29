import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "@/types/roles";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";
import { getStoredPermissions, hasAnyPermission } from "@/utils/permissions";
import { isAuthSessionActive } from "@/utils/authStorage";
import { sessionStore } from "@/utils/sessionStore";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const validateSession = () => {
      const role = normalizeRole(sessionStore.getItem(USER_ROLE_STORAGE_KEY));

      if (!isAuthSessionActive()) {
        setIsAllowed(false);
        return;
      }

      // ✅ If allowedRoles is specified and the user's role is not in the list,
      //    still allow access if the superadmin has granted them permissions.
      //    This covers roles like "company driver" that are not "admin" by name
      //    but have been given module access by a superadmin.
      if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
        const hasPerms = hasAnyPermission("view", getStoredPermissions());

        console.log(
          "[ProtectedRoute] Role not in allowedRoles:",
          role,
          "| hasPermissions:",
          hasPerms
        );

        if (!hasPerms) {
          setIsAllowed(false);
          return;
        }
      }

      setIsAllowed(true);
    };

    validateSession();
    window.addEventListener("iwms:auth-expired", validateSession);
    return () => window.removeEventListener("iwms:auth-expired", validateSession);
  }, [allowedRoles]);

  // Loading
  if (isAllowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Unauthorized → redirect
  if (!isAllowed) {
    return <Navigate to="/auth" replace />;
  }

  // Authorized → render children
  return <>{children}</>;
}
