// Helpers for the Vehicle Status Dashboard. Components live in the .tsx
// files (react-refresh needs component files to export only components).

import { useEffect, useState } from "react";

import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import { buildVehicleTrackingUrl } from "@/config/gpsApiConfig";
import type { Tone } from "../dashboardUtils";
import type { CollectionType, GpsFix, VehicleState } from "./types";

export const STATE_TONE: Record<VehicleState, Tone> = {
  on_trip: "info",
  breakdown: "bad",
  scheduled: "warn",
  completed: "ok",
  idle: "neutral",
};

export const STATE_COLOR: Record<VehicleState, string> = {
  on_trip: "#2f72c9",
  breakdown: "#d63b3b",
  scheduled: "#d99a06",
  completed: "#1f9d47",
  idle: "#9ca3af",
};

export const COLLECTION_TYPES: CollectionType[] = [
  "bin_collection",
  "household_collection",
  "bulk_waste_collection",
];

export const STATUS_TONES: Record<string, Tone> = {
  Completed: "ok",
  "In Progress": "info",
  Scheduled: "warn",
  Cancelled: "bad",
  Pending: "warn",
  Approved: "ok",
  APPROVED: "ok",
  Rejected: "bad",
  REJECTED: "bad",
  Expired: "neutral",
  PENDING: "warn",
  REPORTED: "bad",
  REPLACEMENT_ARRANGED: "ok",
  ACKNOWLEDGED: "warn",
  RESOLVED: "ok",
};

/** "45 min" / "1 h 05 min". */
export const minutes = (value?: number | null) => {
  if (value === null || value === undefined) return "–";
  const abs = Math.abs(value);
  const text = abs >= 60 ? `${Math.floor(abs / 60)} h ${String(abs % 60).padStart(2, "0")} min` : `${abs} min`;
  return value < 0 ? `-${text}` : text;
};

/** Local wall-clock time of an ISO timestamp, "06:40". */
export const clock = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "–";

/* ---------- GPS ---------- */

const PLATE_PATTERN = /[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}/;

/** "TN 01 AB 1234" / "tn01ab1234-old" -> "TN01AB1234". Same matching rule as
 * the Vehicle Tracking page: GPS providers spell plates loosely. */
export const plateKey = (value?: string | null) => {
  const normalized = (value ?? "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  return normalized.match(PLATE_PATTERN)?.[0] ?? normalized;
};

export const findFix = (fixes: Map<string, GpsFix>, vehicleNo: string) => {
  const key = plateKey(vehicleNo);
  if (!key) return undefined;
  const exact = fixes.get(key);
  if (exact || key.length < 5) return exact;
  for (const [plate, fix] of fixes) {
    if (Math.abs(plate.length - key.length) <= 3 && (plate.startsWith(key) || key.startsWith(plate) || plate.endsWith(key) || key.endsWith(plate))) {
      return fix;
    }
  }
  return undefined;
};

const toFix = (r: Record<string, unknown>): GpsFix | null => {
  const lat = Number(r.latitude);
  const lng = Number(r.longitude);
  const plate = plateKey(String(r.vehicleNo ?? r.vehicle_number ?? r.regNo ?? ""));
  if (!plate || !Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  const speed = Number(r.speedKmph ?? r.speed ?? 0) || 0;
  const ignition = String(r.ignitionStatus ?? r.ignition ?? "").toUpperCase();
  const moving: GpsFix["moving"] =
    Number(r.noDataStatus) === 1
      ? "no_data"
      : speed > 2
        ? "running"
        : ignition === "OFF" || ignition === "0"
          ? "parked"
          : "idle";
  const location = String(r.location ?? r.address ?? r.lastLocation ?? r.last_location ?? "").trim();
  return {
    plate,
    lat,
    lng,
    speed,
    moving,
    updatedAt: String(r.updatedTime ?? r.lastComunicationTime ?? ""),
    location: location || undefined,
  };
};

const EMPTY_FIXES = new Map<string, GpsFix>();

/** Live positions from the selected project's GPS provider, polled every
 * `intervalMs`. `configured` is false when the project has no tracking API. */
export function useLiveGps(intervalMs = 20000) {
  const { gpsVehicleTrackingApi, gpsProviderName, gpsFcode } = useProjectSelector();
  const url = buildVehicleTrackingUrl({ providerName: gpsProviderName, fcode: gpsFcode }, gpsVehicleTrackingApi);
  // Keyed by the URL it came from, so switching project never shows the
  // previous project's positions.
  const [result, setResult] = useState<{ url: string; fixes: Map<string, GpsFix>; fetchedAt: Date } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const load = async () => {
      try {
        const json = await (await fetch(url)).json();
        const rows: Record<string, unknown>[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        const next = new Map<string, GpsFix>();
        rows.forEach((row) => {
          const fix = toFix(row);
          if (fix) next.set(fix.plate, fix);
        });
        if (!cancelled) {
          setResult({ url, fixes: next, fetchedAt: new Date() });
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [url, intervalMs]);

  const current = result && result.url === url ? result : null;
  return {
    fixes: current?.fixes ?? EMPTY_FIXES,
    configured: Boolean(url),
    failed: Boolean(url) && failed,
    fetchedAt: current?.fetchedAt ?? null,
  };
}
