import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { Download, LogOut, MapPin, Printer } from "lucide-react";
import ZigmaLogo from "../../images/logo.png";

const IS_PROD = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD ? import.meta.env.VITE_API_PROD : import.meta.env.VITE_API_LOCAL;

const districtApi = axios.create({ baseURL: API_ROOT });
districtApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("district_access_token");
  if (token) { config.headers = config.headers ?? {}; config.headers.Authorization = `Bearer ${token}`; }
  return config;
});

type MonthlyRow = {
  unique_id: string; month: string; waste_type: string;
  total_agreed_weight: number; total_actual_weight: number; variance_kg: number;
  variance_percent: number; report_status: string; total_trips: number;
  collection_points_covered: number; collection_efficiency_percent: number;
  coverage_efficiency_percent?: number; average_weight_per_trip: number;
};
type DailyComparisonRow = {
  unique_id: string; date: string; waste_type: string;
  agreed_weight_kg: number; actual_weight_kg: number; variance_kg: number;
  variance_percent: number; report_status: string; total_trips: number;
  collection_points_covered: number;
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
  collection_efficiency_percent: number; total_trips: number; collection_points_covered: number;
};
type ApiResponse = {
  district_name: string; results: MonthlyRow[];
  monthly_trends: Array<Record<string, number | string>>;
  waste_type_breakdown: Array<Record<string, number | string>>;
  kpis: Kpis;
  day_wise_collection: Array<{ date: string; collected_weight_kg: number; trip_count: number }>;
  trip_waste_types: Array<{ waste_type: string; collected_weight_kg: number; trip_count: number }>;
  day_wise_breakdown: DayWiseBreakdown[];
  daily_rows: DailyComparisonRow[];
  daily_kpis: DailyKpis;
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

function clearDistrictSession() {
  ["district_access_token","district_unique_id","district_name","district_user_name","district_role"].forEach((k) => localStorage.removeItem(k));
}

type View = "home" | "daily" | "monthly";

const fmt = (v?: number | null, dec = 3) =>
  v == null ? "—" : Number(v).toLocaleString("en-IN", { maximumFractionDigits: dec });

const StatusBadge = ({ s }: { s: string }) => {
  const cls = s === "Surplus"
    ? "bg-green-50 border border-green-200 text-green-700"
    : s === "Deficit"
    ? "bg-red-50 border border-red-200 text-red-700"
    : "bg-blue-50 border border-blue-200 text-blue-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {s || "—"}
    </span>
  );
};

