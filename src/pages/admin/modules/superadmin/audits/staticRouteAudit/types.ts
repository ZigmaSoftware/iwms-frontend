export type RouteStop = {
  id: string;
  label?: string | null;
  type?: string | null;
  order?: number | null;
  latitude: number;
  longitude: number;
  details?: Record<string, string>;
};

export type RouteDetour = {
  id: string;
  after_stop_id: string;
  leg?: string | null;
  sequence?: number | null;
  latitude: number;
  longitude: number;
};

export type RouteSnapshot = {
  stops: RouteStop[];
  detour_waypoints: RouteDetour[];
  route_geojson?: unknown | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
};

export type StopMoved = {
  id: string;
  label?: string | null;
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
};

export type DetourMoved = {
  id: string;
  leg?: string | null;
  from: { after_stop_id: string; leg?: string | null; latitude: number; longitude: number };
  to: { after_stop_id: string; leg?: string | null; latitude: number; longitude: number };
};

export type RouteChanges = {
  stops_added: RouteStop[];
  stops_removed: RouteStop[];
  stops_moved: StopMoved[];
  stops_reordered: boolean;
  detours_added: RouteDetour[];
  detours_removed: RouteDetour[];
  detours_moved: DetourMoved[];
};

export type RouteChangeSummary = {
  stops_added: number;
  stops_removed: number;
  stops_moved: number;
  stops_reordered: boolean;
  detours_added: number;
  detours_removed: number;
  detours_moved: number;
};

export type StaticRouteAuditRecord = {
  id: number;
  trip_plan_id: string;
  trip_plan_code?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  change_type: string;
  change_type_label?: string | null;
  trigger: string;
  trigger_label?: string | null;
  previous_version?: number | null;
  new_version: number;
  summary?: RouteChangeSummary | null;
  previous_distance_meters?: number | null;
  new_distance_meters?: number | null;
  distance_change_meters?: number | null;
  previous_duration_seconds?: number | null;
  new_duration_seconds?: number | null;
  duration_change_seconds?: number | null;
  affected_trip_count?: number | null;
  routing_error?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  timestamp?: string;
};

export type StaticRouteAuditDetail = StaticRouteAuditRecord & {
  previous_route?: RouteSnapshot | null;
  new_route?: RouteSnapshot | null;
  changes?: RouteChanges | null;
  affected_trip_ids?: string[];
};

export type FilterOption = { unique_id: string; name: string };

export type TripPlanOption = { unique_id: string; name: string };

export type StaticRouteAuditFilterOptions = {
  companies: FilterOption[];
  projects: FilterOption[];
  trip_plans: TripPlanOption[];
  change_types: FilterOption[];
  triggers: FilterOption[];
};
