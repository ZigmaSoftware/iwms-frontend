import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Zap,
} from "lucide-react";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import UserDropdown from "@/components/header/UserDropdown";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SideBarContext";
import MenuSearchDialog from "@/layouts/admin/components/MenuSearchDialog";
import { useDashboardMenuItems } from "@/layouts/dashboard/dashboardMenu";
import { cn } from "@/lib/utils";
import {
  glassCapsuleClasses,
  glassClasses,
  glassSheenClasses,
  glassIconButtonClasses,
  glassScrolledClasses,
} from "@/layouts/glassStyles";
import {
  ADMIN_VIEW_MODE_DASHBOARD,
  USER_ROLE_STORAGE_KEY,
  setAdminViewPreference,
} from "@/types/roles";
import ZigmaLogo from "@/images/logo.png";
import { getStoredProfile } from "@/utils/authStorage";
import { api } from "@/api";

/** Resolve company logo URL from stored profile, prepending the backend origin.
 *
 * Rules:
 *  - Platform super-admin (user_type === "platform") → always ZigmaLogo
 *  - Company user (staff / customer / contractor) with a logo → their company logo
 *  - Anything else (no logo, missing profile) → ZigmaLogo fallback
 */
function useCompanyLogo(): string {
  const profile = getStoredProfile() as Record<string, unknown> | null;

  // Platform super-admin always shows the Zigma logo
  if (!profile || profile.user_type === "platform") return ZigmaLogo;

  const relativePath = profile.company_logo as string | null | undefined;
  if (!relativePath) return ZigmaLogo;

  // Strip /api/v1 suffix from baseURL to get the backend origin (e.g. http://127.0.0.1:8000)
  const origin = (api.defaults.baseURL ?? "")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/api\/desktop\/?$/, "");
  return `${origin}${relativePath}`;
}

