import type {
  DetourMoved,
  RouteChanges,
  RouteDetour,
  RouteSnapshot,
  RouteStop,
  StaticRouteAuditDetail as DetailRecord,
  StopMoved,
} from "./types";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AuditRouteMap from "./AuditRouteMap";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const formatKm = (meters?: number | null) =>
  meters == null ? "-" : `${(meters / 1000).toFixed(2)} km`;

const formatMin = (seconds?: number | null) =>
  seconds == null ? "-" : `${Math.round(seconds / 60)} min`;

const formatDelta = (value?: number | null, unit = "") => {
  if (value == null || value === 0) return `±0${unit ? ` ${unit}` : ""}`;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString()}${unit ? ` ${unit}` : ""}`;
};

const coords = (lat: number, lng: number) =>
  `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

function RouteColumn({
  title,
  version,
  route,
  accent,
}: {
  title: string;
  version?: number | null;
  route?: RouteSnapshot | null;
  accent: string;
}) {
  const stops = route?.stops ?? [];
  const detours = route?.detour_waypoints ?? [];
  return (
    <div className="min-w-0 rounded-lg border border-gray-200">
      <div className={`rounded-t-lg px-3 py-2 ${accent}`}>
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <div className="text-xs text-gray-500">
          {version != null ? `Version ${version}` : "First version"} ·{" "}
          {formatKm(route?.distance_meters)} · {formatMin(route?.duration_seconds)} ·{" "}
          {stops.length} stops · {detours.length} detours
        </div>
      </div>
      <div className="max-h-[340px] space-y-3 overflow-auto p-3">
        {!route ? (
          <p className="text-sm text-gray-500">No previous route — this save created it.</p>
        ) : (
          <>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Stops ({stops.length})
              </h4>
              <ol className="space-y-1">
                {stops.map((s: RouteStop) => (
                  <li
                    key={s.id}
                    className="rounded border border-gray-100 bg-gray-50 px-2 py-1 text-xs"
                  >
                    <span className="font-semibold text-gray-700">#{s.order ?? "-"} </span>
                    {s.label || s.id}{" "}
                    <span className="text-gray-400">({s.type ?? "stop"})</span>
                    <div className="font-mono text-[11px] text-gray-500">
                      {coords(s.latitude, s.longitude)}
                    </div>
                  </li>
                ))}
                {stops.length === 0 && (
                  <li className="text-xs text-gray-400">No stops</li>
                )}
              </ol>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Detours ({detours.length})
              </h4>
              <ul className="space-y-1">
                {detours.map((d: RouteDetour) => (
                  <li
                    key={d.id}
                    className="rounded border border-dashed border-gray-200 px-2 py-1 text-xs text-gray-700"
                  >
                    {d.leg || d.after_stop_id}{" "}
                    <span className="text-gray-400">seq {d.sequence ?? "-"}</span>
                    <div className="font-mono text-[11px] text-gray-500">
                      {coords(d.latitude, d.longitude)}
                    </div>
                  </li>
                ))}
                {detours.length === 0 && (
                  <li className="text-xs text-gray-400">No detours</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeviationSection({
  title,
  emptyText,
  children,
  count,
  tone,
}: {
  title: string;
  emptyText: string;
  children: React.ReactNode;
  count: number;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
  );
}

export default function StaticRouteAuditDetail({
  record,
  onClose,
}: {
  record: DetailRecord | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [showPrevious, setShowPrevious] = useState(true);
  const [showNew, setShowNew] = useState(true);
  const changes: RouteChanges | null = record?.changes ?? null;

  const stopsAdded = changes?.stops_added ?? [];
  const stopsRemoved = changes?.stops_removed ?? [];
  const stopsMoved: StopMoved[] = changes?.stops_moved ?? [];
  const detoursAdded = changes?.detours_added ?? [];
  const detoursRemoved = changes?.detours_removed ?? [];
  const detoursMoved: DetourMoved[] = changes?.detours_moved ?? [];

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[81vh] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 pb-4 pr-12 pt-6">
          <DialogTitle>
            {t("common.view")} — {record?.trip_plan_code || record?.trip_plan_id} · v
            {record?.previous_version ?? "–"} → v{record?.new_version}
          </DialogTitle>
        </DialogHeader>

        {record && (
          <div className="space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-3 rounded-md border bg-gray-50 p-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500">Trip plan</div>
                <div className="font-medium">{record.trip_plan_code || record.trip_plan_id}</div>
                <div className="text-xs text-gray-500">{record.project_name || record.project_id || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Change</div>
                <div className="font-medium">{record.change_type_label || record.change_type}</div>
                <div className="text-xs text-gray-500">{record.trigger_label || record.trigger}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">When / by</div>
                <div className="font-medium">{formatDateTime(record.timestamp)}</div>
                <div className="text-xs text-gray-500">{record.updated_by_name || record.updated_by || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Distance</div>
                <div className="font-medium">
                  {formatKm(record.previous_distance_meters)} → {formatKm(record.new_distance_meters)}
                </div>
                <div className="text-xs text-gray-500">{formatDelta(record.distance_change_meters, "m")}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Duration</div>
                <div className="font-medium">
                  {formatMin(record.previous_duration_seconds)} → {formatMin(record.new_duration_seconds)}
                </div>
                <div className="text-xs text-gray-500">{formatDelta(record.duration_change_seconds, "s")}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Daily trips moved</div>
                <div className="font-medium">{record.affected_trip_count ?? 0}</div>
                <div className="break-all text-xs text-gray-500">
                  {(record.affected_trip_ids ?? []).slice(0, 5).join(", ")}
                  {(record.affected_trip_ids?.length ?? 0) > 5
                    ? ` +${(record.affected_trip_ids?.length ?? 0) - 5} more`
                    : ""}
                </div>
              </div>
            </div>

            {record.routing_error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Routing failed on this save: {record.routing_error}
              </div>
            )}

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-700">Route map — previous vs new</h3>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <label className="flex cursor-pointer items-center gap-1">
                    <input
                      type="checkbox"
                      checked={showPrevious}
                      onChange={(e) => setShowPrevious(e.target.checked)}
                      className="h-3.5 w-3.5 accent-gray-500"
                    />
                    Previous
                  </label>
                  <label className="flex cursor-pointer items-center gap-1">
                    <input
                      type="checkbox"
                      checked={showNew}
                      onChange={(e) => setShowNew(e.target.checked)}
                      className="h-3.5 w-3.5 accent-blue-600"
                    />
                    New
                  </label>
                </div>
              </div>
              <AuditRouteMap
                previous={record.previous_route}
                current={record.new_route}
                changes={record.changes}
                showPrevious={showPrevious}
                showNew={showNew}
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Previous route vs new route
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <RouteColumn
                  title="Previous route"
                  version={record.previous_version}
                  route={record.previous_route}
                  accent="bg-gray-50"
                />
                <RouteColumn
                  title="New route"
                  version={record.new_version}
                  route={record.new_route}
                  accent="bg-green-50"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">What deviated</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <DeviationSection
                  title="Stops added"
                  emptyText="No stops added"
                  count={stopsAdded.length}
                  tone="bg-green-50 text-green-700"
                >
                  {stopsAdded.map((s) => (
                    <div key={s.id} className="rounded bg-green-50 px-2 py-1 text-xs text-green-800">
                      #{s.order ?? "-"} {s.label || s.id} · {coords(s.latitude, s.longitude)}
                    </div>
                  ))}
                </DeviationSection>
                <DeviationSection
                  title="Stops removed"
                  emptyText="No stops removed"
                  count={stopsRemoved.length}
                  tone="bg-red-50 text-red-700"
                >
                  {stopsRemoved.map((s) => (
                    <div key={s.id} className="rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                      #{s.order ?? "-"} {s.label || s.id} · {coords(s.latitude, s.longitude)}
                    </div>
                  ))}
                </DeviationSection>
                <DeviationSection
                  title="Stops moved"
                  emptyText="No stops moved"
                  count={stopsMoved.length}
                  tone="bg-amber-50 text-amber-700"
                >
                  {stopsMoved.map((s) => (
                    <div key={s.id} className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      {s.label || s.id}: {coords(s.from.latitude, s.from.longitude)} →{" "}
                      {coords(s.to.latitude, s.to.longitude)}
                    </div>
                  ))}
                </DeviationSection>
                <DeviationSection
                  title={`Stops reordered — ${changes?.stops_reordered ? "yes" : "no"}`}
                  emptyText="Order unchanged"
                  count={changes?.stops_reordered ? 1 : 0}
                  tone="bg-blue-50 text-blue-700"
                >
                  {changes?.stops_reordered ? (
                    <div className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">
                      Stop sequence changed between versions
                    </div>
                  ) : null}
                </DeviationSection>
                <DeviationSection
                  title="Detours added"
                  emptyText="No detours added"
                  count={detoursAdded.length}
                  tone="bg-green-50 text-green-700"
                >
                  {detoursAdded.map((d) => (
                    <div key={d.id} className="rounded bg-green-50 px-2 py-1 text-xs text-green-800">
                      leg {d.leg || d.after_stop_id} · {coords(d.latitude, d.longitude)}
                    </div>
                  ))}
                </DeviationSection>
                <DeviationSection
                  title="Detours removed"
                  emptyText="No detours removed"
                  count={detoursRemoved.length}
                  tone="bg-red-50 text-red-700"
                >
                  {detoursRemoved.map((d) => (
                    <div key={d.id} className="rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                      leg {d.leg || d.after_stop_id} · {coords(d.latitude, d.longitude)}
                    </div>
                  ))}
                </DeviationSection>
                <DeviationSection
                  title="Detours moved"
                  emptyText="No detours moved"
                  count={detoursMoved.length}
                  tone="bg-amber-50 text-amber-700"
                >
                  {detoursMoved.map((d) => (
                    <div key={d.id} className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      {d.leg || d.id}: {d.from.leg || d.from.after_stop_id} (
                      {coords(d.from.latitude, d.from.longitude)}) → {d.to.leg || d.to.after_stop_id} (
                      {coords(d.to.latitude, d.to.longitude)})
                    </div>
                  ))}
                </DeviationSection>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
