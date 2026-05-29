import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Briefcase,
  Building,
  Building2,
  ClipboardList,
  Database,
  Flag,
  GitBranch,
  Globe,
  Home,
  Key,
  Layers3,
  Map,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Tag,
  Truck,
  Users,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  areaTypeApi,
  binApi,
  cityApi,
  collectionPointApi,
  columnPermissionApi,
  companyApi,
  complaintApi,
  continentApi,
  countryApi,
  customerCreationApi,
  departmentApi,
  designationApi,
  districtApi,
  feedbackApi,
  fuelApi,
  hierarchyApi,
  mainCategoryApi,
  mainScreenApi,
  mainScreenTypeApi,
  panchayatApi,
  projectApi,
  propertiesApi,
  staffCreationApi,
  staffUserTypeApi,
  stateApi,
  subCategoryApi,
  subPropertiesApi,
  userCreationApi,
  userScreenActionApi,
  userScreenApi,
  userScreenPermissionApi,
  userTypeApi,
  vehicleCreationApi,
  vehicleTypeApi,
  wasteCollectionApi,
  wasteTypeApi,
  wardApi,
  zoneApi,
} from "@/helpers/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityKey =
  | "companies" | "projects" | "continents" | "countries" | "states"
  | "districts" | "cities" | "zones" | "wards" | "panchayats"
  | "departments" | "designations" | "areaTypes" | "hierarchies"
  | "properties" | "subProperties" | "collectionPoints"
  | "wasteTypes" | "bins" | "users" | "userTypes" | "staffUserTypes"
  | "staff" | "customers" | "vehicleTypes" | "vehicles" | "fuels"
  | "wasteCollections" | "complaints" | "feedbacks"
  | "mainCategories" | "subCategories" | "mainScreenTypes"
  | "mainScreens" | "userScreens" | "screenActions"
  | "screenPermissions" | "columnPermissions";

type DashboardData = Record<EntityKey, Record<string, unknown>[]>;

type KpiConfig = {
  title: string;
  value: number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bg: string;
};

type MainScreenRow = {
  id: string;
  name: string;
  type: string;
  userScreenNames: string[];
  userScreenCount: number;
  roles: string[];
  active: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MASTER_CATEGORIES: Array<{
  label: string;
  key: EntityKey;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  group: "Geography" | "Organisation" | "Waste";
}> = [
  { label: "Continents", key: "continents", color: "#6366f1", icon: Globe, group: "Geography" },
  { label: "Countries", key: "countries", color: "#3b82f6", icon: Flag, group: "Geography" },
  { label: "States", key: "states", color: "#0ea5e9", icon: Map, group: "Geography" },
  { label: "Districts", key: "districts", color: "#14b8a6", icon: MapPin, group: "Geography" },
  { label: "Cities", key: "cities", color: "#10b981", icon: Building, group: "Geography" },
  { label: "Zones", key: "zones", color: "#22c55e", icon: Layers3, group: "Geography" },
  { label: "Wards", key: "wards", color: "#84cc16", icon: Home, group: "Geography" },
  { label: "Panchayats", key: "panchayats", color: "#eab308", icon: Home, group: "Geography" },
  { label: "Departments", key: "departments", color: "#f97316", icon: Briefcase, group: "Organisation" },
  { label: "Designations", key: "designations", color: "#ef4444", icon: Tag, group: "Organisation" },
  { label: "Area Types", key: "areaTypes", color: "#ec4899", icon: Tag, group: "Organisation" },
  { label: "Hierarchies", key: "hierarchies", color: "#8b5cf6", icon: GitBranch, group: "Organisation" },
  { label: "Properties", key: "properties", color: "#a855f7", icon: Key, group: "Waste" },
  { label: "Sub Properties", key: "subProperties", color: "#7c3aed", icon: Workflow, group: "Waste" },
];

const ROLE_DISPLAY: Record<string, { bg: string; text: string; label: string }> = {
  company_admin: { bg: "bg-purple-100", text: "text-purple-700", label: "Co. Admin" },
  company_operator: { bg: "bg-blue-100", text: "text-blue-700", label: "Operator" },
  company_driver: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Driver" },
  company_supervisor: { bg: "bg-amber-100", text: "text-amber-700", label: "Supervisor" },
  company_user: { bg: "bg-slate-100", text: "text-slate-600", label: "User" },
  company_project_admin: { bg: "bg-rose-100", text: "text-rose-700", label: "Proj. Admin" },
  contractor_admin: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Cont. Admin" },
  contractor_supervisor: { bg: "bg-cyan-100", text: "text-cyan-700", label: "Cont. Supervisor" },
  contractor_operator: { bg: "bg-teal-100", text: "text-teal-700", label: "Cont. Operator" },
  contractor_worker: { bg: "bg-orange-100", text: "text-orange-700", label: "Cont. Worker" },
  contractor_driver: { bg: "bg-lime-100", text: "text-lime-700", label: "Cont. Driver" },
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#0f766e", "#ea580c", "#ec4899", "#6366f1"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyData = (): DashboardData => ({
  companies: [], projects: [], continents: [], countries: [], states: [],
  districts: [], cities: [], zones: [], wards: [], panchayats: [],
  departments: [], designations: [], areaTypes: [], hierarchies: [],
  properties: [], subProperties: [], collectionPoints: [],
  wasteTypes: [], bins: [], users: [], userTypes: [], staffUserTypes: [],
  staff: [], customers: [], vehicleTypes: [], vehicles: [], fuels: [],
  wasteCollections: [], complaints: [], feedbacks: [],
  mainCategories: [], subCategories: [], mainScreenTypes: [],
  mainScreens: [], userScreens: [], screenActions: [],
  screenPermissions: [], columnPermissions: [],
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const toRows = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.results)) return value.results.filter(isRecord);
  return [];
};

