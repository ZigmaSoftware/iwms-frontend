import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Building2,
  CalendarCheck,
  ChartColumn,
  ClipboardCheck,
  Database,
  FolderKanban,
  Gauge,
  House,
  LayoutDashboard,
  Lock,
  MessageSquareWarning,
  Recycle,
  Route,
  ShieldCheck,
  Timer,
  Trash2,
  TriangleAlert,
  Trophy,
  Truck,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { usePermission } from "@/contexts/PermissionContext";
import { adminEndpoints } from "@/helpers/admin/endpoints";
import type { AdminDashboardData, DailyRow, ProjectRow } from "./types";
import {
  DataTable,
  DateRangeControl,
  Filter,
  Kpi,
  KpiGrid,
  MasterCounts,
  MultiSelect,
  Meter,
  PageHeader,
  Panel,
  RankList,
  Section,
  SectionNav,
  SelectionChips,
  SingleSelect,
  SplitChart,
  StatusPills,
  TrendChart,
  Two,
} from "./shared";
import {
  byMonth,
  fullDay,
  inputClass,
  monthLabel,
  mutedClass,
  num,
  pct,
  rangeFor,
  rangeParams,
  shortDay,
  panelClass,
  weight,
  type Column,
  type DateRange,
} from "./dashboardUtils";
import { useDashboardData } from "./useDashboardData";
import { NoAccess } from "./NoAccess";

const URL = `/${adminEndpoints.adminDashboard}/`;

const idsFrom = (raw: string | null) => (raw ?? "").split(",").filter(Boolean);

const STATUS_TONES = {
  Collected: "ok",
  Completed: "ok",
  Verified: "ok",
  Approved: "ok",
  Pending: "warn",
  "In Progress": "info",
  Scheduled: "info",
  "Collect Later": "warn",
  "Not Available": "warn",
  Skipped: "warn",
  Missed: "bad",
  "Not Collected": "bad",
  Cancelled: "bad",
  Rejected: "bad",
} as const;

/** The sidebar "Dashboard": one company's projects, day-wise or over a range.
 * Needs view on the dashboard / admin-dashboard screen. */
