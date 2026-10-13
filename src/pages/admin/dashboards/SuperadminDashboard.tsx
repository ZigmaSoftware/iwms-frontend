import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  ClipboardCheck,
  Database,
  FolderKanban,
  House,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Search,
  MessageSquareWarning,
  Minus,
  Route,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TriangleAlert,
  Truck,
} from "lucide-react";

import { adminEndpoints } from "@/helpers/admin/endpoints";
import { isStoredSuperAdmin } from "@/utils/permissions";
import type {
  CompanyGrant,
  CompanyRow,
  ProjectRow,
  SuperadminDashboardData,
} from "./types";
import {
  Badge,
  DataTable,
  DateRangeControl,
  Filter,
  HeroStats,
  Kpi,
  KpiGrid,
  MasterCounts,
  Meter,
  PageHeader,
  Panel,
  Section,
  SectionNav,
  SingleSelect,
  SplitChart,
  StatusPills,
  TrendChart,
  Two,
} from "./shared";
import {
  dateTime,
  humanize,
  inputClass,
  mutedClass,
  num,
  panelClass,
  pct,
  rangeFor,
  rangeParams,
  shortDay,
  weight,
  type Column,
  type DateRange,
} from "./dashboardUtils";
import { useDashboardData } from "./useDashboardData";
import { NoAccess } from "./NoAccess";

const URL = `/${adminEndpoints.superadminDashboard}/`;

type T = (key: string, fallback: string) => string;
type RoleRow = SuperadminDashboardData["staff_by_role"][number];
type StaffGrantRow = SuperadminDashboardData["permissions"]["staff_grants"][number];

/** Every company and project on the platform. Platform super admins only. */
export default function SuperadminDashboard() {
  if (!isStoredSuperAdmin()) return <NoAccess kind="superadmin" />;
  return <SuperadminDashboardContent />;
}

