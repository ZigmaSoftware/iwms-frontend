import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  ArrowLeft, Calendar, ClipboardList, Download,
  FileBarChart2, LogOut, Printer, TrendingUp,
} from "lucide-react";
import ZigmaLogo from "../../images/logo.png";

/* ─── axios instance ─────────────────────────────────────────────────── */
const IS_PROD = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD ? import.meta.env.VITE_API_PROD : import.meta.env.VITE_API_LOCAL;

const lbApi = axios.create({ baseURL: API_ROOT });
lbApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("lb_access_token");
  if (token) { config.headers = config.headers ?? {}; config.headers.Authorization = `Bearer ${token}`; }
  return config;
});

/* ─── types (unchanged) ──────────────────────────────────────────────── */
type MonthlyRow = {
  unique_id: string; month: string; waste_type: string;
  total_agreed_weight: number; total_actual_weight: number;
  variance_kg: number; variance_percent: number; report_status: string;
  total_trips: number; collection_points_covered: number;
  collection_efficiency_percent: number; coverage_efficiency_percent?: number;
  average_weight_per_trip: number;
};
type DailyComparisonRow = {
  unique_id: string; collection_date: string; waste_type: string;
  agreed_weight_kg: number; actual_weight_kg: number;
  variance_kg: number; variance_percent: number; report_status: string;
  total_trips: number; collection_points_covered: number;
};
type DayWiseBreakdown = {
  date: string; waste_type: string; actual_weight_kg: number;
  agreed_weight_kg: number; trip_count: number; points_covered: number;
};
type Kpis = {
  total_agreed_weight: number; total_actual_weight: number; variance_kg: number;
  collection_efficiency_percent: number; average_weight_per_trip: number;
  coverage_efficiency_percent: number; total_trips: number;
  collection_points_covered: number; report_status: string;
};
type DailyKpis = {
  total_actual_kg: number; total_agreed_kg: number; variance_kg: number;
  collection_efficiency_percent: number; total_trips: number;
  collection_points_covered: number;
};
type ApiResponse = {
  panchayat_name: string; results: MonthlyRow[];
  monthly_trends: Array<Record<string, number | string>>;
  waste_type_breakdown: Array<Record<string, number | string>>;
  kpis: Kpis;
  day_wise_collection: Array<{ date: string; collected_weight_kg: number; trip_count: number }>;
  trip_waste_types: Array<{ waste_type: string; collected_weight_kg: number; trip_count: number }>;
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
  total_actual_kg: 0, total_agreed_kg: 0, variance_kg: 0,
  collection_efficiency_percent: 0, total_trips: 0, collection_points_covered: 0,
};

const currentMonth = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
};
const todayStr = () => new Date().toISOString().split("T")[0];

function clearLocalBodySession() {
  ["lb_access_token","lb_panchayat_unique_id","lb_panchayat_name","lb_leader_name","lb_role"]
    .forEach((k) => localStorage.removeItem(k));
}

type View = "home" | "daily" | "monthly";

/* ─── small helpers ──────────────────────────────────────────────────── */
const fmt = (v?: number | null, dec = 3) =>
  v == null ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: dec });

