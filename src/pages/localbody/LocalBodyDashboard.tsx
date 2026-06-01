import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Dedicated axios instance for the localbody portal.
// Uses lb_access_token so it never conflicts with the admin panel's session.
const IS_PROD = import.meta.env.VITE_PROD === "true";
const API_ROOT = IS_PROD
  ? import.meta.env.VITE_API_PROD
  : import.meta.env.VITE_API_LOCAL;

const lbApi = axios.create({ baseURL: API_ROOT });
lbApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("lb_access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { Building2, Download, LogOut, Search } from "lucide-react";
import ZigmaLogo from "../../images/logo.png";

/* ─── types ─────────────────────────────────────────────── */

type ReportRow = {
  unique_id: string;
  month: string;
  panchayat_id: string;
  panchayat_name?: string;
  waste_type: string;
  total_agreed_weight: number;
  total_actual_weight: number;
  variance_kg: number;
  variance_percent: number;
  report_status: string;
  total_trips: number;
  collection_points_covered: number;
  collection_efficiency_percent: number;
  coverage_efficiency_percent?: number;
  average_weight_per_trip: number;
};

type Kpis = {
  total_agreed_weight: number;
  total_actual_weight: number;
  variance_kg: number;
  collection_efficiency_percent: number;
  average_weight_per_trip: number;
  coverage_efficiency_percent: number;
  total_trips: number;
  collection_points_covered: number;
  report_status: string;
};

type ApiResponse = {
  panchayat_name: string;
  results: ReportRow[];
  monthly_trends: Array<Record<string, number | string>>;
  waste_type_breakdown: Array<Record<string, number | string>>;
  kpis: Kpis;
};

const ZERO_KPIS: Kpis = {
  total_agreed_weight: 0,
  total_actual_weight: 0,
  variance_kg: 0,
  collection_efficiency_percent: 0,
  average_weight_per_trip: 0,
  coverage_efficiency_percent: 0,
  total_trips: 0,
  collection_points_covered: 0,
  report_status: "On Target",
};

const currentMonth = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
};

function clearLocalBodySession() {
  [
    "lb_access_token",
    "lb_panchayat_unique_id", "lb_panchayat_name",
    "lb_leader_name", "lb_role",
  ].forEach((k) => localStorage.removeItem(k));
}

/* ─── component ─────────────────────────────────────────── */

