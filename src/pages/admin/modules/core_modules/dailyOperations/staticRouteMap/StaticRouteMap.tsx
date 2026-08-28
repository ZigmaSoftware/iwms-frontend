import { useEffect, useState } from "react";
import StaticRouteMapView from "./StaticRouteMapView";
import { useStaticRoutes } from "./useStaticRoutes";
import { useRouteDetourEditor } from "./useRouteDetourEditor";
import { useRouteAnimation } from "./useRouteAnimation";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { dailyTripAssignmentApi } from "@/helpers/admin";
import { normalizeList } from "@/utils/forms";
import type { RouteStop, StaticRoute } from "./types";

const SPEED_OPTIONS = [1, 2, 4] as const;

// Which leg (the two consecutive stops) a click point falls closest to,
// by nearest point-to-segment distance in plain lat/lng space — good
// enough at city scale to pick the right leg to detour.
function nearestLegStartStop(stops: RouteStop[], latitude: number, longitude: number): RouteStop | null {
  const ordered = [...stops].sort((a, b) => a.order - b.order);
  if (ordered.length < 2) return null;

  let closest: { stop: RouteStop; distance: number } | null = null;
  for (let i = 0; i < ordered.length - 1; i++) {
    const a = ordered[i];
    const b = ordered[i + 1];
    const dx = b.longitude - a.longitude;
    const dy = b.latitude - a.latitude;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((longitude - a.longitude) * dx + (latitude - a.latitude) * dy) / lengthSquared));
    const projX = a.longitude + t * dx;
    const projY = a.latitude + t * dy;
    const distance = Math.hypot(longitude - projX, latitude - projY);
    if (!closest || distance < closest.distance) {
      closest = { stop: a, distance };
    }
  }
  return closest?.stop ?? null;
}

const LEGEND: Array<{ label: string; color: string }> = [
  { label: "Start", color: "#16a34a" },
  { label: "Collection Point", color: "#2563eb" },
  { label: "Plant", color: "#dc2626" },
];

