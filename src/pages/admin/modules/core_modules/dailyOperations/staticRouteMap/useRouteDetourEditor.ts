import { useCallback, useState } from "react";
import { routeDetourWaypointApi } from "@/helpers/admin";
import Swal from "@/lib/notify";

interface UseRouteDetourEditorOptions {
  tripAssignmentId: string;
  onChanged: () => void;
}

// latitude/longitude are stored as DecimalField(max_digits=9, decimal_places=6)
// server-side (same precision as every other geo field in this app) — a raw
// Leaflet click/drag position has far more floating-point digits than that,
// so it must be rounded before it's sent or the API rejects it.
function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

// Owns "Edit Route" mode for one trip assignment's Static Route Map.
// Waypoints themselves are fetched as part of useStaticRoutes (they're
// returned alongside the trip's stops/geometry); this hook only handles
// creating/removing/moving them and re-triggering that fetch afterward.
export function useRouteDetourEditor({ tripAssignmentId, onChanged }: UseRouteDetourEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addWaypoint = useCallback(
    async (afterStopId: string, latitude: number, longitude: number, sequence = 1) => {
      setIsSaving(true);
      try {
        await routeDetourWaypointApi.create({
          trip_assignment_id: tripAssignmentId,
          after_stop_id: afterStopId,
          sequence,
          latitude: roundCoordinate(latitude),
          longitude: roundCoordinate(longitude),
        });
        onChanged();
      } catch (error) {
        console.error("Failed to add detour waypoint", error);
        void Swal.fire("Error", "Unable to add detour point.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [tripAssignmentId, onChanged],
  );

  const removeWaypoint = useCallback(
    async (waypointId: string) => {
      setIsSaving(true);
      try {
        await routeDetourWaypointApi.delete(waypointId);
        onChanged();
      } catch (error) {
        console.error("Failed to remove detour waypoint", error);
        void Swal.fire("Error", "Unable to remove detour point.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [onChanged],
  );

  // A drag is a move — delete the old point, create it again at the new
  // coordinates, keeping the same leg/sequence. Simpler than a partial
  // update endpoint for a feature with no other mutable fields.
  const moveWaypoint = useCallback(
    async (waypointId: string, afterStopId: string, sequence: number, latitude: number, longitude: number) => {
      setIsSaving(true);
      try {
        await routeDetourWaypointApi.delete(waypointId);
        await routeDetourWaypointApi.create({
          trip_assignment_id: tripAssignmentId,
          after_stop_id: afterStopId,
          sequence,
          latitude: roundCoordinate(latitude),
          longitude: roundCoordinate(longitude),
        });
        onChanged();
      } catch (error) {
        console.error("Failed to move detour waypoint", error);
        void Swal.fire("Error", "Unable to move detour point.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [tripAssignmentId, onChanged],
  );

  return {
    isEditing,
    isSaving,
    enterEditMode: () => setIsEditing(true),
    exitEditMode: () => setIsEditing(false),
    addWaypoint,
    removeWaypoint,
    moveWaypoint,
  };
}
