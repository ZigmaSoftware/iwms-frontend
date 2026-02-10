import { useEffect, useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { HorizontalNav } from "@/layouts/dashboard/components/HorizontalNav";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/PageLoader";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import ZigmaLogo from "@/images/logo.png";
import {
  DEFAULT_ROLE,
  ADMIN_VIEW_MODE_ADMIN,
  USER_ROLE_STORAGE_KEY,
  clearAdminViewPreference,
  normalizeRole,
  setAdminViewPreference,
  type DashboardLayoutProps,
} from "@/types/roles";

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { setUser } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsNavigating(true);
    const timer = window.setTimeout(() => setIsNavigating(false), 450);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
    setIsAdmin(role === DEFAULT_ROLE);
  }, []);

  const handleSignOut = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("unique_id");
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_email");
      clearAdminViewPreference();
      setUser(null);

      navigate("/auth", { replace: true });
    } catch (error) {
      toast({
        title: t("common.logout_failed_title"),
        description: t("common.logout_failed_desc"),
        variant: "destructive",
      });
    }
  };

  const handleSwitchToAdmin = () => {
    setAdminViewPreference(ADMIN_VIEW_MODE_ADMIN);
    navigate("/admin", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full   flex-col bg-gray-50 dark:bg-gray-900">

      {/* TOPBAR */}
      <header
        className="
          sticky top-0 z-20 
          border-b border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-900
          shadow-sm
        "
      >
        <div className="flex h-16 items-center justify-between px-2 md:px-4 lg:px-6">

          {/* LOGO */}
          <div className="flex items-center gap-3">
            <img
              src={ZigmaLogo}
              alt="Zigma Logo"
              className="h-12 w-12 object-contain"
            />
            {/* <h1 className="hidden md:block text-lg font-semibold text-gray-700 dark:text-gray-200">
              IWMS Dashboard
            </h1> */}
          </div>

          {/* NAVIGATION + ACTIONS */}
          <div className="flex items-center gap-2">

            {/* NAVIGATION */}
            <HorizontalNav />

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwitchToAdmin}
                className="rainbow-border"
              >
                {t("common.admin_view")}
              </Button>
            )}

            <LanguageSwitcher variant="select" className="w-[140px]" />

            {/* THEME TOGGLE */}
            <button
              onClick={toggleTheme}
              className="rainbow-border rounded-md border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              aria-label="Toggle color theme"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </button>

            {/* LOGOUT BUTTON */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="
                rainbow-border
                flex items-center gap-1 
                rounded-md 
                border-gray-300 dark:border-gray-600
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-all
              "
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </header>

      {/* {isNavigating && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-30 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Navigating...
          </div>
        </div>
      )} */}

      {/* MAIN CONTENT */}
      <main className="flex-1  p-2 md:p-4 lg:p-6">
        {isNavigating ? (
          <PageLoader fullHeight message={t("common.loading_dashboard")} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
