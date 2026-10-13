export type StopType = "start" | "collection_point" | "household" | "plant";

export interface RouteStop {
  id: string;
  label: string;
  type: StopType;
  order: number;
  latitude: number;
  longitude: number;
  details?: Record<string, string>;
}

// A routing engine (e.g. OpenRouteService via the backend's route-static
// action) returns a FeatureCollection; a hand-authored static fallback can
// supply a bare LineString. StaticRouteMapView accepts either.
export type RouteGeometry = GeoJSON.LineString | GeoJSON.FeatureCollection | GeoJSON.Feature;

// Where a route's stop order and road path come from, as stored in the DB:
// - "draft": a trip plan as currently drawn (plan mode);
// - "saved": a daily trip's copy of its plan's saved route;
// - "plan": a daily trip whose plan has no saved route yet — follows the
//   plan's current drawing;
// - "trip": a daily trip without a plan — its own stops.
export type RouteSource = "draft" | "saved" | "plan" | "trip";

export interface RouteStorage {
  source: RouteSource;
  // Plan mode: the last saved version. Daily: the plan version it copied.
  version: number | null;
  savedAt?: string | null;
  // Plan mode: the drawing differs from what was last saved.
  hasUnsavedChanges?: boolean;
}

export interface StaticRoute {
  id: string;
  name: string;
  // The trip plan this route comes from (for a daily trip, its plan).
  tripPlanId?: string | null;
  stops: RouteStop[];
  geometry: RouteGeometry;
  distanceMeters?: number;
  durationSeconds?: number;
  storage?: RouteStorage;
}

// A manually placed point the road route must pass through, overriding one
// leg of the route's line (e.g. to detour around a closed road) without
// moving or reordering the real stops.
export interface DetourWaypoint {
  id: string;
  afterStopId: string;
  sequence: number;
  latitude: number;
  longitude: number;
}
