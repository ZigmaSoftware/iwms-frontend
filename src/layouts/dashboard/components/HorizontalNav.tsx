import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  useDashboardActiveNav,
  useDashboardMenuItems,
} from "@/layouts/dashboard/dashboardMenu";

export function HorizontalNav() {
  const { t } = useTranslation();
  const isItemActive = useDashboardActiveNav();
  const { items } = useDashboardMenuItems();

  // Rendered inside the header's glass capsule: flat items, the active one a
  // teal pill.
  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const isActive = isItemActive(item);

        return (
          <Link
            key={item.url}
            to={item.url}
            className={cn(
              "group flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-linear-to-r from-green-500 to-green-600 font-semibold text-white shadow-[0_6px_16px_-6px_rgba(13,148,136,0.6)] dark:from-green-400 dark:to-green-500 dark:text-green-950"
                : "text-gray-600 hover:bg-white/80 hover:text-green-700 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-green-300",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                !isActive && "group-hover:scale-110",
              )}
            />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
