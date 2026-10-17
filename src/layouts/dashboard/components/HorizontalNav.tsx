import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDashboardActiveNav, useDashboardMenuItems } from "@/layouts/dashboard/dashboardMenu";

export function HorizontalNav() {
  const { t } = useTranslation();
  const isItemActive = useDashboardActiveNav();
  const { items } = useDashboardMenuItems();

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {items.map((item) => {
        const isActive = isItemActive(item);

        return (
          <Link
            key={item.url}
            to={item.url}
            className={`group relative flex items-center gap-3 px-2 text-lg py-2 rounded-lg font-medium transition-all duration-300 after:absolute after:left-2 after:right-2 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary/60 after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100 ${
              isActive
                ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <item.icon
              className={`h-4 w-4 transition-transform duration-300 ${
                isActive ? "scale-110" : "group-hover:scale-110"
              }`}
            />
            <span className="text-sm">{t(item.labelKey)}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground/50 rounded-t-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
