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

type TripLog = {
  unique_id: string; trip_date: string; waste_type: string;
  collected_weight_kg: number; log_status: string;
  collection_point: string; driver: string;
  actual_start_time?: string | null; actual_end_time?: string | null;
};

type DayWise = { date: string; collected_weight_kg: number; trip_count: number; verified_count: number };
type WasteTypeStat = { waste_type: string; collected_weight_kg: number; trip_count: number };

type Kpis = {
  total_agreed_weight: number; total_actual_weight: number; variance_kg: number;
  collection_efficiency_percent: number; average_weight_per_trip: number;
  coverage_efficiency_percent: number; total_trips: number;
  collection_points_covered: number; report_status: string;
};

type TripKpis = {
  total_collected_kg: number; total_trips: number; verified_trips: number;
  submitted_trips: number; draft_trips: number; avg_weight_per_trip: number;
};

type ApiResponse = {
  panchayat_name: string;
  results: MonthlyRow[];
  monthly_trends: Array<Record<string, number | string>>;
  waste_type_breakdown: Array<Record<string, number | string>>;
  kpis: Kpis;
  day_wise_collection: DayWise[];
  trip_waste_types: WasteTypeStat[];
  trip_logs: TripLog[];
  trip_kpis: TripKpis;
};

const ZERO_KPIS: Kpis = {
  total_agreed_weight: 0, total_actual_weight: 0, variance_kg: 0,
  collection_efficiency_percent: 0, average_weight_per_trip: 0,
  coverage_efficiency_percent: 0, total_trips: 0, collection_points_covered: 0,
  report_status: "On Target",
};

