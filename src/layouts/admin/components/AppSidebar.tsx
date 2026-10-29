import { Fragment, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useSidebar } from "@/contexts/SideBarContext";
import { startRouteProgress } from "@/components/common/routeProgressStore";
import { useSidebarNav } from "@/layouts/admin/useSidebarNav";
import type { NavItem, SidebarSectionKey } from "@/layouts/admin/sidebarMenu";

// One entry per top-level menu; the selected menu's submenu is shown as
// horizontal tabs at the top of the page (AdminSubNav). Closed, the sidebar is
// a rail of icons only (names in tooltips); open, it lists full names beside
// the icons.
// Each item is a card: hidden at rest, lifted on hover, kept for the
// selected item. Only colours and shadow animate (no layout shift).
const railButtonBase =
  "group flex w-full shrink-0 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300";
const railButtonClosedClasses = "items-center justify-center p-1.5";
const railButtonOpenClasses =
  "flex-row items-center gap-3 px-2 py-1.5 text-left";
const railCardRestClasses =
  "border-transparent hover:border-green-100 hover:bg-white hover:shadow-[0_6px_18px_-6px_rgba(13,148,136,0.35)] dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:shadow-none";
const railCardSelectedClasses =
  "border-green-100 bg-white shadow-[0_4px_14px_-6px_rgba(13,148,136,0.4)] dark:border-green-400/20 dark:bg-white/5 dark:shadow-none";
// No transform transition here: DockIcon drives the scale every frame.
const railIconBase =
  "flex shrink-0 items-center justify-center rounded-xl transition-[background-color,color,box-shadow] duration-200";
const railActiveClasses =
  "bg-linear-to-br from-green-500 to-green-600 text-white shadow-md shadow-green-200/70 dark:shadow-green-900/40";
const railCurrentClasses =
  "bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300";
const railInactiveClasses =
  "text-gray-500 group-hover:bg-green-50 group-hover:text-green-700 dark:text-gray-400 dark:group-hover:bg-green-400/10 dark:group-hover:text-green-300";
const railLabelClasses = "min-w-0 flex-1 text-sm leading-snug";

// Dock magnification: icons within DOCK_RANGE px of the pointer grow towards
// DOCK_MAX_SCALE on a cosine falloff. Only the icon scales (no layout change),
// so labels and spacing stay put; a spring keeps it smooth.
const DOCK_RANGE = 110;
const DOCK_MAX_SCALE = 1.28;
const DOCK_SPRING = { stiffness: 320, damping: 26, mass: 0.35 };