const StatusBadge = ({ s }: { s: string }) => {
  const cls = s === "Surplus"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : s === "Deficit"
    ? "bg-red-50 text-red-700 ring-red-200"
    : "bg-blue-50 text-blue-700 ring-blue-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ring-1 ${cls}`}>
      {s || "—"}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════
    COMPONENT
════════════════════════════════════════════════════════════ */
export default function LocalBodyDashboard() {
  const navigate  = useNavigate();
  const leaderName    = localStorage.getItem("lb_leader_name") ?? "Leader";
  const panchayatName = localStorage.getItem("lb_panchayat_name") ?? "";
  const printRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role  = localStorage.getItem("lb_role");
    const token = localStorage.getItem("lb_access_token");
    if (role !== "panchayat_leader" || !token) navigate("/auth/localbody", { replace: true });
  }, [navigate]);

  /* ── view / filters ── */
  const [view,      setView]      = useState<View>("home");
  const [appliedMonth, setAppliedMonth] = useState(currentMonth());

  const [fromDate, setFromDate]   = useState(todayStr());
  const [toDate,   setToDate]     = useState(todayStr());
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  const [monthValue, setMonthValue] = useState(currentMonth());
  const [appliedMonthFilter, setAppliedMonthFilter] = useState("");

  /* ── data ── */
  const [rows,      setRows]      = useState<MonthlyRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyComparisonRow[]>([]);
  const [kpis,      setKpis]      = useState<Kpis>(ZERO_KPIS);
  const [dailyKpis, setDailyKpis] = useState<DailyKpis>(ZERO_DAILY_KPIS);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  /* ── fetch (unchanged) ── */
  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const params: Record<string, string> = {};
      if (appliedMonth) params.month = appliedMonth;
      const { data } = await lbApi.get<ApiResponse>("/localbody/dashboard/", { params });
      setRows(Array.isArray(data?.results) ? data.results : []);
      setKpis(data?.kpis ?? ZERO_KPIS);
      setDailyRows(Array.isArray(data?.daily_rows) ? data.daily_rows : []);
      setDailyKpis(data?.daily_kpis ?? ZERO_DAILY_KPIS);
    } catch {
      setRows([]); setKpis(ZERO_KPIS); setDailyRows([]); setDailyKpis(ZERO_DAILY_KPIS);
      setError("Unable to load data. Please try again.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void fetchData(); }, [appliedMonth]);

  /* ── filtered rows (client-side) ── */
  const filteredDailyRows = useMemo(() => {
    if (!appliedFrom && !appliedTo) return dailyRows;
    return dailyRows.filter((r) => {
      const d = r.collection_date;
      if (appliedFrom && d < appliedFrom) return false;
      if (appliedTo   && d > appliedTo)   return false;
      return true;
    });
  }, [dailyRows, appliedFrom, appliedTo]);

  const filteredMonthlyRows = useMemo(() => {
    if (!appliedMonthFilter) return rows;
    return rows.filter((r) => r.month === appliedMonthFilter);
  }, [rows, appliedMonthFilter]);

  /* ── totals ── */
  const dailyTotal = useMemo(() => ({
    agreed:   filteredDailyRows.reduce((s, r) => s + Number(r.agreed_weight_kg), 0),
    actual:   filteredDailyRows.reduce((s, r) => s + Number(r.actual_weight_kg), 0),
    variance: filteredDailyRows.reduce((s, r) => s + Number(r.variance_kg), 0),
    trips:    filteredDailyRows.reduce((s, r) => s + r.total_trips, 0),
    points:   filteredDailyRows.reduce((s, r) => s + r.collection_points_covered, 0),
  }), [filteredDailyRows]);

  const monthlyTotal = useMemo(() => ({
    agreed:   filteredMonthlyRows.reduce((s, r) => s + Number(r.total_agreed_weight), 0),
    actual:   filteredMonthlyRows.reduce((s, r) => s + Number(r.total_actual_weight), 0),
    variance: filteredMonthlyRows.reduce((s, r) => s + Number(r.variance_kg), 0),
    trips:    filteredMonthlyRows.reduce((s, r) => s + r.total_trips, 0),
    points:   filteredMonthlyRows.reduce((s, r) => s + r.collection_points_covered, 0),
  }), [filteredMonthlyRows]);

  /* ── actions ── */
  const handlePrint = () => window.print();

  const downloadDaily = () => {
    const ws = XLSX.utils.json_to_sheet(filteredDailyRows.map((r, i) => ({
      "S.No": i + 1, "Date": r.collection_date, "Waste Type": r.waste_type,
      "Agreed (Kg)": r.agreed_weight_kg, "Actual (Kg)": r.actual_weight_kg,
      "Variance (Kg)": r.variance_kg, "Variance %": r.variance_percent,
      "Status": r.report_status, "Trips": r.total_trips, "Points": r.collection_points_covered,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `daily-report-${panchayatName}.xlsx`);
  };

  const downloadMonthly = () => {
    const ws = XLSX.utils.json_to_sheet(filteredMonthlyRows.map((r, i) => ({
      "S.No": i + 1, "Month": r.month, "Waste Type": r.waste_type,
      "Agreed (Kg)": r.total_agreed_weight, "Actual (Kg)": r.total_actual_weight,
      "Variance (Kg)": r.variance_kg, "Status": r.report_status,
      "Trips": r.total_trips, "Points": r.collection_points_covered,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `monthly-report-${panchayatName}.xlsx`);
  };

  /* ── shared header ── */
  const Header = (
    <header
      className="print:hidden sticky top-0 z-20 flex items-center justify-between px-6 shadow-sm"
      style={{ height: 64, background: "linear-gradient(90deg,#1a8a44 0%,#22a855 100%)" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center">
          <img src={ZigmaLogo} className="h-7 w-7 object-contain" alt="Zigma" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">IWMS Portal</p>
          <p className="text-[11px] text-white/70 leading-tight">Panchayat Leader Dashboard</p>
        </div>
      </div>

      <p className="text-sm font-semibold text-white hidden md:block tracking-wide">
        {panchayatName} — Waste Collection Analytics
      </p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
          <span className="h-6 w-6 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold text-white">
            {(leaderName[0] ?? "L").toUpperCase()}
          </span>
          <span className="text-xs font-semibold text-white hidden sm:block">{leaderName}</span>
        </div>
        <button
          onClick={() => { clearLocalBodySession(); navigate("/auth/localbody", { replace: true }); }}
          className="flex items-center gap-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>
    </header>
  );

  /* ── print-only company header ── */
  const PrintHeader = (
    <div className="hidden print:block mb-6">
      <div className="flex items-center justify-between pb-3 border-b-2" style={{ borderColor: "#22a855" }}>
        <div className="flex items-center gap-3">
          <img src={ZigmaLogo} className="h-12 w-12 object-contain" alt="Zigma" />
          <div>
            <p className="text-base font-bold text-gray-900">ZIGMA Global Environ Solutions Pvt. Ltd.</p>
            <p className="text-sm text-gray-500">{panchayatName} — IWMS Panchayat Leader Portal</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">Printed: {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );

  /* ── stat card ── */
  const StatCard = ({
    label, value, accent, icon,
  }: { label: string; value: string; accent: string; icon: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: accent + "18" }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
        <p className="text-lg font-bold text-gray-800 mt-0.5">{loading ? "—" : value}</p>
      </div>
    </div>
  );

  /* ── action button ── */
  const ActionBtn = ({
    label, icon, onClick, color = "#22a855",
  }: { label: string; icon: React.ReactNode; onClick: () => void; color?: string }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-all hover:shadow-sm print:hidden"
      style={{ borderColor: color + "60", color, background: color + "0d" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = color + "1a"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = color + "0d"; }}
    >
      {icon} {label}
    </button>
  );

  /* ── table header column ── */
  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th
      className={`px-3 py-3 text-xs font-semibold border-r border-white/20 last:border-0 ${right ? "text-right" : "text-left"}`}
      style={{ background: "linear-gradient(180deg,#22a855 0%,#1a8a44 100%)", color: "#fff" }}
    >
      {children}
    </th>
  );
  const TH_B = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th
      className={`px-3 py-3 text-xs font-semibold border-r border-white/20 last:border-0 ${right ? "text-right" : "text-left"}`}
      style={{ background: "linear-gradient(180deg,#2563eb 0%,#1d4ed8 100%)", color: "#fff" }}
    >
      {children}
    </th>
  );

  /* ════════════════════════════════════════════════════════════
      HOME
  ════════════════════════════════════════════════════════════ */
  if (view === "home") {
    return (
      <div className="min-h-screen font-sans" style={{ background: "#f4f7f5" }}>
        {Header}
        <main className="p-6 space-y-6 max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* ── Welcome strip ── */}
          <div
            className="rounded-2xl px-6 py-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
            style={{ background: "linear-gradient(135deg,#e8f8ee 0%,#d1f5df 100%)", border: "1px solid #b2e8c4" }}
          >
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Welcome, <span style={{ color: "#22a855" }}>{leaderName}</span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {panchayatName} · Waste Collection Report Portal
              </p>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" style={{ color: "#22a855" }} />
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* ── Stats ── */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
              Input Waste Statistics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
              <StatCard label="Total Records (Daily)"     value={fmt(dailyRows.length, 0)}                              accent="#22a855" icon={<ClipboardList  className="h-5 w-5" />} />
              <StatCard label="Actual Weight (Kg)"        value={fmt(dailyKpis.total_actual_kg)}                         accent="#2563eb" icon={<TrendingUp      className="h-5 w-5" />} />
              <StatCard label="Agreed Weight (Kg)"        value={fmt(dailyKpis.total_agreed_kg)}                         accent="#7c3aed" icon={<FileBarChart2   className="h-5 w-5" />} />
              <StatCard label="Collection Efficiency"     value={`${fmt(dailyKpis.collection_efficiency_percent, 2)}%`}  accent="#f97316" icon={<TrendingUp      className="h-5 w-5" />} />
              <StatCard label="Total Trips"               value={fmt(dailyKpis.total_trips, 0)}                          accent="#0891b2" icon={<ClipboardList  className="h-5 w-5" />} />
              <StatCard label="Points Covered"            value={fmt(dailyKpis.collection_points_covered, 0)}            accent="#16a34a" icon={<FileBarChart2   className="h-5 w-5" />} />
              <StatCard label="Total Variance (Kg)"       value={fmt(dailyKpis.variance_kg)}                             accent="#dc2626" icon={<TrendingUp      className="h-5 w-5" />} />
              <StatCard label="Monthly Records"           value={fmt(rows.length, 0)}                                    accent="#9333ea" icon={<ClipboardList  className="h-5 w-5" />} />
            </div>
          </section>

          {/* ── Report cards ── */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Day Wise */}
              <button
                onClick={() => { setAppliedFrom(""); setAppliedTo(""); setFromDate(todayStr()); setToDate(todayStr()); setView("daily"); }}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:shadow-md hover:border-green-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:scale-105"
                    style={{ background: "#e8f8ee" }}>
                    <ClipboardList className="h-7 w-7" style={{ color: "#22a855" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                      Day Wise Report
                    </p>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                      View daily waste collection comparison records with date range filter, totals and print support.
                    </p>
                    <span
                      className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: "#e8f8ee", color: "#22a855" }}
                    >
                      Click Here →
                    </span>
                  </div>
                </div>
              </button>

              {/* Monthly */}
              <button
                onClick={() => { setAppliedMonthFilter(""); setMonthValue(currentMonth()); setView("monthly"); }}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left hover:shadow-md hover:border-blue-200 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:scale-105"
                    style={{ background: "#dbeafe" }}>
                    <FileBarChart2 className="h-7 w-7 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                      Monthly Report
                    </p>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                      View monthly waste comparison, performance metrics and variance analysis with print support.
                    </p>
                    <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                      Click Here →
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </section>
        </main>

        <footer className="text-center text-xs text-gray-400 py-5">
          Copyright © 2017–2026 ZIGMA Global Environ Solutions · All Rights Reserved.
        </footer>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
      SHARED TABLE WRAPPER
  ═══════════════════════════════════════════════════════════ */
  const isDaily    = view === "daily";
  const accentHex  = isDaily ? "#22a855" : "#2563eb";
  const accentSoft = isDaily ? "#e8f8ee" : "#dbeafe";
  const title      = isDaily ? "Day Wise Report" : "Monthly Report";
  const theRows    = isDaily ? filteredDailyRows : filteredMonthlyRows;
  const theTotal   = isDaily ? dailyTotal : monthlyTotal;

  return (
    <div className="min-h-screen font-sans" style={{ background: "#f4f7f5" }} ref={printRef}>
      {Header}

      <main className="p-6 space-y-5 max-w-screen-2xl mx-auto">

        {/* ── Breadcrumb + title ── */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={() => setView("home")}
            className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 shadow-sm transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">/</span>
            <h1 className="text-xl font-bold" style={{ color: accentHex }}>{title}</h1>
          </div>
        </div>

        {/* ── Filter card ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 print:hidden">
          <div className="flex flex-wrap items-end gap-4">
            {isDaily ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">From Date</label>
                  <input
                    type="date" value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
                    style={{ focusRingColor: accentHex } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">To Date</label>
                  <input
                    type="date" value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all"
                  />
                </div>
                <button
                  onClick={() => { setAppliedFrom(fromDate); setAppliedTo(toDate); }}
                  className="text-white font-semibold px-6 py-2 rounded-lg text-sm shadow-sm hover:opacity-90 transition-opacity"
                  style={{ background: accentHex }}
                >GO</button>
                <button
                  onClick={() => { setAppliedFrom(""); setAppliedTo(""); setFromDate(todayStr()); setToDate(todayStr()); }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
                >All Dates</button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Month</label>
                  <input
                    type="month" value={monthValue}
                    onChange={(e) => setMonthValue(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  />
                </div>
                <button
                  onClick={() => { setAppliedMonthFilter(monthValue); setAppliedMonth(monthValue); }}
                  className="text-white font-semibold px-6 py-2 rounded-lg text-sm shadow-sm hover:opacity-90 transition-opacity"
                  style={{ background: accentHex }}
                >GO</button>
                <button
                  onClick={() => { setAppliedMonthFilter(""); setAppliedMonth(""); setMonthValue(currentMonth()); }}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
                >All Months</button>
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              <ActionBtn
                label="Download" icon={<Download className="h-3.5 w-3.5" />}
                onClick={isDaily ? downloadDaily : downloadMonthly}
                color={accentHex}
              />
              <ActionBtn
                label="Print" icon={<Printer className="h-3.5 w-3.5" />}
                onClick={handlePrint}
                color="#64748b"
              />
            </div>
          </div>
        </div>

        {/* ── Summary pills ── */}
        {theRows.length > 0 && (
          <div className="flex flex-wrap gap-2 print:hidden">
            {[
              { label: "Records",       v: `${theRows.length}`,        c: accentHex  },
              { label: "Agreed Kg",     v: fmt(theTotal.agreed),       c: "#7c3aed"  },
              { label: "Actual Kg",     v: fmt(theTotal.actual),       c: accentHex  },
              { label: "Variance Kg",   v: fmt(theTotal.variance),     c: theTotal.variance < 0 ? "#dc2626" : "#16a34a" },
              { label: "Total Trips",   v: fmt(theTotal.trips, 0),     c: "#0891b2"  },
              { label: "Points",        v: fmt(theTotal.points, 0),    c: "#9333ea"  },
            ].map((p) => (
              <span
                key={p.label}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                style={{ color: p.c, background: p.c + "12", borderColor: p.c + "30" }}
              >
                {p.label}: {p.v}
              </span>
            ))}
          </div>
        )}

        {/* ── Print header ── */}
        {PrintHeader}
        <div className="hidden print:flex gap-8 text-sm mb-4 font-medium text-gray-600">
          {isDaily ? (
            <>
              <span>From: <strong>{appliedFrom || "All"}</strong></span>
              <span>To: <strong>{appliedTo || "All"}</strong></span>
            </>
          ) : (
            <span>Month: <strong>{appliedMonthFilter || "All"}</strong></span>
          )}
          <span>Panchayat: <strong>{panchayatName}</strong></span>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-gray-200 border-t-green-500 rounded-full" />
              Loading data…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {isDaily ? (
                      <>
                        <TH>S.No</TH><TH>Date</TH><TH>Waste Type</TH>
                        <TH right>Agreed (Kg)</TH><TH right>Actual (Kg)</TH>
                        <TH right>Variance (Kg)</TH><TH right>Variance %</TH>
                        <TH>Status</TH><TH right>Trips</TH><TH right>Points</TH>
                      </>
                    ) : (
                      <>
                        <TH_B>S.No</TH_B><TH_B>Month</TH_B><TH_B>Waste Type</TH_B>
                        <TH_B right>Agreed (Kg)</TH_B><TH_B right>Actual (Kg)</TH_B>
                        <TH_B right>Variance (Kg)</TH_B><TH_B right>Variance %</TH_B>
                        <TH_B>Status</TH_B><TH_B right>Trips</TH_B><TH_B right>Points</TH_B>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {theRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">
                        No records found for the selected period.
                      </td>
                    </tr>
                  ) : theRows.map((r: any, i) => (
                    <tr
                      key={r.unique_id}
                      className="border-t border-gray-50 transition-colors"
                      style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = accentSoft)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}
                    >
                      <td className="px-3 py-2.5 text-gray-400 text-xs font-medium w-12">{i + 1}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">
                        {isDaily ? r.collection_date : r.month}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{r.waste_type}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">
                        {fmt(isDaily ? r.agreed_weight_kg : r.total_agreed_weight)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold" style={{ color: accentHex }}>
                        {fmt(isDaily ? r.actual_weight_kg : r.total_actual_weight)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${r.variance_kg < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {fmt(r.variance_kg)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-500">{fmt(r.variance_percent, 2)}%</td>
                      <td className="px-3 py-2.5"><StatusBadge s={r.report_status} /></td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{r.total_trips}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">{r.collection_points_covered}</td>
                    </tr>
                  ))}
                </tbody>

                {theRows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2" style={{ borderColor: accentHex + "40", background: accentSoft }}>
                      <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-gray-700">Total</td>
                      <td className="px-3 py-3 text-right font-bold text-gray-700">{fmt(theTotal.agreed)}</td>
                      <td className="px-3 py-3 text-right font-bold" style={{ color: accentHex }}>{fmt(theTotal.actual)}</td>
                      <td className={`px-3 py-3 text-right font-bold ${theTotal.variance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {fmt(theTotal.variance)}
                      </td>
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3" />
                      <td className="px-3 py-3 text-right font-bold text-gray-700">{theTotal.trips}</td>
                      <td className="px-3 py-3 text-right font-bold text-gray-700">{theTotal.points}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {theRows.length > 0 && (
          <p className="text-xs text-gray-400 print:hidden">
            Showing {theRows.length} record{theRows.length !== 1 ? "s" : ""}
          </p>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-5 print:mt-8">
        Copyright © 2017–2026 ZIGMA Global Environ Solutions · All Rights Reserved.
      </footer>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          main, main * { visibility: visible; }
          main { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          table { font-size: 11px; border-collapse: collapse; }
          th, td { padding: 5px 8px !important; border: 1px solid #e5e7eb; }
          thead th { background: #22a855 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          tr:nth-child(even) { background: #f9fafb !important; }
          tfoot tr { background: #e8f8ee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