const ZERO_TRIP_KPIS: TripKpis = {
  total_collected_kg: 0, total_trips: 0, verified_trips: 0,
  submitted_trips: 0, draft_trips: 0, avg_weight_per_trip: 0,
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
  const [dayWise,       setDayWise]       = useState<DayWise[]>([]);
  const [tripWasteTypes,setTripWasteTypes]= useState<WasteTypeStat[]>([]);
  const [tripLogs,      setTripLogs]      = useState<TripLog[]>([]);
  const [tripKpis,      setTripKpis]      = useState<TripKpis>(ZERO_TRIP_KPIS);
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
      setTripLogs(Array.isArray(data?.trip_logs) ? data.trip_logs : []);
      setTripKpis(data?.trip_kpis ?? ZERO_TRIP_KPIS);
    } catch {
      setRows([]); setMonthlyTrends([]); setWasteBreakdown([]); setKpis(ZERO_KPIS);
      setDayWise([]); setTripWasteTypes([]); setTripLogs([]); setTripKpis(ZERO_TRIP_KPIS);
      setError("Unable to load dashboard data. Please try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, [appliedMonth, sortMode]);

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

  const tripStatusBadge = (row: TripLog) => {
    const s = row.log_status;
    const cls = s === "Verified" ? "bg-green-100 text-green-800 border-green-200"
      : s === "Submitted" ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
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

  const handleTripDownload = () => {
    const ws = XLSX.utils.json_to_sheet(tripLogs.map((r) => ({
      date: r.trip_date, waste_type: r.waste_type,
      collected_kg: r.collected_weight_kg, status: r.log_status,
      collection_point: r.collection_point, driver: r.driver,
      start: r.actual_start_time ?? "", end: r.actual_end_time ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Trip Logs");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `trip-logs-${panchayatName}-${appliedMonth || "all"}.xlsx`);
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

  const tripKpiCards = [
    { label: "Collected Weight",  value: fmt(tripKpis.total_collected_kg, " kg"), color: "border-l-blue-500",   text: "text-blue-700"   },
    { label: "Avg / Trip",        value: fmt(tripKpis.avg_weight_per_trip, " kg"),color: "border-l-green-500",  text: "text-green-700"  },
    { label: "Total Trips",       value: String(tripKpis.total_trips),            color: "border-l-indigo-500", text: "text-indigo-700" },
    { label: "Verified Trips",    value: String(tripKpis.verified_trips),         color: "border-l-teal-500",   text: "text-teal-700"   },
    { label: "Submitted Trips",   value: String(tripKpis.submitted_trips),        color: "border-l-purple-500", text: "text-purple-700" },
    { label: "Draft Trips",       value: String(tripKpis.draft_trips),            color: "border-l-orange-500", text: "text-orange-700" },
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
              Panchayat Leader Portal
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
            <h1 className="text-2xl font-bold text-gray-800">Panchayat Dashboard</h1>
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
            <button onClick={tab === "monthly" ? handleMonthlyDownload : handleTripDownload}
              disabled={tab === "monthly" ? !rows.length : !tripLogs.length}
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

            {/* Monthly Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Monthly Collection Trend</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total_agreed_weight" name="Agreed" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="total_actual_weight" name="Actual"  stroke="#16a34a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Waste Type Comparison</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={wasteBreakdown.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="waste_type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_actual_weight"  name="Actual kg"  fill="#16a34a" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="total_agreed_weight"  name="Agreed kg"  fill="#2563eb" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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

            {/* Trip KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {tripKpiCards.map((kpi) => (
                <div key={kpi.label} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${kpi.color} p-3 shadow-sm`}>
                  <p className="text-xs text-gray-500 font-medium truncate">{kpi.label}</p>
                  <p className={`text-lg font-bold mt-1 ${kpi.text}`}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Daily Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Day-wise Bar Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Day-wise Waste Collection (kg)</h2>
                {dayWise.length === 0
                  ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No trip data for the selected period</div>
                  : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={dayWise}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v} kg`, "Collected"]} />
                        <Legend />
                        <Bar dataKey="collected_weight_kg" name="Collected (kg)" fill="#2563eb" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="trip_count"          name="Trips"          fill="#16a34a" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </div>

              {/* Waste Type Pie Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Collection by Waste Type</h2>
                {tripWasteTypes.length === 0
                  ? <div className="flex h-48 items-center justify-center text-sm text-gray-400">No waste type data for the selected period</div>
                  : (
                    <div className="flex gap-4 items-center">
                      <ResponsiveContainer width="55%" height={200}>
                        <PieChart>
                          <Pie data={tripWasteTypes} dataKey="collected_weight_kg" nameKey="waste_type"
                            cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                            {tripWasteTypes.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => [`${v} kg`]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-48">
                        {tripWasteTypes.map((wt, i) => (
                          <div key={wt.waste_type} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="truncate font-medium text-gray-700">{wt.waste_type}</span>
                            <span className="ml-auto font-semibold text-gray-600 whitespace-nowrap">{wt.collected_weight_kg} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
              </div>
            </div>

            {/* Day-wise collected weight line chart */}
            {dayWise.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Collection Trend by Day</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dayWise}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`${v} kg`, "Collected"]} />
                    <Line type="monotone" dataKey="collected_weight_kg" name="Collected (kg)"
                      stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Trip Logs Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <DataTable value={tripLogs} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
                filters={tripFilters} loading={loading} stripedRows showGridlines
                emptyMessage="No daily trip logs found for this panchayat." className="p-datatable-sm"
                globalFilterFields={["trip_date", "waste_type", "log_status", "collection_point", "driver"]}
                header={
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Daily Trip Logs</span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
                      <Search size={15} className="text-gray-500" />
                      <InputText value={tripSearch}
                        onChange={(e) => { setTripSearch(e.target.value); setTripFilters({ global: { value: e.target.value, matchMode: FilterMatchMode.CONTAINS } }); }}
                        placeholder="Search trips..." className="p-inputtext-sm !border-0 !shadow-none" />
                    </div>
                  </div>
                }>
                <Column header="S.No" body={(_: any, opts: any) => opts.rowIndex + 1} style={{ width: "60px" }} />
                <Column field="trip_date"           header="Date"              sortable />
                <Column field="waste_type"          header="Waste Type"        sortable />
                <Column field="collected_weight_kg" header="Collected (kg)"    body={(r: TripLog) => fmt(r.collected_weight_kg)} sortable />
                <Column field="log_status"          header="Status"            body={tripStatusBadge} sortable />
                <Column field="collection_point"    header="Collection Point"  sortable />
                <Column field="driver"              header="Driver"            sortable />
                <Column field="actual_start_time"   header="Start Time"        body={(r: TripLog) => r.actual_start_time ?? "—"} />
                <Column field="actual_end_time"     header="End Time"          body={(r: TripLog) => r.actual_end_time ?? "—"} />
              </DataTable>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
