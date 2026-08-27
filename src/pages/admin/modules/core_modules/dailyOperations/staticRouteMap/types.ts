export type StopType = "start" | "collection_point" | "plant";

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

export interface StaticRoute {
  id: string;
  name: string;
  stops: RouteStop[];
  geometry: RouteGeometry;
}

// A manually placed point the road route must pass through, overriding one
// leg of a single trip's line (e.g. to detour around a closed road) without
// moving or reordering the real stops.
export interface DetourWaypoint {
  id: string;
  afterStopId: string;
  sequence: number;
  latitude: number;
  longitude: number;
}
