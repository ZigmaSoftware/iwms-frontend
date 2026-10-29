import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlarmClock,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  Recycle,
  RotateCcw,
  Route,
  Scale,
  TriangleAlert,
  Truck,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

import { adminEndpoints } from "@/helpers/admin/endpoints";
import {
  Badge,
  DataTable,
  Empty,
  Kpi,
  KpiGrid,
  Meter,
  Panel,
  Section,
  SplitChart,
  TrendChart,
  Two,
} from "../shared";
import { dateTime, fullDay, humanize, mutedClass, num, panelClass, shortDay, weight, type Column } from "../dashboardUtils";
import { useDashboardData } from "../useDashboardData";
import { FleetMap } from "./FleetMap";
import type {
  AltCrew,
  BreakdownRow,
  CollectionType,
  Crew,
  DelayRow,
  GpsFix,
  RetripRow,
  StaffRef,
  StopCounts,
  TripDetail,
  VehicleDetailData,
  WeightSummary,
} from "./types";
import { COLLECTION_TYPES, STATE_COLOR, STATE_TONE, STATUS_TONES, clock, minutes } from "./vehicleStatusUtils";

const URL = `/${adminEndpoints.vehicleStatusDashboard}/`;

const LAST_SEEN_SOURCE: Record<string, string> = {
  bin_scan: "Last bin scan",
  household_stop: "Last household stop",
  breakdown: "Breakdown report",
};

