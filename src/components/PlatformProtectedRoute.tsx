import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

type JwtPayload = {
  exp?: number;
};

const PLATFORM_TOKEN_KEY = "platform_access_token";

export function PlatformProtectedRoute({ children }: { children: ReactNode }) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(PLATFORM_TOKEN_KEY);

    if (!token) {
      setIsAllowed(false);
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Math.floor(Date.now() / 1000);

      if (!decoded.exp || decoded.exp > now) {
        setIsAllowed(true);
      } else {
        setIsAllowed(false);
      }
    } catch {
      setIsAllowed(false);
    }
  }, []);

  if (isAllowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/platform/login" replace />;
  }

  return <>{children}</>;
}
