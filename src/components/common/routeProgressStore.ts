/* Pending in-app navigation, shared by RouteProgress (which shows the
   loader) and menus that navigate programmatically. */
let pendingPath: string | null = null;
const listeners = new Set<() => void>();

export const setPendingRoute = (path: string | null) => {
  if (pendingPath === path) return;
  pendingPath = path;
  listeners.forEach((listener) => listener());
};

export const subscribePendingRoute = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const currentPath = () => window.location.pathname + window.location.search;

/** Mark a programmatic navigation (navigate(path)) as pending. */
export function startRouteProgress(path: string) {
  if (path !== currentPath()) setPendingRoute(path);
}

export const getPendingRoute = () => pendingPath;