const isActive = (row: Record<string, unknown>) =>
  row.is_active !== false && row.is_deleted !== true;

const getLabel = (row: Record<string, unknown>, fallback: string) =>
  String(row.mainscreen_name ?? row.mainScreenName ?? row.module_name ?? row.name ?? row.screen_name ?? row.title ?? row.unique_id ?? fallback);

const getNestedId = (row: Record<string, unknown>, field: string): string => {
  const val = row[field];
  if (typeof val === "string" || typeof val === "number") return String(val);
  if (isRecord(val)) return String(val.id ?? val.unique_id ?? "");
  return "";
};

const extractUserTypeName = (permission: Record<string, unknown>): string => {
  if (typeof permission.user_type_name === "string") return permission.user_type_name;
  if (typeof permission.user_type__user_type_name === "string") return permission.user_type__user_type_name;
  if (isRecord(permission.user_type)) {
    const ut = permission.user_type as Record<string, unknown>;
    return String(ut.user_type_name ?? ut.name ?? ut.unique_id ?? "");
  }
  if (typeof permission.user_type === "string") return permission.user_type;
  return "";
};

const entityRequests: Array<[EntityKey, () => Promise<unknown>]> = [
  ["companies", () => companyApi.list()],
  ["projects", () => projectApi.list()],
  ["continents", () => continentApi.list()],
  ["countries", () => countryApi.list()],
  ["states", () => stateApi.list()],
  ["districts", () => districtApi.list()],
  ["cities", () => cityApi.list()],
  ["zones", () => zoneApi.list()],
  ["wards", () => wardApi.list()],
  ["panchayats", () => panchayatApi.list()],
  ["departments", () => departmentApi.list()],
  ["designations", () => designationApi.list()],
  ["areaTypes", () => areaTypeApi.list()],
  ["hierarchies", () => hierarchyApi.list()],
  ["properties", () => propertiesApi.list()],
  ["subProperties", () => subPropertiesApi.list()],
  ["collectionPoints", () => collectionPointApi.list()],
  ["wasteTypes", () => wasteTypeApi.list()],
  ["bins", () => binApi.list()],
  ["users", () => userCreationApi.list()],
  ["userTypes", () => userTypeApi.list()],
  ["staffUserTypes", () => staffUserTypeApi.list()],
  ["staff", () => staffCreationApi.list()],
  ["customers", () => customerCreationApi.list()],
  ["vehicleTypes", () => vehicleTypeApi.list()],
  ["vehicles", () => vehicleCreationApi.list()],
  ["fuels", () => fuelApi.list()],
  ["wasteCollections", () => wasteCollectionApi.list()],
  ["complaints", () => complaintApi.list()],
  ["feedbacks", () => feedbackApi.list()],
  ["mainCategories", () => mainCategoryApi.list()],
  ["subCategories", () => subCategoryApi.list()],
  ["mainScreenTypes", () => mainScreenTypeApi.list()],
  ["mainScreens", () => mainScreenApi.list()],
  ["userScreens", () => userScreenApi.list()],
  ["screenActions", () => userScreenActionApi.list()],
  ["screenPermissions", () => userScreenPermissionApi.list()],
  ["columnPermissions", () => columnPermissionApi.list()],
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminHome() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    const next = emptyData();
    try {
      const results = await Promise.allSettled(entityRequests.map(([, req]) => req()));
      results.forEach((result, i) => {
        const key = entityRequests[i][0];
        next[key] = result.status === "fulfilled" ? toRows(result.value) : [];
      });
      setData(next);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchDashboardData(); }, []);

  const dashboard = useMemo(() => {
    const geographyTotal = data.continents.length + data.countries.length + data.states.length +
      data.districts.length + data.cities.length + data.zones.length + data.wards.length + data.panchayats.length;
    const orgTotal = data.departments.length + data.designations.length + data.areaTypes.length + data.hierarchies.length;
    const wasteTotal = data.properties.length + data.subProperties.length;
    const masterTotal = geographyTotal + orgTotal + wasteTotal;
    const assetTotal = data.collectionPoints.length + data.wasteTypes.length + data.bins.length;
    const workforceTotal = data.users.length + data.staff.length + data.customers.length;
    const transportTotal = data.vehicleTypes.length + data.vehicles.length + data.fuels.length;
    const grievanceTotal = data.complaints.length + data.feedbacks.length + data.mainCategories.length + data.subCategories.length;
    const screenTotal = data.mainScreenTypes.length + data.mainScreens.length + data.userScreens.length + data.screenActions.length;
    const permissionTotal = data.screenPermissions.length + data.columnPermissions.length;

    const activeUsers = data.users.filter(isActive).length;
    const activeStaff = data.staff.filter(isActive).length;
    const activeBins = data.bins.filter(isActive).length;
    const activeVehicles = data.vehicles.filter(isActive).length;
    const activeComplaints = data.complaints.filter((c) => {
      const status = String(c.status ?? c.complaint_status ?? "").toLowerCase();
      return !["closed", "resolved", "completed"].includes(status);
    }).length;

    // Module bar chart data
    const moduleNames = ["Masters", "Assets", "Users", "Transport", "Grievance", "Screens", "Permissions"];
    const moduleValues = [masterTotal, assetTotal, workforceTotal, transportTotal, grievanceTotal, screenTotal, permissionTotal];
    const moduleLoadData = moduleNames.map((name, i) => ({ name, value: moduleValues[i], color: CHART_COLORS[i] }));

    // Users donut data
    const userDonutLabels = ["Users", "Active Users", "Staff", "Customers", "User Types"];
    const userDonutSeries = [data.users.length, activeUsers, data.staff.length, data.customers.length, data.userTypes.length];

    // Grievance area data
    const grievanceCategories = ["Complaints", "Open/Active", "Feedback", "Categories"];
    const grievanceSeries = [data.complaints.length, activeComplaints, data.feedbacks.length, data.mainCategories.length + data.subCategories.length];

    // Asset radial data
    const maxAsset = Math.max(data.collectionPoints.length, data.wasteTypes.length, data.bins.length, activeBins, 1);
    const assetRadialSeries = [
      Math.round((data.collectionPoints.length / maxAsset) * 100),
      Math.round((data.wasteTypes.length / maxAsset) * 100),
      Math.round((data.bins.length / maxAsset) * 100),
      Math.round((activeBins / maxAsset) * 100),
    ];

    // Screen donut data
    const screenDonutLabels = ["Screen Types", "Main Screens", "User Screens", "Actions"];
    const screenDonutSeries = [data.mainScreenTypes.length, data.mainScreens.length, data.userScreens.length, data.screenActions.length];

    // User screens by module (enhanced table)
    const mainScreenDetails: MainScreenRow[] = data.mainScreens.map((screen, index) => {
      const screenId = String(screen.id ?? screen.unique_id ?? "");
      const screenName = getLabel(screen, `Main Screen ${index + 1}`);

      const typeId = String(screen.mainscreen_type_id ?? screen.mainscreen_type ?? "");
      const typeObj = data.mainScreenTypes.find((t) => String(t.id ?? t.unique_id ?? "") === typeId);
      const typeName = typeObj ? getLabel(typeObj, "General") : (typeId || "General");

      const linkedUserScreens = data.userScreens.filter((us) => {
        const usMainId = getNestedId(us, "mainscreen_id") || String(us.main_screen_id ?? "");
        return usMainId && screenId && usMainId === screenId;
      });

      const userScreenNames = linkedUserScreens.map((us, i) => getLabel(us, `Screen ${i + 1}`));

      const linkedPermissions = data.screenPermissions.filter((p) => {
        const pMainId = getNestedId(p, "mainscreen_id") || String(p.main_screen_id ?? "");
        return pMainId && screenId && pMainId === screenId;
      });

      const roles = [...new Set(linkedPermissions.map(extractUserTypeName).filter(Boolean))];

      return {
        id: screenId,
        name: screenName,
        type: typeName,
        userScreenNames,
        userScreenCount: linkedUserScreens.length,
        roles,
        active: screen.is_active !== false,
      };
    });

    return {
      totals: {
        masterTotal, assetTotal, workforceTotal, transportTotal, grievanceTotal,
        screenTotal, permissionTotal, geographyTotal,
        activeUsers, activeStaff, activeBins, activeVehicles, activeComplaints,
      },
      charts: {
        moduleNames, moduleValues, moduleLoadData,
        userDonutLabels, userDonutSeries,
        grievanceCategories, grievanceSeries,
        assetRadialSeries, maxAsset,
        screenDonutLabels, screenDonutSeries,
      },
      mainScreenDetails,
    };
  }, [data]);

  const kpis: KpiConfig[] = [
    {
      title: "Total Masters",
      value: dashboard.totals.masterTotal,
      detail: `${dashboard.totals.geographyTotal} geography · ${dashboard.totals.masterTotal - dashboard.totals.geographyTotal} org`,
      icon: Database,
      gradient: "from-indigo-600 to-blue-500",
      bg: "bg-indigo-50",
    },
    {
      title: "Active Users",
      value: dashboard.totals.activeUsers,
      detail: `${dashboard.totals.activeStaff} active staff · ${data.customers.length} customers`,
      icon: Users,
      gradient: "from-emerald-600 to-teal-500",
      bg: "bg-emerald-50",
    },
    {
      title: "Fleet & Transport",
      value: dashboard.totals.transportTotal,
      detail: `${data.vehicles.length} vehicles · ${dashboard.totals.activeVehicles} active`,
      icon: Truck,
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
    },
    {
      title: "Assets",
      value: dashboard.totals.assetTotal,
      detail: `${dashboard.totals.activeBins} active bins · ${data.collectionPoints.length} collection points`,
      icon: Boxes,
      gradient: "from-cyan-600 to-sky-500",
      bg: "bg-cyan-50",
    },
    {
      title: "Open Grievances",
      value: dashboard.totals.activeComplaints,
      detail: `${data.complaints.length} total complaints · ${data.feedbacks.length} feedbacks`,
      icon: AlertTriangle,
      gradient: "from-rose-600 to-red-500",
      bg: "bg-rose-50",
    },
    {
      title: "Screen Coverage",
      value: dashboard.totals.screenTotal,
      detail: `${data.mainScreens.length} main screens · ${data.userScreens.length} user screens`,
      icon: Layers3,
      gradient: "from-violet-600 to-purple-500",
      bg: "bg-violet-50",
    },
    {
      title: "Customers",
      value: data.customers.length,
      detail: `${data.userTypes.length} user types · ${data.staffUserTypes.length} staff types`,
      icon: Building2,
      gradient: "from-pink-600 to-rose-500",
      bg: "bg-pink-50",
    },
    {
      title: "Waste Collections",
      value: data.wasteCollections.length,
      detail: `${data.wasteTypes.length} waste types · ${data.properties.length} properties`,
      icon: Activity,
      gradient: "from-lime-600 to-green-500",
      bg: "bg-lime-50",
    },
  ];

  // ─── ApexChart Options ──────────────────────────────────────────────────────


  const userDonutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: dashboard.charts.userDonutLabels,
    colors: ["#3b82f6", "#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6"],
    legend: { position: "bottom", fontSize: "12px" },
    plotOptions: {
      pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total", fontSize: "14px", fontWeight: "600" as unknown as number, color: "#0f172a" } } } },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => v.toLocaleString() } },
  };

  const grievanceAreaOptions: ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 100] } },
    colors: ["#ef4444"],
    xaxis: { categories: dashboard.charts.grievanceCategories, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { show: false },
    grid: { borderColor: "#fef2f2", strokeDashArray: 4 },
    dataLabels: { enabled: true, style: { colors: ["#ef4444"], fontSize: "13px", fontWeight: "700" } },
    markers: { size: 5, colors: ["#ef4444"], strokeWidth: 2, strokeColors: "#fff" },
    tooltip: { y: { formatter: (v) => v.toLocaleString() } },
  };
  const grievanceAreaSeries = [{ name: "Count", data: dashboard.charts.grievanceSeries }];

  const assetRadialOptions: ApexOptions = {
    chart: { type: "radialBar", fontFamily: "inherit" },
    plotOptions: {
      radialBar: {
        hollow: { size: "20%", margin: 5 },
        track: { background: "#f1f5f9", strokeWidth: "80%", margin: 4 },
        dataLabels: { show: false },
      },
    },
    labels: ["Collection Pts", "Waste Types", "Bins", "Active Bins"],
    colors: ["#10b981", "#0ea5e9", "#f59e0b", "#3b82f6"],
    stroke: { lineCap: "round" },
  };

  const screenDonutOptions: ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: dashboard.charts.screenDonutLabels,
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
    legend: { position: "bottom", fontSize: "12px" },
    plotOptions: { pie: { donut: { size: "60%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => v.toLocaleString() } },
  };

  const hasUserData = dashboard.charts.userDonutSeries.some((v) => v > 0);
  const hasGrievanceData = dashboard.charts.grievanceSeries.some((v) => v > 0);
  const hasAssetData = dashboard.charts.assetRadialSeries.some((v) => v > 0);
  const hasScreenData = dashboard.charts.screenDonutSeries.some((v) => v > 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-slate-50/70">
      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-emerald-950">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-violet-500/10 blur-2xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  Integrated Waste Management System
                </p>
              </div>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">Admin Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Live view of masters, assets, workforce, grievances, transport, screens, and permission configuration.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs text-slate-400">
                <span className="text-slate-500">Updated: </span>
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "Not yet"}
              </div>
              <Button
                onClick={fetchDashboardData}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
              >
                <RefreshCw className={loading ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Header quick stats */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Masters", value: dashboard.totals.masterTotal, color: "text-blue-300" },
              { label: "Active Users", value: dashboard.totals.activeUsers, color: "text-emerald-300" },
              { label: "Vehicles", value: data.vehicles.length, color: "text-amber-300" },
              { label: "Open Grievances", value: dashboard.totals.activeComplaints, color: "text-rose-300" },
            ].map(({ label, value, color }, idx) => (
              <div key={`${label}-${idx}`} className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 backdrop-blur-sm">
                <p className={`text-2xl font-bold tabular-nums ${color}`}>
                  {loading ? "—" : value.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── KPI Cards (8) ─────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} loading={loading} />
          ))}
        </div>

        {/* ── Module Load + Users Donut ──────────────────────────────────── */}
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Module Load" subtitle="Record volume across all administrative domains" icon={Activity}>
            <ModuleLoadBars data={dashboard.charts.moduleLoadData} loading={loading} />
          </Panel>

          <Panel title="Users & Workforce" subtitle="Operational availability snapshot" icon={Users}>
            {loading ? (
              <SkeletonChart height={320} />
            ) : hasUserData ? (
              <SafeApexChart options={userDonutOptions} series={dashboard.charts.userDonutSeries} type="donut" height={320} />
            ) : (
              <EmptyChart height={320} />
            )}
          </Panel>
        </div>

        {/* ── Masters Coverage (always visible grid) ─────────────────────── */}
        <Panel title="Masters Coverage" subtitle="Complete view of all geographic and organisational master data" icon={Database}>
          <div className="space-y-5">
            {/* Geography */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Geographic Hierarchy
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {MASTER_CATEGORIES.filter((c) => c.group === "Geography").map(({ label, key, color, icon: Icon }, idx) => (
                  <MasterCard key={`${key}-${idx}`} label={label} count={data[key].length} color={color} icon={Icon} loading={loading} />
                ))}
              </div>
            </div>

            {/* Organisation */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-orange-500" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Organisation & Classification
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MASTER_CATEGORIES.filter((c) => c.group === "Organisation").map(({ label, key, color, icon: Icon }, idx) => (
                  <MasterCard key={`${key}-${idx}`} label={label} count={data[key].length} color={color} icon={Icon} loading={loading} />
                ))}
              </div>
            </div>

            {/* Waste Classification */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-500" />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Waste Classification
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MASTER_CATEGORIES.filter((c) => c.group === "Waste").map(({ label, key, color, icon: Icon }, idx) => (
                  <MasterCard key={`${key}-${idx}`} label={label} count={data[key].length} color={color} icon={Icon} loading={loading} />
                ))}
                {/* Extra stats in same row */}
                <MasterCard key={`departments-${data.departments.length}`} label="Departments" count={data.departments.length} color="#f97316" icon={Briefcase} loading={loading} />
                <MasterCard key={`designations-${data.designations.length}`} label="Designations" count={data.designations.length} color="#ef4444" icon={Tag} loading={loading} />
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Grievance + Assets + Screen Composition ───────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Grievance Pulse" subtitle="Complaints, open cases, feedback & categories" icon={ClipboardList}>
            {loading ? (
              <SkeletonChart height={260} />
            ) : hasGrievanceData ? (
              <SafeApexChart options={grievanceAreaOptions} series={grievanceAreaSeries} type="area" height={260} />
            ) : (
              <EmptyChart height={260} />
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatPill label="Total Complaints" value={data.complaints.length} color="text-red-600" />
              <StatPill label="Open / Active" value={dashboard.totals.activeComplaints} color="text-amber-600" />
              <StatPill label="Feedbacks" value={data.feedbacks.length} color="text-emerald-600" />
              <StatPill label="Categories" value={data.mainCategories.length + data.subCategories.length} color="text-blue-600" />
            </div>
          </Panel>

          <Panel title="Asset Breakdown" subtitle="Collection points, waste types & bins" icon={Boxes}>
            {loading ? (
              <SkeletonChart height={260} />
            ) : hasAssetData ? (
              <div className="flex items-center gap-2">
                <div className="w-[55%]">
                  <SafeApexChart options={assetRadialOptions} series={dashboard.charts.assetRadialSeries} type="radialBar" height={240} />
                </div>
                <div className="flex-1 space-y-5 py-2 pr-2">
                  {[
                    { label: "Collection Points", value: data.collectionPoints.length, color: "#10b981" },
                    { label: "Waste Types", value: data.wasteTypes.length, color: "#0ea5e9" },
                    { label: "Total Bins", value: data.bins.length, color: "#f59e0b" },
                    { label: "Active Bins", value: dashboard.totals.activeBins, color: "#3b82f6" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <div>
                        <p className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
                          {value.toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChart height={260} />
            )}
          </Panel>

          <Panel title="Screen Composition" subtitle="Screen types, screens, user screens & actions" icon={ShieldCheck}>
            {loading ? (
              <SkeletonChart height={260} />
            ) : hasScreenData ? (
              <SafeApexChart options={screenDonutOptions} series={dashboard.charts.screenDonutSeries} type="donut" height={260} />
            ) : (
              <EmptyChart height={260} />
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatPill label="Screen Types" value={data.mainScreenTypes.length} color="text-blue-600" />
              <StatPill label="Main Screens" value={data.mainScreens.length} color="text-emerald-600" />
              <StatPill label="User Screens" value={data.userScreens.length} color="text-amber-600" />
              <StatPill label="Actions" value={data.screenActions.length} color="text-violet-600" />
            </div>
          </Panel>
        </div>

        {/* ── User Screens By Module (comprehensive table) ───────────────── */}
        <Panel
          title="User Screens by Module"
          subtitle="All main screens with sub-screens, user screen names, and role access by staff user type"
          icon={ShieldCheck}
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : dashboard.mainScreenDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Main Screen</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Module Type</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Sub Screens / User Screens
                    </th>
                    {/* <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Roles with Access (Staff User Type)
                    </th> */}
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboard.mainScreenDetails.map((row, index) => (
                    <tr key={row.id} className="group transition-colors hover:bg-slate-50/80">
                      <td className="px-4 py-4 text-xs font-mono text-slate-400">{index + 1}</td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-400">{row.userScreenCount} sub-screen{row.userScreenCount !== 1 ? "s" : ""}</p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {row.type}
                        </span>
                      </td>

                      <td className="px-4 py-4 max-w-xs">
                        {row.userScreenNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.userScreenNames.slice(0, 6).map((name, i) => (
                              <span
                                key={`${name}-${i}`}
                                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 shadow-sm"
                              >
                                {name}
                              </span>
                            ))}
                            {row.userScreenNames.length > 6 && (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                                +{row.userScreenNames.length - 6} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">No sub-screens configured</span>
                        )}
                      </td>

                      {/* <td className="px-4 py-4 max-w-xs">
                        {row.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.roles.map((role) => {
                              const rd = ROLE_DISPLAY[role] ?? { bg: "bg-slate-100", text: "text-slate-600", label: role };
                              return (
                                <span
                                  key={role}
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${rd.bg} ${rd.text}`}
                                >
                                  {rd.label}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">No permissions assigned</span>
                        )}
                      </td> */}

                      <td className="px-4 py-4">
                        <span
                          className={
                            row.active
                              ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                              : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500"
                          }
                        >
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-400">No main screen records available.</div>
          )}
        </Panel>

        {/* ── Bottom Mini Stats ──────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BottomStat label="Companies" value={data.companies.length} icon={Building2} color="bg-indigo-600" loading={loading} />
          <BottomStat label="Projects" value={data.projects.length} icon={Layers3} color="bg-emerald-600" loading={loading} />
          <BottomStat label="Transport Records" value={dashboard.totals.transportTotal} icon={Truck} color="bg-amber-600" loading={loading} />
          <BottomStat label="Waste Collections" value={data.wasteCollections.length} icon={Activity} color="bg-rose-600" loading={loading} />
        </div>
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ title, value, detail, icon: Icon, gradient, loading }: KpiConfig & { loading: boolean }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-[0.04] transition-opacity group-hover:opacity-[0.07]`} />
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
              {loading ? (
                <span className="inline-block h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
              ) : (
                value.toLocaleString()
              )}
            </p>
            <p className="mt-1.5 text-xs text-slate-400 leading-snug">{detail}</p>
          </div>
          <div className={`ml-3 shrink-0 rounded-xl bg-linear-to-br ${gradient} p-3 text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className={`mt-4 h-1 w-full rounded-full bg-linear-to-r ${gradient} opacity-30`} />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {children}
    </section>
  );
}

function MasterCard({
  label,
  count,
  color,
  icon: Icon,
  loading,
}: {
  label: string;
  count: number;
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  loading?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}0d` }}
    >
      <Icon className="h-4 w-4" style={{ color }} />
      {loading ? (
        <span className="inline-block h-7 w-10 animate-pulse rounded bg-slate-200" />
      ) : (
        <span className="text-xl font-bold text-slate-900 tabular-nums">{count.toLocaleString()}</span>
      )}
      <span className="text-[10px] leading-tight text-slate-500">{label}</span>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function BottomStat({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`rounded-xl ${color} p-3 text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
          {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-200" /> : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function ModuleLoadBars({
  data,
  loading,
}: {
  data: { name: string; value: number; color: string }[];
  loading: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-4 py-1">
      {data.map(({ name, value, color }) => {
        const pct = Math.max((value / max) * 100, 2);
        return (
          <div key={name} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-sm font-medium text-slate-600">{name}</div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-slate-100">
              {loading ? (
                <div className="h-full w-1/3 animate-pulse rounded-lg bg-slate-200" />
              ) : (
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              )}
            </div>
            <div className="w-16 shrink-0 text-right">
              {loading ? (
                <span className="inline-block h-6 w-12 animate-pulse rounded bg-slate-200" />
              ) : (
                <span
                  className="inline-block rounded-md px-2 py-1 text-xs font-bold tabular-nums text-white"
                  style={{ backgroundColor: color }}
                >
                  {value.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonChart({ height }: { height: number }) {
  return (
    <div className="animate-pulse rounded-lg bg-slate-100" style={{ height }} />
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400"
      style={{ height }}
    >
      No data available
    </div>
  );
}

function SafeApexChart(props: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <ReactApexChart {...props} />;
}