export function VehicleDetail({
  vehicleId,
  params,
  fix,
  gpsConfigured,
  stateLabel,
  ctypeLabel,
}: {
  vehicleId: string;
  params: Record<string, string>;
  fix?: GpsFix;
  gpsConfigured: boolean;
  stateLabel: (state: VehicleDetailData["state"]) => string;
  ctypeLabel: (key: string) => string;
}) {
  const { t } = useTranslation();
  const { data, loading } = useDashboardData<VehicleDetailData>(`${URL}${encodeURIComponent(vehicleId)}/`, params);
  const busy = loading && !data;
  const [period, setPeriod] = useState<"today" | "month">("today");

  if (!data) {
    return <div className={panelClass}>{busy ? <Empty>{t("admin.dashboards.loading", "Loading…")}</Empty> : <Empty />}</div>;
  }

  const v = data.vehicle;
  const todayTrips = data.trips;
  const stops = data.stops.total;
  const w = data.weight[period];
  const point = fix
    ? { lat: fix.lat, lng: fix.lng, live: true }
    : data.last_seen
      ? { lat: data.last_seen.lat, lng: data.last_seen.lng, live: false }
      : null;
  const isToday = data.date === new Date().toLocaleDateString("en-CA");

  return (
    <div className={loading ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {/* ---- where is it */}
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("admin.dashboards.vehicle_status.location", "Where is the vehicle")} icon={<MapPin size={16} aria-hidden="true" />}>
          {point ? (
            <FleetMap
              height={260}
              selectedId={v.id}
              points={[{ id: v.id, label: v.vehicle_no, ...point, color: STATE_COLOR[data.state] }]}
            />
          ) : (
            <Empty>
              {gpsConfigured
                ? t("admin.dashboards.vehicle_status.no_position", "No GPS position or geotagged activity for this vehicle on this day")
                : t("admin.dashboards.vehicle_status.no_gps", "This project has no GPS tracking API configured, and the vehicle has no geotagged activity on this day")}
            </Empty>
          )}
          <div className="mt-3 text-[13px]">
            {fix ? (
              <Two
                main={
                  <span className="inline-flex items-center gap-1.5">
                    <Navigation size={14} aria-hidden="true" className="text-[#1f9d47]" />
                    {fix.location || `${fix.lat.toFixed(5)}, ${fix.lng.toFixed(5)}`}
                  </span>
                }
                sub={`${t("admin.dashboards.vehicle_status.live_gps", "Live GPS")} · ${humanize(fix.moving)} · ${num(fix.speed)} km/h${fix.updatedAt ? ` · ${fix.updatedAt}` : ""}`}
              />
            ) : data.last_seen ? (
              <Two
                main={`${data.last_seen.lat.toFixed(5)}, ${data.last_seen.lng.toFixed(5)}`}
                sub={`${t(`admin.dashboards.vehicle_status.seen.${data.last_seen.source}`, LAST_SEEN_SOURCE[data.last_seen.source] ?? data.last_seen.source)} · ${dateTime(data.last_seen.at)}${isToday && gpsConfigured ? ` · ${t("admin.dashboards.vehicle_status.not_on_gps", "not reported by GPS")}` : ""}`}
              />
            ) : null}
          </div>
        </Panel>

        <Panel title={v.vehicle_no} icon={<Truck size={16} aria-hidden="true" />} actions={<Badge tone={STATE_TONE[data.state]}>{stateLabel(data.state)}</Badge>}>
          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
            <Stat label={t("admin.dashboards.vehicle_status.type", "Vehicle type")} value={v.vehicle_type ?? "–"} />
            <Stat label={t("admin.dashboards.vehicle_status.capacity", "Capacity")} value={v.capacity !== null ? num(v.capacity) : "–"} />
            <Stat label={t("admin.dashboards.project", "Project")} value={v.project_name ?? "–"} />
            <Stat
              label={t("admin.dashboards.vehicle_status.supervisor", "Supervisor")}
              value={<StaffLine staff={v.supervisor ?? todayTrips.find((x) => x.id === data.current_trip_id)?.supervisor ?? null} />}
            />
            <Stat label={t("admin.dashboards.vehicle_status.condition", "Condition")} value={v.condition ? humanize(v.condition) : "–"} />
            <Stat
              label={t("admin.dashboards.vehicle_status.insurance", "Insurance expiry")}
              value={
                v.insurance_expiry_date ? (
                  <span className={v.insurance_expiry_date < data.date ? "text-[#b42626]" : ""}>{fullDay(v.insurance_expiry_date)}</span>
                ) : (
                  "–"
                )
              }
            />
            <Stat
              label={t("admin.dashboards.vehicle_status.month_trips", "Trips this month")}
              value={`${num(data.month_trips.completed)} / ${num(data.month_trips.total)}`}
            />
          </dl>
        </Panel>
      </div>

      <KpiGrid>
        <Kpi
          loading={busy}
          tone="info"
          icon={<Route size={18} aria-hidden="true" />}
          label={t("admin.dashboards.vehicle_status.trips_today", "Trips today")}
          value={`${num(todayTrips.filter((x) => x.status === "Completed").length)} / ${num(todayTrips.length)}`}
          hint={`${num(todayTrips.filter((x) => x.late).length)} ${t("admin.dashboards.vehicle_status.late_starts", "late starts")}`}
        />
        <Kpi
          loading={busy}
          icon={<Recycle size={18} aria-hidden="true" />}
          progress={stops.completion_rate}
          label={t("admin.dashboards.vehicle_status.stops", "Stops collected")}
          value={`${num(stops.collected)} / ${num(stops.planned)}`}
          hint={`${num(stops.remaining)} ${t("admin.dashboards.vehicle_status.remaining", "remaining")} · ${num(stops.missed)} ${t("admin.dashboards.vehicle_status.missed", "missed")} · ${num(stops.carried)} ${t("admin.dashboards.vehicle_status.carried", "carried over")}`}
        />
        <Kpi
          loading={busy}
          icon={<Scale size={18} aria-hidden="true" />}
          label={t("admin.dashboards.vehicle_status.weight_today", "Weight today")}
          value={weight(data.weight.today.total_kg)}
          hint={COLLECTION_TYPES.filter((c) => data.weight.today.by_collection_type[c])
            .map((c) => `${ctypeLabel(c)} ${weight(data.weight.today.by_collection_type[c])}`)
            .join(" · ")}
        />
        <Kpi
          loading={busy}
          icon={<CalendarClock size={18} aria-hidden="true" />}
          label={t("admin.dashboards.vehicle_status.weight_month", "Weight this month")}
          value={weight(data.weight.month.total_kg)}
          hint={`${shortDay(data.month_start)} – ${shortDay(data.date)}`}
        />
        <Kpi
          loading={busy}
          tone={data.breakdowns.length ? "bad" : "neutral"}
          icon={<Wrench size={18} aria-hidden="true" />}
          label={t("admin.dashboards.vehicle_status.breakdowns_month", "Breakdowns (month)")}
          value={num(data.breakdowns.length)}
          hint={`${num(data.breakdowns.filter((b) => b.date === data.date).length)} ${t("admin.dashboards.vehicle_status.today", "today")}`}
        />
        <Kpi
          loading={busy}
          tone={data.delays.length ? "warn" : "neutral"}
          icon={<AlarmClock size={18} aria-hidden="true" />}
          label={t("admin.dashboards.vehicle_status.delays_month", "Delays / re-trips (month)")}
          value={`${num(data.delays.length)} / ${num(data.retrips.length)}`}
          hint={`${num(data.delays.filter((d) => d.trip_date === data.date).length)} / ${num(data.retrips.filter((r) => r.trip_date === data.date).length)} ${t("admin.dashboards.vehicle_status.today", "today")}`}
        />
      </KpiGrid>

      {/* ---- trips */}
      <Section
        title={t("admin.dashboards.vehicle_status.todays_trips", "Today's trips")}
        icon={<Route size={17} aria-hidden="true" />}
        description={t("admin.dashboards.vehicle_status.todays_trips_hint", "Scheduled and actual start, crew and progress of every trip on this day")}
      >
        {todayTrips.length ? (
          <TripSlider trips={todayTrips} currentId={data.current_trip_id} ctypeLabel={ctypeLabel} />
        ) : (
          <div className={panelClass}>
            <Empty>{t("admin.dashboards.vehicle_status.no_trips", "No trips assigned to this vehicle on this day")}</Empty>
          </div>
        )}
      </Section>

      {/* ---- staff */}
      <Section
        title={t("admin.dashboards.vehicle_status.staff", "Staff assigned")}
        icon={<Users size={17} aria-hidden="true" />}
        description={t("admin.dashboards.vehicle_status.staff_hint", "Crews of this vehicle's trip plans, and alternative crews standing in on this day")}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel title={t("admin.dashboards.vehicle_status.regular_staff", "Regular staff")} icon={<Users size={16} aria-hidden="true" />}>
            {data.staff.assigned.length ? (
              <div className="space-y-3">
                {data.staff.assigned.map((crew) => (
                  <CrewBlock key={crew.template_id} crew={crew} />
                ))}
              </div>
            ) : (
              <Empty>{t("admin.dashboards.vehicle_status.no_staff", "No staff template is linked to this vehicle")}</Empty>
            )}
          </Panel>
          <Panel title={t("admin.dashboards.vehicle_status.alternative_staff", "Alternative staff")} icon={<UserCog size={16} aria-hidden="true" />}>
            {data.staff.alternatives.length ? (
              <div className="space-y-3">
                {data.staff.alternatives.map((crew) => (
                  <CrewBlock key={crew.template_id} crew={crew} alt />
                ))}
              </div>
            ) : (
              <Empty>{t("admin.dashboards.vehicle_status.no_alternatives", "No alternative staff on this day")}</Empty>
            )}
          </Panel>
        </div>
      </Section>

      {/* ---- stops */}
      <Section
        title={t("admin.dashboards.vehicle_status.stops_section", "Stops collected and remaining")}
        icon={<Gauge size={17} aria-hidden="true" />}
        description={t("admin.dashboards.vehicle_status.stops_hint", "Carried over = moved to a re-trip or replacement vehicle, so not remaining on this trip")}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel title={t("admin.dashboards.vehicle_status.by_collection_type", "By collection type")}>
            <StopTable
              rows={COLLECTION_TYPES.map((c) => ({ name: ctypeLabel(c), ...data.stops.by_collection_type[c] }))}
              total={data.stops.total}
            />
          </Panel>
          <Panel title={t("admin.dashboards.vehicle_status.by_waste_type", "By waste type")}>
            <StopTable rows={data.stops.by_waste_type} total={data.stops.total} />
          </Panel>
        </div>
      </Section>

      {/* ---- weight */}
      <Section
        title={t("admin.dashboards.vehicle_status.weight_section", "Waste collected")}
        icon={<Scale size={17} aria-hidden="true" />}
        description={t("admin.dashboards.vehicle_status.weight_hint", "Bin scans and household / bulk weighments attributed to this vehicle")}
      >
        <div className="mb-3 inline-flex rounded-lg border border-[#dfe8e2] bg-white p-0.5 dark:border-[#26352b] dark:bg-[#17221b]" role="tablist">
          {(["today", "month"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={`rounded-md px-3 py-1 text-[13px] font-medium ${period === key ? "bg-[#1f9d47] text-white" : mutedClass}`}
            >
              {key === "today"
                ? `${t("admin.dashboards.vehicle_status.day", "Day")} · ${weight(data.weight.today.total_kg)}`
                : `${t("admin.dashboards.vehicle_status.month", "Month to date")} · ${weight(data.weight.month.total_kg)}`}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Panel title={t("admin.dashboards.vehicle_status.weight_by_collection_type", "By collection type")}>
            <SplitChart counts={w.by_collection_type} labelFor={ctypeLabel} />
          </Panel>
          <Panel title={t("admin.dashboards.vehicle_status.weight_by_waste_type", "By waste type")}>
            <SplitChart counts={Object.fromEntries(w.by_waste_type.map((x) => [x.name, x.kg]))} labelFor={(k) => k} />
          </Panel>
          <Panel title={t("admin.dashboards.vehicle_status.weight_matrix", "Collection type × waste type")}>
            <WeightMatrix summary={w} ctypeLabel={ctypeLabel} />
          </Panel>
        </div>
        <div className="mt-3">
          <Panel title={t("admin.dashboards.vehicle_status.weight_per_day", "Weight per day this month")}>
            <TrendChart
              labels={data.weight.daily.map((d) => shortDay(d.date))}
              format={weight}
              height={220}
              series={[{ label: t("admin.dashboards.vehicle_status.collected", "Collected"), values: data.weight.daily.map((d) => d.kg), color: "#1f9d47" }]}
            />
          </Panel>
        </div>
      </Section>

      {/* ---- exceptions */}
      <Section
        title={t("admin.dashboards.vehicle_status.breakdowns", "Breakdowns")}
        icon={<Wrench size={17} aria-hidden="true" />}
        description={t("admin.dashboards.vehicle_status.month_hint", "This month up to the selected day")}
      >
        <div className={panelClass}>
          <BreakdownTable rows={data.breakdowns} />
        </div>
      </Section>
      <Section title={t("admin.dashboards.vehicle_status.retrips", "Re-trips")} icon={<RotateCcw size={17} aria-hidden="true" />} description={t("admin.dashboards.vehicle_status.month_hint", "This month up to the selected day")}>
        <div className={panelClass}>
          <RetripTable rows={data.retrips} />
        </div>
      </Section>
      <Section title={t("admin.dashboards.vehicle_status.delays", "Trip delays")} icon={<TriangleAlert size={17} aria-hidden="true" />} description={t("admin.dashboards.vehicle_status.month_hint", "This month up to the selected day")}>
        <div className={panelClass}>
          <DelayTable rows={data.delays} />
        </div>
      </Section>
    </div>
  );
}

/* ---------- pieces ---------- */

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <dt className={`text-xs ${mutedClass}`}>{label}</dt>
    <dd className="m-0 font-semibold">{value}</dd>
  </div>
);

function StartLine({ trip }: { trip: TripDetail }) {
  const { t } = useTranslation();
  if (trip.actual_start_at) {
    const delay = trip.start_delay_min ?? 0;
    return (
      <Badge tone={trip.late ? "bad" : "ok"}>
        {delay > 0
          ? `${minutes(delay)} ${t("admin.dashboards.vehicle_status.late", "late")}`
          : t("admin.dashboards.vehicle_status.on_time", "On time")}
      </Badge>
    );
  }
  if (trip.overdue_min) {
    return (
      <Badge tone="bad">
        {t("admin.dashboards.vehicle_status.not_started", "Not started")} · {minutes(trip.overdue_min)} {t("admin.dashboards.vehicle_status.overdue", "overdue")}
      </Badge>
    );
  }
  return null;
}

const TRIP_STATUSES = ["Scheduled", "In Progress", "Completed", "Cancelled"] as const;

const GAP_PX = 12;

/** Trip cards side by side: 2 on wide screens, 1 below the xl breakpoint. */
function useCardsPerPage() {
  const query = "(min-width: 1280px)";
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide ? 2 : 1;
}

/** Status buttons over trip cards that slide a page at a time, with dots
 * (and arrows) to move between pages instead of a scrollbar. */
function TripSlider({
  trips,
  currentId,
  ctypeLabel,
}: {
  trips: TripDetail[];
  currentId: string | null;
  ctypeLabel: (k: string) => string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const perPage = useCardsPerPage();

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    trips.forEach((trip) => {
      out[trip.status] = (out[trip.status] ?? 0) + 1;
    });
    return out;
  }, [trips]);
  const shown = status ? trips.filter((trip) => trip.status === status) : trips;
  const label: Record<string, string> = {
    "": t("admin.dashboards.vehicle_status.all_trips", "All"),
    Scheduled: t("admin.dashboards.vehicle_status.trip_scheduled", "Scheduled"),
    "In Progress": t("admin.dashboards.vehicle_status.trip_in_progress", "In progress"),
    Completed: t("admin.dashboards.vehicle_status.trip_completed", "Completed"),
    Cancelled: t("admin.dashboards.vehicle_status.trip_cancelled", "Cancelled"),
  };
  // Cancelled only appears when there is one.
  const buttons = ["", ...TRIP_STATUSES.filter((s) => s !== "Cancelled" || counts[s])];

  const pages = Math.max(Math.ceil(shown.length / perPage), 1);
  const current = Math.min(page, pages - 1);

  // On a new filter or layout, open the page holding the current trip.
  useEffect(() => {
    const index = shown.findIndex((trip) => trip.id === currentId);
    setPage(index > 0 ? Math.floor(index / perPage) : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentId, trips, perPage]);

  const arrow = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfe8e2] bg-white shadow-sm hover:border-[#1f9d47] hover:text-[#167a37] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#26352b] dark:bg-[#17221b]";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("admin.dashboards.vehicle_status.trip_status", "Trip status")}>
          {buttons.map((key) => {
            const active = status === key;
            const count = key ? counts[key] ?? 0 : trips.length;
            return (
              <button
                key={key || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatus(key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium ${
                  active
                    ? "border-[#1f9d47] bg-[#1f9d47] text-white"
                    : "border-[#dfe8e2] bg-white text-[#3c4b41] hover:border-[#1f9d47] dark:border-[#26352b] dark:bg-[#17221b] dark:text-[#c5d3ca]"
                }`}
              >
                {label[key]}
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/25" : "bg-[#eef3ef] dark:bg-[#22302a]"}`}>
                  {num(count)}
                </span>
              </button>
            );
          })}
        </div>
        {pages > 1 ? (
          <div className="flex gap-1.5">
            <button type="button" className={arrow} onClick={() => setPage(current - 1)} disabled={current === 0} aria-label={t("admin.dashboards.vehicle_status.previous_trip", "Previous trip")}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" className={arrow} onClick={() => setPage(current + 1)} disabled={current === pages - 1} aria-label={t("admin.dashboards.vehicle_status.next_trip", "Next trip")}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {shown.length ? (
        <>
          {/* Clipped track moved a page (perPage cards) at a time: no scrollbar. */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(calc(-${current * 100}% - ${current * GAP_PX}px))`, gap: GAP_PX }}
            >
              {shown.map((trip) => (
                <div
                  key={trip.id}
                  className="shrink-0 [&>div]:h-full"
                  style={{ width: `calc((100% - ${(perPage - 1) * GAP_PX}px) / ${perPage})` }}
                  inert={Math.floor(shown.indexOf(trip) / perPage) !== current}
                >
                  <TripCard trip={trip} current={trip.id === currentId} ctypeLabel={ctypeLabel} />
                </div>
              ))}
            </div>
          </div>
          {pages > 1 ? (
            <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label={t("admin.dashboards.vehicle_status.trip_pages", "Trip pages")}>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`${t("admin.dashboards.vehicle_status.page", "Page")} ${i + 1}`}
                  onClick={() => setPage(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === current ? "w-6 bg-[#1f9d47]" : "w-2.5 bg-[#c9dccf] hover:bg-[#8fbf9e] dark:bg-[#2c3d32]"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className={panelClass}>
          <Empty>
            {t("admin.dashboards.vehicle_status.no_trips_status", "No {{status}} trips on this day", { status: label[status].toLowerCase() })}
          </Empty>
        </div>
      )}
    </div>
  );
}

function TripCard({ trip, current, ctypeLabel }: { trip: TripDetail; current: boolean; ctypeLabel: (k: string) => string }) {
  const { t } = useTranslation();
  const s = trip.stops_total;
  return (
    <div className={`${panelClass} ${current ? "ring-2 ring-[#2f72c9]/50" : ""}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <Two
          main={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {trip.plan_code ?? trip.id}
              {trip.trip_number > 1 ? <Badge tone="warn">{t("admin.dashboards.vehicle_status.retrip_no", "Re-trip")} #{trip.trip_number}</Badge> : null}
              {current ? <Badge tone="info">{t("admin.dashboards.vehicle_status.current", "Current")}</Badge> : null}
            </span>
          }
          sub={[
            trip.id,
            trip.collection_type ? ctypeLabel(trip.collection_type) : null,
            trip.waste_types.join(", ") || null,
            trip.panchayat,
            trip.wards.length ? `${t("admin.dashboards.vehicle_status.wards", "Wards")}: ${trip.wards.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Badge tone={STATUS_TONES[trip.status] ?? "neutral"}>{trip.status}</Badge>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px] sm:grid-cols-4">
        <Stat label={t("admin.dashboards.vehicle_status.scheduled", "Scheduled start")} value={trip.scheduled_time ?? "–"} />
        <Stat
          label={t("admin.dashboards.vehicle_status.actual_start", "Actual start")}
          value={
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {clock(trip.actual_start_at)}
              <StartLine trip={trip} />
            </span>
          }
        />
        <Stat label={t("admin.dashboards.vehicle_status.ended", "Ended")} value={clock(trip.actual_end_at)} />
        <Stat label={t("admin.dashboards.vehicle_status.duration", "Duration")} value={minutes(trip.duration_min)} />
        <Stat
          label={t("admin.dashboards.vehicle_status.stops", "Stops collected")}
          value={<Meter value={s.completion_rate} label={`${num(s.collected)} / ${num(s.planned)}`} />}
        />
        <Stat label={t("admin.dashboards.vehicle_status.remaining_stops", "Remaining")} value={num(s.remaining)} />
        <Stat label={t("admin.dashboards.vehicle_status.missed_carried", "Missed / carried")} value={`${num(s.missed)} / ${num(s.carried)}`} />
        <Stat label={t("admin.dashboards.vehicle_status.weight", "Weight")} value={weight(trip.weight_kg)} />
        <Stat label={t("admin.dashboards.vehicle_status.trip_supervisor", "Trip supervisor")} value={<StaffLine staff={trip.supervisor} />} />
      </dl>

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-[#eef3ef] pt-3 sm:grid-cols-2 dark:border-[#22302a]">
        <div>
          <div className={`mb-1 text-xs ${mutedClass}`}>{t("admin.dashboards.vehicle_status.regular_staff", "Regular staff")}</div>
          {trip.staff ? <CrewBlock crew={trip.staff} compact /> : <span className={mutedClass}>–</span>}
        </div>
        <div>
          <div className={`mb-1 text-xs ${mutedClass}`}>{t("admin.dashboards.vehicle_status.alternative_staff", "Alternative staff")}</div>
          {trip.alternative_staff ? <CrewBlock crew={trip.alternative_staff} alt compact /> : <span className={mutedClass}>{t("admin.dashboards.vehicle_status.none", "None")}</span>}
        </div>
      </div>
      {trip.remarks ? <p className={`m-0 mt-2 text-xs ${mutedClass}`}>{trip.remarks}</p> : null}
    </div>
  );
}

/** Name with a tap-to-call number. */
const StaffLine = ({ staff }: { staff: StaffRef | null }) =>
  staff ? (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {staff.name}
      {staff.mobile ? (
        <a href={`tel:${staff.mobile}`} className="inline-flex items-center gap-1 text-xs font-normal text-[#2357a0] hover:underline dark:text-blue-300">
          <Phone size={11} aria-hidden="true" />
          {staff.mobile}
        </a>
      ) : null}
    </span>
  ) : (
    <>–</>
  );

const Person = ({ role, staff }: { role: string; staff: StaffRef | null }) =>
  staff ? (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <span className={`w-[70px] shrink-0 text-xs ${mutedClass}`}>{role}</span>
      <span className="font-medium">{staff.name}</span>
      {staff.emp_id ? <span className={`text-xs ${mutedClass}`}>{staff.emp_id}</span> : null}
      {staff.mobile ? (
        <a href={`tel:${staff.mobile}`} className="inline-flex items-center gap-1 text-xs text-[#2357a0] hover:underline dark:text-blue-300">
          <Phone size={11} aria-hidden="true" />
          {staff.mobile}
        </a>
      ) : null}
    </li>
  ) : null;

function CrewBlock({ crew, alt, compact }: { crew: Crew | AltCrew; alt?: boolean; compact?: boolean }) {
  const { t } = useTranslation();
  const altCrew = alt ? (crew as AltCrew) : null;
  return (
    <div className={compact ? "" : "rounded-lg border border-[#eef3ef] p-2.5 dark:border-[#22302a]"}>
      {!compact || altCrew ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[13px]">
          {!compact ? <span className="font-semibold">{crew.code ?? crew.template_id}</span> : null}
          {altCrew ? (
            <>
              <Badge tone={STATUS_TONES[altCrew.approval_status] ?? "neutral"}>{humanize(altCrew.approval_status)}</Badge>
              {altCrew.reason ? <span className={`text-xs ${mutedClass}`}>{altCrew.reason}</span> : null}
              {altCrew.from_date || altCrew.to_date ? (
                <span className={`text-xs ${mutedClass}`}>
                  {altCrew.from_date ? shortDay(altCrew.from_date) : "…"} – {altCrew.to_date ? shortDay(altCrew.to_date) : "…"}
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
      <ul className="m-0 list-none space-y-1 p-0 text-[13px]">
        <Person role={t("admin.dashboards.vehicle_status.driver", "Driver")} staff={crew.driver} />
        <Person role={t("admin.dashboards.vehicle_status.operator", "Operator")} staff={crew.operator} />
        {crew.extra_operators.map((s) => (
          <Person key={s.id} role={t("admin.dashboards.vehicle_status.helper", "Helper")} staff={s} />
        ))}
      </ul>
    </div>
  );
}

function StopTable({ rows, total }: { rows: (StopCounts & { name: string })[]; total: StopCounts }) {
  const { t } = useTranslation();
  const shown = rows.filter((r) => r.planned > 0);
  if (!shown.length) return <Empty>{t("admin.dashboards.vehicle_status.no_stops", "No stops planned on this day")}</Empty>;
  const th = `whitespace-nowrap border-b border-[#dfe8e2] px-2 py-1.5 text-right font-medium dark:border-[#26352b] ${mutedClass}`;
  const td = "border-b border-[#eef3ef] px-2 py-1.5 text-right tabular-nums dark:border-[#22302a]";
  const line = (r: StopCounts & { name: string }, bold = false) => (
    <tr key={r.name} className={bold ? "font-semibold" : ""}>
      <td className={`${td} text-left`}>{r.name}</td>
      <td className={td}>{num(r.planned)}</td>
      <td className={td}>{num(r.collected)}</td>
      <td className={td}>{num(r.remaining)}</td>
      <td className={td}>{num(r.missed)}</td>
      <td className={td}>{num(r.carried)}</td>
      <td className={td}>
        <Meter value={r.completion_rate} label={`${Math.round(r.completion_rate)}%`} />
      </td>
    </tr>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={`${th} text-left`}>{t("admin.dashboards.vehicle_status.type_col", "Type")}</th>
            <th className={th}>{t("admin.dashboards.vehicle_status.planned", "Planned")}</th>
            <th className={th}>{t("admin.dashboards.vehicle_status.collected", "Collected")}</th>
            <th className={th}>{t("admin.dashboards.vehicle_status.remaining_stops", "Remaining")}</th>
            <th className={th}>{t("admin.dashboards.vehicle_status.missed_col", "Missed")}</th>
            <th className={th}>{t("admin.dashboards.vehicle_status.carried_col", "Carried")}</th>
            <th className={th}>{t("admin.dashboards.vehicle_status.done", "Done")}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => line(r))}
          {shown.length > 1 ? line({ name: t("admin.dashboards.vehicle_status.total", "Total"), ...total }, true) : null}
        </tbody>
      </table>
    </div>
  );
}

function WeightMatrix({ summary, ctypeLabel }: { summary: WeightSummary; ctypeLabel: (k: string) => string }) {
  const types = COLLECTION_TYPES.filter((c) => summary.by_collection_type[c] > 0);
  if (!types.length) return <Empty />;
  return (
    <div className="space-y-3 text-[13px]">
      {types.map((c: CollectionType) => (
        <div key={c}>
          <div className="flex justify-between font-semibold">
            <span>{ctypeLabel(c)}</span>
            <span className="tabular-nums">{weight(summary.by_collection_type[c])}</span>
          </div>
          <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
            {summary.by_collection_and_waste_type[c].map((x) => (
              <li key={x.name} className={`flex justify-between pl-3 ${mutedClass}`}>
                <span>{x.name}</span>
                <span className="tabular-nums">{weight(x.kg)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BreakdownTable({ rows }: { rows: BreakdownRow[] }) {
  const { t } = useTranslation();
  const columns = useMemo<Column<BreakdownRow>[]>(
    () => [
      { key: "date", header: t("admin.dashboards.vehicle_status.date", "Date"), value: (r) => r.date, render: (r) => <Two main={shortDay(r.date)} sub={r.time ?? clock(r.reported_at)} /> },
      {
        key: "role",
        header: t("admin.dashboards.vehicle_status.role", "This vehicle"),
        value: (r) => r.role,
        render: (r) =>
          r.role === "broke_down" ? (
            <Badge tone="bad">{t("admin.dashboards.vehicle_status.broke_down", "Broke down")}</Badge>
          ) : (
            <Two main={<Badge tone="info">{t("admin.dashboards.vehicle_status.replacement", "Replacement")}</Badge>} sub={`${t("admin.dashboards.vehicle_status.for", "for")} ${r.broken_vehicle_no ?? "–"}`} />
          ),
      },
      { key: "reason", header: t("admin.dashboards.vehicle_status.reason", "Reason"), value: (r) => humanize(r.reason ?? ""), render: (r) => <Two main={humanize(r.reason ?? "")} sub={r.remarks} /> },
      { key: "location", header: t("admin.dashboards.vehicle_status.location_col", "Location"), value: (r) => r.location ?? (r.lat !== null ? `${r.lat}, ${r.lng}` : "") },
      {
        key: "replacement",
        header: t("admin.dashboards.vehicle_status.replacement_col", "Replacement"),
        value: (r) => r.replacement_vehicle_no,
        render: (r) => <Two main={r.replacement_vehicle_no ?? "–"} sub={[r.replacement_driver?.name, r.replacement_operator?.name].filter(Boolean).join(", ")} />,
      },
      { key: "kg", header: t("admin.dashboards.vehicle_status.before_kg", "Collected before"), value: (r) => r.collected_before_kg, render: (r) => weight(r.collected_before_kg), align: "right" },
      {
        key: "status",
        header: t("admin.dashboards.vehicle_status.status", "Status"),
        value: (r) => r.status,
        render: (r) => <Two main={<Badge tone={STATUS_TONES[r.status] ?? "neutral"}>{humanize(r.status)}</Badge>} sub={humanize(r.approval_status)} />,
      },
      { key: "trip", header: t("admin.dashboards.vehicle_status.trip", "Trip"), value: (r) => r.trip_id, render: (r) => <Two main={r.trip_id ?? "–"} sub={r.continuation_trip_id ? `→ ${r.continuation_trip_id}` : undefined} /> },
    ],
    [t],
  );
  return <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} fileName="vehicle-breakdowns" pageSize={5} />;
}

function RetripTable({ rows }: { rows: RetripRow[] }) {
  const { t } = useTranslation();
  const columns = useMemo<Column<RetripRow>[]>(
    () => [
      { key: "date", header: t("admin.dashboards.vehicle_status.date", "Date"), value: (r) => r.trip_date, render: (r) => <Two main={shortDay(r.trip_date)} sub={clock(r.requested_at)} /> },
      { key: "trip", header: t("admin.dashboards.vehicle_status.trip", "Trip"), value: (r) => r.trip_id, render: (r) => <Two main={r.trip_id} sub={r.continuation_trip_id ? `→ ${r.continuation_trip_id}` : undefined} /> },
      { key: "by", header: t("admin.dashboards.vehicle_status.requested_by", "Requested by"), value: (r) => r.requested_by?.name },
      { key: "reason", header: t("admin.dashboards.vehicle_status.reason", "Reason"), value: (r) => r.reason },
      {
        key: "pending",
        header: t("admin.dashboards.vehicle_status.pending_stops", "Pending stops"),
        value: (r) => r.pending_bins + r.pending_households,
        render: (r) => <Two main={num(r.pending_bins + r.pending_households)} sub={`${num(r.pending_bins)} ${t("admin.dashboards.bins", "Bins")} · ${num(r.pending_households)} ${t("admin.dashboards.households", "Households")}`} />,
        align: "right",
      },
      {
        key: "status",
        header: t("admin.dashboards.vehicle_status.status", "Status"),
        value: (r) => r.status,
        render: (r) => <Two main={<Badge tone={STATUS_TONES[r.status] ?? "neutral"}>{r.status}</Badge>} sub={r.review_remarks ?? (r.reviewed_at ? dateTime(r.reviewed_at) : undefined)} />,
      },
    ],
    [t],
  );
  return <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} fileName="vehicle-retrips" pageSize={5} />;
}

function DelayTable({ rows }: { rows: DelayRow[] }) {
  const { t } = useTranslation();
  const columns = useMemo<Column<DelayRow>[]>(
    () => [
      { key: "date", header: t("admin.dashboards.vehicle_status.date", "Date"), value: (r) => r.trip_date, render: (r) => <Two main={shortDay(r.trip_date)} sub={r.time ?? clock(r.reported_at)} /> },
      { key: "trip", header: t("admin.dashboards.vehicle_status.trip", "Trip"), value: (r) => r.trip_id },
      { key: "reason", header: t("admin.dashboards.vehicle_status.reason", "Reason"), value: (r) => humanize(r.reason), render: (r) => <Two main={humanize(r.reason)} sub={r.remarks} /> },
      { key: "min", header: t("admin.dashboards.vehicle_status.est_delay", "Est. delay"), value: (r) => r.estimated_minutes, render: (r) => minutes(r.estimated_minutes), align: "right" },
      { key: "location", header: t("admin.dashboards.vehicle_status.location_col", "Location"), value: (r) => r.location },
      { key: "by", header: t("admin.dashboards.vehicle_status.reported_by", "Reported by"), value: (r) => r.reported_by?.name },
      {
        key: "status",
        header: t("admin.dashboards.vehicle_status.status", "Status"),
        value: (r) => r.status,
        render: (r) => <Two main={<Badge tone={STATUS_TONES[r.status] ?? "neutral"}>{humanize(r.status)}</Badge>} sub={r.supervisor_remarks ?? undefined} />,
      },
    ],
    [t],
  );
  return <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} fileName="vehicle-delays" pageSize={5} />;
}
