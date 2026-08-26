import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DetourWaypoint, RouteStop, StaticRoute } from "./types";

const STOP_COLOR: Record<RouteStop["type"], string> = {
  start: "#16a34a",
  collection_point: "#2563eb",
  dump_yard: "#dc2626",
};

const STOP_ICON: Record<RouteStop["type"], string> = {
  start: "🚛",
  collection_point: "",
  dump_yard: "🗑️",
};

// One color per route when several routes render together ("all routes"
// mode). A single route always uses ROUTE_LINE_COLORS[0] to match the
// legend's static blue.
const ROUTE_LINE_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#db2777",
  "#16a34a",
  "#4f46e5",
  "#ca8a04",
];

function binCountFor(stop: RouteStop): number {
  const bins = stop.details?.Bins;
  if (!bins) return 0;
  return bins.split(",").filter((entry) => entry.trim()).length;
}

function stopMarkerHtml(stop: RouteStop, lineColor: string) {
  const color = stop.type === "collection_point" ? lineColor : STOP_COLOR[stop.type];
  const icon = STOP_ICON[stop.type];
  const content = icon || String(stop.order);
  const binCount = binCountFor(stop);
  const badge =
    binCount > 1
      ? `<div style="position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;padding:0 3px;border-radius:9999px;background:#111827;border:2px solid white;color:white;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center">${binCount}</div>`
      : "";
  return `<div style="position:relative;width:30px;height:30px">
      <div style="width:30px;height:30px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 7px #0005;color:white;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${content}</div>
      ${badge}
    </div>`;
}

function stopPopupHtml(stop: RouteStop, routeName?: string) {
  const bins = stop.details?.Bins;
  const binRows = bins
    ? `<div style="margin-top:4px"><span style="color:#6b7280">Bins:</span><ul style="margin:2px 0 0;padding-left:16px">${bins
        .split(",")
        .map((entry) => `<li>${entry.trim()}</li>`)
        .join("")}</ul></div>`
    : "";
  const otherDetailRows = Object.entries(stop.details ?? {})
    .filter(([key]) => key !== "Bins")
    .map(([key, value]) => `<div><span style="color:#6b7280">${key}:</span> ${value}</div>`)
    .join("");
  return `
    <div style="font-size:12px;min-width:160px">
      ${routeName ? `<div style="color:#6b7280;font-size:11px;margin-bottom:2px">${routeName}</div>` : ""}
      <div style="font-weight:700;font-size:13px;margin-bottom:2px">${stop.order}. ${stop.label}</div>
      <div style="color:#6b7280;margin-bottom:4px">${stop.type.replace("_", " ")}</div>
      ${otherDetailRows}
      ${binRows}
    </div>
  `;
}

function waypointMarkerHtml() {
  return `<div style="width:16px;height:16px;transform:rotate(45deg);background:#f59e0b;border:2px solid white;box-shadow:0 1px 4px #0006"></div>`;
}

function vehicleMarkerHtml() {
  return `<div style="width:32px;height:32px;border-radius:9999px;background:#111827;border:3px solid white;box-shadow:0 2px 8px #0007;display:flex;align-items:center;justify-content:center;font-size:16px">🚛</div>`;
}

interface StaticRouteMapViewProps {
  routes: StaticRoute[];
  className?: string;
  onRouteClick?: (route: StaticRoute) => void;
  waypoints?: DetourWaypoint[];
  editable?: boolean;
  onMapClick?: (latitude: number, longitude: number) => void;
  onWaypointRemove?: (waypointId: string) => void;
  onWaypointDrag?: (waypointId: string, latitude: number, longitude: number) => void;
  animatedVehiclePosition?: { latitude: number; longitude: number } | null;
}

