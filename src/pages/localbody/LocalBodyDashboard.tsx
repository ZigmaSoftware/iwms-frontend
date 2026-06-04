import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { Building2, Download, LogOut, Search } from "lucide-react";
import ZigmaLogo from "../../images/logo.png";

/* ─────────────────────────────────────────────────────────────────────────
   Dedicated axios instance — reads lb_access_token so it never conflicts
   with the admin panel's session token
───────────────────────────────────────────────────────────────────────── */
const IS_PROD = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD ? import.meta.env.VITE_API_PROD : import.meta.env.VITE_API_LOCAL;

const lbApi = axios.create({ baseURL: API_ROOT });
lbApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("lb_access_token");
  if (token) { config.headers = config.headers ?? {}; config.headers.Authorization = `Bearer ${token}`; }
  return config;
});

/* ─── palette for waste-type pie chart ───────────────────────────────── */
const PIE_COLORS = ["#2563eb", "#16a34a", "#f97316", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f59e0b"];

/* ─── types ──────────────────────────────────────────────────────────── */
type MonthlyRow = {
  unique_id: string; month: string; waste_type: string;
  total_agreed_weight: number; total_actual_weight: number;
  variance_kg: number; variance_percent: number; report_status: string;
  total_trips: number; collection_points_covered: number;
  collection_efficiency_percent: number; coverage_efficiency_percent?: number;
  average_weight_per_trip: number;
};

type DailyComparisonRow = {
  unique_id: string;
  collection_date: string;
  waste_type: string;
  agreed_weight_kg: number;
  actual_weight_kg: number;
  variance_kg: number;
  variance_percent: number;
  report_status: string;
  total_trips: number;
  collection_points_covered: number;
};

type DayWise = { date: string; collected_weight_kg: number; trip_count: number; points_covered?: number };
type WasteTypeStat = { waste_type: string; collected_weight_kg: number; trip_count: number };
type DayWiseBreakdown = {
  date: string; waste_type: string;
  actual_weight_kg: number; agreed_weight_kg: number;
  trip_count: number; points_covered: number;
};

type Kpis = {
  total_agreed_weight: number; total_actual_weight: number; variance_kg: number;
  collection_efficiency_percent: number; average_weight_per_trip: number;
  coverage_efficiency_percent: number; total_trips: number;
  collection_points_covered: number; report_status: string;
};

type DailyKpis = {
  total_actual_kg: number;
  total_agreed_kg: number;
  variance_kg: number;
  collection_efficiency_percent: number;
  total_trips: number;
  collection_points_covered: number;
};

type ApiResponse = {
  panchayat_name: string;
  results: MonthlyRow[];
  monthly_trends: Array<Record<string, number | string>>;
  waste_type_breakdown: Array<Record<string, number | string>>;
  kpis: Kpis;
  day_wise_collection: DayWise[];
  trip_waste_types: WasteTypeStat[];
  day_wise_breakdown: DayWiseBreakdown[];
  daily_rows: DailyComparisonRow[];
  daily_kpis: DailyKpis;
};

const ZERO_KPIS: Kpis = {
  total_agreed_weight: 0, total_actual_weight: 0, variance_kg: 0,
  collection_efficiency_percent: 0, average_weight_per_trip: 0,
  coverage_efficiency_percent: 0, total_trips: 0, collection_points_covered: 0,
  report_status: "On Target",
};

const ZERO_DAILY_KPIS: DailyKpis = {
  total_actual_kg: 0,
  total_agreed_kg: 0,
  variance_kg: 0,
  collection_efficiency_percent: 0,
  total_trips: 0,
  collection_points_covered: 0,
};

const currentMonth = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
};

function clearLocalBodySession() {
  ["lb_access_token","lb_panchayat_unique_id","lb_panchayat_name","lb_leader_name","lb_role"]
    .forEach((k) => localStorage.removeItem(k));
}

type Tab = "monthly" | "daily";

