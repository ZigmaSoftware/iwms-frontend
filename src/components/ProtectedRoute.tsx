// import { useEffect, useState } from "react";
// import type { ReactNode } from "react";
// import { Navigate } from "react-router-dom";
// import { jwtDecode } from "jwt-decode";
// import type { UserRole } from "@/types/roles";
// import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";

// interface ProtectedRouteProps {
//   children: ReactNode;
//   allowedRoles?: UserRole[];
// }

// type JwtPayload = {
//   exp?: number;
// };

// export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
//   const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

//   useEffect(() => {
//     const token = localStorage.getItem("access_token");
//     const role = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));

//     if (!token) {
//       setIsAllowed(false);
//       return;
//     }

//     if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
//       setIsAllowed(false);
//       return;
//     }

//     try {
//       const decoded = jwtDecode<JwtPayload>(token);
//       const now = Math.floor(Date.now() / 1000);

//       if (!decoded.exp || decoded.exp > now) {
//         setIsAllowed(true);
//       } else {
//         setIsAllowed(false);
//       }
//     } catch (err) {
//       setIsAllowed(false);
//     }
//   }, [allowedRoles]);

//   // Loading
//   if (isAllowed === null) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
//       </div>
//     );
//   }

//   // Unauthorized → redirect
//   if (!isAllowed) {
//     return <Navigate to="/auth" replace />;
//   }

//   // Authorized → render children
//   return <>{children}</>;
// }



import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { UserRole } from "@/types/roles";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

type JwtPayload = {
  exp?: number;
};

/**
 * Check if the user has any permissions in localStorage.
 * Handles both array format and object format from the API.
 */
function hasAnyPermission(permissions: Record<string, any>): boolean {
  if (!permissions || typeof permissions !== "object") return false;

  return Object.values(permissions).some((module) => {
    if (!module || typeof module !== "object") return false;

    return Object.values(module).some((screenValue) => {
      if (Array.isArray(screenValue)) return screenValue.length > 0;
      if (typeof screenValue === "object" && screenValue !== null) {
        return Object.values(screenValue).some((v) => v === true);
      }
      return false;
    });
  });
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));

    if (!token) {
      setIsAllowed(false);
      return;
    }

    // ✅ If allowedRoles is specified and the user's role is not in the list,
    //    still allow access if the superadmin has granted them permissions.
    //    This covers roles like "company driver" that are not "admin" by name
    //    but have been given module access by a superadmin.
    if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
      const permissions = JSON.parse(
        localStorage.getItem("permissions") || "{}"
      );
      const hasPerms = hasAnyPermission(permissions);

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
      // else: fall through — user has permissions, allow them in
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Math.floor(Date.now() / 1000);

      if (!decoded.exp || decoded.exp > now) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
    } catch (err) {
      setIsAllowed(false);
    }
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