const DockIcon: React.FC<{
  pointerY: MotionValue<number>;
  disabled: boolean;
  className: string;
  children: React.ReactNode;
}> = ({ pointerY, disabled, className, children }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const targetScale = useTransform(pointerY, (y) => {
    const rect = ref.current?.getBoundingClientRect();
    if (disabled || !rect || !Number.isFinite(y)) return 1;
    const distance = Math.abs(y - (rect.top + rect.height / 2));
    if (distance >= DOCK_RANGE) return 1;
    const falloff = (Math.cos((Math.PI * distance) / DOCK_RANGE) + 1) / 2;
    return 1 + (DOCK_MAX_SCALE - 1) * falloff;
  });
  const scale = useSpring(targetScale, DOCK_SPRING);

  return (
    <motion.span
      ref={ref}
      style={{ scale }}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.span>
  );
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, toggleMobileSidebar } = useSidebar();
  const { t } = useTranslation();
  const { railGroups, isItemCurrent, selectedItem, select } = useSidebarNav();
  const navigate = useNavigate();
  const isOpen = isExpanded || isMobileOpen;
  // Pointer's viewport Y over the rail; Infinity when it is elsewhere.
  const pointerY = useMotionValue(Infinity);
  const reduceMotion = useReducedMotion();
  // One tooltip at a time: Radix keeps a focused (just-clicked) icon's
  // tooltip open while another is hovered, so several could stack up.
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);

  const handleRailClick = (
    type: SidebarSectionKey,
    index: number,
    item: NavItem,
  ) => {
    select(type, index);
    // Open the menu's first page so the content matches its tabs, unless one
    // of its pages is already open.
    const firstPage = item.subItems?.[0]?.path;
    if (firstPage && !isItemCurrent(item)) {
      startRouteProgress(firstPage);
      navigate(firstPage);
    }
    // On mobile the rail covers the page; close it so the submenu bar shows.
    if (isMobileOpen) toggleMobileSidebar();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-(--admin-header-h) z-50 flex h-[calc(100vh-var(--admin-header-h))] flex-col transition-all duration-300 ease-out",
        "border-r border-(--admin-border) bg-(--admin-surface) shadow-lg shadow-gray-200/50 dark:shadow-black/30",
        isOpen ? "w-64" : "w-[72px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
      )}
    >
      <nav
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") pointerY.set(e.clientY);
        }}
        onPointerLeave={() => {
          pointerY.set(Infinity);
          setTooltipKey(null);
        }}
        onScroll={() => {
          pointerY.set(Infinity);
          setTooltipKey(null);
        }}
        className={cn(
          "scrollbar-none flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-3",
          isOpen ? "items-stretch px-3" : "items-center px-1.5",
        )}
      >
        {/* No delay, so names follow the pointer while sweeping the rail. */}
        <TooltipProvider delayDuration={0} skipDelayDuration={300}>
          {railGroups.map((group, groupIndex) => (
            <Fragment key={group.key}>
              {isOpen ? (
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-2 px-2 pb-1",
                    groupIndex > 0 && "pt-3",
                  )}
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", group.accent)}
                  />
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {t(group.titleKey)}
                  </span>
                </div>
              ) : (
                groupIndex > 0 && (
                  <div className="my-1 h-px w-10 shrink-0 bg-gray-200 dark:bg-white/10" />
                )
              )}
              {group.sections.map((section) =>
                section.items.map((item, index) => {
                  const isSelected = selectedItem === item;
                  const isCurrent = isItemCurrent(item);
                  const label = t(item.nameKey);
                  const content = (
                    <>
                      <DockIcon
                        pointerY={pointerY}
                        disabled={!!reduceMotion}
                        className={cn(
                          railIconBase,
                          isOpen ? "h-9 w-9" : "h-8 w-12",
                          isSelected
                            ? railActiveClasses
                            : isCurrent
                              ? railCurrentClasses
                              : railInactiveClasses,
                        )}
                      >
                        {item.icon}
                      </DockIcon>
                      {isOpen && (
                        <span
                          className={cn(
                            railLabelClasses,
                            isSelected || isCurrent
                              ? "font-semibold text-gray-900 dark:text-white"
                              : "font-medium text-gray-500 group-hover:text-green-700 dark:text-gray-400 dark:group-hover:text-green-300",
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </>
                  );
                  const hasSubItems =
                    !!item.subItems && item.subItems.length > 0;
                  const itemKey = `${section.key}-${index}`;
                  return (
                    <Tooltip
                      key={itemKey}
                      open={!isOpen && tooltipKey === itemKey}
                      onOpenChange={(open) =>
                        setTooltipKey((current) =>
                          open ? itemKey : current === itemKey ? null : current,
                        )
                      }
                    >
                      <TooltipTrigger asChild>
                        {hasSubItems || !item.path ? (
                          <button
                            type="button"
                            aria-label={label}
                            onClick={() =>
                              handleRailClick(section.key, index, item)
                            }
                            className={cn(
                              railButtonBase,
                              isOpen
                                ? railButtonOpenClasses
                                : railButtonClosedClasses,
                              isSelected
                                ? railCardSelectedClasses
                                : railCardRestClasses,
                            )}
                          >
                            {content}
                          </button>
                        ) : (
                          <Link
                            to={item.path}
                            aria-label={label}
                            onClick={() =>
                              handleRailClick(section.key, index, item)
                            }
                            className={cn(
                              railButtonBase,
                              isOpen
                                ? railButtonOpenClasses
                                : railButtonClosedClasses,
                              isSelected
                                ? railCardSelectedClasses
                                : railCardRestClasses,
                            )}
                          >
                            {content}
                          </Link>
                        )}
                      </TooltipTrigger>
                      {/* Names are only hidden when closed.
                          Portalled: the rail scrolls, so it would clip it. */}
                      {!isOpen && (
                        <TooltipPrimitive.Portal>
                          <TooltipContent
                            side="right"
                            sideOffset={10}
                            className="z-70 rounded-lg border-0 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg dark:bg-gray-700"
                          >
                            {label}
                            <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-700" />
                          </TooltipContent>
                        </TooltipPrimitive.Portal>
                      )}
                    </Tooltip>
                  );
                }),
              )}
            </Fragment>
          ))}
        </TooltipProvider>
      </nav>
    </aside>
  );
};

export default AppSidebar;