export default function LocalBodyDashboard() {
  const navigate = useNavigate();

  const leaderName    = localStorage.getItem("lb_leader_name") ?? "Leader";
  const panchayatName = localStorage.getItem("lb_panchayat_name") ?? "";

  /* redirect if not authenticated as panchayat_leader */
  useEffect(() => {
    const role  = localStorage.getItem("lb_role");
    const token = localStorage.getItem("lb_access_token");
    if (role !== "panchayat_leader" || !token) {
      navigate("/auth/localbody", { replace: true });
    }
  }, [navigate]);

  /* ── filter state ── */
  const [monthValue,   setMonthValue]   = useState(currentMonth());
  const [appliedMonth, setAppliedMonth] = useState(currentMonth());
  const [sortMode,     setSortMode]     = useState("absolute");

  /* ── data state ── */
  const [rows,              setRows]              = useState<ReportRow[]>([]);
  const [monthlyTrends,     setMonthlyTrends]     = useState<ApiResponse["monthly_trends"]>([]);
  const [wasteBreakdown,    setWasteBreakdown]    = useState<ApiResponse["waste_type_breakdown"]>([]);
  const [kpis,              setKpis]              = useState<Kpis>(ZERO_KPIS);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");

  /* ── table filter ── */
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  /* ── fetch ── */
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { sort: sortMode };
      if (appliedMonth) params.month = appliedMonth;

      const { data } = await lbApi.get<ApiResponse>("/localbody/dashboard/", { params });
      setRows(Array.isArray(data?.results) ? data.results : []);
      setMonthlyTrends(Array.isArray(data?.monthly_trends) ? data.monthly_trends : []);
      setWasteBreakdown(Array.isArray(data?.waste_type_breakdown) ? data.waste_type_breakdown : []);
      setKpis(data?.kpis ?? ZERO_KPIS);
    } catch {
      setRows([]); setMonthlyTrends([]); setWasteBreakdown([]); setKpis(ZERO_KPIS);
      setError("Unable to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, [appliedMonth, sortMode]);

  /* ── helpers ── */
  const fmt = (val?: number | null, suffix = "") => {
    const n = Number(val);
    if (Number.isNaN(n)) return "—";
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  };

  const statusBadge = (row: ReportRow) => {
    const s = String(row.report_status || "On Target");
    const cls = s === "Surplus"
      ? "bg-green-100 text-green-800 border-green-200"
      : s === "Deficit"
        ? "bg-red-100 text-red-800 border-red-200"
        : "bg-blue-100 text-blue-800 border-blue-200";
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
        {s}
      </span>
    );
  };

  /* ── download ── */
  const exportRows = useMemo(() =>
    rows.map((r) => ({
      month: r.month,
      panchayat_name: r.panchayat_name,
      waste_type: r.waste_type,
      agreed_kg: r.total_agreed_weight,
      actual_kg: r.total_actual_weight,
      variance_kg: r.variance_kg,
      variance_pct: r.variance_percent,
      status: r.report_status,
      trips: r.total_trips,
      points: r.collection_points_covered,
      collection_eff_pct: r.collection_efficiency_percent,
      coverage_eff_pct: r.coverage_efficiency_percent,
      avg_per_trip: r.average_weight_per_trip,
    })), [rows]);

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Waste Report");
    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `waste-report-${panchayatName}-${appliedMonth || "all"}.xlsx`,
    );
  };

  const handleLogout = () => {
    clearLocalBodySession();
    navigate("/auth/localbody", { replace: true });
  };

  /* ── KPI cards ── */
  const kpiCards = [
    { label: "Collection Efficiency", value: fmt(kpis.collection_efficiency_percent, "%"),  color: "border-l-blue-500",   text: "text-blue-700"   },
    { label: "Avg Weight / Trip",     value: fmt(kpis.average_weight_per_trip, " kg"),      color: "border-l-green-500",  text: "text-green-700"  },
    { label: "Coverage Efficiency",   value: fmt(kpis.coverage_efficiency_percent, "%"),    color: "border-l-purple-500", text: "text-purple-700" },
    { label: "Total Variance",        value: fmt(kpis.variance_kg, " kg"),                  color: "border-l-orange-500", text: "text-orange-700" },
    { label: "Total Trips",           value: fmt(kpis.total_trips),                         color: "border-l-teal-500",   text: "text-teal-700"   },
    { label: "Points Covered",        value: fmt(kpis.collection_points_covered),           color: "border-l-pink-500",   text: "text-pink-700"   },
    { label: "Agreed Weight",         value: fmt(kpis.total_agreed_weight, " kg"),          color: "border-l-indigo-500", text: "text-indigo-700" },
    { label: "Actual Weight",         value: fmt(kpis.total_actual_weight, " kg"),          color: "border-l-cyan-500",   text: "text-cyan-700"   },
  ];

  /* ── render ── */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top nav — height matches admin header (85px) ── */}
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="p-4 space-y-5">

        {/* ── Page header + filters ── */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Monthly Waste Collection</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {panchayatName
                ? `Agreed vs actual collection · ${panchayatName}`
                : "Agreed vs actual collection report"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={monthValue}
              max={currentMonth()}
              onChange={(e) => setMonthValue(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="absolute">Highest variance</option>
              <option value="deficit">Highest deficit</option>
              <option value="surplus">Highest surplus</option>
            </select>
            <button
              onClick={() => setAppliedMonth(monthValue)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Go
            </button>
            <button
              onClick={() => { setMonthValue(""); setAppliedMonth(""); }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              All Months
            </button>
            <button
              onClick={handleDownload}
              disabled={!rows.length}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Download size={15} />
              Download
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className={`bg-white rounded-lg border border-gray-200 border-l-4 ${kpi.color} p-3 shadow-sm`}
            >
              <p className="text-xs text-gray-500 font-medium truncate">{kpi.label}</p>
              <p className={`text-lg font-bold mt-1 ${kpi.text}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Monthly Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Monthly Trend</h2>
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

          {/* Waste Type Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Waste Type Breakdown</h2>
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

        {/* ── Data Table ── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <DataTable
            value={rows}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            filters={filters}
            loading={loading}
            stripedRows
            showGridlines
            emptyMessage="No waste collection data found for this panchayat."
            globalFilterFields={["month", "waste_type", "report_status"]}
            className="p-datatable-sm"
            header={
              <div className="flex justify-end items-center">
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
                  <Search size={15} className="text-gray-500" />
                  <InputText
                    value={globalFilterValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      setGlobalFilterValue(value);
                      setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
                    }}
                    placeholder="Search report..."
                    className="p-inputtext-sm !border-0 !shadow-none"
                  />
                </div>
              </div>
            }
          >
            <Column header="S.No" body={(_: ReportRow, opts: any) => opts.rowIndex + 1} style={{ width: "60px" }} />
            <Column field="month"                         header="Month"        sortable />
            <Column field="waste_type"                    header="Waste Type"   sortable />
            <Column field="total_agreed_weight"           header="Agreed (kg)"  body={(r: ReportRow) => fmt(r.total_agreed_weight)}                sortable />
            <Column field="total_actual_weight"           header="Actual (kg)"  body={(r: ReportRow) => fmt(r.total_actual_weight)}                sortable />
            <Column field="variance_kg"                   header="Variance (kg)" body={(r: ReportRow) => fmt(r.variance_kg)}                      sortable />
            <Column field="variance_percent"              header="Variance %"   body={(r: ReportRow) => fmt(r.variance_percent, "%")}             sortable />
            <Column field="report_status"                 header="Status"       body={statusBadge}                                                sortable />
            <Column field="total_trips"                   header="Trips"        sortable />
            <Column field="collection_points_covered"     header="Points"       sortable />
            <Column field="collection_efficiency_percent" header="Coll. Eff. %" body={(r: ReportRow) => fmt(r.collection_efficiency_percent, "%")} sortable />
            <Column field="coverage_efficiency_percent"   header="Coverage %"   body={(r: ReportRow) => fmt(r.coverage_efficiency_percent, "%")}  sortable />
            <Column field="average_weight_per_trip"       header="Avg/Trip"     body={(r: ReportRow) => fmt(r.average_weight_per_trip)}           sortable />
          </DataTable>
        </div>

      </main>
    </div>
  );
}
