import { useCallback, useMemo, useRef, useState } from "react";
import { routeDetourWaypointApi } from "@/helpers/admin";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

// Edits a trip plan's static route. The backend re-saves the route on every
// change and passes it to the plan's unfinished daily trips.
interface UseRouteDetourEditorOptions {
  tripPlanId: string;
  onChanged: () => void;
}

// latitude/longitude are stored as DecimalField(max_digits=9, decimal_places=6)
// server-side (same precision as every other geo field in this app) — a raw
// Leaflet click/drag position has far more floating-point digits than that,
// so it must be rounded before it's sent or the API rejects it.
function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

// Owns "Edit Route" mode for one trip plan's Static Route Map.
// Waypoints themselves are fetched as part of useStaticRoutes (they're
// returned alongside the trip's stops/geometry); this hook only handles
// creating/removing/moving them and re-triggering that fetch afterward.
export function useRouteDetourEditor({ tripPlanId, onChanged }: UseRouteDetourEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const owner = useMemo(() => ({ trip_plan_id: tripPlanId }), [tripPlanId]);

  // The backend requires a delete_reason on every delete. Removals fired
  // together (e.g. "Clear detours" removing every point at once) share one
  // in-flight prompt, so the user is asked once and the same reason is sent
  // with each request.
  const pendingRemoveReason = useRef<Promise<string | null> | null>(null);
  const askRemoveReason = useCallback(() => {
    if (!pendingRemoveReason.current) {
      pendingRemoveReason.current = confirmDeleteWithReason({
        title: "Remove detour point?",
        text: "The detour point will be removed from this route.",
      }).finally(() => {
        pendingRemoveReason.current = null;
      });
    }
    return pendingRemoveReason.current;
  }, []);

  const addWaypoint = useCallback(
    async (afterStopId: string, latitude: number, longitude: number, sequence = 1) => {
      setIsSaving(true);
      try {
        await routeDetourWaypointApi.create({
          ...owner,
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
    [owner, onChanged],
  );

  const removeWaypoint = useCallback(
    async (waypointId: string) => {
      const reason = await askRemoveReason();
      if (reason === null) return;

      setIsSaving(true);
      try {
        await routeDetourWaypointApi.delete(waypointId, withDeleteReason(reason));
        onChanged();
      } catch (error) {
        console.error("Failed to remove detour waypoint", error);
        void Swal.fire("Error", "Unable to remove detour point.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [askRemoveReason, onChanged],
  );

  // A drag is a move — delete the old point, create it again at the new
  // coordinates, keeping the same leg/sequence. Simpler than a partial
  // update endpoint for a feature with no other mutable fields.
  const moveWaypoint = useCallback(
    async (waypointId: string, afterStopId: string, sequence: number, latitude: number, longitude: number) => {
      const reason = await confirmDeleteWithReason({
        title: "Move detour point?",
        text: "Moving a detour point deletes it and re-creates it at the new position.",
      });
      if (reason === null) {
        // Re-fetch so the dragged marker snaps back to its saved position.
        onChanged();
        return;
      }

      setIsSaving(true);
      try {
        await routeDetourWaypointApi.delete(waypointId, withDeleteReason(reason));
        await routeDetourWaypointApi.create({
          ...owner,
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
    [owner, onChanged],
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
