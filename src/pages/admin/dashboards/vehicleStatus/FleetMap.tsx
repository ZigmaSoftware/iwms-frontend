import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { addMapLayerSwitcher } from "@/components/map/MapLayerSwitcher";
import "./FleetMap.css";

export type MapPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  color: string;
  /** Live GPS fix (solid) or the last geotagged event of the day (hollow). */
  live: boolean;
  detail?: string;
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** A truck in a circle of the vehicle's state colour, pulsing when selected —
 * the Vehicle Tracking page's marker. */
const truckIcon = (color: string, live: boolean, focused: boolean) => {
  const size = focused ? 42 : 34;
  return L.divIcon({
    className: "vs-marker",
    html: `
      <div class="vs-vehicle-icon${live ? "" : " stale"}${focused ? " focused" : ""}" style="--accent:${color}">
        ${focused ? '<span class="vs-vehicle-pulse"></span>' : ""}
        <span class="vs-vehicle-emoji">🚚</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/** Vehicles as truck markers. Refits only when the set of vehicles changes,
 * so a position poll does not yank the view away from where the user is. */
export function FleetMap({
  points,
  selectedId,
  onSelect,
  height = 380,
}: {
  points: MapPoint[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fitKeyRef = useRef("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!divRef.current) return;
    const map = L.map(divRef.current, { scrollWheelZoom: false }).setView([11.0, 78.0], 7);
    addMapLayerSwitcher(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      fitKeyRef.current = "";
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    points.forEach((p) => {
      const selected = p.id === selectedId;
      const marker = L.marker([p.lat, p.lng], {
        icon: truckIcon(p.color, p.live, selected),
        zIndexOffset: selected ? 1000 : 0,
        keyboard: true,
        title: p.label,
      })
        .bindTooltip(escapeHtml(p.label), { direction: "top", offset: [0, selected ? -22 : -18] })
        .bindPopup(
          `<strong>${escapeHtml(p.label)}</strong>${p.detail ? `<br/>${escapeHtml(p.detail)}` : ""}`,
        )
        .on("click", () => onSelectRef.current?.(p.id));
      marker.addTo(layer);
    });

    const key = points.map((p) => p.id).sort().join("|");
    if (key && key !== fitKeyRef.current) {
      fitKeyRef.current = key;
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }, [points, selectedId]);

  // Pan to the selected vehicle.
  useEffect(() => {
    const point = points.find((p) => p.id === selectedId);
    if (point && mapRef.current) mapRef.current.panTo([point.lat, point.lng]);
    // Only when the selection changes, not on every position poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={divRef} style={{ height }} className="z-0 w-full overflow-hidden rounded-lg" />;
}