export default function DistrictDashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("district_user_name") ?? "District User";
  const districtName = localStorage.getItem("district_name") ?? "";
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("district_access_token");
    const districtId = localStorage.getItem("district_unique_id");
    if (!token || !districtId) navigate("/auth/district", { replace: true });
  }, [navigate]);

  const [view, setView] = useState<View>("home");
  const [appliedMonth, setAppliedMonth] = useState(currentMonth());
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [monthValue, setMonthValue] = useState(currentMonth());
  const [appliedMonthFilter, setAppliedMonthFilter] = useState("");

  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyComparisonRow[]>([]);
  const [dailyKpis, setDailyKpis] = useState<DailyKpis>(ZERO_DAILY_KPIS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const params: Record<string, string> = {};
      if (appliedMonth) params.month = appliedMonth;
      if (appliedFrom) params.from_date = appliedFrom;
      if (appliedTo) params.to_date = appliedTo;
      const { data } = await districtApi.get<ApiResponse>("/district/dashboard/", { params });
      setRows(Array.isArray(data?.results) ? data.results : []);
      setDailyRows(Array.isArray(data?.daily_rows) ? data.daily_rows : []);
      setDailyKpis(data?.daily_kpis ?? ZERO_DAILY_KPIS);
    } catch {
      setRows([]); setDailyRows([]); setDailyKpis(ZERO_DAILY_KPIS);
      setError("Unable to load data. Please try again.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void fetchData(); }, [appliedMonth, appliedFrom, appliedTo]);

  const filteredDailyRows = useMemo(() => {
    if (!appliedFrom && !appliedTo) return dailyRows;
    return dailyRows.filter((r) => {
      const d = r.date ?? "";
      if (!d) return false;
      if (appliedFrom && d < appliedFrom) return false;
      if (appliedTo && d > appliedTo) return false;
      return true;
    });
  }, [dailyRows, appliedFrom, appliedTo]);

  const filteredMonthlyRows = useMemo(() => {
    if (!appliedMonthFilter) return rows;
    return rows.filter((r) => r.month === appliedMonthFilter);
  }, [rows, appliedMonthFilter]);

  const dailyTotal = useMemo(() => ({
    agreed: filteredDailyRows.reduce((s, r) => s + Number(r.agreed_weight_kg), 0),
    actual: filteredDailyRows.reduce((s, r) => s + Number(r.actual_weight_kg), 0),
    variance: filteredDailyRows.reduce((s, r) => s + Number(r.variance_kg), 0),
    trips: filteredDailyRows.reduce((s, r) => s + r.total_trips, 0),
    points: filteredDailyRows.reduce((s, r) => s + r.collection_points_covered, 0),
  }), [filteredDailyRows]);

  const monthlyTotal = useMemo(() => ({
    agreed: filteredMonthlyRows.reduce((s, r) => s + Number(r.total_agreed_weight), 0),
    actual: filteredMonthlyRows.reduce((s, r) => s + Number(r.total_actual_weight), 0),
    variance: filteredMonthlyRows.reduce((s, r) => s + Number(r.variance_kg), 0),
    trips: filteredMonthlyRows.reduce((s, r) => s + r.total_trips, 0),
    points: filteredMonthlyRows.reduce((s, r) => s + r.collection_points_covered, 0),
  }), [filteredMonthlyRows]);

  const handlePrint = () => window.print();

  const downloadDaily = () => {
    const ws = XLSX.utils.json_to_sheet(filteredDailyRows.map((r, i) => ({
      "S.No": i + 1, "Date": r.date, "Waste Type": r.waste_type,
      "Agreed (Kg)": r.agreed_weight_kg, "Actual (Kg)": r.actual_weight_kg,
      "Variance (Kg)": r.variance_kg, "Variance %": r.variance_percent,
      "Status": r.report_status, "Trips": r.total_trips, "Points": r.collection_points_covered,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `daily-report-${districtName}.xlsx`);
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
      `monthly-report-${districtName}.xlsx`);
  };

  const Header = (
    <header className="print:hidden sticky top-0 z-20 flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center">
          <img src={ZigmaLogo} className="h-7 w-7 object-contain" alt="Zigma" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">IWMS Portal</p>
          <p className="text-[11px] text-gray-500 leading-tight">District Dashboard</p>
        </div>
      </div>

      <p className="text-sm font-medium text-gray-700 hidden md:block">
        <span className="font-semibold text-green-600">{districtName}</span>
        <span className="text-gray-300 mx-2">|</span>
        District Waste Analytics
      </p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <span className="h-6 w-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
            {(userName[0] ?? "D").toUpperCase()}
          </span>
          <span className="text-xs font-semibold text-gray-700 hidden sm:block">{userName}</span>
        </div>
        <button
          onClick={() => { clearDistrictSession(); navigate("/auth/district", { replace: true }); }}
          className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
      </div>
    </header>
  );

  const PrintHeader = (
    <div className="hidden print:block mb-6">
      <div className="flex items-center justify-between pb-3 border-b-2 border-green-500">
        <div className="flex items-center gap-3">
          <img src={ZigmaLogo} className="h-12 w-12 object-contain" alt="Zigma" />
          <div>
            <p className="text-base font-bold text-gray-900">ZIGMA Global Environ Solutions Pvt. Ltd.</p>
            <p className="text-sm text-gray-500">{districtName} — IWMS District Portal</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">Printed: {new Date().toLocaleString("en-IN")}</p>
      </div>
    </div>
  );

  return (
    <div ref={printRef} className="min-h-screen bg-slate-50 text-slate-900">
      {Header}
      <main className="p-6">
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Welcome back</p>
                    <p className="text-2xl font-bold text-slate-900">{districtName} Dashboard</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    <MapPin className="h-4 w-4" /> District View
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total Agreed</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{fmt(monthlyTotal.agreed, 0)} kg</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total Actual</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{fmt(monthlyTotal.actual, 0)} kg</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Variance</p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">{fmt(monthlyTotal.variance, 0)} kg</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Filters</p>
                    <p className="text-sm font-semibold text-slate-900">Select month and range</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500">Month</label>
                    <input
                      type="month"
                      value={monthValue}
                      onChange={(e) => setMonthValue(e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => { setAppliedMonth(monthValue); setAppliedMonthFilter(monthValue); }}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                    >Apply Month</button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500">Date range</label>
                    <div className="mt-2 grid gap-2">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                      />
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => { setAppliedFrom(fromDate); setAppliedTo(toDate); }}
                        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                      >Apply Range</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Monthly performance</p>
                <p className="text-sm text-slate-500">District-level waste collection metrics</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadMonthly}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Export
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>
            {error ? (
              <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
            ) : null}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-3 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    <th className="pb-3">Month</th>
                    <th className="pb-3">Waste Type</th>
                    <th className="pb-3">Agreed</th>
                    <th className="pb-3">Actual</th>
                    <th className="pb-3">Variance</th>
                    <th className="pb-3">Trips</th>
                    <th className="pb-3">Points</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthlyRows.map((row) => (
                    <tr key={row.unique_id} className="border-t border-slate-200">
                      <td className="py-3 text-slate-700">{row.month}</td>
                      <td className="py-3 text-slate-700">{row.waste_type}</td>
                      <td className="py-3 text-slate-700">{fmt(row.total_agreed_weight, 0)}</td>
                      <td className="py-3 text-slate-700">{fmt(row.total_actual_weight, 0)}</td>
                      <td className="py-3 text-slate-700">{fmt(row.variance_kg, 0)}</td>
                      <td className="py-3 text-slate-700">{row.total_trips}</td>
                      <td className="py-3 text-slate-700">{row.collection_points_covered}</td>
                      <td className="py-3"><StatusBadge s={row.report_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Daily performance</p>
                <p className="text-sm text-slate-500">Date-filtered daily collection details</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadDaily}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Export
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total Agreed</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{fmt(dailyTotal.agreed, 0)} kg</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total Actual</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{fmt(dailyTotal.actual, 0)} kg</p>
              </div>
              <div className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Variance</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{fmt(dailyTotal.variance, 0)} kg</p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-3 text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Waste Type</th>
                    <th className="pb-3">Agreed</th>
                    <th className="pb-3">Actual</th>
                    <th className="pb-3">Variance</th>
                    <th className="pb-3">Trips</th>
                    <th className="pb-3">Points</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDailyRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">No daily records found for the selected date range.</td>
                    </tr>
                  ) : (
                    filteredDailyRows.map((row) => (
                      <tr key={row.unique_id} className="border-t border-slate-200">
                        <td className="py-3 text-slate-700">{row.date}</td>
                        <td className="py-3 text-slate-700">{row.waste_type}</td>
                        <td className="py-3 text-slate-700">{fmt(row.agreed_weight_kg, 0)}</td>
                        <td className="py-3 text-slate-700">{fmt(row.actual_weight_kg, 0)}</td>
                        <td className="py-3 text-slate-700">{fmt(row.variance_kg, 0)}</td>
                        <td className="py-3 text-slate-700">{row.total_trips}</td>
                        <td className="py-3 text-slate-700">{row.collection_points_covered}</td>
                        <td className="py-3"><StatusBadge s={row.report_status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
