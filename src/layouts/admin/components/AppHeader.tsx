import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";

import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import UserDropdown from "@/components/header/UserDropdown";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SideBarContext";
import { cn } from "@/lib/utils";
import {
  ADMIN_VIEW_MODE_DASHBOARD,
  setAdminViewPreference,
} from "@/types/roles";
import ZigmaLogo from "@/images/logo.png";

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { theme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSidebarToggle = () => {
    if (window.innerWidth >= 1024) toggleSidebar();
    else toggleMobileSidebar();
  };

  const toggleApplicationMenu = () => setApplicationMenuOpen((prev) => !prev);
  const handleDashboardView = () => {
    setAdminViewPreference(ADMIN_VIEW_MODE_DASHBOARD);
    navigate("/", { replace: true });
  };

  const isDark = theme === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-[60] w-full backdrop-blur-xl transition-all duration-500",
        isDark
          ? "bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90"
          : "bg-white"
      )}
    >
      {/* Animated gradient border */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden",
          scrolled ? "opacity-100" : "opacity-0",
          "transition-opacity duration-500"
        )}
      >
        <motion.div
          className={cn(
            "h-full w-full",
            isDark
              ? "bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              : "bg-gradient-to-r from-transparent via-blue-400 to-transparent"
          )}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative h-[var(--admin-header-h)] px-4 lg:px-8",
          scrolled &&
            (isDark
              ? "shadow-2xl shadow-blue-500/10"
              : "shadow-xl shadow-blue-300/20"),
          "transition-shadow duration-500"
        )}
      >
        <div className="flex min-h-[54px] flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:py-2">
          <div className="flex w-full items-center justify-between gap-4">
            {/* Left Group */}
            <div className="flex items-center gap-5">
              {/* Sidebar Toggle with Pulse Effect */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSidebarToggle}
              >
                {/* Hover glow effect */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300",
                    isDark ? "bg-blue-500/30" : "bg-blue-400/30"
                  )}
                />
                <motion.div
                  animate={{ rotate: isMobileOpen ? 90 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10"
                >
                  {isMobileOpen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6.22 7.28a.75.75 0 0 1 1.06-1.06L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L10.94 12 6.22 7.28Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="14" viewBox="0 0 16 12" fill="none">
                      <path
                        d="M1.33.25h13.33a.75.75 0 0 1 0 1.5H1.33a.75.75 0 0 1 0-1.5Zm0 10h13.33a.75.75 0 0 1 0 1.5H1.33a.75.75 0 0 1 0-1.5Zm0-5h6.67a.75.75 0 0 1 0 1.5H1.33a.75.75 0 0 1 0-1.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  )}
                </motion.div>
              </motion.button>

              {/* Enhanced Branding */}
              <div className="hidden flex-col lg:flex select-none">
                <motion.div
                  className="flex items-center gap-3 mb-1"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="relative">
                    <img src={ZigmaLogo} className="h-12 w-12" />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-xl font-bold tracking-tight",
                        isDark
                          ? "bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent"
                          : "bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent"
                      )}
                    >
                      {t("admin.panel_title")}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Mobile Logo */}
              <Link to="/admin" className="lg:hidden">
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src="/logo.png"
                  alt="Logo"
                  className="h-9 w-auto opacity-95"
                />
              </Link>
            </div>

            {/* Mobile Quick Action Button */}
            <div className="flex items-center gap-2 lg:hidden">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleApplicationMenu}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
                  isDark
                    ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20 text-white hover:from-blue-600/30 hover:to-purple-600/30 border border-white/10"
                    : "bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-700 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-200/50"
                )}
              >
                <motion.div
                  animate={{ rotate: isApplicationMenuOpen ? 90 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm12 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
                      fill="currentColor"
                    />
                  </svg>
                </motion.div>
              </motion.button>
            </div>
          </div>

          {/* Right Section */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex w-full flex-row items-center justify-end gap-3 pt-2 lg:w-auto lg:pt-0",
              isApplicationMenuOpen ? "flex" : "hidden lg:flex",
              isDark
                ? "border-t border-white/10 lg:border-none"
                : "border-t border-gray-200 lg:border-none"
            )}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDashboardView}
              title={t("common.dashboard_view")}
              aria-label={t("common.dashboard_view")}
              className={cn(
                "rainbow-border flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold shadow transition-all",
                isDark
                  ? "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  : "border border-gray-200 bg-white text-blue-700 hover:bg-gray-50"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="sr-only">{t("common.dashboard_view")}</span>
            </motion.button>

            <LanguageSwitcher
              variant="select"
              className="w-[150px]"
              triggerClassName={cn(
                "h-11 rounded-full px-4 text-xs font-semibold",
                isDark
                  ? "border-white/15 bg-white/5 text-white focus-visible:ring-white/30"
                  : "border-[var(--admin-border)] bg-white/90 text-[var(--admin-text)] shadow-[0_10px_24px_rgba(9,74,141,0.08)] focus-visible:ring-[var(--admin-primarySoft)]",
              )}
            />

            {/* Theme Toggle */}
            <ThemeToggleButton showLabel={false} />

            <UserDropdown />
          </motion.div>
        </div>
      </motion.div>
    </header>
  );
};

export default AppHeader;
