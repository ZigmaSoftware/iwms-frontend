import { useCallback, useEffect, useState } from "react";
import { dailyTripCollectionPointApi, tripPlanApi } from "@/helpers/admin";
import type {
  DetourWaypoint,
  RouteGeometry,
  RouteSource,
  RouteStop,
  RouteStorage,
  StaticRoute,
} from "./types";

interface DetourWaypointApiResponse {
  id: string;
  after_stop_id: string;
  sequence: number;
  latitude: number;
  longitude: number;
}

interface StaticRouteApiResponse {
  trip_assignment_id: string;
  trip_plan_id?: string | null;
  trip_date?: string | null;
  vehicle_no?: string | null;
  route_source: Exclude<RouteSource, "draft">;
  plan_route_version?: number | null;
  stops: RouteStop[];
  detour_waypoints?: DetourWaypointApiResponse[];
  route_geojson?: RouteGeometry | null;
  distance_meters?: number;
  duration_seconds?: number;
}

interface TripPlanStaticRouteApiResponse {
  trip_plan_id: string;
  display_code?: string | null;
  vehicle_no?: string | null;
  stops: RouteStop[];
  detour_waypoints?: DetourWaypointApiResponse[];
  saved: {
    version: number;
    saved_at: string;
    distance_meters: number;
    duration_seconds: number;
  } | null;
  has_unsaved_changes: boolean;
  route_geojson?: RouteGeometry | null;
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

interface RawRoute {
  id: string;
  name: string;
  tripPlanId?: string | null;
  stops: RouteStop[];
  detour_waypoints?: DetourWaypointApiResponse[];
  // The road path stored in the DB, when it still matches the stops and
  // detours — then there's no need to ask the routing engine again.
  storedGeometry?: RouteGeometry | null;
  distanceMeters?: number;
  durationSeconds?: number;
  storage: RouteStorage;
}

function fromAssignment(response: StaticRouteApiResponse): RawRoute {
  return {
    id: response.trip_assignment_id,
    name: [response.trip_assignment_id, response.vehicle_no].filter(Boolean).join(" · "),
    tripPlanId: response.trip_plan_id,
    stops: response.stops,
    detour_waypoints: response.detour_waypoints,
    storedGeometry: response.route_geojson,
    distanceMeters: response.distance_meters,
    durationSeconds: response.duration_seconds,
    storage: { source: response.route_source, version: response.plan_route_version ?? null },
  };
}

function fromTripPlan(response: TripPlanStaticRouteApiResponse): RawRoute {
  return {
    id: response.trip_plan_id,
    name: [response.display_code || response.trip_plan_id, response.vehicle_no].filter(Boolean).join(" · "),
    tripPlanId: response.trip_plan_id,
    stops: response.stops,
    detour_waypoints: response.detour_waypoints,
    storedGeometry: response.route_geojson,
    distanceMeters: response.route_geojson ? response.saved?.distance_meters : undefined,
    durationSeconds: response.route_geojson ? response.saved?.duration_seconds : undefined,
    storage: {
      source: "draft",
      version: response.saved?.version ?? null,
      savedAt: response.saved?.saved_at ?? null,
      hasUnsavedChanges: response.has_unsaved_changes,
    },
  };
}

async function withRoadGeometry(response: RawRoute): Promise<{
  route: StaticRoute;
  detourWaypoints: DetourWaypoint[];
}> {
  const orderedStops = [...response.stops].sort((a, b) => a.order - b.order);
  const detourWaypoints = toDetourWaypoints(response.detour_waypoints);
  const routingCoordinates = buildRoutingCoordinates(orderedStops, detourWaypoints);
  const fallback = straightLineGeometry(
    routingCoordinates.map((point) => [point.longitude, point.latitude]),
  );

  let geometry: RouteGeometry = response.storedGeometry ?? fallback;
  let distanceMeters = response.distanceMeters;
  let durationSeconds = response.durationSeconds;
  if (!response.storedGeometry && routingCoordinates.length >= 2) {
    try {
      const geo = await dailyTripCollectionPointApi.action<RouteStaticGeometryResponse>("route-static", {
        stops: routingCoordinates,
      });
      if (geo?.route_geojson) {
        geometry = geo.route_geojson;
        distanceMeters = geo.distance_meters;
        durationSeconds = geo.duration_seconds;
      }
    } catch {
      // Keep the straight-line fallback when the routing engine is unavailable.
    }
  }

  return {
    route: {
      id: response.id,
      name: response.name,
      tripPlanId: response.tripPlanId,
      stops: orderedStops,
      geometry,
      distanceMeters,
      durationSeconds,
      storage: response.storage,
    },
    detourWaypoints,
  };
}

export interface StaticRouteFilters {
  companyId?: string;
  projectId?: string;
  date?: string;
  tripAssignmentId?: string;
  // Set to show a trip plan's own static route instead of daily trips.
  tripPlanId?: string;
  // Fetch nothing (e.g. trip plan mode before a plan is picked).
  skip?: boolean;
}

// Fetches static routes (fixed stop order + project plant already
// appended server-side) and their road-following geometry, with saved
// detour waypoints spliced in. A road path stored in the DB is used as-is;
// otherwise it's routed live.
// - tripPlanId: that trip plan's static route and its detours.
// - tripAssignmentId: one daily trip — its plan's route and detours,
//   read-only.
// - neither: every daily trip matching the other filters ("all routes"
//   mode, no detour editing).
export function useStaticRoutes(filters: StaticRouteFilters) {
  const [routes, setRoutes] = useState<StaticRoute[]>([]);
  const [detourWaypoints, setDetourWaypoints] = useState<DetourWaypoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;

    if (filters.skip) {
      Promise.resolve().then(() => {
        if (!active) return;
        setRoutes([]);
        setDetourWaypoints([]);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }

    const params = {
      company_id: filters.companyId || undefined,
      project_id: filters.projectId || undefined,
      date: filters.date || undefined,
      trip_assignment_id: filters.tripAssignmentId || undefined,
    };

    const fetchRoutes: Promise<RawRoute[]> = filters.tripPlanId
      ? tripPlanApi
          .action<TripPlanStaticRouteApiResponse>(`${filters.tripPlanId}/static-route`)
          .then((route) => [fromTripPlan(route)])
      : filters.tripAssignmentId
        ? dailyTripCollectionPointApi
            .action<StaticRouteApiResponse>("static-route", undefined, { params })
            .then((route) => [fromAssignment(route)])
        : dailyTripCollectionPointApi
            .action<StaticRoutesApiResponse>("static-routes", undefined, { params })
            .then((result) => result.routes.map(fromAssignment));

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
  }, [
    filters.companyId,
    filters.projectId,
    filters.date,
    filters.tripAssignmentId,
    filters.tripPlanId,
    filters.skip,
    refreshKey,
  ]);

  return { routes, detourWaypoints, loading, refresh };
}
