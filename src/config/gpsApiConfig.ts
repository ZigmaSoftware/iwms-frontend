/**
 * GPS API Configuration
 * Centralized configuration for all Vamosys GPS-related APIs
 */

export const GPS_API_CONFIG = {
  // Vehicle History API
  vehicleHistory: {
    baseUrl: import.meta.env.VITE_GPS_VEHICLE_HISTORY_API || "https://api.vamosys.com/getVehicleHistory",
    defaultParams: {
      userId: import.meta.env.VITE_GPS_USER_ID || "BLUEPLANET",
      groupName: import.meta.env.VITE_GPS_GROUP_NAME || "BLUEPLANET:VAM",
      interval: "-1",
    },
  },

  // Vehicle Tracking API
  vehicleTracking: {
    baseUrl: import.meta.env.VITE_GPS_VEHICLE_TRACKING_API || "https://api.vamosys.com/mobile/getGrpDataForTrustedClients",
    defaultParams: {
      providerName: import.meta.env.VITE_GPS_PROVIDER_NAME || "BLUEPLANET",
      fcode: import.meta.env.VITE_GPS_FCODE || "VAM",
    },
  },

  // Trip Summary API
  tripSummary: {
    baseUrl: import.meta.env.VITE_GPS_TRIP_SUMMARY_API || "https://gpsvtsprobend.vamosys.com/v2/getTripSummary",
    defaultParams: {
      userId: import.meta.env.VITE_GPS_TRIP_USER_ID || "NMCP2DISPOSAL",
      duration: "0",
    },
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
  const baseUrl = customBaseUrl || GPS_API_CONFIG.vehicleHistory.baseUrl;
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
  const baseUrl = customBaseUrl || GPS_API_CONFIG.vehicleTracking.baseUrl;
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
  const baseUrl = customBaseUrl || GPS_API_CONFIG.tripSummary.baseUrl;
  const params = mergeParams(GPS_API_CONFIG.tripSummary.defaultParams, {
    vehicleId,
    fromDateUTC: String(fromDateUTC),
    toDateUTC: String(toDateUTC),
    ...overrideParams,
  });

  return buildUrlWithParams(baseUrl, params);
};
