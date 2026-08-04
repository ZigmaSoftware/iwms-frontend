/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import type { AxiosRequestConfig } from "axios";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";
import {
  getStoredCities,
  getStoredContinents,
  getStoredCountries,
  getStoredDistricts,
  getStoredPanchayats,
  getStoredStates,
  getStoredWards,
  getStoredZones,
  type LocationConfig,
} from "@/utils/authStorage";
import type { CrudHelpers } from "@/helpers/admin/crudHelpers";

export type LocationOption = {
  value: string;
  label: string;
};

const toOption = (entry: LocationConfig): LocationOption => ({
  value: entry.unique_id,
  label:
    entry.name ?? entry.zone_name ?? entry.panchayat_name ?? entry.ward_name ?? "",
});

const readIsSuperAdmin = (): boolean => {
  if (typeof window === "undefined") return false;
  return normalizeRole(localStorage.getItem(USER_ROLE_STORAGE_KEY)) === "superadmin";
};

/**
 * Options for one location level (continent/country/state/district/city/
 * zone/panchayat/ward), scoped to the logged-in staff's Staff Access
 * Configuration — mirrors useCompanyProjectSelection's convention: non-
 * superadmin reads the list login already scoped and stored in
 * authStorage; superadmin (or an empty scoped list, e.g. legacy session)
 * falls back to the live API, which is unscoped by design for admins.
 */
export const useScopedLocationOptions = (
  getStored: () => LocationConfig[],
  api: Pick<CrudHelpers, "readAllForExport">,
  apiParams?: AxiosRequestConfig,
) => {
  const isSuperAdmin = useMemo(readIsSuperAdmin, []);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      const stored = getStored();
      if (stored.length > 0) {
        setOptions(stored.map(toOption));
        setLoaded(true);
        return;
      }
    }

    let active = true;
    setLoaded(false);

    api
      .readAllForExport(apiParams)
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setOptions(
          list.map((row) =>
            toOption(row as unknown as LocationConfig),
          ),
        );
      })
      .catch(() => {
        if (!active) return;
        setOptions([]);
      })
      .finally(() => {
        if (!active) return;
        setLoaded(true);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, JSON.stringify(apiParams ?? {})]);

  // Single assigned option: auto-select/prefill it, same convention as the
  // single-project case in useCompanyProjectSelection — never leave a form
  // on an empty/"All" selection when the staff only has one choice.
  const singleValue = !isSuperAdmin && options.length === 1 ? options[0].value : "";

  return { options, loaded, isSuperAdmin, singleValue };
};

export const useScopedContinents = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredContinents, api);

export const useScopedCountries = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredCountries, api);

export const useScopedStates = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredStates, api);

export const useScopedDistricts = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredDistricts, api);

export const useScopedCities = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredCities, api);

export const useScopedZones = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredZones, api);

export const useScopedPanchayats = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredPanchayats, api);

export const useScopedWards = (api: Pick<CrudHelpers, "readAllForExport">) =>
  useScopedLocationOptions(getStoredWards, api);