export default function StaticRouteMap() {
  const { companyUniqueId, projectId, companies, projects, setProjectId, onCompanyChange } =
    useCompanyProjectSelection({ isEdit: false });

  const [date, setDate] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [assignments, setAssignments] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedRoute, setSelectedRoute] = useState<StaticRoute | null>(null);
  const [sequencePanelOpen, setSequencePanelOpen] = useState(true);

  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      return;
    }
    const params: Record<string, string> = { company_id: companyUniqueId, project_id: projectId };
    if (date) params.date = date;
    let active = true;
    void dailyTripAssignmentApi.readAll({ params }).then((result) => {
      if (!active) return;
      setAssignments(
        (normalizeList(result) as Record<string, unknown>[]).map((item) => ({
          value: String(item.unique_id ?? ""),
          label: `${String(item.unique_id ?? "")}${item.trip_date ? ` | ${String(item.trip_date)}` : ""}`,
        })),
      );
    });
    return () => {
      active = false;
    };
  }, [companyUniqueId, projectId, date]);

  const { routes, detourWaypoints, loading, refresh } = useStaticRoutes({
    companyId: companyUniqueId,
    projectId,
    date,
    tripAssignmentId: assignmentId,
  });

  const detourEditor = useRouteDetourEditor({
    tripAssignmentId: assignmentId,
    onChanged: refresh,
  });

  const [hiddenWaypointIds, setHiddenWaypointIds] = useState<Set<string>>(new Set());

  const isAllRoutesMode = !assignmentId;
  const displayedRoutes = isAllRoutesMode && selectedRoute ? [selectedRoute] : routes;
  const activeRoute = !isAllRoutesMode ? routes[0] : undefined;
  const visibleWaypoints = detourWaypoints.filter((w) => !hiddenWaypointIds.has(w.id));

  useEffect(() => {
    if (isAllRoutesMode) detourEditor.exitEditMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllRoutesMode]);

  useEffect(() => {
    setHiddenWaypointIds((current) => {
      const knownIds = new Set(detourWaypoints.map((w) => w.id));
      const next = new Set([...current].filter((id) => knownIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [detourWaypoints]);

  const toggleWaypointVisibility = (waypointId: string) => {
    setHiddenWaypointIds((current) => {
      const next = new Set(current);
      if (next.has(waypointId)) next.delete(waypointId);
      else next.add(waypointId);
      return next;
    });
  };

  const legLabelFor = (afterStopId: string) =>
    activeRoute?.stops.find((stop) => stop.id === afterStopId)?.label ?? "route";

  const handleMapClick = (latitude: number, longitude: number) => {
    if (!activeRoute) return;
    const legStart = nearestLegStartStop(activeRoute.stops, latitude, longitude);
    if (!legStart) return;
    const nextSequence =
      detourWaypoints.filter((w) => w.afterStopId === legStart.id).length + 1;
    void detourEditor.addWaypoint(legStart.id, latitude, longitude, nextSequence);
  };

  const handleWaypointDrag = (waypointId: string, latitude: number, longitude: number) => {
    const waypoint = detourWaypoints.find((w) => w.id === waypointId);
    if (!waypoint) return;
    void detourEditor.moveWaypoint(waypointId, waypoint.afterStopId, waypoint.sequence, latitude, longitude);
  };

  const animation = useRouteAnimation(activeRoute?.geometry);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-gray-50">
      <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Static Route Map</h1>
          <p className="text-xs text-gray-500">
            {isAllRoutesMode ? "Showing every trip route" : "Fixed stop order for the selected trip"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAllRoutesMode && activeRoute && (
            <button
              type="button"
              onClick={() =>
                detourEditor.isEditing ? detourEditor.exitEditMode() : detourEditor.enterEditMode()
              }
              disabled={detourEditor.isSaving}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                detourEditor.isEditing
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {detourEditor.isEditing ? "Done Editing" : "Edit Route"}
            </button>
          )}
          <div className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            {loading ? "Loading…" : `${displayedRoutes.length} Route${displayedRoutes.length === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      {detourEditor.isEditing && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Click anywhere on the map to add a detour point on the nearest leg. Click a detour marker to remove it, or drag it to fine-tune.
        </div>
      )}

      <div className="flex shrink-0 flex-wrap gap-2 border-b bg-white px-4 py-2">
        <select
          value={companyUniqueId}
          onChange={(e) => onCompanyChange(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="">Company</option>
          {companies.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="">Project</option>
          {projects.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        />
        <select
          value={assignmentId}
          onChange={(e) => {
            setAssignmentId(e.target.value);
            setSelectedRoute(null);
          }}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="">All Routes</option>
          {assignments.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <StaticRouteMapView
          routes={displayedRoutes}
          className="h-full w-full"
          onRouteClick={isAllRoutesMode ? setSelectedRoute : undefined}
          waypoints={!isAllRoutesMode ? visibleWaypoints : undefined}
          editable={detourEditor.isEditing}
          onMapClick={detourEditor.isEditing ? handleMapClick : undefined}
          onWaypointRemove={detourEditor.isEditing ? detourEditor.removeWaypoint : undefined}
          onWaypointDrag={detourEditor.isEditing ? handleWaypointDrag : undefined}
          animatedVehiclePosition={!isAllRoutesMode ? animation.position : null}
        />

        {!isAllRoutesMode && activeRoute && animation.canPlay && (
          <div className="absolute bottom-4 left-1/2 z-[400] flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={animation.isPlaying ? animation.pause : animation.play}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-700"
              title={animation.isPlaying ? "Pause" : "Play"}
            >
              {animation.isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              onClick={animation.reset}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Reset"
            >
              ↺
            </button>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.round(animation.progress * 100)}%` }}
              />
            </div>
            <select
              value={animation.speed}
              onChange={(e) => animation.setSpeed(Number(e.target.value))}
              className="rounded-lg border border-gray-200 p-1 text-xs"
            >
              {SPEED_OPTIONS.map((speedOption) => (
                <option key={speedOption} value={speedOption}>
                  {speedOption}x
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="absolute left-4 top-4 z-[400] rounded-xl border bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm">
          <p className="mb-2 font-bold text-gray-700">Legend</p>
          {LEGEND.map((item) => (
            <div key={item.label} className="mb-1 flex items-center gap-2 last:mb-0">
              <span
                className="h-4 w-4 rounded-full border-2 border-white"
                style={{ background: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {displayedRoutes.length === 1 && !sequencePanelOpen && (
          <button
            type="button"
            onClick={() => setSequencePanelOpen(true)}
            className="absolute right-4 top-4 z-[400] rounded-xl border bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-lg backdrop-blur-sm hover:bg-gray-50"
          >
            Route Sequence
          </button>
        )}

        {displayedRoutes.length === 1 && sequencePanelOpen && (
          <div className="absolute right-4 top-4 z-[400] w-72 rounded-xl border bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-bold text-gray-800">Route Sequence</p>
              <button
                type="button"
                onClick={() => setSequencePanelOpen(false)}
                title="Close"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <p className="mb-2 text-[11px] text-gray-500">{displayedRoutes[0].name}</p>
            <ol className="max-h-64 space-y-1.5 overflow-y-auto">
              {[...displayedRoutes[0].stops]
                .sort((a, b) => a.order - b.order)
                .map((stop) => (
                  <li key={stop.id} className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                      {stop.order}
                    </span>
                    <span className="truncate text-gray-700">{stop.label}</span>
                  </li>
                ))}
            </ol>
            {!isAllRoutesMode && detourWaypoints.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-700">
                    {detourWaypoints.length} detour point{detourWaypoints.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void Promise.all(detourWaypoints.map((w) => detourEditor.removeWaypoint(w.id)))
                    }
                    className="text-[11px] font-semibold text-red-600 hover:underline"
                  >
                    Clear detours
                  </button>
                </div>
                <ul className="max-h-32 space-y-1 overflow-y-auto">
                  {detourWaypoints.map((waypoint, index) => (
                    <li key={waypoint.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!hiddenWaypointIds.has(waypoint.id)}
                        onChange={() => toggleWaypointVisibility(waypoint.id)}
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                      <span className="flex-1 truncate text-gray-600">
                        Detour {index + 1} — near {legLabelFor(waypoint.afterStopId)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void detourEditor.removeWaypoint(waypoint.id)}
                        title="Delete detour point"
                        className="text-red-500 hover:text-red-700"
                      >
                        🗑
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isAllRoutesMode && (
              <button
                type="button"
                onClick={() => setSelectedRoute(null)}
                className="mt-2 text-[11px] font-semibold text-blue-600 hover:underline"
              >
                ← Back to all routes
              </button>
            )}
          </div>
        )}

        {isAllRoutesMode && displayedRoutes.length > 1 && (
          <div className="absolute right-4 top-4 z-[400] w-72 rounded-xl border bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm">
            <p className="mb-2 font-bold text-gray-800">Trips</p>
            <p className="mb-2 text-[11px] text-gray-500">Click a route or marker to inspect its stops.</p>
            <ol className="max-h-64 space-y-1 overflow-y-auto">
              {displayedRoutes.map((route) => (
                <li key={route.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRoute(route)}
                    className="w-full truncate rounded px-2 py-1 text-left text-gray-700 hover:bg-gray-100"
                  >
                    {route.name}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {!loading && displayedRoutes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border bg-white/95 px-6 py-4 text-sm text-gray-500 shadow-lg">
              No routes found for the current filters.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
