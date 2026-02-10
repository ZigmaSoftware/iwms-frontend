import type { ReactNode } from "react";

/* ========================
   Roles
======================== */

export type UserRole = "user" | "admin" | "superadmin";

export const USER_ROLE_STORAGE_KEY = "user_role";

export const ADMIN_ROLES = ["admin", "superadmin"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export const DEFAULT_ROLE: UserRole = "user";

/* ========================
   Layout Props
======================== */

interface LayoutChildren {
  children: ReactNode;
}

export interface AdminLayoutProps extends LayoutChildren {}
export interface DashboardLayoutProps extends LayoutChildren {}

export interface RoleBasedLayoutProps extends LayoutChildren {
  /**
   * Optional override useful for testing or forcing a role context.
   */
  roleOverride?: UserRole | null;
}

/* ========================
   Role Utils
======================== */

export function normalizeRole(
  role: string | null | undefined
): UserRole | null {
  if (!role) return null;

  const normalized = role.toLowerCase();
  if (normalized === "admin") return "admin";
  if (normalized === "superadmin") return "superadmin";

  return null;
}

export function isAdmin(role: UserRole | null | undefined): role is AdminRole {
  return role === "admin" || role === "superadmin";
}

/* ========================
   Admin View Mode
======================== */

export const ADMIN_VIEW_MODE_STORAGE_KEY = "admin_view_preference";
export const ADMIN_VIEW_MODE_ADMIN = "admin" as const;
export const ADMIN_VIEW_MODE_DASHBOARD = "dashboard" as const;

export type AdminViewMode =
  | typeof ADMIN_VIEW_MODE_ADMIN
  | typeof ADMIN_VIEW_MODE_DASHBOARD;

/* ========================
   Storage Helpers
======================== */

const isBrowser = () => typeof window !== "undefined";

const getAdminViewStorage = () => {
  if (!isBrowser()) return null;
  return localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY);
};

export function getAdminViewPreference(): AdminViewMode {
  const stored = getAdminViewStorage();
  return stored === ADMIN_VIEW_MODE_DASHBOARD
    ? ADMIN_VIEW_MODE_DASHBOARD
    : ADMIN_VIEW_MODE_ADMIN;
}

export function setAdminViewPreference(mode: AdminViewMode) {
  if (!isBrowser()) return;
  localStorage.setItem(ADMIN_VIEW_MODE_STORAGE_KEY, mode);
}

export function clearAdminViewPreference() {
  if (!isBrowser()) return;
  localStorage.removeItem(ADMIN_VIEW_MODE_STORAGE_KEY);
}
