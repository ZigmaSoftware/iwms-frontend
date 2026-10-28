/* =====================================================================
   Sidebar navigation state shared by the icon rail (AppSidebar) and the
   horizontal submenu bar (AdminSubNav): permission-filtered menus, route
   matching, and which rail icon is selected.
===================================================================== */
import { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { usePermission } from "@/contexts/PermissionContext";
import { useSidebar } from "@/contexts/SideBarContext";
import { decryptSegment } from "@/utils/routeCrypto";
import {
  MODULE_GROUPS,
  SIDEBAR_SECTIONS,
  type NavItem,
  type NavMatchable,
  type NavPermission,
  type SidebarSectionKey,
} from "@/layouts/admin/sidebarMenu";

export type SidebarSection = { key: SidebarSectionKey; items: NavItem[] };
export type RailSelection = { type: SidebarSectionKey; index: number };

// Helper: Check if user is superadmin
const isSuperAdminUser = (): boolean => {
  const roleFromStorage = localStorage.getItem("user_role");
  return roleFromStorage === "superadmin" || roleFromStorage === "super_admin";
};

// Nest flat sections under their top-level category group (SUPER ADMIN /
// MASTERS / CORE MODULES / REPORTS), in the exact order each group expects.
export const groupSections = (sections: SidebarSection[]) => {
  const sectionsByKey = new Map(
    sections.map((section) => [section.key, section]),
  );
  return MODULE_GROUPS.map((group) => ({
    key: group.key,
    titleKey: group.titleKey,
    accent: group.accent,
    sections: group.sectionKeys
      .map((key) => sectionsByKey.get(key))
      .filter(
        (section): section is SidebarSection =>
          !!section && section.items.length > 0,
      ),
  })).filter((group) => group.sections.length > 0);
};

/** Submenu links of an item; an item without submenus links to itself. */
export const panelLinks = (item: NavItem) =>
  item.subItems && item.subItems.length > 0
    ? item.subItems
    : item.path
      ? [{ ...item, path: item.path }]
      : [];

export function useSidebarNav() {
  const location = useLocation();
  const { hasPermission } = usePermission();
  const { railClick, setRailClick } = useSidebar();

  //  Detect if current user is superadmin
  const isSuperAdmin = useMemo(() => isSuperAdminUser(), []);

  // Check sidebar visibility using the read/view permission returned by login.
  const checkPermission = useCallback(
    (module: string | undefined, screen: string | undefined): boolean => {
      if (!module || !screen) return true;
      return hasPermission(module, screen, "view");
    },
    [hasPermission],
  );

  const checkSubItemPermission = useCallback(
    (entry: NavPermission): boolean => {
      if (!entry.module || !entry.screens?.length) return true;
      return entry.screens.some((screen) => checkPermission(entry.module, screen));
    },
    [checkPermission],
  );

  // Build sidebar sections with strict filtering
  const sidebarSections = useMemo((): SidebarSection[] => {
    // If superadmin, show ALL sections with ALL items
    if (isSuperAdmin) {
      return SIDEBAR_SECTIONS.filter((section) => section.items.length > 0);
    }

    // For regular users: hide superadmin-only items, keep only permitted
    // submenus, and drop menus left with nothing to show.
    return SIDEBAR_SECTIONS.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !item.superadminOnly)
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter((sub) => checkSubItemPermission(sub)),
        }))
        .filter((item) =>
          item.subItems
            ? item.subItems.length > 0
            : checkSubItemPermission(item),
        ),
    })).filter((section) => section.items.length > 0);
  }, [isSuperAdmin, checkSubItemPermission]);

  const railGroups = useMemo(
    () => groupSections(sidebarSections),
    [sidebarSections],
  );

  const currentDecodedPath = useMemo(() => {
    const [master, module] = location.pathname.split("/").filter(Boolean);
    return {
      master: decryptSegment(master || "") ?? null,
      module: decryptSegment(module || "") ?? null,
    };
  }, [location.pathname]);

  const isActive = useCallback(
    (path: string, allowNestedRoutes = false) => {
      if (!path) return false;

      const segments = path.split("/").filter(Boolean);
      const [encMaster, encModule] = segments;
      const decodedMaster = decryptSegment(encMaster || "");
      const decodedModule = decryptSegment(encModule || "");

      if (!decodedMaster && !decodedModule) {
        if (location.pathname === path) return true;
        return (
          allowNestedRoutes &&
          location.pathname.startsWith(path.endsWith("/") ? path : `${path}/`)
        );
      }

      if (decodedMaster !== currentDecodedPath.master) return false;
      if (!decodedModule) return true;

      if (currentDecodedPath.module === decodedModule) return true;
      return (
        allowNestedRoutes &&
        currentDecodedPath.module?.startsWith(decodedModule)
      );
    },
    [currentDecodedPath, location.pathname],
  );

  /** True when `entry`'s own route, or any route it fronts, is current. */
  const isEntryActive = useCallback(
    (entry: NavMatchable) =>
      (!!entry.path && isActive(entry.path, !entry.exact)) ||
      (entry.matchPaths?.some((candidate) => isActive(candidate, true)) ??
        false),
    [isActive],
  );

  /** True when the item or one of its submenu pages is the current route. */
  const isItemCurrent = useCallback(
    (item: NavItem) =>
      item.subItems && item.subItems.length > 0
        ? item.subItems.some((sub) => isEntryActive(sub))
        : isEntryActive(item),
    [isEntryActive],
  );

  // The rail icon that owns the current route.
  const routeSelection = useMemo(
    (): RailSelection | null =>
      sidebarSections
        .map((section) => ({
          type: section.key,
          index: section.items.findIndex((item) => isItemCurrent(item)),
        }))
        .find((selection) => selection.index !== -1) ?? null,
    [isItemCurrent, sidebarSections],
  );

  // A clicked icon wins until the route changes; then the route's icon is
  // selected, or the last one stays when the route has no sidebar entry.
  const selected = useMemo(
    () =>
      railClick && railClick.pathname === location.pathname
        ? railClick.selection
        : (routeSelection ?? railClick?.selection ?? null),
    [railClick, location.pathname, routeSelection],
  );

  const selectedItem = useMemo(() => {
    const fallback = sidebarSections[0]?.items[0];
    if (!selected) return fallback;
    const section = sidebarSections.find((s) => s.key === selected.type);
    return section?.items[selected.index] ?? fallback;
  }, [selected, sidebarSections]);

  const selectedGroupTitleKey = useMemo(() => {
    if (!selected) return railGroups[0]?.titleKey;
    return railGroups.find((group) =>
      group.sections.some((section) => section.key === selected.type),
    )?.titleKey;
  }, [selected, railGroups]);

  const select = useCallback(
    (type: SidebarSectionKey, index: number) =>
      setRailClick({ selection: { type, index }, pathname: location.pathname }),
    [location.pathname, setRailClick],
  );

  return {
    railGroups,
    isEntryActive,
    isItemCurrent,
    selectedItem,
    selectedGroupTitleKey,
    select,
  };
}
