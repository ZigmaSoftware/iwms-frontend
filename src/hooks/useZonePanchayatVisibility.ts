import { useEffect, useMemo, useState } from "react";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";
import { getStoredPanchayats, getStoredZones } from "@/utils/authStorage";
import { panchayatApi, zoneApi } from "@/helpers/admin";

const isSuperAdminSession = (): boolean => {
  if (typeof window === "undefined") return false;
  return normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY)) === "superadmin";
};

// Admin roles (Company Admin, Company Project Admin, ...) manage data
// beyond their personal scope — and an empty login scope means
// "unrestricted", not "nothing granted" (backend treats empty zone_ids /
// panchayat_ids as company-wide access). Gating their fields on a non-empty
// login list would hide Zone/Panchayat/Ward from exactly the users who need
// them, while superadmin (same empty scope) sees everything.
const isAdminLikeSession = (): boolean => {
  if (typeof window === "undefined") return false;
  const role = normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY));
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized.includes("admin");
};

const countRows = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  const results = (value as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? results.length : 0;
};

export type ZonePanchayatScope = {
  companyId?: string;
  projectId?: string;
};

/**
 * Zone and Panchayat are independent siblings under City — a staff may be
 * granted one, the other, both, or neither (e.g. a panchayat-only project
 * grants no Zone screen access at all, so calling the Zone API 403s at the
 * module-permission middleware). The login response already reflects
 * exactly what Staff Access Configuration assigned: show/fetch each field
 * only when its login-scoped list is non-empty. Superadmin isn't scoped,
 * so both are always shown/fetched for that role. Admin roles are treated
 * the same way — their empty scope means unrestricted, and the dropdown
 * fetches stay backend-scoped (plus allSettled-tolerant), so the gate only
 * controls field visibility, never data access.
 *
 * Pass the form's { companyId, projectId } scope to make visibility follow
 * the project instead: a project with zones but no panchayats shows only
 * Zone (and vice versa), in every form using this hook. While the probe is
 * pending — or when no project is selected yet — the role/scope fallback
 * above applies, so fields never flash hidden.
 *
 * Use this in any form with a Zone-or-Panchayat picker (Ward, Customer
 * Creation, Collection Point, Bin Load Log, Household Pickup Event,
 * Supervisor Zone Access Audit, ...) to decide both whether to call
 * zoneApi/panchayatApi at all, and whether to render the field.
 */
export const useZonePanchayatVisibility = (scope?: ZonePanchayatScope) => {
  const isSuperAdmin = useMemo(() => isSuperAdminSession(), []);
  const isAdminLike = useMemo(() => isAdminLikeSession(), []);

  const companyId = scope?.companyId || "";
  const projectId = scope?.projectId || "";
  const scopeKey = `${companyId}|${projectId}`;
  const [probe, setProbe] = useState<{
    key: string;
    zoneCount: number;
    panchayatCount: number;
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    const key = `${companyId}|${projectId}`;
    const params = {
      ...(companyId ? { company_id: companyId } : {}),
      project_id: projectId,
    };
    // allSettled: a 403 on either call (no screen access) resolves to []
    // instead of failing the other probe.
    Promise.allSettled([
      zoneApi.readAll({ params }),
      panchayatApi.readAll({ params }),
    ]).then(([zonesR, panchayatsR]) => {
      if (!active) return;
      setProbe({
        key,
        zoneCount: zonesR.status === "fulfilled" ? countRows(zonesR.value) : 0,
        panchayatCount:
          panchayatsR.status === "fulfilled" ? countRows(panchayatsR.value) : 0,
      });
    });
    return () => {
      active = false;
    };
  }, [companyId, projectId]);

  const fallbackZone =
    isSuperAdmin || isAdminLike || getStoredZones().length > 0;
  const fallbackPanchayat =
    isSuperAdmin || isAdminLike || getStoredPanchayats().length > 0;

  // A probe for a previous project is ignored via the key check (same as
  // unset) — no reset setState needed when the scope clears.
  const showZone =
    probe && probe.key === scopeKey ? probe.zoneCount > 0 : fallbackZone;
  const showPanchayat =
    probe && probe.key === scopeKey
      ? probe.panchayatCount > 0
      : fallbackPanchayat;

  return { showZone, showPanchayat, isSuperAdmin };
};
