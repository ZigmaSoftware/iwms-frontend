import { useCallback, useEffect, useState } from "react";
import { dailyTripCollectionPointApi } from "@/helpers/admin";
import type { DetourWaypoint, RouteGeometry, RouteStop, StaticRoute } from "./types";

interface DetourWaypointApiResponse {
  id: string;
  after_stop_id: string;
  sequence: number;
  latitude: number;
  longitude: number;
}

interface StaticRouteApiResponse {
  trip_assignment_id: string;
  trip_date?: string | null;
  vehicle_no?: string | null;
  stops: RouteStop[];
  detour_waypoints?: DetourWaypointApiResponse[];
}

interface StaticRoutesApiResponse {
  routes: StaticRouteApiResponse[];
}

interface RouteStaticGeometryResponse {
  stop_order: string[];
  distance_meters: number;
  duration_seconds: number;
  route_geojson: RouteGeometry | null;
}

function straightLineGeometry(coordinates: Array<[number, number]>): GeoJSON.LineString {
  return { type: "LineString", coordinates };
}

function toDetourWaypoints(raw?: DetourWaypointApiResponse[]): DetourWaypoint[] {
  return (raw ?? []).map((waypoint) => ({
    id: waypoint.id,
    afterStopId: waypoint.after_stop_id,
    sequence: waypoint.sequence,
    latitude: waypoint.latitude,
    longitude: waypoint.longitude,
  }));
}

// ORS Directions draws a road path through however many coordinates it's
// given, in order — it has no concept of "real stop" vs "manual waypoint."
// So a detour is just extra coordinates spliced in between the two stops
// whose leg is being overridden, before the request goes to route-static.
function buildRoutingCoordinates(
  stops: RouteStop[],
  waypoints: DetourWaypoint[],
): Array<{ id: string; latitude: number; longitude: number }> {
  const waypointsByStop = new Map<string, DetourWaypoint[]>();
  for (const waypoint of waypoints) {
    const list = waypointsByStop.get(waypoint.afterStopId) ?? [];
    list.push(waypoint);
    waypointsByStop.set(waypoint.afterStopId, list);
  }

  const coordinates: Array<{ id: string; latitude: number; longitude: number }> = [];
  for (const stop of stops) {
    coordinates.push({ id: stop.id, latitude: stop.latitude, longitude: stop.longitude });
    const detours = waypointsByStop.get(stop.id);
    if (!detours) continue;
    for (const detour of [...detours].sort((a, b) => a.sequence - b.sequence)) {
      coordinates.push({ id: detour.id, latitude: detour.latitude, longitude: detour.longitude });
    }
  }
  return coordinates;
}

async function withRoadGeometry(response: StaticRouteApiResponse): Promise<{
  route: StaticRoute;
  detourWaypoints: DetourWaypoint[];
}> {
  const orderedStops = [...response.stops].sort((a, b) => a.order - b.order);
  const detourWaypoints = toDetourWaypoints(response.detour_waypoints);
  const routingCoordinates = buildRoutingCoordinates(orderedStops, detourWaypoints);
  const fallback = straightLineGeometry(
    routingCoordinates.map((point) => [point.longitude, point.latitude]),
  );

  let geometry: RouteGeometry = fallback;
  if (routingCoordinates.length >= 2) {
    try {
      const geo = await dailyTripCollectionPointApi.action<RouteStaticGeometryResponse>("route-static", {
        stops: routingCoordinates,
      });
      if (geo?.route_geojson) geometry = geo.route_geojson;
    } catch {
      // Keep the straight-line fallback when the routing engine is unavailable.
    }
  }

  return {
    route: {
      id: response.trip_assignment_id,
      name: [response.trip_assignment_id, response.vehicle_no].filter(Boolean).join(" · "),
      stops: orderedStops,
      geometry,
    },
    detourWaypoints,
  };
}

export interface StaticRouteFilters {
  companyId?: string;
  projectId?: string;
  date?: string;
  tripAssignmentId?: string;
}

// Fetches real trip routes (fixed stop order + project plant already
// appended server-side) and their road-following geometry. Passing
// tripAssignmentId returns that one trip (with its saved manual detour
// waypoints spliced into the routed geometry); omitting it returns every
// trip matching the other filters ("all routes" mode, no detour editing).
export function useStaticRoutes(filters: StaticRouteFilters) {
  const [routes, setRoutes] = useState<StaticRoute[]>([]);
  const [detourWaypoints, setDetourWaypoints] = useState<DetourWaypoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;

    const params = {
      company_id: filters.companyId || undefined,
      project_id: filters.projectId || undefined,
      date: filters.date || undefined,
      trip_assignment_id: filters.tripAssignmentId || undefined,
    };

    const fetchRoutes = filters.tripAssignmentId
      ? dailyTripCollectionPointApi
          .action<StaticRouteApiResponse>("static-route", undefined, { params })
          .then((route) => [route])
      : dailyTripCollectionPointApi
          .action<StaticRoutesApiResponse>("static-routes", undefined, { params })
          .then((result) => result.routes);

    Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
      })
      .then(() => fetchRoutes)
      .then((rawRoutes) => Promise.all(rawRoutes.map(withRoadGeometry)))
      .then((resolved) => {
        if (!active) return;
        setRoutes(resolved.map((entry) => entry.route));
        setDetourWaypoints(resolved[0]?.detourWaypoints ?? []);
      })
      .catch(() => {
        if (!active) return;
        setRoutes([]);
        setDetourWaypoints([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters.companyId, filters.projectId, filters.date, filters.tripAssignmentId, refreshKey]);

  return { routes, detourWaypoints, loading, refresh };
}