function SuperadminDashboardContent() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DateRange>(() => rangeFor("30d"));
  const params = useMemo(() => rangeParams(range), [range]);
  const { data, loading, error, refresh } = useDashboardData<SuperadminDashboardData>(URL, params);

  const daily = useMemo(() => data?.daily ?? [], [data]);
  const labels = useMemo(() => daily.map((d) => shortDay(d.date)), [daily]);
  const companyColumns = useMemo(
    () => (data?.companies ?? []).map((c) => ({ id: c.company_id, name: c.company_name })),
    [data],
  );

  if (error === 403) return <NoAccess kind="superadmin" />;

  const busy = loading && !data;
  const p = data?.platform;
  const ops = data?.operations;
  const scope = data?.scope;

  const sections = [
    { id: "sa-platform", label: t("admin.dashboards.sections.platform", "Platform") },
    { id: "sa-operations", label: t("admin.dashboards.sections.operations", "Operations in this period") },
    { id: "sa-companies", label: t("admin.dashboards.sections.companies", "Companies") },
    { id: "sa-projects", label: t("admin.dashboards.sections.projects_all", "Projects") },
    { id: "sa-permissions", label: t("admin.dashboards.sections.permissions", "Permissions") },
    { id: "sa-people", label: t("admin.dashboards.sections.people", "Staff and sign-ins") },
    { id: "sa-masters", label: t("admin.dashboards.sections.masters", "Master data") },
  ];

  return (
    <div className="p-3 text-sm text-[#1d2b22] dark:text-[#e6efe8]">
      <PageHeader
        variant="superadmin"
        icon={<ShieldCheck size={24} aria-hidden="true" />}
        eyebrow={t("admin.dashboards.superadmin.eyebrow", "Platform control centre")}
        title={t("admin.dashboards.superadmin.title", "Superadmin Dashboard")}
        subtitle={
          scope
            ? `${t("admin.dashboards.superadmin.subtitle", "All companies and projects")} · ${shortDay(scope.from_date)}${scope.days > 1 ? ` – ${shortDay(scope.to_date)}` : ""}`
            : "…"
        }
        loading={loading}
        onRefresh={refresh}
        generatedAt={data?.generated_at}
        stats={
          <HeroStats
            items={[
              { label: t("admin.dashboards.kpi.companies", "Companies"), value: busy ? "…" : num(p?.companies), hint: `${num(p?.companies_active)} ${t("admin.dashboards.active", "active")}` },
              { label: t("admin.dashboards.kpi.projects", "Projects"), value: busy ? "…" : num(p?.projects), hint: `${num(p?.projects_active)} ${t("admin.dashboards.active", "active")}` },
              { label: t("admin.dashboards.kpi.staff_total", "Staff"), value: busy ? "…" : num(data?.staff.total), hint: `${num(data?.staff.active)} ${t("admin.dashboards.active", "active")} · ${num(data?.staff.login_enabled)} ${t("admin.dashboards.login_enabled", "can sign in")}` },
              { label: t("admin.dashboards.kpi.waste", "Waste collected"), value: busy ? "…" : weight(ops?.waste.total_kg), hint: `${weight(ops?.waste.avg_kg_per_day)}/${t("admin.dashboards.day", "day")}` },
            ]}
          />
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Filter label={t("admin.dashboards.range.label", "Period")}>
            <DateRangeControl value={range} onChange={setRange} />
          </Filter>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c7c4f5] bg-[#eef0ff] px-3 py-[7px] text-sm font-medium text-[#3730a3] hover:bg-[#e0e3ff] dark:border-[#3b3a7a] dark:bg-[#23224a] dark:text-[#c7c9ff]"
          >
            <LayoutDashboard size={14} aria-hidden="true" />
            {t("admin.dashboards.superadmin.open_admin", "Company / project view")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </PageHeader>

      <SectionNav items={sections} />

      <Section id="sa-platform" icon={<Layers size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.platform", "Platform")} description={t("admin.dashboards.sections.platform_hint", "Set-up across every company")}>
        <KpiGrid>
          <Kpi loading={busy} tone={data?.staff.pending ? "warn" : "neutral"} icon={<Timer size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.pending_staff", "Staff awaiting approval")} value={num(data?.staff.pending)} />
          <Kpi loading={busy} tone="info" icon={<KeyRound size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.access_configs", "Staff access configurations")} value={num(p?.staff_access_configs)} />
          <Kpi loading={busy} icon={<House size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.customers", "Customers")} value={num(p?.customers)} />
          <Kpi loading={busy} icon={<Truck size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.vehicles_total", "Vehicles")} value={num(p?.vehicles)} hint={`${num(data?.fleet.active)} ${t("admin.dashboards.active", "active")}`} />
          <Kpi loading={busy} tone="neutral" icon={<ListChecks size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.catalog", "Permission screens")} value={`${num(p?.screens_seeded)} / ${num(p?.screens)}`} hint={`${num(p?.modules)} ${t("admin.dashboards.modules", "modules")} · ${num(p?.app_modules)} ${t("admin.dashboards.app_modules", "app modules")}`} />
          <Kpi loading={busy} tone="neutral" icon={<Sparkles size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.integrations", "Projects with integrations")} value={`${num(p?.integrations.gps)} · ${num(p?.integrations.weighment)} · ${num(p?.integrations.attendance)}`} hint={t("admin.dashboards.integrations_hint", "GPS · weighment · attendance")} />
          <Kpi loading={busy} tone="neutral" icon={<ShieldCheck size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.platform_admins", "Platform admins")} value={num(p?.platform_admins)} />
        </KpiGrid>
      </Section>

      <Section id="sa-operations" icon={<Activity size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.operations", "Operations in this period")}>
        <KpiGrid>
          <Kpi loading={busy} tone="info" icon={<Route size={18} aria-hidden="true" />} progress={ops?.trips.completion_rate} label={t("admin.dashboards.kpi.trips", "Trips completed")} value={`${num(ops?.trips.completed)} / ${num(ops?.trips.total)}`} hint={`${pct(ops?.trips.completion_rate)} ${t("admin.dashboards.completion", "completion")}`} />
          <Kpi loading={busy} tone="info" icon={<ClipboardCheck size={18} aria-hidden="true" />} progress={ops?.trip_logs.verification_rate} label={t("admin.dashboards.kpi.trip_logs", "Daily trip logs")} value={num(ops?.trip_logs.total)} hint={`${pct(ops?.trip_logs.verification_rate)} ${t("admin.dashboards.verified", "verified")}`} />
          <Kpi loading={busy} icon={<House size={18} aria-hidden="true" />} progress={ops?.households.coverage_rate} label={t("admin.dashboards.kpi.households", "Households collected")} value={num(ops?.households.collected)} hint={`${pct(ops?.households.coverage_rate)} ${t("admin.dashboards.coverage", "coverage")}`} />
          <Kpi loading={busy} icon={<Trash2 size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.bins", "Bins collected")} value={num(ops?.bins.distinct_bins_collected)} />
          <Kpi loading={busy} tone={ops?.complaints.overdue_open ? "bad" : "warn"} icon={<MessageSquareWarning size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.open_complaints", "Open complaints")} value={num(ops?.complaints.open)} hint={`${num(ops?.complaints.raised)} ${t("admin.dashboards.raised", "raised")}`} />
          <Kpi loading={busy} tone={ops?.exceptions.breakdowns ? "bad" : "neutral"} icon={<TriangleAlert size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.exceptions", "Breakdowns / delays")} value={`${num(ops?.exceptions.breakdowns)} / ${num(ops?.exceptions.delays)}`} />
          <Kpi loading={busy} tone="info" icon={<LogIn size={18} aria-hidden="true" />} label={t("admin.dashboards.kpi.logins", "Sign-ins")} value={num(data?.activity.logins)} hint={`${num(data?.activity.active_users)} ${t("admin.dashboards.users", "users")} · ${num(data?.activity.failed_logins)} ${t("admin.dashboards.failed", "failed")}`} />
        </KpiGrid>
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Panel title={t("admin.dashboards.charts.waste_per_day", "Waste collected per day")}>
            <TrendChart
              labels={labels}
              stacked
              format={weight}
              series={[
                { label: t("admin.dashboards.household", "Household"), values: daily.map((d) => d.household_kg), color: "#1f9d47" },
                { label: t("admin.dashboards.bins", "Bins"), values: daily.map((d) => d.bin_kg), color: "#2f72c9" },
              ]}
            />
          </Panel>
          <Panel title={t("admin.dashboards.charts.trips_per_day", "Trips per day")}>
            <TrendChart
              labels={labels}
              series={[
                { label: t("admin.dashboards.scheduled", "Scheduled"), values: daily.map((d) => d.trips), color: "#c9dccf" },
                { label: t("admin.dashboards.completed", "Completed"), values: daily.map((d) => d.trips_completed), color: "#1f9d47" },
                { label: t("admin.dashboards.trip_logs", "Trip logs"), values: daily.map((d) => d.trip_logs), color: "#ef5a1c", type: "line" },
              ]}
            />
          </Panel>
          <Panel title={t("admin.dashboards.charts.logins_per_day", "Sign-ins per day")}>
            <TrendChart
              labels={labels}
              stacked
              series={[
                { label: t("admin.dashboards.success", "Successful"), values: (data?.activity.per_day ?? []).map((d) => d.success), color: "#1f9d47" },
                { label: t("admin.dashboards.failed", "Failed"), values: (data?.activity.per_day ?? []).map((d) => d.failed), color: "#d63b3b" },
              ]}
            />
          </Panel>
          <Panel title={t("admin.dashboards.charts.permission_changes", "Permission changes per day")}>
            <TrendChart
              labels={labels}
              series={[
                { label: t("admin.dashboards.changes", "Changes"), values: (data?.permissions.changes.per_day ?? []).map((d) => d.changes), color: "#7a5bd1" },
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section id="sa-companies" icon={<Building2 size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.companies", "Companies")} description={t("admin.dashboards.sections.companies_hint", "Click a company to open it in the Admin Dashboard")}>
        <div className={panelClass}>
          <DataTable<CompanyRow>
            rows={data?.companies ?? []}
            rowKey={(r) => r.company_id}
            fileName="superadmin-companies"
            initialSort="staff"
            columns={companyColumnsFor(t)}
          />
        </div>
      </Section>

      <Section id="sa-projects" icon={<FolderKanban size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.projects_all", "Projects")}>
        <div className={panelClass}>
          <DataTable<ProjectRow>
            rows={data?.projects ?? []}
            rowKey={(r) => r.project_id}
            fileName="superadmin-projects"
            initialSort="total_kg"
            columns={projectColumnsFor(t)}
          />
        </div>
      </Section>

      <Section id="sa-permissions" icon={<KeyRound size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.permissions", "Permissions")}>
        <PermissionExplorer grants={data?.permissions.company_grants ?? []} loading={busy} />
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title={t("admin.dashboards.staff_grants", "Staff holding each screen (view)")}>
            <DataTable<StaffGrantRow>
              rows={data?.permissions.staff_grants ?? []}
              rowKey={(r) => `${r.company_id}|${r.module}|${r.screen}`}
              fileName="superadmin-staff-grants"
              initialSort="staff"
              columns={[
                { key: "company", header: t("admin.dashboards.company", "Company"), value: (r) => r.company_name },
                { key: "module", header: t("admin.dashboards.module", "Module"), value: (r) => r.module_label },
                { key: "screen", header: t("admin.dashboards.screen", "Screen"), value: (r) => r.screen_label },
                { key: "staff", header: t("admin.dashboards.staff_col", "Staff"), value: (r) => r.staff_with_view, align: "right" },
              ]}
            />
          </Panel>
          <Panel title={t("admin.dashboards.permission_changes", "Permission changes in this period")}>
            <div className="mb-2 text-[24px] font-semibold">{num(data?.permissions.changes.total)}</div>
            <div className="mb-1 text-xs text-[#66756b] dark:text-[#9aaba0]">{t("admin.dashboards.by_source", "By source")}</div>
            <StatusPills counts={data?.permissions.changes.by_source ?? {}} />
            <div className="mb-1 mt-2.5 text-xs text-[#66756b] dark:text-[#9aaba0]">{t("admin.dashboards.by_action", "By action")}</div>
            <StatusPills counts={data?.permissions.changes.by_action ?? {}} tones={{ CREATED: "ok", UPDATED: "info", DELETED: "bad" }} />
            <div className="mb-1 mt-2.5 text-xs text-[#66756b] dark:text-[#9aaba0]">{t("admin.dashboards.by_company", "By company")}</div>
            <StatusPills counts={data?.permissions.changes.by_company ?? {}} />
          </Panel>
        </div>
      </Section>

      <Section id="sa-people" icon={<LogIn size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.people", "Staff and sign-ins")}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Panel title={t("admin.dashboards.staff_by_role", "Staff by role")}>
            <SplitChart counts={data?.staff.by_role ?? {}} labelFor={(k) => k} />
          </Panel>
          <Panel className="xl:col-span-2" title={t("admin.dashboards.staff_by_project_role", "Staff by company, project and role")}>
            <DataTable<RoleRow>
              rows={data?.staff_by_role ?? []}
              rowKey={(r) => `${r.company_id}|${r.project_id}|${r.role}`}
              fileName="superadmin-staff-by-role"
              columns={[
                { key: "company", header: t("admin.dashboards.company", "Company"), value: (r) => r.company_name },
                { key: "project", header: t("admin.dashboards.project", "Project"), value: (r) => r.project_name },
                { key: "role", header: t("admin.dashboards.role", "Role"), value: (r) => r.role },
                { key: "staff", header: t("admin.dashboards.staff_col", "Staff"), value: (r) => r.staff, align: "right" },
              ]}
            />
          </Panel>
        </div>
      </Section>

      <Section id="sa-masters" icon={<Database size={17} aria-hidden="true" />} title={t("admin.dashboards.sections.masters", "Master data")}>
        <MasterCounts rows={data?.masters ?? []} columns={companyColumns} by="company" loading={loading} />
      </Section>
    </div>
  );
}

const ACTIONS = ["view", "add", "edit", "delete", "use"] as const;

/** Which screens, with which actions, each company/project is enabled for:
 * pick a company and project, then a module on the left; the right side is
 * a screen × action matrix. */
function PermissionExplorer({ grants, loading }: { grants: CompanyGrant[]; loading: boolean }) {
  const { t } = useTranslation();
  const [companyId, setCompanyId] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [moduleKey, setModuleKey] = useState("");
  const [query, setQuery] = useState("");

  const companies = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of grants) map.set(g.company_id, g.company_name);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [grants]);
  const company = companies.find((c) => c.id === companyId)?.id ?? companies[0]?.id ?? "";
  const projects = grants.filter((g) => g.company_id === company);
  const current = projects.find((g) => (g.project_id ?? "") === projectKey) ?? projects[0];
  const modules = current?.modules ?? [];
  const needle = query.trim().toLowerCase();

  const isFull = (actions: string[]) => ACTIONS.every((a) => actions.includes(a));
  const screens = modules.flatMap((m) => m.screens);
  const full = screens.filter((s) => isFull(s.actions)).length;
  const viewOnly = screens.filter((s) => s.actions.length === 1 && s.actions[0] === "view").length;
  const coverage = Math.min(current?.coverage ?? 0, 100);

  const shown = modules
    .filter((m) => !moduleKey || m.module === moduleKey)
    .map((m) => ({
      ...m,
      screens: m.screens.filter((s) => !needle || `${m.label} ${s.label}`.toLowerCase().includes(needle)),
    }))
    .filter((m) => m.screens.length);

  const projectOptions = projects.map((g) => ({
    id: g.project_id ?? "",
    name: g.project_id ? g.project_name : t("admin.dashboards.company_wide", "Company-wide (all projects)"),
  }));

  return (
    <div className={panelClass}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="m-0 text-[15px] font-semibold">
            {t("admin.dashboards.company_permissions", "Company and project permissions")}
          </h3>
          <p className={`m-0 text-xs ${mutedClass}`}>
            {t("admin.dashboards.company_permissions_hint", "Screens and actions enabled in Companywise User Screen Permission")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Filter label={t("admin.dashboards.company", "Company")}>
            <SingleSelect
              label={t("admin.dashboards.company", "Company")}
              icon={<Building2 className="h-4 w-4 shrink-0 text-[#4338ca]" aria-hidden="true" />}
              options={companies}
              value={company}
              onChange={(id) => {
                setCompanyId(id);
                setProjectKey("");
                setModuleKey("");
              }}
            />
          </Filter>
          <Filter label={t("admin.dashboards.project", "Project")}>
            <SingleSelect
              label={t("admin.dashboards.project", "Project")}
              icon={<FolderKanban className="h-4 w-4 shrink-0 text-[#4338ca]" aria-hidden="true" />}
              options={projectOptions}
              value={current?.project_id ?? ""}
              onChange={(id) => {
                setProjectKey(id);
                setModuleKey("");
              }}
              disabled={projectOptions.length < 2}
            />
          </Filter>
        </div>
      </div>

      {loading ? (
        <div className={mutedClass}>…</div>
      ) : !current ? (
        <div className={mutedClass}>{t("admin.dashboards.no_grants", "No company has been given any screen yet.")}</div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-[#e4e6f5] p-3 dark:border-[#2b2a52]">
              <div className={`text-xs ${mutedClass}`}>{t("admin.dashboards.coverage_title", "Catalog coverage")}</div>
              <div className="text-[20px] font-bold tabular-nums">{pct(coverage)}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef0ff] dark:bg-[#23224a]">
                <div className="h-1.5 rounded-full bg-[#4338ca]" style={{ width: `${coverage}%` }} />
              </div>
            </div>
            <PermStat label={t("admin.dashboards.screens_enabled", "Screens enabled")} value={num(current.screens_enabled)} />
            <PermStat label={t("admin.dashboards.full_access", "Full access")} value={num(full)} />
            <PermStat label={t("admin.dashboards.view_only", "View only")} value={num(viewOnly)} />
          </div>

          <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-[#e4e6f5] md:grid-cols-[240px_1fr] dark:border-[#2b2a52]">
            <nav className="max-h-[520px] overflow-y-auto border-b border-[#e4e6f5] bg-[#fafafe] p-2 md:border-b-0 md:border-r dark:border-[#2b2a52] dark:bg-[#18172f]">
              <ModuleButton
                active={!moduleKey}
                label={t("admin.dashboards.all_modules", "All modules")}
                count={screens.length}
                onClick={() => setModuleKey("")}
              />
              {modules.map((m) => (
                <ModuleButton
                  key={m.module}
                  active={moduleKey === m.module}
                  label={m.label}
                  count={m.screens.length}
                  complete={m.screens.every((s) => isFull(s.actions))}
                  onClick={() => setModuleKey(m.module)}
                />
              ))}
            </nav>
            <div className="min-w-0">
              <div className="flex items-center gap-2 border-b border-[#e4e6f5] p-2 dark:border-[#2b2a52]">
                <div className="relative flex-1">
                  <Search size={14} aria-hidden="true" className={`absolute left-3 top-1/2 -translate-y-1/2 ${mutedClass}`} />
                  <input
                    type="search"
                    aria-label={t("admin.dashboards.search_screens", "Search screens")}
                    placeholder={t("admin.dashboards.search_screens", "Search screens")}
                    className={`${inputClass} w-full pl-9`}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-[464px] overflow-auto">
                {!shown.length ? (
                  <div className={`py-10 text-center ${mutedClass}`}>{t("admin.dashboards.no_rows", "Nothing to show")}</div>
                ) : (
                  <table className="w-full min-w-[520px] border-collapse text-[13px]">
                    <thead className="sticky top-0 z-10 bg-white dark:bg-[#17221b]">
                      <tr>
                        <th className={`border-b border-[#e4e6f5] px-3 py-2 text-left text-xs font-medium dark:border-[#2b2a52] ${mutedClass}`}>
                          {t("admin.dashboards.screen", "Screen")}
                        </th>
                        {ACTIONS.map((a) => (
                          <th key={a} className={`w-16 border-b border-[#e4e6f5] px-2 py-2 text-center text-xs font-medium capitalize dark:border-[#2b2a52] ${mutedClass}`}>
                            {a}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((m) => (
                        <ModuleRows key={m.module} label={m.label} showLabel={!moduleKey} screens={m.screens} />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ModuleButton({
  active,
  label,
  count,
  complete,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  complete?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
        active
          ? "bg-[#4338ca] font-medium text-white"
          : "text-[#3c4b41] hover:bg-[#eef0ff] dark:text-[#c5d3ca] dark:hover:bg-[#23224a]"
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {complete && !active ? <CircleCheck size={13} aria-hidden="true" className="shrink-0 text-[#1f9d47]" /> : null}
      <span className={`shrink-0 text-[11px] tabular-nums ${active ? "text-white/80" : mutedClass}`}>{count}</span>
    </button>
  );
}

function ModuleRows({
  label,
  showLabel,
  screens,
}: {
  label: string;
  showLabel: boolean;
  screens: { name: string; label: string; actions: string[] }[];
}) {
  return (
    <>
      {showLabel ? (
        <tr>
          <td colSpan={ACTIONS.length + 1} className="bg-[#f7f7fd] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#4338ca] dark:bg-[#1c1b38] dark:text-[#c7c9ff]">
            {label}
          </td>
        </tr>
      ) : null}
      {screens.map((s) => (
        <tr key={s.name} className="hover:bg-[#fafafe] dark:hover:bg-[#1c1b38]">
          <td className="border-b border-[#f0f1f8] px-3 py-2 dark:border-[#22213f]">{s.label}</td>
          {ACTIONS.map((a) => (
            <td key={a} className="border-b border-[#f0f1f8] px-2 py-2 text-center dark:border-[#22213f]">
              {s.actions.includes(a) ? (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e3f6e8] text-[#167a37] dark:bg-green-900/40 dark:text-green-300">
                  <Check size={12} strokeWidth={3} aria-label={a} />
                </span>
              ) : (
                <Minus size={14} aria-label={`no ${a}`} className="inline text-gray-300 dark:text-gray-600" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const PermStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-[#e4e6f5] p-3 dark:border-[#2b2a52]">
    <div className={`text-xs ${mutedClass}`}>{label}</div>
    <div className="text-[20px] font-bold tabular-nums">{value}</div>
  </div>
);

const companyColumnsFor = (t: T): Column<CompanyRow>[] => [
  {
    key: "company",
    header: t("admin.dashboards.company", "Company"),
    value: (r) => r.company_name,
    render: (r) => (
      <Two
        main={
          <span className="inline-flex items-center gap-1.5">
            <Link
              to={`/admin?company=${encodeURIComponent(r.company_id)}`}
              className="font-medium text-[#4338ca] hover:underline dark:text-[#c7c9ff]"
            >
              {r.company_name}
            </Link>
            {!r.is_active ? <Badge tone="bad">{t("admin.dashboards.inactive", "inactive")}</Badge> : null}
          </span>
        }
        sub={`${num(r.projects)} ${t("admin.dashboards.projects_lc", "projects")} · ${num(r.projects_active)} ${t("admin.dashboards.active", "active")}`}
      />
    ),
  },
  {
    key: "staff",
    header: t("admin.dashboards.staff_col", "Staff"),
    value: (r) => r.staff,
    render: (r) => (
      <Two
        main={`${num(r.staff_active)} / ${num(r.staff)} ${t("admin.dashboards.active", "active")}`}
        sub={`${num(r.staff_login_enabled)} ${t("admin.dashboards.login_enabled", "can sign in")} · ${num(r.staff_pending)} ${t("admin.dashboards.pending_lc", "pending")}`}
      />
    ),
    align: "right",
  },
  {
    key: "configured",
    header: t("admin.dashboards.access", "Access"),
    value: (r) => r.staff_configured,
    render: (r) => (
      <Two
        main={`${num(r.staff_configured)} ${t("admin.dashboards.configured_lc", "configured")}`}
        sub={r.staff_without_grants ? `${num(r.staff_without_grants)} ${t("admin.dashboards.no_grants_lc", "without grants")}` : undefined}
      />
    ),
    align: "right",
  },
  {
    key: "screens",
    header: t("admin.dashboards.screens_enabled", "Screens enabled"),
    value: (r) => r.screen_coverage,
    render: (r) => <Meter value={r.screen_coverage} label={`${num(r.screens_enabled)} · ${pct(r.screen_coverage)}`} />,
    align: "right",
  },
  {
    key: "completion",
    header: t("admin.dashboards.trips", "Trips"),
    value: (r) => r.completion_rate,
    render: (r) => <Meter value={r.completion_rate} label={`${num(r.trips_completed)} / ${num(r.trips)}`} />,
    align: "right",
  },
  {
    key: "waste",
    header: t("admin.dashboards.waste", "Waste"),
    value: (r) => r.total_kg,
    render: (r) => <Two main={weight(r.total_kg)} sub={`${num(r.open_complaints)} ${t("admin.dashboards.open_complaints_lc", "open complaints")}`} />,
    align: "right",
  },
  {
    key: "logins",
    header: t("admin.dashboards.logins", "Sign-ins"),
    value: (r) => r.logins,
    render: (r) => (
      <Two
        main={`${num(r.logins)}${r.failed_logins ? ` · ${num(r.failed_logins)} ${t("admin.dashboards.failed", "failed")}` : ""}`}
        sub={dateTime(r.last_login)}
      />
    ),
    align: "right",
  },
  // CSV only:
  ...(
    [
      ["projects", "Projects", (r: CompanyRow) => r.projects],
      ["staff_total", "Staff", (r: CompanyRow) => r.staff],
      ["staff_active", "Active staff", (r: CompanyRow) => r.staff_active],
      ["staff_login", "Can sign in", (r: CompanyRow) => r.staff_login_enabled],
      ["staff_pending", "Pending", (r: CompanyRow) => r.staff_pending],
      ["no_grants", "No grants", (r: CompanyRow) => r.staff_without_grants],
      ["screens_n", "Screens enabled", (r: CompanyRow) => r.screens_enabled],
      ["modules", "Modules", (r: CompanyRow) => r.modules_enabled],
      ["customers", "Customers", (r: CompanyRow) => r.customers],
      ["vehicles", "Vehicles", (r: CompanyRow) => r.vehicles],
      ["trips_n", "Trips", (r: CompanyRow) => r.trips],
      ["trips_done", "Completed", (r: CompanyRow) => r.trips_completed],
      ["kg", "Waste (kg)", (r: CompanyRow) => r.total_kg],
      ["complaints", "Open complaints", (r: CompanyRow) => r.open_complaints],
      ["failed", "Failed sign-ins", (r: CompanyRow) => r.failed_logins],
      ["last_login", "Last sign-in", (r: CompanyRow) => r.last_login ?? ""],
    ] as const
  ).map(([key, header, value]) => ({ key, header, value, exportOnly: true })),
];

const projectColumnsFor = (t: T): Column<ProjectRow>[] => [
  {
    key: "project",
    header: t("admin.dashboards.project", "Project"),
    value: (r) => r.project_name,
    render: (r) => <Two main={r.project_name} sub={r.company_name} />,
  },
  { key: "company", header: t("admin.dashboards.company", "Company"), value: (r) => r.company_name ?? "", exportOnly: true },
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
  {
    key: "completion",
    header: t("admin.dashboards.trips", "Trips"),
    value: (r) => r.completion_rate,
    render: (r) => <Meter value={r.completion_rate} label={`${num(r.trips_completed)} / ${num(r.trips)}`} />,
    align: "right",
  },
  {
    key: "total_kg",
    header: t("admin.dashboards.waste", "Waste"),
    value: (r) => r.total_kg,
    render: (r) => <Two main={weight(r.total_kg)} sub={`${num(r.open_complaints)} ${t("admin.dashboards.open_complaints_lc", "open complaints")}`} />,
    align: "right",
  },
  { key: "screens", header: t("admin.dashboards.screens", "Screens"), value: (r) => r.screens_enabled ?? 0, align: "right" },
  {
    key: "integrations",
    header: t("admin.dashboards.integrations", "Integrations"),
    value: (r) =>
      Object.entries(r.integrations ?? {})
        .filter(([, on]) => on)
        .map(([k]) => k)
        .join(" "),
    render: (r) => (
      <span className="flex flex-wrap gap-1">
        {Object.entries(r.integrations ?? {}).map(([key, on]) => (
          <Badge key={key} tone={on ? "ok" : "neutral"}>
            {humanize(key)}
          </Badge>
        ))}
      </span>
    ),
  },
  ...(
    [
      ["staff_n", "Staff", (r: ProjectRow) => r.staff],
      ["vehicles", "Vehicles", (r: ProjectRow) => r.vehicles],
      ["customers", "Customers", (r: ProjectRow) => r.customers],
      ["bins", "Bins (master)", (r: ProjectRow) => r.bins],
      ["trips", "Trips", (r: ProjectRow) => r.trips],
      ["trips_done", "Completed", (r: ProjectRow) => r.trips_completed],
      ["kg", "Waste (kg)", (r: ProjectRow) => r.total_kg],
      ["complaints", "Open complaints", (r: ProjectRow) => r.open_complaints],
    ] as const
  ).map(([key, header, value]) => ({ key, header, value, exportOnly: true })),
];
