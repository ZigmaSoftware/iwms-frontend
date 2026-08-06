/**
 * GPS API Configuration
 * Centralized configuration for all Vamosys GPS-related APIs
 */

// No hardcoded base URLs or auth params here — every value must come from
// the selected project's own GPS configuration (via ProjectSelectorContext).
// A project with a field left blank gets that field blank in the built URL,
// never a shared/hardcoded fallback.
export const GPS_API_CONFIG = {
  vehicleHistory: {
    defaultParams: { interval: "-1" },
  },
  vehicleTracking: {
    defaultParams: {},
  },
  tripSummary: {
    defaultParams: { duration: "0" },
  },
};

type QueryParams = Record<string, string | number | null | undefined>;

const compactParams = (params: QueryParams = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
  ) as Record<string, string | number>;

const mergeParams = (defaults: QueryParams, overrides?: QueryParams) => ({
  ...compactParams(defaults),
  ...compactParams(overrides),
});

export const buildUrlWithParams = (baseUrl: string, params: QueryParams): string => {
  const cleanParams = compactParams(params);
  if (!baseUrl) return "";

  try {
    const url = new URL(baseUrl);
    Object.entries(cleanParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  } catch {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(cleanParams).map(([key, value]) => [key, String(value)]))
    ).toString();
    if (!query) return baseUrl;
    return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query}`;
  }
};

/**
 * Build a complete vehicle history API URL with parameters
 * @param vehicleId - Vehicle ID
 * @param fromDateUTC - Start date in milliseconds
 * @param toDateUTC - End date in milliseconds
 * @param overrideParams - Override specific parameters
 * @param customBaseUrl - Use custom base URL instead of config
 */
export const buildVehicleHistoryUrl = (
  vehicleId: string,
  fromDateUTC: string | number,
  toDateUTC: string | number,
  overrideParams?: QueryParams,
  customBaseUrl?: string
): string => {
  const baseUrl = customBaseUrl ?? "";
  const params = mergeParams(GPS_API_CONFIG.vehicleHistory.defaultParams, {
    vehicleId,
    fromDateUTC: String(fromDateUTC),
    toDateUTC: String(toDateUTC),
    ...overrideParams,
  });

  return buildUrlWithParams(baseUrl, params);
};

/**
 * Build a complete vehicle tracking API URL
 * @param overrideParams - Override specific parameters
 * @param customBaseUrl - Use custom base URL instead of config
 */
export const buildVehicleTrackingUrl = (
  overrideParams?: QueryParams,
  customBaseUrl?: string
): string => {
  const baseUrl = customBaseUrl ?? "";
  const params = mergeParams(GPS_API_CONFIG.vehicleTracking.defaultParams, overrideParams);

  return buildUrlWithParams(baseUrl, params);
};

/**
 * Build a complete trip summary API URL
 * @param vehicleId - Vehicle ID
 * @param fromDateUTC - Start date in milliseconds
 * @param toDateUTC - End date in milliseconds
 * @param overrideParams - Override specific parameters
 * @param customBaseUrl - Use custom base URL instead of config
 */
export const buildTripSummaryUrl = (
  vehicleId: string,
  fromDateUTC: string | number,
  toDateUTC: string | number,
  overrideParams?: QueryParams,
  customBaseUrl?: string
): string => {
  const baseUrl = customBaseUrl ?? "";
  const params = mergeParams(GPS_API_CONFIG.tripSummary.defaultParams, {
    vehicleId,
    fromDateUTC: String(fromDateUTC),
    toDateUTC: String(toDateUTC),
    ...overrideParams,
  });

  return buildUrlWithParams(baseUrl, params);
};