export default function AdminDashboard() {
  const { hasPermission } = usePermission();
  if (!hasPermission("dashboard", "admin-dashboard", "view")) return <NoAccess kind="admin" />;
  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DateRange>(() => rangeFor("7d"));
  // ?company=a,b&project=c preselects the filters (the Superadmin
  // Dashboard's company cards link here that way).
  const [searchParams] = useSearchParams();
  const [companyIds, setCompanyIds] = useState<string[]>(() => idsFrom(searchParams.get("company")));
  const [projectIds, setProjectIds] = useState<string[]>(() => idsFrom(searchParams.get("project")));

  const params = useMemo(
    () => ({
      ...rangeParams(range),
      ...(companyIds.length ? { company_id: companyIds.join(",") } : {}),
      ...(projectIds.length ? { project_id: projectIds.join(",") } : {}),
    }),
    [range, companyIds, projectIds],
  );
  const { data, loading, error, refresh } = useDashboardData<AdminDashboardData>(URL, params);

  const daily = useMemo(() => data?.daily ?? [], [data]);
  // Day or month buckets for the trend charts and the detail table. Until
  // picked, ranges over two months default to month-wise.
  const [grainPick, setGrain] = useState<Grain | null>(null);
  const grain: Grain = grainPick ?? (daily.length > 62 ? "month" : "day");
  const months: MonthRow[] = useMemo(() => byMonth(daily), [daily]);
  const series: (DailyRow & { month?: string; days?: number })[] = grain === "month" ? months : daily;
  const labels = useMemo(
    () => series.map((d) => (d.month ? monthLabel(d.month) : shortDay(d.date))),
    [series],
  );
  const ops = data?.operations;
  const busy = loading && !data;
  const canPickCompany = Boolean(data?.filters.can_pick_company);

  const projectColumns = useMemo(
    () => (data?.projects ?? []).map((p) => ({ id: p.project_id, name: p.project_name })),
    [data],
  );
  const companyOptions = useMemo(
    () => (data?.filters.companies ?? []).map((c) => ({ id: c.id, name: c.name })),
    [data],
  );
  const projectOptions = useMemo(() => {
    const projects = data?.filters.projects ?? [];
    const several = new Set(projects.map((p) => p.company_id)).size > 1;
    return projects.map((p) => ({ id: p.id, name: p.name, group: several ? p.company_name : undefined }));
  }, [data]);

  // Changing companies drops picked projects that belong to companies no
  // longer selected.
  const pickCompanies = (ids: string[]) => {
    setCompanyIds(ids);
    if (ids.length) {
      const keep = new Set(
        (data?.filters.projects ?? []).filter((p) => ids.includes(p.company_id)).map((p) => p.id),
      );
      setProjectIds((current) => current.filter((id) => keep.has(id)));
    }
  };

  if (error === 403) return <NoAccess kind="admin" />;

  const scope = data?.scope;
  const period =
    scope && scope.from_date === scope.to_date
      ? fullDay(scope.from_date)
      : scope
        ? `${shortDay(scope.from_date)} – ${shortDay(scope.to_date)} (${scope.days} ${t("admin.dashboards.days", "days")})`
        : "";
  const companyLabel = !scope
    ? "…"
    : companyIds.length > 1
      ? `${companyIds.length} ${t("admin.dashboards.companies_lc", "companies")}`
      : scope.company_name;
  const projectLabel = !scope
    ? "…"
    : projectIds.length > 1
      ? `${projectIds.length} ${t("admin.dashboards.projects_lc", "projects")}`
      : scope.project_name;

  const severalCompanies = new Set((data?.projects ?? []).map((p) => p.company_id)).size > 1;

  const nameOf = (options: { id: string; name: string }[], id: string) =>
    options.find((o) => o.id === id)?.name ?? id;
  const chips = [
    ...companyIds.map((id) => ({
      key: `c-${id}`,
      kind: t("admin.dashboards.company", "Company"),
      label: nameOf(companyOptions, id),
      onRemove: () => pickCompanies(companyIds.filter((c) => c !== id)),
    })),
    ...projectIds.map((id) => ({
      key: `p-${id}`,
      kind: t("admin.dashboards.project", "Project"),
      label: nameOf(projectOptions, id),
      onRemove: () => setProjectIds(projectIds.filter((p) => p !== id)),
    })),
  ];

  const sections = [
    { id: "adm-overview", label: t("admin.dashboards.sections.overview", "Overview") },
    { id: "adm-trend", label: t("admin.dashboards.sections.trend", "Day-wise trend") },
    { id: "adm-collections", label: t("admin.dashboards.sections.collections", "Trips and collections") },
    { id: "adm-top", label: t("admin.dashboards.sections.top", "Top performers") },
    { id: "adm-fleet", label: t("admin.dashboards.sections.fleet_staff", "Fleet and staff") },
    { id: "adm-projects", label: t("admin.dashboards.sections.projects", "Project comparison") },
    { id: "adm-masters", label: t("admin.dashboards.sections.masters", "Master data") },
    { id: "adm-daily", label: t("admin.dashboards.sections.daily", "Date-wise detail") },
  ];

  return (
    <div className="p-3 text-sm text-[#1d2b22] dark:text-[#e6efe8]">
      <PageHeader
        variant="admin"
        icon={<LayoutDashboard size={24} aria-hidden="true" />}
        eyebrow={t("admin.dashboards.admin.eyebrow", "Company & project operations")}
        title={t("admin.dashboards.admin.title", "Admin Dashboard")}
        subtitle={scope ? `${companyLabel} · ${projectLabel} · ${period}` : "…"}
        loading={loading}
        onRefresh={refresh}
        generatedAt={data?.generated_at}
      >
        <div className="flex flex-wrap items-end gap-3">
          <Filter label={t("admin.dashboards.company", "Company")}>
            {canPickCompany ? (
              <MultiSelect
                label={t("admin.dashboards.company", "Company")}
                icon={<Building2 size={15} aria-hidden="true" className="shrink-0 text-[#1f9d47]" />}
                options={companyOptions}
                value={companyIds}
                onChange={pickCompanies}
                allLabel={t("admin.dashboards.all_companies", "All companies")}
              />
            ) : (
              <span className={`${inputClass} inline-flex w-full items-center gap-2 bg-muted sm:w-[250px]`}>
                <Building2 size={15} aria-hidden="true" className="shrink-0 text-[#1f9d47]" />
                <span className="truncate">{scope?.company_name ?? "…"}</span>
                <Lock size={12} aria-hidden="true" className={`ml-auto shrink-0 ${mutedClass}`} />
              </span>
            )}
          </Filter>
          <Filter label={t("admin.dashboards.project", "Project")}>
            <MultiSelect
              label={t("admin.dashboards.project", "Project")}
              icon={<FolderKanban size={15} aria-hidden="true" className="shrink-0 text-[#1f9d47]" />}
              options={projectOptions}
              value={projectIds}
              onChange={setProjectIds}
              allLabel={t("admin.dashboards.all_projects", "All projects")}
            />
          </Filter>
          <Filter label={t("admin.dashboards.range.label", "Period")}>
            <DateRangeControl value={range} onChange={setRange} />
          </Filter>
        </div>
        <SelectionChips
          chips={chips}
          onClearAll={() => {
            setCompanyIds([]);
            setProjectIds([]);
          }}
        />
      </PageHeader>

      <SectionNav items={sections} />

      <Section id="adm-overview" icon={<Gauge size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.overview", "Overview")} description={t("admin.dashboards.sections.overview_hint", "Headline numbers for the selected companies, projects and period")}>
        <KpiGrid>
          <Kpi
            loading={busy}
            icon={<Recycle size={18} aria-hidden="true" />}
            label={t("admin.dashboards.kpi.waste", "Waste collected")}
            value={weight(ops?.waste.total_kg)}
            hint={`${t("admin.dashboards.household", "Household")} ${weight(ops?.waste.household_kg)} · ${t("admin.dashboards.bins", "Bins")} ${weight(ops?.waste.bin_kg)}`}
          />
          <Kpi
            loading={busy}
            tone="info"
            icon={<Route size={18} aria-hidden="true" />}
            progress={ops?.trips.completion_rate}
            label={t("admin.dashboards.kpi.trips", "Trips completed")}
            value={`${num(ops?.trips.completed)} / ${num(ops?.trips.total)}`}
            hint={`${pct(ops?.trips.completion_rate)} ${t("admin.dashboards.completion", "completion")} · ${num(ops?.trips.per_day)}/${t("admin.dashboards.day", "day")}`}
          />
          <Kpi
            loading={busy}
            tone="info"
            icon={<ClipboardCheck size={18} aria-hidden="true" />}
            progress={ops?.trip_logs.verification_rate}
            label={t("admin.dashboards.kpi.trip_logs", "Daily trip logs")}
            value={num(ops?.trip_logs.total)}
            hint={`${pct(ops?.trip_logs.verification_rate)} ${t("admin.dashboards.verified", "verified")} · ${weight(ops?.trip_logs.total_kg)}`}
          />
          <Kpi
            loading={busy}
            icon={<House size={18} aria-hidden="true" />}
            progress={ops?.households.coverage_rate}
            label={t("admin.dashboards.kpi.households", "Households collected")}
            value={`${num(ops?.households.collected)} / ${num(ops?.households.planned_stops)}`}
            hint={`${pct(ops?.households.coverage_rate)} ${t("admin.dashboards.coverage", "coverage")} · ${num(ops?.households.customers_served)} ${t("admin.dashboards.customers_weighed", "customers weighed")}`}
          />
          <Kpi
            loading={busy}
            icon={<Trash2 size={18} aria-hidden="true" />}
            progress={ops?.collection_points.coverage_rate}
            label={t("admin.dashboards.kpi.bins", "Bins collected")}
            value={num(ops?.bins.distinct_bins_collected)}
            hint={`${num(ops?.bins.collected)} ${t("admin.dashboards.lifts", "lifts")} · ${pct(ops?.collection_points.coverage_rate)} ${t("admin.dashboards.points_covered", "points covered")}`}
          />
          <Kpi
            loading={busy}
            tone="info"
            icon={<UserCheck size={18} aria-hidden="true" />}
            progress={ops?.attendance.attendance_rate}
            label={t("admin.dashboards.kpi.attendance", "Avg. staff present")}
            value={num(ops?.attendance.avg_present)}
            hint={`${pct(ops?.attendance.attendance_rate)} ${t("admin.dashboards.of", "of")} ${num(ops?.attendance.staff)} ${t("admin.dashboards.staff", "staff")}`}
          />
          <Kpi
            loading={busy}
            tone={ops && ops.complaints.overdue_open ? "bad" : "warn"}
            icon={<MessageSquareWarning size={18} aria-hidden="true" />}
            label={t("admin.dashboards.kpi.open_complaints", "Open complaints")}
            value={num(ops?.complaints.open)}
            hint={`${num(ops?.complaints.raised)} ${t("admin.dashboards.raised", "raised")} · ${num(ops?.complaints.overdue_open)} ${t("admin.dashboards.overdue", "overdue")}`}
          />
          <Kpi
            loading={busy}
            tone={ops && ops.exceptions.breakdowns ? "bad" : "neutral"}
            icon={<TriangleAlert size={18} aria-hidden="true" />}
            label={t("admin.dashboards.kpi.exceptions", "Breakdowns / delays")}
            value={`${num(ops?.exceptions.breakdowns)} / ${num(ops?.exceptions.delays)}`}
            hint={`${num(ops?.exceptions.retrips)} ${t("admin.dashboards.retrips", "re-trip requests")}`}
          />
        </KpiGrid>
      </Section>

      <Section id="adm-trend" icon={<ChartColumn size={17} aria-hidden="true" />} title={grain === "month" ? t("admin.dashboards.sections.trend_month", "Month-wise trend") : t("admin.dashboards.sections.trend", "Day-wise trend")}>
        <div className="mb-3">
          <GrainTabs value={grain} onChange={setGrain} />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Panel title={grain === "month" ? t("admin.dashboards.charts.waste_per_month", "Waste collected per month") : t("admin.dashboards.charts.waste_per_day", "Waste collected per day")}>
            <TrendChart
              labels={labels}
              stacked
              format={weight}
              series={[
                { label: t("admin.dashboards.household", "Household"), values: series.map((d) => d.household_kg), color: "#1f9d47" },
                { label: t("admin.dashboards.bins", "Bins"), values: series.map((d) => d.bin_kg), color: "#2f72c9" },
              ]}
            />
          </Panel>
          <Panel title={grain === "month" ? t("admin.dashboards.charts.trips_per_month", "Trips per month") : t("admin.dashboards.charts.trips_per_day", "Trips per day")}>
            <TrendChart
              labels={labels}
              series={[
                { label: t("admin.dashboards.scheduled", "Scheduled"), values: series.map((d) => d.trips), color: "#c9dccf" },
                { label: t("admin.dashboards.completed", "Completed"), values: series.map((d) => d.trips_completed), color: "#1f9d47" },
                { label: t("admin.dashboards.trip_logs", "Trip logs"), values: series.map((d) => d.trip_logs), color: "#ef5a1c", type: "line" },
              ]}
            />
          </Panel>
          <Panel title={grain === "month" ? t("admin.dashboards.charts.collections_per_month", "Households and bins collected per month") : t("admin.dashboards.charts.collections_per_day", "Households and bins collected per day")}>
            <TrendChart
              labels={labels}
              series={[
                { label: t("admin.dashboards.households", "Households"), values: series.map((d) => d.households_collected), color: "#1f9d47" },
                { label: t("admin.dashboards.bins", "Bins"), values: series.map((d) => d.bins_collected), color: "#2f72c9" },
              ]}
            />
          </Panel>
          <Panel title={grain === "month" ? t("admin.dashboards.charts.issues_per_month", "Avg. attendance, complaints and breakdowns per month") : t("admin.dashboards.charts.issues_per_day", "Attendance, complaints and breakdowns per day")}>
            <TrendChart
              labels={labels}
              series={[
                { label: t("admin.dashboards.present", "Staff present"), values: series.map((d) => d.present), color: "#0f9488", type: "line" },
                { label: t("admin.dashboards.complaints", "Complaints"), values: series.map((d) => d.complaints), color: "#d99a06" },
                { label: t("admin.dashboards.breakdowns", "Breakdowns"), values: series.map((d) => d.breakdowns), color: "#d63b3b" },
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section id="adm-collections" icon={<Route size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.collections", "Trips and collections")}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Panel title={t("admin.dashboards.charts.waste_by_type", "Waste by type")}>
            <SplitChart
              counts={Object.fromEntries((ops?.waste.by_waste_type ?? []).map((w) => [w.name, w.kg]))}
              labelFor={(k) => k}
            />
          </Panel>
          <Panel title={t("admin.dashboards.charts.trips_by_type", "Trips by collection type")}>
            <SplitChart
              counts={Object.fromEntries(
                Object.entries(ops?.trips.by_collection_type ?? {}).map(([k, v]) => [k, v.total]),
              )}
            />
          </Panel>
          <Panel title={t("admin.dashboards.trip_quality", "Trip quality")}>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
              <Stat label={t("admin.dashboards.on_time", "On-time starts")} value={pct(ops?.trips.on_time_rate)} />
              <Stat label={t("admin.dashboards.late", "Late starts")} value={num(ops?.trips.late_start)} />
              <Stat label={t("admin.dashboards.avg_duration", "Avg. trip duration")} value={`${num(ops?.trips.avg_duration_min)} min`} />
              <Stat label={t("admin.dashboards.avg_per_trip", "Avg. waste per trip")} value={weight(ops?.waste.avg_kg_per_trip)} />
              <Stat label={t("admin.dashboards.vehicles_used", "Vehicles used")} value={num(ops?.trips.vehicles_used)} />
              <Stat label={t("admin.dashboards.teams_used", "Staff teams used")} value={num(ops?.trips.teams_used)} />
              <Stat label={t("admin.dashboards.avg_per_day", "Avg. waste per day")} value={weight(ops?.waste.avg_kg_per_day)} />
              <Stat label={t("admin.dashboards.unverified_logs", "Unverified logs")} value={num(ops?.trip_logs.unverified)} />
            </dl>
          </Panel>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Panel title={t("admin.dashboards.status_breakdown", "Status breakdown")}>
            <StatusBlock label={t("admin.dashboards.trips", "Trips")} counts={{
              Scheduled: ops?.trips.scheduled ?? 0,
              "In Progress": ops?.trips.in_progress ?? 0,
              Completed: ops?.trips.completed ?? 0,
              Cancelled: ops?.trips.cancelled ?? 0,
            }} />
            <StatusBlock label={t("admin.dashboards.trip_approval", "Trip approval")} counts={ops?.trips.approval ?? {}} />
            <StatusBlock label={t("admin.dashboards.household_stops", "Household stops")} counts={ops?.households.status ?? {}} />
            <StatusBlock label={t("admin.dashboards.collection_points", "Collection points")} counts={ops?.collection_points.status ?? {}} />
            <StatusBlock label={t("admin.dashboards.bin_lifts", "Bin lifts")} counts={ops?.bins.status ?? {}} />
          </Panel>
          <Panel title={t("admin.dashboards.exceptions", "Exceptions and complaints")}>
            <StatusBlock label={t("admin.dashboards.breakdown_reasons", "Breakdown reasons")} counts={ops?.exceptions.breakdown_reasons ?? {}} />
            <StatusBlock label={t("admin.dashboards.breakdown_status", "Breakdown status")} counts={ops?.exceptions.breakdown_status ?? {}} />
            <StatusBlock label={t("admin.dashboards.delay_reasons", "Delay reasons")} counts={ops?.exceptions.delay_reasons ?? {}} />
            <StatusBlock label={t("admin.dashboards.retrip_status", "Re-trip requests")} counts={ops?.exceptions.retrip_status ?? {}} />
            <StatusBlock label={t("admin.dashboards.complaint_status", "Complaints raised, by status")} counts={ops?.complaints.by_status ?? {}} />
            <p className="mb-0 mt-2 text-xs text-[#66756b] dark:text-[#9aaba0]">
              {t("admin.dashboards.complaint_flow", "Resolved")} {num(ops?.complaints.resolved)} · {t("admin.dashboards.closed", "Closed")} {num(ops?.complaints.closed)} · {t("admin.dashboards.escalated", "Escalated (open)")} {num(ops?.complaints.escalated_open)} · {t("admin.dashboards.avg_delay", "Avg. delay")} {num(ops?.exceptions.avg_delay_min)} min
            </p>
          </Panel>
        </div>
      </Section>

      <Section id="adm-top" icon={<Trophy size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.top", "Top performers")} description={t("admin.dashboards.sections.top_hint", "Ranked by waste collected")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Panel title={t("admin.dashboards.top.vehicles", "Vehicles")}>
            <RankList rows={data?.top.vehicles ?? []} value={(r) => r.kg} format={weight} sub={(r) => `${num(r.trips)} ${t("admin.dashboards.trips_short", "trips")}`} />
          </Panel>
          <Panel title={t("admin.dashboards.top.drivers", "Drivers")}>
            <RankList rows={data?.top.drivers ?? []} value={(r) => r.kg} format={weight} sub={(r) => `${num(r.trips)} ${t("admin.dashboards.trips_short", "trips")}`} />
          </Panel>
          <Panel title={t("admin.dashboards.top.plbs", "Local bodies (bins)")}>
            <RankList rows={data?.top.plbs ?? []} value={(r) => r.kg} format={weight} />
          </Panel>
          <Panel title={t("admin.dashboards.top.wards", "Wards (households)")}>
            <RankList rows={data?.top.wards ?? []} value={(r) => r.kg} format={weight} />
          </Panel>
        </div>
      </Section>

      <Section id="adm-fleet" icon={<Truck size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.fleet_staff", "Fleet and staff")}>
        <KpiGrid>
          <Kpi loading={busy} tone="info" icon={<Truck size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.vehicles", "Active vehicles")} value={`${num(data?.fleet.active)} / ${num(data?.fleet.total)}`} hint={`${num(data?.fleet.on_trip_last_day)} ${t("admin.dashboards.on_trip", "on trip")} · ${num(data?.fleet.idle_last_day)} ${t("admin.dashboards.idle", "idle")}`} />
          <Kpi loading={busy} tone={data?.fleet.open_breakdowns ? "bad" : "neutral"} icon={<TriangleAlert size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.open_breakdowns", "Open breakdowns")} value={num(data?.fleet.open_breakdowns)} />
          <Kpi loading={busy} tone={data?.fleet.insurance_expired ? "bad" : "warn"} icon={<ShieldCheck size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.insurance", "Insurance expired / due 30d")} value={`${num(data?.fleet.insurance_expired)} / ${num(data?.fleet.insurance_due_30d)}`} />
          <Kpi loading={busy} icon={<Users size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.staff", "Active staff")} value={`${num(data?.staff.active)} / ${num(data?.staff.total)}`} hint={`${num(data?.staff.login_enabled)} ${t("admin.dashboards.login_enabled", "can sign in")}`} />
          <Kpi loading={busy} tone={data?.staff.pending ? "warn" : "neutral"} icon={<Timer size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.pending_staff", "Staff awaiting approval")} value={num(data?.staff.pending)} />
        </KpiGrid>
        <div className="mt-3">
          <Panel title={t("admin.dashboards.staff_by_role", "Staff by role")}>
            <SplitChart counts={data?.staff.by_role ?? {}} labelFor={(k) => k} height={220} />
          </Panel>
        </div>
      </Section>

      <Section id="adm-projects" icon={<FolderKanban size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.projects", "Project comparison")}>
        <div className={panelClass}>
          <DataTable<ProjectRow>
            rows={data?.projects ?? []}
            rowKey={(r) => r.project_id}
            fileName="admin-dashboard-projects"
            initialSort="total_kg"
            columns={projectTableColumns(t, severalCompanies)}
          />
        </div>
      </Section>

      <Section id="adm-masters" icon={<Database size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.masters", "Master data")}>
        <MasterCounts rows={data?.masters ?? []} columns={projectColumns} by="project" loading={loading} />
      </Section>

      <Section id="adm-daily" icon={<CalendarCheck size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.daily", "Date-wise detail")} description={t("admin.dashboards.sections.daily_hint", "Day-wise or month-wise rows within the selected period")}>
        <DetailTable daily={daily} months={months} grain={grain} onGrain={setGrain} />
      </Section>
    </div>
  );
}

type T = (key: string, fallback: string) => string;

const projectTableColumns = (t: T, withCompany: boolean): Column<ProjectRow>[] => [
  {
    key: "project",
    header: t("admin.dashboards.project", "Project"),
    value: (r) => r.project_name,
    render: (r) => <Two main={r.project_name} sub={withCompany ? r.company_name : undefined} />,
  },
  { key: "company", header: t("admin.dashboards.company", "Company"), value: (r) => r.company_name ?? "", exportOnly: true },
  {
    key: "completion",
    header: t("admin.dashboards.trips", "Trips"),
    value: (r) => r.completion_rate,
    render: (r) => <Meter value={r.completion_rate} label={`${num(r.trips_completed)} / ${num(r.trips)} · ${pct(r.completion_rate)}`} />,
    align: "right",
  },
  { key: "trips", header: t("admin.dashboards.trips", "Trips"), value: (r) => r.trips, exportOnly: true },
  { key: "trips_completed", header: t("admin.dashboards.completed", "Completed"), value: (r) => r.trips_completed, exportOnly: true },
  { key: "logs", header: t("admin.dashboards.trip_logs", "Trip logs"), value: (r) => r.trip_logs, align: "right" },
  {
    key: "total_kg",
    header: t("admin.dashboards.waste", "Waste"),
    value: (r) => r.total_kg,
    render: (r) => <Two main={weight(r.total_kg)} sub={wasteSplit(t, r.household_kg, r.bin_kg)} />,
    align: "right",
  },
  { key: "household_kg", header: t("admin.dashboards.household_kg", "Household (kg)"), value: (r) => r.household_kg, exportOnly: true },
  { key: "bin_kg", header: t("admin.dashboards.bin_kg", "Bins (kg)"), value: (r) => r.bin_kg, exportOnly: true },
  { key: "bins_collected", header: t("admin.dashboards.bin_lifts", "Bin lifts"), value: (r) => r.bins_collected, align: "right" },
  {
    key: "open_complaints",
    header: t("admin.dashboards.issues", "Issues"),
    value: (r) => r.open_complaints + r.breakdowns,
    render: (r) => (
      <Two
        main={`${num(r.open_complaints)} ${t("admin.dashboards.complaints_lc", "complaints")}`}
        sub={`${num(r.breakdowns)} ${t("admin.dashboards.breakdowns_lc", "breakdowns")}`}
      />
    ),
    align: "right",
  },
  { key: "complaints_csv", header: t("admin.dashboards.open_complaints", "Open complaints"), value: (r) => r.open_complaints, exportOnly: true },
  { key: "breakdowns", header: t("admin.dashboards.breakdowns", "Breakdowns"), value: (r) => r.breakdowns, exportOnly: true },
  {
    key: "staff",
    header: t("admin.dashboards.resources", "Resources"),
    value: (r) => r.staff,
    render: (r) => (
      <Two
        main={`${num(r.staff)} ${t("admin.dashboards.staff", "staff")} · ${num(r.vehicles)} ${t("admin.dashboards.vehicles_lc", "vehicles")}`}
        sub={`${num(r.customers)} ${t("admin.dashboards.customers_lc", "customers")} · ${num(r.bins)} ${t("admin.dashboards.bins_lc", "bins")}`}
      />
    ),
    align: "right",
  },
  { key: "staff_csv", header: t("admin.dashboards.staff_col", "Staff"), value: (r) => r.staff, exportOnly: true },
  { key: "vehicles", header: t("admin.dashboards.vehicles", "Vehicles"), value: (r) => r.vehicles, exportOnly: true },
  { key: "customers", header: t("admin.dashboards.customers", "Customers"), value: (r) => r.customers, exportOnly: true },
  { key: "bins", header: t("admin.dashboards.bin_master", "Bins (master)"), value: (r) => r.bins, exportOnly: true },
];

const wasteSplit = (t: T, household: number, bin: number) =>
  `${t("admin.dashboards.household_short", "H")} ${weight(household)} · ${t("admin.dashboards.bins_short", "B")} ${weight(bin)}`;

/** Day (or, via monthTableColumns, month) rows. */
const dailyTableColumns = (t: T): Column<DailyRow>[] => [
  { key: "date", header: t("admin.dashboards.date", "Date"), value: (r) => r.date, render: (r) => fullDay(r.date) },
  {
    key: "trips",
    header: t("admin.dashboards.trips", "Trips"),
    value: (r) => r.trips,
    render: (r) =>
      r.trips ? (
        <Meter value={(r.trips_completed / r.trips) * 100} label={`${num(r.trips_completed)} / ${num(r.trips)}`} />
      ) : (
        <span className="text-gray-300 dark:text-gray-600">–</span>
      ),
    align: "right",
  },
  { key: "done", header: t("admin.dashboards.completed", "Completed"), value: (r) => r.trips_completed, exportOnly: true },
  { key: "logs", header: t("admin.dashboards.trip_logs", "Trip logs"), value: (r) => r.trip_logs, align: "right" },
  {
    key: "total_kg",
    header: t("admin.dashboards.waste", "Waste"),
    value: (r) => r.total_kg,
    render: (r) => <Two main={weight(r.total_kg)} sub={r.total_kg ? wasteSplit(t, r.household_kg, r.bin_kg) : undefined} />,
    align: "right",
  },
  { key: "household_kg", header: t("admin.dashboards.household_kg", "Household (kg)"), value: (r) => r.household_kg, exportOnly: true },
  { key: "bin_kg", header: t("admin.dashboards.bin_kg", "Bins (kg)"), value: (r) => r.bin_kg, exportOnly: true },
  { key: "households", header: t("admin.dashboards.households", "Households"), value: (r) => r.households_collected, align: "right" },
  { key: "bins", header: t("admin.dashboards.bin_lifts", "Bin lifts"), value: (r) => r.bins_collected, align: "right" },
  { key: "present", header: t("admin.dashboards.present", "Staff present"), value: (r) => r.present, align: "right" },
  { key: "complaints", header: t("admin.dashboards.complaints", "Complaints"), value: (r) => r.complaints, align: "right" },
  { key: "breakdowns", header: t("admin.dashboards.breakdowns", "Breakdowns"), value: (r) => r.breakdowns, align: "right" },
];

type Grain = "day" | "month";

const isEmptyDay = (r: DailyRow) =>
  !r.trips && !r.trip_logs && !r.total_kg && !r.households_collected && !r.bins_collected &&
  !r.complaints && !r.breakdowns && !r.present;

/** Date-wise detail: day or month rows, narrowed by a from–to inside the
 * loaded period, optionally hiding days with no activity; paginated. */
function DetailTable({
  daily,
  months,
  grain,
  onGrain,
}: {
  daily: DailyRow[];
  months: MonthRow[];
  grain: Grain;
  onGrain: (grain: Grain) => void;
}) {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hideEmpty, setHideEmpty] = useState(false);

  const minDay = daily[0]?.date ?? "";
  const maxDay = daily[daily.length - 1]?.date ?? "";
  // A day key ("2026-10-08") or month key ("2026-10") compares as text.
  const inRange = (key: string) =>
    (!from || key >= (grain === "month" ? from.slice(0, 7) : from)) &&
    (!to || key <= (grain === "month" ? to.slice(0, 7) : to));
  const days = daily.filter((r) => inRange(r.date) && !(hideEmpty && isEmptyDay(r))).reverse();
  const monthRows = months.filter((r) => inRange(r.month) && !(hideEmpty && isEmptyDay(r))).reverse();
  const monthOptions = months.map((m) => ({ id: `${m.month}-01`, name: monthLabel(m.month) }));
  const filtered = Boolean(from || to || hideEmpty);

  const filters = (
    <>
      {grain === "day" ? (
        <>
          <input
            type="date"
            aria-label={t("admin.dashboards.range.from", "From")}
            className={inputClass}
            min={minDay}
            max={to || maxDay}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className={mutedClass}>–</span>
          <input
            type="date"
            aria-label={t("admin.dashboards.range.to", "To")}
            className={inputClass}
            min={from || minDay}
            max={maxDay}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </>
      ) : (
        <>
          <SingleSelect
            label={t("admin.dashboards.range.from_month", "From month")}
            options={[{ id: "", name: t("admin.dashboards.range.from_month", "From month") }, ...monthOptions]}
            value={from}
            onChange={setFrom}
            className="w-[150px]"
            searchable={false}
          />
          <span className={mutedClass}>–</span>
          <SingleSelect
            label={t("admin.dashboards.range.to_month", "To month")}
            options={[{ id: "", name: t("admin.dashboards.range.to_month", "To month") }, ...monthOptions]}
            value={to}
            onChange={setTo}
            className="w-[150px]"
            searchable={false}
          />
        </>
      )}
      <label className={`${inputClass} inline-flex cursor-pointer select-none items-center gap-2`}>
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#1f9d47]"
          checked={hideEmpty}
          onChange={(e) => setHideEmpty(e.target.checked)}
        />
        {grain === "month"
          ? t("admin.dashboards.hide_empty_months", "Hide empty months")
          : t("admin.dashboards.hide_empty_days", "Hide empty days")}
      </label>
      {filtered ? (
        <button
          type="button"
          onClick={() => {
            setFrom("");
            setTo("");
            setHideEmpty(false);
          }}
          className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-[#b42626] hover:bg-[#fde4e4] dark:hover:bg-red-900/30"
        >
          <X size={14} aria-hidden="true" /> {t("admin.dashboards.reset", "Reset")}
        </button>
      ) : null}
    </>
  );

  return (
    <div className={panelClass}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <GrainTabs
          value={grain}
          onChange={(g) => {
            onGrain(g);
            setFrom("");
            setTo("");
          }}
        />
        {grain === "month" ? (
          <span className={`text-xs ${mutedClass}`}>
            {t("admin.dashboards.month_hint", "Totals per month · staff present is the daily average")}
          </span>
        ) : null}
      </div>
      {grain === "month" ? (
        <DataTable<MonthRow>
          key="month"
          rows={monthRows}
          rowKey={(r) => r.month}
          fileName="admin-dashboard-monthly"
          columns={monthTableColumns(t)}
          filters={filters}
        />
      ) : (
        <DataTable<DailyRow>
          key="day"
          rows={days}
          rowKey={(r) => r.date}
          fileName="admin-dashboard-daily"
          columns={dailyTableColumns(t)}
          filters={filters}
        />
      )}
    </div>
  );
}
type MonthRow = DailyRow & { month: string; days: number };

function GrainTabs({ value, onChange }: { value: Grain; onChange: (grain: Grain) => void }) {
  const { t } = useTranslation();
  return (
    <div role="tablist" className="inline-flex h-9 items-center rounded-lg bg-muted p-1">
      {(["day", "month"] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`inline-flex h-7 items-center rounded-md px-3 text-[13px] font-medium transition-all ${
            value === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {key === "day" ? t("admin.dashboards.day_wise", "Day-wise") : t("admin.dashboards.month_wise", "Month-wise")}
        </button>
      ))}
    </div>
  );
}

const monthTableColumns = (t: T): Column<MonthRow>[] => [
  { key: "month", header: t("admin.dashboards.month", "Month"), value: (r) => r.month, render: (r) => monthLabel(r.month) },
  { key: "days", header: t("admin.dashboards.days_col", "Days"), value: (r) => r.days, align: "right" },
  ...(dailyTableColumns(t).filter((c) => c.key !== "date") as unknown as Column<MonthRow>[]).map((c) =>
    c.key === "present" ? { ...c, header: t("admin.dashboards.avg_present", "Avg. staff present") } : c,
  ),
];

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-[#66756b] dark:text-[#9aaba0]">{label}</dt>
    <dd className="m-0 text-[16px] font-semibold">{value}</dd>
  </div>
);

const StatusBlock = ({ label, counts }: { label: string; counts: Record<string, number> }) => (
  <div className="mb-2.5 last:mb-0">
    <div className="mb-1 text-xs text-[#66756b] dark:text-[#9aaba0]">{label}</div>
    <StatusPills
      counts={Object.fromEntries(Object.entries(counts).filter(([, v]) => v > 0))}
      tones={STATUS_TONES as Record<string, "ok" | "warn" | "bad" | "info">}
    />
  </div>
);
