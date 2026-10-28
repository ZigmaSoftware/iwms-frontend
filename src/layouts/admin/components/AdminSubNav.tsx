import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { panelLinks, useSidebarNav } from "@/layouts/admin/useSidebarNav";

// Horizontal submenu bar: the options of the rail icon selected in
// AppSidebar. The title and every option are separate cards on the page
// background, wrapping onto further rows instead of scrolling.
const cardBase =
  "rounded-xl border shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)] dark:shadow-none";
// Kept off the active tab: the dark theme forces every .bg-white to the card
// colour, which would hide its gradient.
const cardSurface = "bg-white dark:bg-(--admin-surfaceAlt)";
const tabBase =
  "flex items-center whitespace-nowrap px-4 py-2 text-sm transition-[background-color,border-color,box-shadow,color] duration-200 ease-out";
const tabActiveClasses =
  "border-transparent bg-linear-to-r from-green-500 to-green-600 font-semibold text-white dark:from-green-400 dark:to-green-500 dark:text-green-950 shadow-[0_6px_16px_-6px_rgba(13,148,136,0.55)] dark:shadow-green-900/40";
const tabInactiveClasses =
  "border-gray-100 font-medium text-gray-600 hover:border-green-200 hover:text-green-700 hover:shadow-[0_6px_16px_-6px_rgba(13,148,136,0.35)] dark:border-white/10 dark:text-gray-300 dark:hover:border-green-400/40 dark:hover:text-green-300";

const AdminSubNav: React.FC = () => {
  const { t } = useTranslation();
  const { isEntryActive, selectedItem, selectedGroupTitleKey } =
    useSidebarNav();

  if (!selectedItem) return null;

  return (
    // Page-coloured backing so content scrolling under the sticky row stays
    // hidden; it blends into the page when not scrolled.
    // The module card is its own column, so wrapped submodule rows line up
    // under the first submodule instead of under the module name.
    <nav className="sticky top-(--admin-header-h) z-30 -my-1 flex w-full min-w-0 flex-col gap-2 bg-(--admin-surface)/90 py-1 backdrop-blur md:flex-row md:items-start md:gap-0">
      <div
        className={cn(
          cardBase,
          cardSurface,
          "flex shrink-0 items-center gap-2.5 self-start border-gray-100 py-1.5 dark:border-white/10 pl-1.5 pr-4",
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300">
          {selectedItem.icon}
        </span>
        <div className="min-w-0">
          {selectedGroupTitleKey && (
            <p className="text-[10px] font-bold uppercase leading-tight tracking-wider text-gray-400 dark:text-gray-500">
              {t(selectedGroupTitleKey)}
            </p>
          )}
          <p className="truncate text-sm font-bold leading-tight text-gray-900 dark:text-white">
            {t(selectedItem.nameKey)}
          </p>
        </div>
      </div>

      {/* Divider between the module and its submodules (desktop only). */}
      <span className="mx-3 hidden w-px self-stretch rounded-full bg-gray-200 md:block dark:bg-white/10" />

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:pt-1">
        {panelLinks(selectedItem).map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={cn(
              cardBase,
              tabBase,
              isEntryActive(link)
                ? tabActiveClasses
                : cn(cardSurface, tabInactiveClasses),
            )}
          >
            {t(link.nameKey)}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default AdminSubNav;
