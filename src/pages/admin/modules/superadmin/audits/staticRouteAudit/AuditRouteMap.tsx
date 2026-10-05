import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteChanges, RouteSnapshot } from "./types";

type AuditStop = RouteSnapshot["stops"][number];
type AuditDetour = RouteSnapshot["detour_waypoints"][number];

function orderedStops(route?: RouteSnapshot | null): AuditStop[] {
  return [...(route?.stops ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function orderedDetours(route?: RouteSnapshot | null): AuditDetour[] {
  return [...(route?.detour_waypoints ?? [])].sort((a, b) =>
    a.after_stop_id === b.after_stop_id
      ? (a.sequence ?? 0) - (b.sequence ?? 0)
      : a.after_stop_id.localeCompare(b.after_stop_id),
  );
}

/** Stop order with each leg's detours spliced in after the stop the leg
 *  starts from — mirrors the backend's _routing_points. */
function routingLatLngs(route?: RouteSnapshot | null): Array<[number, number]> {
  if (!route) return [];
  const byStop = new Map<string, AuditDetour[]>();
  for (const d of orderedDetours(route)) {
    const list = byStop.get(d.after_stop_id) ?? [];
    list.push(d);
    byStop.set(d.after_stop_id, list);
  }
  const points: Array<[number, number]> = [];
  for (const stop of orderedStops(route)) {
    points.push([stop.latitude, stop.longitude]);
    for (const d of byStop.get(stop.id) ?? []) points.push([d.latitude, d.longitude]);
  }
  return points;
}

function geometryFor(route?: RouteSnapshot | null): GeoJSON.GeoJsonObject | null {
  if (!route) return null;
  if (route.route_geojson) return route.route_geojson as GeoJSON.GeoJsonObject;
  const latLngs = routingLatLngs(route);
  if (latLngs.length < 2) return null;
  const line: GeoJSON.LineString = {
    type: "LineString",
    coordinates: latLngs.map(([lat, lng]) => [lng, lat]),
  };
  return line;
}

function dotHtml(label: string, background: string, dashed = false): string {
  return `<div style="width:26px;height:26px;border-radius:9999px;background:${background};border:3px solid white;${dashed ? "outline:2px dashed #6b7280;outline-offset:1px;" : ""}box-shadow:0 2px 7px #0005;color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">${label}</div>`;
}

function diamondHtml(background: string): string {
  return `<div style="width:14px;height:14px;transform:rotate(45deg);background:${background};border:2px solid white;box-shadow:0 1px 4px #0006"></div>`;
}

export default function AuditRouteMap({
  previous,
  current,
  changes,
  showPrevious = true,
  showNew = true,
  className,
}: {
  previous?: RouteSnapshot | null;
  current?: RouteSnapshot | null;
  changes?: RouteChanges | null;
  showPrevious?: boolean;
  showNew?: boolean;
  className?: string;
}) {
  const mapElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElement.current) return;

    const map = L.map(mapElement.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const addedIds = new Set((changes?.stops_added ?? []).map((s) => s.id));
    const removedIds = new Set((changes?.stops_removed ?? []).map((s) => s.id));
    const movedIds = new Set((changes?.stops_moved ?? []).map((s) => s.id));

    const bounds: L.LatLng[] = [];

    const drawRoute = (
      route: RouteSnapshot | null | undefined,
      opts: {
        lineColor: string;
        haloColor: string;
        dash?: string;
        stopColor: (stop: AuditStop) => string;
        stopDashed: (stop: AuditStop) => boolean;
        detourColor: string;
        tag: string;
      },
    ) => {
      if (!route) return;
      const geometry = geometryFor(route);
      if (geometry) {
        L.geoJSON(geometry, { style: { color: opts.haloColor, weight: 8, opacity: 0.85 } }).addTo(map);
        L.geoJSON(geometry, {
          style: { color: opts.lineColor, weight: 4, opacity: 0.95, dashArray: opts.dash },
        }).addTo(map);
      } else {
        // No stored road path and too few points for a line — still show
        // the stops so the deviation is visible.
        const latLngs = routingLatLngs(route);
        if (latLngs.length >= 2) {
          L.polyline(latLngs.map(([lat, lng]) => L.latLng(lat, lng)), {
            color: opts.lineColor,
            weight: 4,
            dashArray: "6 8",
          }).addTo(map);
        }
      }

      for (const stop of orderedStops(route)) {
        if (stop.type === "plant") continue;
        const latLng = L.latLng(stop.latitude, stop.longitude);
        bounds.push(latLng);
        const background = opts.stopColor(stop);
        L.marker(latLng, {
          icon: L.divIcon({
            className: "",
            html: dotHtml(String(stop.order ?? "•"), background, opts.stopDashed(stop)),
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }),
        })
          .bindTooltip(`${opts.tag} #${stop.order ?? "-"} ${stop.label || stop.id}`, {
            direction: "top",
            offset: [0, -12],
          })
          .bindPopup(
            `<div style="font-size:12px;min-width:160px"><div style="color:#6b7280;font-size:11px">${opts.tag}</div>` +
              `<div style="font-weight:700">${stop.order ?? "-"} ${stop.label || stop.id}</div>` +
              `<div style="color:#6b7280">${stop.type ?? ""} · ${Number(stop.latitude).toFixed(5)}, ${Number(stop.longitude).toFixed(5)}</div></div>`,
          )
          .addTo(map);
      }

      for (const d of orderedDetours(route)) {
        const latLng = L.latLng(d.latitude, d.longitude);
        bounds.push(latLng);
        L.marker(latLng, {
          icon: L.divIcon({
            className: "",
            html: diamondHtml(opts.detourColor),
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        })
          .bindTooltip(`${opts.tag} detour · leg ${d.after_stop_id}`, { direction: "top", offset: [0, -8] })
          .addTo(map);
      }
    };

    if (showPrevious) {
      drawRoute(previous, {
        lineColor: "#9ca3af",
        haloColor: "#ffffff",
        dash: "8 6",
        stopColor: (s) => (removedIds.has(s.id) ? "#dc2626" : movedIds.has(s.id) ? "#d97706" : "#9ca3af"),
        stopDashed: () => true,
        detourColor: "#9ca3af",
        tag: "Previous",
      });
    }

    if (showNew) {
      drawRoute(current, {
        lineColor: "#2563eb",
        haloColor: "#ffffff",
        stopColor: (s) => (addedIds.has(s.id) ? "#16a34a" : movedIds.has(s.id) ? "#d97706" : "#2563eb"),
        stopDashed: () => false,
        detourColor: "#f59e0b",
        tag: "New",
      });
    }

    if (bounds.length) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [32, 32] });
    } else {
      map.setView([10.7867, 76.6548], 8);
    }

    // The dialog animates open, so the container's first measurement can
    // be stale — refresh once it's settled.
    const settled = window.setTimeout(() => map.invalidateSize({ animate: false, pan: false }), 250);
    let lastSize = map.getSize();
    const observer = new ResizeObserver(() => {
      if (!mapElement.current) return;
      const next = L.point(mapElement.current.clientWidth, mapElement.current.clientHeight);
      if (next.equals(lastSize)) return;
      lastSize = next;
      map.invalidateSize({ animate: false, pan: false });
    });
    observer.observe(mapElement.current);

    return () => {
      window.clearTimeout(settled);
      observer.disconnect();
      map.remove();
    };
  }, [previous, current, changes, showPrevious, showNew]);

  return (
    <div className={`relative ${className ?? "h-[380px] w-full"}`}>
      <div ref={mapElement} className="h-full w-full rounded-lg border border-gray-200" />
      <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-[11px] shadow">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded bg-gray-400" style={{ borderTop: "3px dashed #9ca3af" }} />
          Previous route
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-1 w-6 rounded bg-blue-600" />
          New route
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-green-600" /> added
          <span className="inline-block h-3 w-3 rounded-full bg-red-600" /> removed
          <span className="inline-block h-3 w-3 rounded-full bg-amber-600" /> moved
        </div>
      </div>
    </div>
  );
}
