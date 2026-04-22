import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import {
  getStoredPermissions,
  hasPermission as checkPermission,
  type PermissionsMap,
  type PermissionAction,
  fetchPermissionsFromAPI,
} from "@/utils/permissions";

type PermissionContextValue = {
  permissions: PermissionsMap;
  hasPermission: (moduleName: string, screenName: string, action?: PermissionAction) => boolean;
  updatePermissions: (permissions: PermissionsMap) => void;
  isLoading: boolean;
  lastVersion: number | null;
  /**
   * 🔹 TRUE if permissions are empty - indicates user has no module access
   * Show "No modules assigned" message, only dashboard accessible
   */
  isEmptyPermissions: boolean;
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const [permissions, setPermissions] = useState<PermissionsMap>(() =>
    getStoredPermissions()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastVersion, setLastVersion] = useState<number | null>(null);
  const [isEmptyPermissions, setIsEmptyPermissions] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  /**
   * 🔹 Fetch and update permissions from API
   * All users follow the same flow - no role-based special cases
   */
  const fetchAndUpdatePermissions = useCallback(async () => {
    try {
      // console.log("[PermissionContext] 📡 Fetching permissions from API...");
      const apiPermissions = await fetchPermissionsFromAPI();
      
      if (!isMountedRef.current) return;

      if (apiPermissions && Object.keys(apiPermissions).length > 0) {
        setPermissions(apiPermissions);
        setIsEmptyPermissions(false);
        // console.log("[PermissionContext] ✅ Permissions updated from API");
      } else {
        const storedPerms = getStoredPermissions();
        setPermissions(storedPerms);
        setIsEmptyPermissions(Object.keys(storedPerms).length === 0);
        // console.log(
        //   `[PermissionContext] ℹ️ Using stored permissions (isEmpty: ${Object.keys(storedPerms).length === 0})`
        // );
      }
    } catch (error) {
      // console.error("[PermissionContext] ❌ Failed to fetch permissions:", error);
      if (isMountedRef.current) {
        const storedPerms = getStoredPermissions();
        setPermissions(storedPerms);
        setIsEmptyPermissions(Object.keys(storedPerms).length === 0);
      }
    }
  }, []);

  /**
   * 🔹 Initialize permissions on mount
   */
  useEffect(() => {
    const initializePermissions = async () => {
      try {
        // console.log("[PermissionContext] 🚀 Initializing permissions");
        setIsLoading(true);
        await fetchAndUpdatePermissions();
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializePermissions();
  }, [fetchAndUpdatePermissions]);

  /**
   * 🔹 Setup polling interval (10 seconds) for permission updates
   * All users poll - no role-based exceptions
   */
  useEffect(() => {
    // console.log("[PermissionContext] ⏱️ Starting permission polling (10s interval)");

    pollingIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        // console.log("[PermissionContext] 🔄 Polling permissions...");
        fetchAndUpdatePermissions();
      }
    }, 10000); // 10 seconds

    return () => {
      if (pollingIntervalRef.current) {
        // console.log("[PermissionContext] ⏱️ Stopping permission polling");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [fetchAndUpdatePermissions]);

  /**
   * 🔹 Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // console.log("[PermissionContext] 🧹 Cleanup: component unmounted");
    };
  }, []);

  /**
   * 🔹 Sync permissions when localStorage changes (multi-tab scenarios)
   */
  const handleStorageChange = useCallback(() => {
    const updated = getStoredPermissions();
    // console.log("[PermissionContext] 📤 Storage sync - updating permissions");
    setPermissions(updated);
    setIsEmptyPermissions(Object.keys(updated).length === 0);
  }, []);

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);

  /**
   * 🔹 Allow explicit permission updates (useful for same-tab updates)
   */
  const updatePermissions = useCallback((newPermissions: PermissionsMap) => {
    // console.log("[PermissionContext] 🔄 Explicit permission update");
    setPermissions(newPermissions);
    setIsEmptyPermissions(Object.keys(newPermissions).length === 0);
  }, []);

  /**
   * 🔹 Check if user has permission
   * Dashboard always accessible, all other access based on permissions
   */
  const hasPermission = (
    moduleName: string,
    screenName: string,
    action: PermissionAction = "view"
  ): boolean => {
    // ✅ Dashboard always accessible
    if (moduleName?.toLowerCase() === "dashboard") {
      return true;
    }

    // Check permission against the stored permissions map
    const result = checkPermission(moduleName, screenName, action, permissions);
    // console.log(
    //   `[PermissionContext] hasPermission(${moduleName}/${screenName}/${action}): ${result}`
    // );
    return result;
  };

  return (
    <PermissionContext.Provider 
      value={{ permissions, hasPermission, updatePermissions, isLoading, lastVersion, isEmptyPermissions }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermission must be used within PermissionProvider");
  }
  return ctx;
};

/**
 * 🔹 Hook to check if user should be redirected to dashboard
 * Returns true if permissions are empty (user has no module access)
 * Used in route protection and sidebar rendering
 */
export const useShouldRedirectToDashboard = () => {
  const { isEmptyPermissions, isLoading } = usePermission();
  return {
    shouldRedirect: isEmptyPermissions,
    isLoading,
  };
};