export default function StaticRouteMapView({
  routes,
  className,
  onRouteClick,
  waypoints,
  editable,
  onMapClick,
  onWaypointRemove,
  onWaypointDrag,
  animatedVehiclePosition,
}: StaticRouteMapViewProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapElement.current) return;
    mapRef.current?.remove();

    const map = L.map(mapElement.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    if (onMapClick) {
      map.on("click", (event: L.LeafletMouseEvent) => {
        onMapClick(event.latlng.lat, event.latlng.lng);
      });
    }

    const latLngs: L.LatLng[] = [];
    const showRouteName = routes.length > 1;

    routes.forEach((route, routeIndex) => {
      const lineColor = ROUTE_LINE_COLORS[routeIndex % ROUTE_LINE_COLORS.length];
      const orderedStops = [...route.stops].sort((a, b) => a.order - b.order);

      L.geoJSON(route.geometry, {
        style: { color: "#ffffff", weight: 9, opacity: 0.9 },
      }).addTo(map);
      const lineLayer = L.geoJSON(route.geometry, {
        style: { color: lineColor, weight: 5, opacity: 0.9 },
      }).addTo(map);
      if (onRouteClick) {
        lineLayer.on("click", () => onRouteClick(route));
        if (showRouteName) lineLayer.bindTooltip(route.name);
      }

      orderedStops.forEach((stop) => {
        const latLng = L.latLng(stop.latitude, stop.longitude);
        latLngs.push(latLng);
        L.marker(latLng, {
          icon: L.divIcon({
            className: "",
            html: stopMarkerHtml(stop, lineColor),
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          }),
        })
          .bindPopup(stopPopupHtml(stop, showRouteName ? route.name : undefined))
          .bindTooltip(
            `${stop.order}. ${stop.label}${binCountFor(stop) > 1 ? ` (${binCountFor(stop)} bins)` : ""}`,
            { direction: "top", offset: [0, -14] },
          )
          .on("click", () => onRouteClick?.(route))
          .addTo(map);
      });
    });

    (waypoints ?? []).forEach((waypoint) => {
      const latLng = L.latLng(waypoint.latitude, waypoint.longitude);
      latLngs.push(latLng);
      const marker = L.marker(latLng, {
        icon: L.divIcon({
          className: "",
          html: waypointMarkerHtml(),
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
        draggable: Boolean(editable && onWaypointDrag),
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-size:12px;min-width:140px">
          <div style="font-weight:700;margin-bottom:4px">Detour point</div>
          ${
            editable && onWaypointRemove
              ? `<button type="button" data-waypoint-remove="${waypoint.id}" style="color:#dc2626;font-weight:600;cursor:pointer;background:none;border:none;padding:0">Remove</button>`
              : ""
          }
        </div>
      `);

      if (editable && onWaypointRemove) {
        marker.on("popupopen", (event: L.PopupEvent) => {
          const button = event.popup
            .getElement()
            ?.querySelector<HTMLButtonElement>(`[data-waypoint-remove="${waypoint.id}"]`);
          button?.addEventListener("click", () => onWaypointRemove(waypoint.id));
        });
      }

      if (editable && onWaypointDrag) {
        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onWaypointDrag(waypoint.id, position.lat, position.lng);
        });
      }
    });

    if (latLngs.length) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [32, 32] });
    } else {
      map.setView([10.7867, 76.6548], 8);
    }

    mapRef.current = map;
    vehicleMarkerRef.current = null;

    // Leaflet measures the container once at creation. If the surrounding
    // layout (e.g. the play/pause bar or route panel) resizes it afterward,
    // the tile grid goes stale and tiles stop rendering even though
    // overlays keep drawing fine. Keep it in sync for the container's
    // lifetime — but only when the size actually changed and no zoom
    // animation is in flight, since invalidateSize() resets the view and
    // would otherwise cancel an in-progress zoom-button click.
    let lastObservedSize = map.getSize();
    const resizeObserver = new ResizeObserver(() => {
      if (!mapElement.current) return;
      const nextSize = L.point(mapElement.current.clientWidth, mapElement.current.clientHeight);
      if (nextSize.equals(lastObservedSize)) return;
      lastObservedSize = nextSize;
      if ((map as unknown as { _animatingZoom?: boolean })._animatingZoom) return;
      map.invalidateSize({ animate: false, pan: false });
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      vehicleMarkerRef.current = null;
    };
  }, [routes, onRouteClick, waypoints, editable, onMapClick, onWaypointRemove, onWaypointDrag]);

  // Separate from the main effect above: animation playback updates this
  // position ~60x/second, and re-running the whole map-build effect that
  // often would tear down/recreate every layer and thrash performance.
  // Moving one marker via setLatLng keeps it smooth.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!animatedVehiclePosition) {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      return;
    }

    const latLng = L.latLng(animatedVehiclePosition.latitude, animatedVehiclePosition.longitude);
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng(latLng);
    } else {
      vehicleMarkerRef.current = L.marker(latLng, {
        icon: L.divIcon({
          className: "",
          html: vehicleMarkerHtml(),
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        }),
        zIndexOffset: 1000,
      }).addTo(map);
    }
  }, [animatedVehiclePosition]);

  return <div ref={mapElement} className={className ?? "h-full w-full"} />;
}
