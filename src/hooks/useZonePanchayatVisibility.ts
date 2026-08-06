import { useMemo } from "react";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";
import { getStoredPanchayats, getStoredZones } from "@/utils/authStorage";

const isSuperAdminSession = (): boolean => {
  if (typeof window === "undefined") return false;
  return normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY)) === "superadmin";
};

/**
 * Zone and Panchayat are independent siblings under City — a staff may be
 * granted one, the other, both, or neither (e.g. a panchayat-only project
 * grants no Zone screen access at all, so calling the Zone API 403s at the
 * module-permission middleware). The login response already reflects
 * exactly what Staff Access Configuration assigned: show/fetch each field
 * only when its login-scoped list is non-empty. Superadmin isn't scoped,
 * so both are always shown/fetched for that role.
 *
 * Use this in any form with a Zone-or-Panchayat picker (Ward, Customer
 * Creation, Collection Point, Bin Load Log, Household Pickup Event,
 * Supervisor Zone Access Audit, ...) to decide both whether to call
 * zoneApi/panchayatApi at all, and whether to render the field.
 */
export const useZonePanchayatVisibility = () => {
  const isSuperAdmin = useMemo(isSuperAdminSession, []);
  const showZone = useMemo(
    () => isSuperAdmin || getStoredZones().length > 0,
    [isSuperAdmin],
  );
  const showPanchayat = useMemo(
    () => isSuperAdmin || getStoredPanchayats().length > 0,
    [isSuperAdmin],
  );

  return { showZone, showPanchayat, isSuperAdmin };
};