/** "company_supervisor" / "super-admin" / "Company Supervisor" → title case. */
function formatRole(role: string): string {
  const compact = role.toLowerCase().replace(/[\s_-]+/g, "");
  if (compact === "superadmin") return "Super Admin";
  return role
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Who is signed in, for the header brand and role badge.
 *  Company users see their company name; the platform super admin keeps the
 *  product title. The role comes from the login profile, else the stored
 *  role key. */
function useHeaderIdentity(): {
  companyName: string | null;
  roleLabel: string;
} {
  const profile = getStoredProfile() as Record<string, unknown> | null;
  const isPlatform = !profile || profile.user_type === "platform";
  const companyName =
    !isPlatform && typeof profile?.company_name === "string"
      ? profile.company_name.trim() || null
      : null;
  const rawRole =
    (typeof profile?.role === "string" && profile.role.trim()) ||
    localStorage.getItem(USER_ROLE_STORAGE_KEY) ||
    "";
  return { companyName, roleLabel: rawRole ? formatRole(rawRole) : "Admin" };
}

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();
  const isSidebarOpen = isExpanded || isMobileOpen;
  const [isMenuSearchOpen, setIsMenuSearchOpen] = useState(false);
  const companyLogo = useCompanyLogo();
  const { companyName, roleLabel } = useHeaderIdentity();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Dashboard View only for users granted at least one User Dashboard tab.
  const { items: dashboardTabs } = useDashboardMenuItems();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Ctrl/Cmd + K opens the menu search.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsMenuSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSidebarToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  const handleDashboardView = () => {
    setAdminViewPreference(ADMIN_VIEW_MODE_DASHBOARD);
    navigate("/", { replace: true });
  };

  const isDark = theme === "dark";
  const iconButton = cn(
    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200",
    isDark ? glassIconButtonClasses.dark : glassIconButtonClasses.light,
  );
  const dockItem = cn(
    "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors duration-200",
  );
  const logoImg = (size: string) => (
    <img
      src={companyLogo}
      className={cn(size, "object-contain")}
      alt="Logo"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).src = ZigmaLogo;
      }}
    />
  );

  return (
    // Transparent band; the glass island floats inside it.
    <header className="app-header sticky top-0 z-60 w-full px-2 pt-2 pb-2">
      <div
        className={cn(
          "relative flex h-14 items-center rounded-2xl border pl-[9px] pr-2 backdrop-blur-2xl transition-shadow duration-300 lg:pr-2.5",
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

        <div className="flex w-full items-center justify-between gap-4">
          {/* ── Left Group ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-1">
            {/* Sidebar Toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSidebarToggle}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              className={iconButton}
            >
              {/* Open/close panel icon reflecting the sidebar state. */}
              {isSidebarOpen ? (
                <PanelLeftClose className="h-[19px] w-[19px]" />
              ) : (
                <PanelLeftOpen className="h-[19px] w-[19px]" />
              )}
            </motion.button>

            {/* Menu search */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMenuSearchOpen(true)}
              aria-label="Search menu"
              title="Search menu (Ctrl + K)"
              className={iconButton}
            >
              <Search className="h-[18px] w-[18px]" />
            </motion.button>
            <MenuSearchDialog
              open={isMenuSearchOpen}
              onOpenChange={setIsMenuSearchOpen}
            />

            {/* Brand */}
            <Link
              to="/admin"
              className="ml-2 flex select-none items-center gap-3"
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff] ring-1",
                  isDark
                    ? "ring-white/15"
                    : "shadow-[0_4px_12px_-4px_rgba(13,148,136,0.4)] ring-white",
                )}
              >
                {logoImg("h-6 w-6")}
              </span>
              {/* Company name for company users; product name otherwise. */}
              <span
                className={cn(
                  "hidden max-w-[260px] truncate text-base font-semibold tracking-tight lg:block",
                  isDark ? "text-white" : "text-gray-900",
                )}
                title={companyName ?? undefined}
              >
                {companyName ?? "IWMS"}
              </span>
            </Link>
          </div>

          {/* ── Mobile quick actions toggle ──────────────────────────────── */}
          <div className="flex items-center gap-2 lg:hidden">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setApplicationMenuOpen((p) => !p)}
              aria-label="More actions"
              className={iconButton}
            >
              <motion.div
                animate={{ rotate: isApplicationMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm12 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
                    fill="currentColor"
                  />
                </svg>
              </motion.div>
            </motion.button>
          </div>

          {/* ── Right Group ─────────────────────────────────────────────── */}
          <div
            className={cn(
              "items-center gap-2",
              isApplicationMenuOpen
                ? cn(
                    "absolute right-0 top-[calc(100%+0.5rem)] flex flex-wrap justify-end rounded-2xl border p-2 backdrop-blur-2xl lg:static lg:flex-nowrap lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
                    isDark ? glassClasses.dark : glassClasses.light,
                  )
                : "hidden lg:flex",
            )}
          >
            {/* Control dock: one capsule for view, role, language, theme */}
            <div
              className={cn(
                "flex items-center gap-1 rounded-xl border p-1",
                isDark ? glassCapsuleClasses.dark : glassCapsuleClasses.light,
              )}
            >
              {dashboardTabs.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDashboardView}
                  title={t("common.dashboard_view")}
                  className={cn(
                    dockItem,
                    isDark
                      ? "text-gray-300 hover:bg-green-400/10 hover:text-green-300"
                      : "text-green-700 hover:bg-green-600 hover:text-white",
                  )}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {t("common.dashboard_view")}
                  </span>
                </motion.button>
              )}

              {/* Role badge */}
              <span
                className={cn(
                  dockItem,
                  "hidden cursor-default xl:flex",

                  isDark
                    ? "bg-indigo-400/10 text-indigo-300"
                    : "bg-indigo-50/80 text-indigo-600",
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="max-w-[160px] truncate">{roleLabel}</span>
              </span>

              <span
                className={cn(
                  "mx-0.5 h-5 w-px",
                  isDark ? "bg-white/10" : "bg-gray-300/60",
                )}
              />

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

              <ThemeToggleButton
                showLabel={false}
                className={cn(
                  "h-8 w-8 rounded-lg border-0 bg-transparent shadow-none",
                  isDark ? "hover:bg-white/[0.06]" : "hover:bg-white/80",
                )}
              />
            </div>

            <UserDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