/* ─── component ──────────────────────────────────────────────────────── */
export default function LocalBodyDashboard() {
  const navigate = useNavigate();
  const leaderName    = localStorage.getItem("lb_leader_name") ?? "Leader";
  const panchayatName = localStorage.getItem("lb_panchayat_name") ?? "";

  useEffect(() => {
    const role  = localStorage.getItem("lb_role");
    const token = localStorage.getItem("lb_access_token");
    if (role !== "panchayat_leader" || !token) navigate("/auth/localbody", { replace: true });
  }, [navigate]);

  /* ── filters ── */
  const [tab,          setTab]          = useState<Tab>("monthly");
  const [monthValue,   setMonthValue]   = useState(currentMonth());
  const [appliedMonth, setAppliedMonth] = useState(currentMonth());
  const [sortMode,     setSortMode]     = useState("absolute");

  /* ── data ── */
  const [rows,          setRows]          = useState<MonthlyRow[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<ApiResponse["monthly_trends"]>([]);
  const [wasteBreakdown,setWasteBreakdown]= useState<ApiResponse["waste_type_breakdown"]>([]);
  const [kpis,          setKpis]          = useState<Kpis>(ZERO_KPIS);
  const [dayWise,          setDayWise]          = useState<DayWise[]>([]);
  const [tripWasteTypes,   setTripWasteTypes]   = useState<WasteTypeStat[]>([]);
  const [dayWiseBreakdown, setDayWiseBreakdown] = useState<DayWiseBreakdown[]>([]);
  const [dailyRows,        setDailyRows]        = useState<DailyComparisonRow[]>([]);
  const [dailyKpis,        setDailyKpis]        = useState<DailyKpis>(ZERO_DAILY_KPIS);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  /* ── table filters ── */
  const [monthlySearch,   setMonthlySearch]   = useState("");
  const [monthlyFilters,  setMonthlyFilters]  = useState<any>({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });
  const [tripSearch,      setTripSearch]      = useState("");
  const [tripFilters,     setTripFilters]     = useState<any>({ global: { value: null, matchMode: FilterMatchMode.CONTAINS } });

  /* ── fetch ── */
  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const params: Record<string, string> = { sort: sortMode };
      if (appliedMonth) params.month = appliedMonth;
      const { data } = await lbApi.get<ApiResponse>("/localbody/dashboard/", { params });
      setRows(Array.isArray(data?.results) ? data.results : []);
      setMonthlyTrends(Array.isArray(data?.monthly_trends) ? data.monthly_trends : []);
      setWasteBreakdown(Array.isArray(data?.waste_type_breakdown) ? data.waste_type_breakdown : []);
      setKpis(data?.kpis ?? ZERO_KPIS);
      setDayWise(Array.isArray(data?.day_wise_collection) ? data.day_wise_collection : []);
      setTripWasteTypes(Array.isArray(data?.trip_waste_types) ? data.trip_waste_types : []);
      setDayWiseBreakdown(Array.isArray(data?.day_wise_breakdown) ? data.day_wise_breakdown : []);
      setDailyRows(Array.isArray(data?.daily_rows) ? data.daily_rows : []);
      setDailyKpis(data?.daily_kpis ?? ZERO_DAILY_KPIS);
    } catch {
      setRows([]); setMonthlyTrends([]); setWasteBreakdown([]); setKpis(ZERO_KPIS);
      setDayWise([]); setTripWasteTypes([]); setDailyRows([]); setDailyKpis(ZERO_DAILY_KPIS);
      setError("Unable to load dashboard data. Please try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, [appliedMonth, sortMode]);

  /* ── chart data derived from day_wise_breakdown ── */
  const wasteTypeKeys = useMemo(
    () => [...new Set(dayWiseBreakdown.map((r) => r.waste_type))].sort(),
    [dayWiseBreakdown],
  );

  // Stacked weight chart: one entry per date, one key per waste type
  const weightChartData = useMemo(() => {
    const dates = [...new Set(dayWiseBreakdown.map((r) => r.date))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      dayWiseBreakdown.filter((r) => r.date === date).forEach((r) => {
        row[r.waste_type] = r.actual_weight_kg;
      });
      return row;
    });
  }, [dayWiseBreakdown]);

  // Grouped trips chart: one entry per date, one key per waste type
  const tripsChartData = useMemo(() => {
    const dates = [...new Set(dayWiseBreakdown.map((r) => r.date))].sort();
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      dayWiseBreakdown.filter((r) => r.date === date).forEach((r) => {
        row[r.waste_type] = r.trip_count;
      });
      return row;
    });
  }, [dayWiseBreakdown]);

  // Points chart: MAX per date — collection points are the SAME physical locations
  // for all waste types on a given day, so SUM would double-count them.
  const pointsChartData = useMemo(() => {
    const dates = [...new Set(dayWiseBreakdown.map((r) => r.date))].sort();
    return dates.map((date) => {
      const points = dayWiseBreakdown.filter((r) => r.date === date).map((r) => r.points_covered);
      return { date, points_covered: points.length ? Math.max(...points) : 0 };
    });
  }, [dayWiseBreakdown]);

  /* ── chart data derived from monthly rows ── */
  const monthlyWasteTypeKeys = useMemo(
    () => [...new Set(rows.map((r) => r.waste_type))].sort(),
    [rows],
  );

  // Stacked weight per month × waste type
  const monthlyWeightChartData = useMemo(() => {
    const months = [...new Set(rows.map((r) => r.month))].sort();
    return months.map((month) => {
      const row: Record<string, string | number> = { month };
      rows.filter((r) => r.month === month).forEach((r) => {
        row[r.waste_type] = r.total_actual_weight;
      });
      return row;
    });
  }, [rows]);

  // Grouped trips per month × waste type
  const monthlyTripsChartData = useMemo(() => {
    const months = [...new Set(rows.map((r) => r.month))].sort();
    return months.map((month) => {
      const row: Record<string, string | number> = { month };
      rows.filter((r) => r.month === month).forEach((r) => {
        row[r.waste_type] = r.total_trips;
      });
      return row;
    });
  }, [rows]);

  // Points per month — MAX across waste types (same physical points)
  const monthlyPointsChartData = useMemo(() => {
    const months = [...new Set(rows.map((r) => r.month))].sort();
    return months.map((month) => {
      const pts = rows.filter((r) => r.month === month).map((r) => r.collection_points_covered);
      return { month, points_covered: pts.length ? Math.max(...pts) : 0 };
    });
  }, [rows]);

  /* ── helpers ── */
  const fmt = (v?: number | null, suffix = "") => {
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  };

  const statusBadge = (row: MonthlyRow) => {
    const s = String(row.report_status || "On Target");
    const cls = s === "Surplus" ? "bg-green-100 text-green-800 border-green-200"
      : s === "Deficit" ? "bg-red-100 text-red-800 border-red-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{s}</span>;
  };

  const dailyStatusBadge = (row: DailyComparisonRow) => {
    const s = String(row.report_status || "On Target");
    const cls = s === "Surplus" ? "bg-green-100 text-green-800 border-green-200"
      : s === "Deficit" ? "bg-red-100 text-red-800 border-red-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{s}</span>;
  };

  /* ── downloads ── */
  const handleMonthlyDownload = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      month: r.month, waste_type: r.waste_type,
      agreed_kg: r.total_agreed_weight, actual_kg: r.total_actual_weight,
      variance_kg: r.variance_kg, variance_pct: r.variance_percent,
      status: r.report_status, trips: r.total_trips,
      points: r.collection_points_covered,
      coll_eff_pct: r.collection_efficiency_percent,
      avg_per_trip: r.average_weight_per_trip,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `monthly-report-${panchayatName}-${appliedMonth || "all"}.xlsx`);
  };

  const handleDailyDownload = () => {
    const ws = XLSX.utils.json_to_sheet(dailyRows.map((r) => ({
      collection_date: r.collection_date, waste_type: r.waste_type,
      agreed_kg: r.agreed_weight_kg, actual_kg: r.actual_weight_kg,
      variance_kg: r.variance_kg, variance_pct: r.variance_percent,
      status: r.report_status, trips: r.total_trips,
      points_covered: r.collection_points_covered,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Waste Comparison");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `daily-waste-comparison-${panchayatName}-${appliedMonth || "all"}.xlsx`);
  };

  /* ── KPI cards ── */
  const monthlyKpiCards = [
    { label: "Collection Efficiency", value: fmt(kpis.collection_efficiency_percent, "%"),  color: "border-l-blue-500",   text: "text-blue-700"   },
    { label: "Avg Weight / Trip",     value: fmt(kpis.average_weight_per_trip, " kg"),      color: "border-l-green-500",  text: "text-green-700"  },
    { label: "Coverage Efficiency",   value: fmt(kpis.coverage_efficiency_percent, "%"),    color: "border-l-purple-500", text: "text-purple-700" },
    { label: "Total Variance",        value: fmt(kpis.variance_kg, " kg"),                  color: "border-l-orange-500", text: "text-orange-700" },
    { label: "Total Trips",           value: fmt(kpis.total_trips),                         color: "border-l-teal-500",   text: "text-teal-700"   },
    { label: "Points Covered",        value: fmt(kpis.collection_points_covered),           color: "border-l-pink-500",   text: "text-pink-700"   },
    { label: "Agreed Weight",         value: fmt(kpis.total_agreed_weight, " kg"),          color: "border-l-indigo-500", text: "text-indigo-700" },
    { label: "Actual Weight",         value: fmt(kpis.total_actual_weight, " kg"),          color: "border-l-cyan-500",   text: "text-cyan-700"   },
  ];

  const dailyKpiCards = [
    { label: "Actual Weight",          value: fmt(dailyKpis.total_actual_kg, " kg"),             color: "border-l-cyan-500",   text: "text-cyan-700"   },
    { label: "Agreed Weight",          value: fmt(dailyKpis.total_agreed_kg, " kg"),             color: "border-l-indigo-500", text: "text-indigo-700" },
    { label: "Variance",               value: fmt(dailyKpis.variance_kg, " kg"),                 color: "border-l-orange-500", text: "text-orange-700" },
    { label: "Collection Efficiency",  value: fmt(dailyKpis.collection_efficiency_percent, "%"), color: "border-l-blue-500",   text: "text-blue-700"   },
    { label: "Total Trips",            value: fmt(dailyKpis.total_trips),                        color: "border-l-teal-500",   text: "text-teal-700"   },
    { label: "Points Covered",         value: fmt(dailyKpis.collection_points_covered),          color: "border-l-pink-500",   text: "text-pink-700"   },
  ];

  /* ── render ── */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm" style={{ height: "85px" }}>
        <div className="flex items-center gap-3">
          <img src={ZigmaLogo} className="h-8 w-8 object-contain" alt="Zigma" />
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">Zigma IWMS</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500 leading-tight">
              PLB Leader Portal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">{panchayatName || leaderName}</span>
          </div>
          <button onClick={() => { clearLocalBodySession(); navigate("/auth/localbody", { replace: true }); }}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </header>

      <main className="p-4 space-y-5">

        {/* ── Page header + shared filters ── */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">PLB Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {panchayatName ? `${panchayatName} · Waste collection analytics` : "Waste collection analytics"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="month" value={monthValue} max={currentMonth()}
              onChange={(e) => setMonthValue(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {tab === "monthly" && (
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="absolute">Highest variance</option>
                <option value="deficit">Highest deficit</option>
                <option value="surplus">Highest surplus</option>
              </select>
            )}
            <button onClick={() => setAppliedMonth(monthValue)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Go</button>
            <button onClick={() => { setMonthValue(""); setAppliedMonth(""); }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">All Months</button>
            <button onClick={tab === "monthly" ? handleMonthlyDownload : handleDailyDownload}
              disabled={tab === "monthly" ? !rows.length : !dailyRows.length}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              <Download size={15} /> Download
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {([["monthly", "📊 Monthly Report"], ["daily", "📅 Daily Collection"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════
            TAB 1 — MONTHLY REPORT
        ════════════════════════════════════════════════════════════ */}
        {tab === "monthly" && (
          <div className="space-y-5">

            {/* Monthly KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
              {monthlyKpiCards.map((kpi) => (
                <div key={kpi.label} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${kpi.color} p-3 shadow-sm`}>
                  <p className="text-xs text-gray-500 font-medium truncate">{kpi.label}</p>
                  <p className={`text-lg font-bold mt-1 ${kpi.text}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* ══ Chart 1 — Stacked weight by waste type per month ══ */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-800">Collected Weight by Waste Type</h2>
                <p className="text-xs text-gray-400 mt-0.5">Stacked bars — each colour = one waste type's actual weight per month</p>
              </div>
              <div className="p-4">
                {monthlyWeightChartData.length === 0
                  ? <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data for the selected period</div>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyWeightChartData} margin={{ top: 8, right: 20, left: 8, bottom: 0 }} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} unit=" kg" />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                          formatter={(v: number, name: string) => [`${v.toLocaleString()} kg`, name]}
                          cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        {monthlyWasteTypeKeys.map((wt, i) => (
                          <Bar key={wt} dataKey={wt} stackId="w" fill={PIE_COLORS[i % PIE_COLORS.length]}
                            radius={i === monthlyWasteTypeKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </div>
            </div>

            {/* ══ Charts 2 + 3 — Trips per waste type | Points per month ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Trips per Waste Type</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Grouped bars — trips per waste type each month</p>
                </div>
                <div className="p-4">
                  {monthlyTripsChartData.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
                    : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={monthlyTripsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number, name: string) => [`${v} trips`, name]}
                            cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          {monthlyWasteTypeKeys.map((wt, i) => (
                            <Bar key={wt} dataKey={wt} name={wt} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[4, 4, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Collection Points Covered</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Unique physical points covered each month</p>
                </div>
                <div className="p-4">
                  {monthlyPointsChartData.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
                    : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={monthlyPointsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="40%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number) => [`${v} points`, "Covered"]}
                            cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                          <Bar dataKey="points_covered" name="Points Covered" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                            {monthlyPointsChartData.map((_, idx) => (
                              <Cell key={idx} fill={`hsl(${262 + idx * 12}, 70%, ${52 - idx * 2}%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>
            </div>

            {/* ══ Charts 4 + 5 — Waste type donut | Agreed vs Actual trend ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Waste type donut with progress bars */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Period Total — by Waste Type</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Proportion of total actual weight per waste category</p>
                </div>
                <div className="p-4">
                  {wasteBreakdown.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
                    : (
                      <div className="flex gap-6 items-center">
                        <ResponsiveContainer width="48%" height={210}>
                          <PieChart>
                            <Pie data={wasteBreakdown} dataKey="total_actual_weight" nameKey="waste_type"
                              cx="50%" cy="50%" outerRadius={85} innerRadius={44} paddingAngle={3}>
                              {wasteBreakdown.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                              formatter={(v: number) => [`${Number(v).toLocaleString()} kg`]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-3">
                          {wasteBreakdown.map((wt: any, i: number) => {
                            const total = wasteBreakdown.reduce((s: number, r: any) => s + Number(r.total_actual_weight), 0);
                            const share = total ? Math.round((Number(wt.total_actual_weight) / total) * 100) : 0;
                            return (
                              <div key={String(wt.waste_type)}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span className="text-xs font-semibold text-gray-700">{String(wt.waste_type)}</span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-800">{share}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-gray-100">
                                  <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">{Number(wt.total_actual_weight).toLocaleString()} kg actual · {Number(wt.total_agreed_weight).toLocaleString()} kg agreed</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>

              {/* Agreed vs Actual trend line per month */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Agreed vs Actual — Monthly Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Compare committed targets against actual collection each month</p>
                </div>
                <div className="p-4">
                  {monthlyTrends.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data</div>
                    : (
                      <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={monthlyTrends} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} unit=" kg" />
                          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number, name: string) => [`${Number(v).toLocaleString()} kg`, name]} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          <Line type="monotone" dataKey="total_agreed_weight" name="Agreed"
                            stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4"
                            dot={{ r: 3, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }} />
                          <Line type="monotone" dataKey="total_actual_weight" name="Actual"
                            stroke="#2563eb" strokeWidth={2.5}
                            dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>
            </div>

            {/* Monthly Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <DataTable value={rows} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
                filters={monthlyFilters} loading={loading} stripedRows showGridlines
                emptyMessage="No monthly comparison data found." className="p-datatable-sm"
                globalFilterFields={["month", "waste_type", "report_status"]}
                header={
                  <div className="flex justify-end">
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
                      <Search size={15} className="text-gray-500" />
                      <InputText value={monthlySearch}
                        onChange={(e) => { setMonthlySearch(e.target.value); setMonthlyFilters({ global: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS } }); }}
                        placeholder="Search report..." className="p-inputtext-sm !border-0 !shadow-none" />
                    </div>
                  </div>
                }>
                <Column header="S.No" body={(_: any, opts: any) => opts.rowIndex + 1} style={{ width: "60px" }} />
                <Column field="month"                          header="Month"        sortable />
                <Column field="waste_type"                     header="Waste Type"   sortable />
                <Column field="total_agreed_weight"            header="Agreed (kg)"  body={(r: MonthlyRow) => fmt(r.total_agreed_weight)} sortable />
                <Column field="total_actual_weight"            header="Actual (kg)"  body={(r: MonthlyRow) => fmt(r.total_actual_weight)}  sortable />
                <Column field="variance_kg"                    header="Variance (kg)"body={(r: MonthlyRow) => fmt(r.variance_kg)}          sortable />
                <Column field="variance_percent"               header="Variance %"   body={(r: MonthlyRow) => fmt(r.variance_percent, "%")} sortable />
                <Column field="report_status"                  header="Status"       body={statusBadge}                                     sortable />
                <Column field="total_trips"                    header="Trips"        sortable />
                <Column field="collection_efficiency_percent"  header="Coll. Eff. %" body={(r: MonthlyRow) => fmt(r.collection_efficiency_percent, "%")} sortable />
                <Column field="average_weight_per_trip"        header="Avg/Trip"     body={(r: MonthlyRow) => fmt(r.average_weight_per_trip)} sortable />
              </DataTable>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2 — DAILY COLLECTION
        ════════════════════════════════════════════════════════════ */}
        {tab === "daily" && (
          <div className="space-y-5">

            {/* Daily KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {dailyKpiCards.map((kpi) => (
                <div key={kpi.label} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${kpi.color} p-3 shadow-sm`}>
                  <p className="text-xs text-gray-500 font-medium truncate">{kpi.label}</p>
                  <p className={`text-lg font-bold mt-1 ${kpi.text}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════
                CHART 1 — Stacked weight by waste type per date
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                <h2 className="text-sm font-bold text-gray-800">Collected Weight by Waste Type</h2>
                <p className="text-xs text-gray-400 mt-0.5">Stacked bars — each colour = one waste type's weight on that date</p>
              </div>
              <div className="p-4">
                {weightChartData.length === 0
                  ? <div className="flex h-52 items-center justify-center text-sm text-gray-400">No data for the selected period</div>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={weightChartData} margin={{ top: 8, right: 20, left: 8, bottom: 0 }} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} unit=" kg" />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                          formatter={(v: number, name: string) => [`${v.toLocaleString()} kg`, name]}
                          cursor={{ fill: "rgba(0,0,0,0.04)" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        {wasteTypeKeys.map((wt, i) => (
                          <Bar key={wt} dataKey={wt} stackId="w" fill={PIE_COLORS[i % PIE_COLORS.length]}
                            radius={i === wasteTypeKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                CHARTS 2 + 3 — Trips per waste type  |  Points per date
            ══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* 2 — Grouped trips */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Trips per Waste Type</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Grouped bars — Dry Waste vs Wet Waste trips each day</p>
                </div>
                <div className="p-4">
                  {tripsChartData.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data for the selected period</div>
                    : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={tripsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number, name: string) => [`${v} trips`, name]}
                            cursor={{ fill: "rgba(0,0,0,0.04)" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          {wasteTypeKeys.map((wt, i) => (
                            <Bar key={wt} dataKey={wt} name={`${wt}`} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[4, 4, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>

              {/* 3 — Collection points (unique per day) */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Collection Points Covered</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Unique physical points covered each date (shared by all waste types)</p>
                </div>
                <div className="p-4">
                  {pointsChartData.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data for the selected period</div>
                    : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={pointsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="40%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number) => [`${v} points`, "Covered"]}
                            cursor={{ fill: "rgba(0,0,0,0.04)" }}
                          />
                          <Bar dataKey="points_covered" name="Points Covered" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                            {pointsChartData.map((_, idx) => (
                              <Cell key={idx} fill={`hsl(${262 + idx * 8}, 70%, ${52 - idx * 2}%)`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                CHARTS 4 + 5 — Waste type totals (pie)  |  Trend line
            ══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* 4 — Waste type donut */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Period Total — by Waste Type</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Proportion of total weight collected per waste category</p>
                </div>
                <div className="p-4">
                  {tripWasteTypes.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No waste type data</div>
                    : (
                      <div className="flex gap-6 items-center">
                        <ResponsiveContainer width="48%" height={210}>
                          <PieChart>
                            <Pie data={tripWasteTypes} dataKey="collected_weight_kg" nameKey="waste_type"
                              cx="50%" cy="50%" outerRadius={85} innerRadius={44} paddingAngle={3}>
                              {tripWasteTypes.map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                              formatter={(v: number) => [`${v.toLocaleString()} kg`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-3">
                          {tripWasteTypes.map((wt, i) => {
                            const pct = tripWasteTypes.reduce((s, r) => s + r.collected_weight_kg, 0);
                            const share = pct ? Math.round((wt.collected_weight_kg / pct) * 100) : 0;
                            return (
                              <div key={wt.waste_type}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span className="text-xs font-semibold text-gray-700">{wt.waste_type}</span>
                                  </div>
                                  <span className="text-xs font-bold text-gray-800">{share}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-gray-100">
                                  <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">{wt.collected_weight_kg.toLocaleString()} kg · {wt.trip_count} trips</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>

              {/* 5 — Daily trend line */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-2 border-b border-gray-50">
                  <h2 className="text-sm font-bold text-gray-800">Daily Collection Trend</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Total weight collected (all waste types combined) day by day</p>
                </div>
                <div className="p-4">
                  {dayWise.length === 0
                    ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data for the selected period</div>
                    : (
                      <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={dayWise} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} unit=" kg" />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                            formatter={(v: number) => [`${v.toLocaleString()} kg`, "Total Collected"]}
                          />
                          <Line type="monotone" dataKey="collected_weight_kg" name="Total Collected"
                            stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  }
                </div>
              </div>
            </div>

            {/* Daily Waste Comparison Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <DataTable value={dailyRows} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
                filters={tripFilters} loading={loading} stripedRows showGridlines
                emptyMessage="No daily waste comparison data found." className="p-datatable-sm"
                globalFilterFields={["collection_date", "waste_type", "report_status"]}
                header={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Daily Waste Comparison</span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
                      <Search size={15} className="text-gray-500" />
                      <InputText value={tripSearch}
                        onChange={(e) => { setTripSearch(e.target.value); setTripFilters({ global: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS } }); }}
                        placeholder="Search records..." className="p-inputtext-sm !border-0 !shadow-none" />
                    </div>
                  </div>
                }>
                <Column header="S.No" body={(_: any, opts: any) => opts.rowIndex + 1} style={{ width: "60px" }} />
                <Column field="collection_date"           header="Date"             sortable />
                <Column field="waste_type"                header="Waste Type"       sortable />
                <Column field="agreed_weight_kg"          header="Agreed (kg)"      body={(r: DailyComparisonRow) => fmt(r.agreed_weight_kg)}  sortable />
                <Column field="actual_weight_kg"          header="Actual (kg)"      body={(r: DailyComparisonRow) => fmt(r.actual_weight_kg)}   sortable />
                <Column field="variance_kg"               header="Variance (kg)"    body={(r: DailyComparisonRow) => fmt(r.variance_kg)}        sortable />
                <Column field="variance_percent"          header="Variance %"       body={(r: DailyComparisonRow) => fmt(r.variance_percent, "%")} sortable />
                <Column field="report_status"             header="Status"           body={dailyStatusBadge}                                     sortable />
                <Column field="total_trips"               header="Trips"            sortable />
                <Column field="collection_points_covered" header="Points Covered"   sortable />
              </DataTable>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
