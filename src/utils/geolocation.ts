/**
 * Browser geolocation helper used to auto-detect the current coordinates
 * for forms that need a latitude/longitude capture (e.g. site surveys,
 * asset registration). Wraps navigator.geolocation.getCurrentPosition in a
 * Promise with sensible accuracy/timeout defaults and readable error
 * messages so callers can surface failures directly in the UI.
 */

export type DetectedCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 30_000,
};

const describeGeolocationError = (error: GeolocationPositionError): string => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Allow location access in your browser and try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your current location is unavailable. Check your device location settings and try again.";
    case error.TIMEOUT:
      return "Location detection timed out. Please try again.";
    default:
      return "Unable to detect your current location.";
  }
};

/**
 * Detects the device's current coordinates using the browser Geolocation
 * API. Latitude/longitude are rounded to `decimalPlaces` (default 7, i.e.
 * sub-meter precision) while accuracy (meters) is returned as reported by
 * the browser, or null if the browser did not provide a finite value.
 *
 * Rejects with an Error carrying a human-readable message for:
 * - browsers without geolocation support
 * - PERMISSION_DENIED
 * - POSITION_UNAVAILABLE
 * - TIMEOUT
 */
export const detectCurrentCoordinates = (
  decimalPlaces = 7,
): Promise<DetectedCoordinates> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location detection is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const round = (value: number) => Number(value.toFixed(decimalPlaces));
        resolve({
          latitude: round(position.coords.latitude),
          longitude: round(position.coords.longitude),
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        });
      },
      (error) => reject(new Error(describeGeolocationError(error))),
      GEOLOCATION_OPTIONS,
    );
  });
