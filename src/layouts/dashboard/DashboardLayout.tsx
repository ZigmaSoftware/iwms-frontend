import { useEffect, useState } from "react";
import { Crown, LogOut, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { HorizontalNav } from "@/layouts/dashboard/components/HorizontalNav";
import { MobileNavSheet } from "@/layouts/dashboard/components/MobileNavSheet";
import { PageLoader } from "@/components/ui/PageLoader";
import { RouteProgress } from "@/components/common/RouteProgress";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  glassCapsuleClasses,
  glassClasses,
  glassSheenClasses,
  glassIconButtonClasses,
  glassScrolledClasses,
} from "@/layouts/glassStyles";
import ZigmaLogo from "@/images/logo.png";
import {
  DEFAULT_ROLE,
  ADMIN_VIEW_MODE_ADMIN,
  USER_ROLE_STORAGE_KEY,
  isAdmin,
  normalizeRole,
  setAdminViewPreference,
  type DashboardLayoutProps,
  type UserRole,
} from "@/types/roles";
import {
  ACCESS_TOKEN_STORAGE_KEY,
  clearAuthSession,
} from "@/utils/authStorage";
import { endLoginSession } from "@/utils/loginSession";
import { hasAnyPermission } from "@/utils/permissions";

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { setUser } = useUser();
  const [role] = useState<UserRole | null>(() => {
    if (typeof window === "undefined") return null;
    return normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
  });
  const [isNavigating, setIsNavigating] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsNavigating(true);
    const timer = window.setTimeout(() => setIsNavigating(false), 450);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await endLoginSession(ACCESS_TOKEN_STORAGE_KEY, "manual");
      clearAuthSession();
      setUser(null);

      navigate("/auth", { replace: true });
    } catch {
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

  const canSwitchToAdmin =
    role === DEFAULT_ROLE || isAdmin(role, hasAnyPermission("view"));
  const AdminViewIcon = role === "superadmin" ? Crown : ShieldCheck;

  const capsule = cn(
    "flex items-center gap-1 rounded-xl border p-1",
    isDark ? glassCapsuleClasses.dark : glassCapsuleClasses.light,
  );
  const iconButton = cn(
    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200",
    isDark ? glassIconButtonClasses.dark : glassIconButtonClasses.light,
  );

  return (
    <div className="app-surface-bg flex min-h-screen w-full min-w-0 flex-col">
      {/* TOPBAR: floating glass bar, same look as the admin header */}
      <header className="app-header sticky top-0 z-20 w-full px-2 pt-2 pb-2">
        <div
          className={cn(
            "relative flex h-14 min-w-0 items-center justify-between gap-2 rounded-2xl border px-2 backdrop-blur-2xl transition-shadow duration-300 md:px-3",
            isDark ? glassClasses.dark : glassClasses.light,
            scrolled &&
              (isDark ? glassScrolledClasses.dark : glassScrolledClasses.light),
          )}
        >
          {/* Soft sheen across the top of the glass. */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1/2 bg-linear-to-b to-transparent",
                isDark ? glassSheenClasses.dark : glassSheenClasses.light,
              )}
            />
          </div>

          {/* LOGO */}
          <div className="flex min-w-0 select-none items-center gap-3">
            <span
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff] ring-1",
                isDark
                  ? "ring-white/15"
                  : "shadow-[0_4px_12px_-4px_rgba(13,148,136,0.4)] ring-white",
              )}
            >
              <img
                src={ZigmaLogo}
                alt="Zigma Logo"
                className="h-7 w-7 object-contain"
              />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span
                className={cn(
                  "bg-clip-text text-[10px] font-bold uppercase tracking-[0.22em] text-transparent",
                  isDark
                    ? "bg-linear-to-r from-teal-300 to-indigo-300"
                    : "bg-linear-to-r from-teal-600 to-indigo-500",
                )}
              >
                IWMS
              </span>
              <span
                className={cn(
                  "mt-1 text-[15px] font-semibold tracking-tight",
                  isDark ? "text-white" : "text-gray-900",
                )}
              >
                Dashboard
              </span>
            </span>
          </div>

          {/* NAVIGATION + ACTIONS (desktop) */}
          <div className="hidden items-center gap-2 lg:flex">
            {/* NAVIGATION */}
            <div className={capsule}>
              <HorizontalNav />
            </div>

            <div className={capsule}>
              {canSwitchToAdmin && (
                <button
                  type="button"
                  onClick={handleSwitchToAdmin}
                  className={iconButton}
                  title={t("common.admin_view")}
                  aria-label={t("common.admin_view")}
                >
                  <AdminViewIcon className="h-4 w-4" />
                </button>
              )}

              <LanguageSwitcher
                variant="select"
                className="w-[132px]"
                triggerClassName={cn(
                  "h-8 rounded-lg border-0 bg-transparent px-2 text-xs font-semibold shadow-none",
                  isDark
                    ? "text-gray-200 hover:bg-white/[0.06] focus-visible:ring-green-400/40"
                    : "text-gray-700 hover:bg-white/80 focus-visible:ring-green-300",
                )}
              />

              {/* THEME TOGGLE */}
              <ThemeToggleButton
                showLabel={false}
                className={cn(
                  "h-8 w-8 rounded-lg border-0 bg-transparent shadow-none",
                  isDark ? "hover:bg-white/[0.06]" : "hover:bg-white/80",
                )}
              />

              <span
                className={cn(
                  "mx-0.5 h-5 w-px",
                  isDark ? "bg-white/10" : "bg-gray-300/60",
                )}
              />

              {/* LOGOUT BUTTON */}
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200",
                  isDark
                    ? "text-gray-400 hover:bg-red-500/15 hover:text-red-400"
                    : "text-gray-500 hover:bg-red-50 hover:text-red-500",
                )}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* NAVIGATION + ACTIONS (mobile) */}
          <div className="flex items-center lg:hidden">
            <MobileNavSheet
              canSwitchToAdmin={canSwitchToAdmin}
              onSwitchToAdmin={handleSwitchToAdmin}
              onSignOut={handleSignOut}
              adminViewIcon={AdminViewIcon}
            />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative min-w-0 flex-1 overflow-x-hidden p-2 md:p-4 lg:p-6 lg:pt-3">
        <RouteProgress />
        {isNavigating ? (
          <PageLoader fullHeight message={t("common.loading_dashboard")} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
