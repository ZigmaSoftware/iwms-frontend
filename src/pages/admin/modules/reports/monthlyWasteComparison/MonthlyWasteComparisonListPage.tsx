import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { adminApi } from "@/helpers/admin/registry";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { Download, Plus, Search, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
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
import { getEncryptedRoute } from "@/utils/routeCache";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type ReportRow = {
  unique_id: string;
  company_id: string;
  company_name?: string;
  project_id: string;
  project_name?: string;
  month: string;
  panchayat_id: string;
  panchayat_name?: string;
  waste_type: string;
  total_agreed_weight: number;
  total_actual_weight: number;
  variance_kg: number;
  variance_percent: number;
  report_status: "Surplus" | "Deficit" | "On Target" | string;
  total_trips: number;
  collection_points_covered: number;
  collection_efficiency_percent: number;
  coverage_efficiency_percent?: number;
  average_weight_per_trip: number;
};

type ReportResponse = {
  results: ReportRow[];
  monthly_trends: Array<Record<string, number | string>>;
  panchayat_comparison: Array<Record<string, number | string>>;
  kpis: {
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
};

const initialKpis: ReportResponse["kpis"] = {
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
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

export default function MonthlyWasteComparisonListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const [monthValue, setMonthValue] = useState(currentMonth());
  const [appliedMonth, setAppliedMonth] = useState(currentMonth());
  const [sortMode, setSortMode] = useState("absolute");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<ReportResponse["monthly_trends"]>([]);
  const [panchayatComparison, setPanchayatComparison] = useState<ReportResponse["panchayat_comparison"]>([]);
  const [kpis, setKpis] = useState<ReportResponse["kpis"]>(initialKpis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encReport, encMonthlyWasteComparison } = getEncryptedRoute();
  const NEW_PATH = `/${encReport}/${encMonthlyWasteComparison}/new`;

  const fetchReport = async () => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId) { setRows([]); setMonthlyTrends([]); setPanchayatComparison([]); setKpis(initialKpis); return; }

    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { sort: sortMode };
      if (appliedMonth) params.month = appliedMonth;
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;

      const { data } = await api.get<ReportResponse>("/reports/monthly-waste-comparison/", {
        params,
      });
      setRows(Array.isArray(data?.results) ? data.results : []);
      setMonthlyTrends(Array.isArray(data?.monthly_trends) ? data.monthly_trends : []);
      setPanchayatComparison(Array.isArray(data?.panchayat_comparison) ? data.panchayat_comparison : []);
      setKpis(data?.kpis ?? initialKpis);
    } catch {
      setRows([]);
      setMonthlyTrends([]);
      setPanchayatComparison([]);
      setKpis(initialKpis);
      setError("Unable to load monthly waste comparison report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
  }, [appliedMonth, sortMode, companyUniqueId, projectId, companies.length]);

  const formatNumber = (value?: number | string | null, suffix = "") => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "-";
    return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  };

  const statusBadge = (row: ReportRow) => {
    const status = String(row.report_status || "On Target");
    const cls =
      status === "Surplus"
        ? "bg-green-100 text-green-800 border border-green-200"
        : status === "Deficit"
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-blue-100 text-blue-800 border border-blue-200";
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {status}
      </span>
    );
  };

  const handleDelete = async (row: ReportRow) => {
    const result = await Swal.fire({
      title: t("common.are_you_sure"),
      text: `Delete record for ${row.panchayat_name ?? row.panchayat_id} — ${row.month}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: t("common.delete"),
      cancelButtonText: t("common.cancel"),
    });
    if (!result.isConfirmed) return;
    try {
      await adminApi.monthlyWasteComparison.remove(row.unique_id);
      await fetchReport();
      Swal.fire(t("common.success"), t("common.deleted_success"), "success");
    } catch {
      Swal.fire(t("common.error"), "Failed to delete record.", "error");
    }
  };

  const actionTemplate = (row: ReportRow) => (
    <div className="flex gap-2 justify-center">
      <button
        onClick={() =>
          navigate(`/${encReport}/${encMonthlyWasteComparison}/${row.unique_id}/edit`, {
            state: {
              record: row,
              companyUniqueId: row.company_id,
              projectId: row.project_id,
            },
          })
        }
        className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
        title={t("common.edit")}
      >
        <Pencil size={15} />
      </button>
      <button
        onClick={() => handleDelete(row)}
        className="inline-flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
        title={t("common.delete")}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  const renderHeader = () => (
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
  );

  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        month: row.month,
        panchayat_id: row.panchayat_id,
        panchayat_name: row.panchayat_name,
        waste_type: row.waste_type,
        total_agreed_weight: row.total_agreed_weight,
        total_actual_weight: row.total_actual_weight,
        variance_kg: row.variance_kg,
        variance_percent: row.variance_percent,
        report_status: row.report_status,
        total_trips: row.total_trips,
        collection_points_covered: row.collection_points_covered,
        collection_efficiency_percent: row.collection_efficiency_percent,
        coverage_efficiency_percent: row.coverage_efficiency_percent,
        average_weight_per_trip: row.average_weight_per_trip,
      })),
    [rows],
  );

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Waste Comparison");
    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `monthly-waste-comparison-${appliedMonth || "all-months"}.xlsx`,
    );
  };

  const kpiCards = [
    {
      label: "Collection Efficiency",
      value: formatNumber(kpis.collection_efficiency_percent, "%"),
      color: "border-l-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-700",
    },
    {
      label: "Average Weight / Trip",
      value: formatNumber(kpis.average_weight_per_trip, " kg"),
      color: "border-l-green-500",
      bg: "bg-green-50",
      text: "text-green-700",
    },
    {
      label: "Coverage Efficiency",
      value: formatNumber(kpis.coverage_efficiency_percent, "%"),
      color: "border-l-purple-500",
      bg: "bg-purple-50",
      text: "text-purple-700",
    },
    {
      label: "Total Variance",
      value: formatNumber(kpis.variance_kg, " kg"),
      color: "border-l-orange-500",
      bg: "bg-orange-50",
      text: "text-orange-700",
    },
    {
      label: "Total Trips",
      value: formatNumber(kpis.total_trips),
      color: "border-l-teal-500",
      bg: "bg-teal-50",
      text: "text-teal-700",
    },
    {
      label: "Points Covered",
      value: formatNumber(kpis.collection_points_covered),
      color: "border-l-pink-500",
      bg: "bg-pink-50",
      text: "text-pink-700",
    },
    {
      label: "Agreed Weight",
      value: formatNumber(kpis.total_agreed_weight, " kg"),
      color: "border-l-indigo-500",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
    },
    {
      label: "Actual Weight",
      value: formatNumber(kpis.total_actual_weight, " kg"),
      color: "border-l-cyan-500",
      bg: "bg-cyan-50",
      text: "text-cyan-700",
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monthly Waste Collection Comparison</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agreed vs actual collection by month, panchayat, and waste type.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            </option>
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

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
          <button
            onClick={() => navigate(NEW_PATH)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Record
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <Line type="monotone" dataKey="total_actual_weight" name="Actual" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Panchayat Performance (Top 8)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={panchayatComparison.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="panchayat_name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="variance_kg" name="Variance kg" fill="#f97316" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <DataTable
          value={rows}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          filters={filters}
          header={renderHeader()}
          loading={loading}
          stripedRows
          showGridlines
          emptyMessage="No monthly comparison data found."
          globalFilterFields={["month", "panchayat_id", "panchayat_name", "waste_type", "report_status"]}
          className="p-datatable-sm"
        >
          <Column header="S.No" body={(_, opts) => opts.rowIndex + 1} style={{ width: "60px" }} />
          <Column field="month" header="Month" sortable />
          <Column field="panchayat_id" header="Panchayat ID" sortable />
          <Column field="panchayat_name" header="Panchayat" sortable />
          <Column field="waste_type" header="Waste Type" sortable />
          <Column field="total_agreed_weight" header="Agreed (kg)" body={(r) => formatNumber(r.total_agreed_weight)} sortable />
          <Column field="total_actual_weight" header="Actual (kg)" body={(r) => formatNumber(r.total_actual_weight)} sortable />
          <Column field="variance_kg" header="Variance (kg)" body={(r) => formatNumber(r.variance_kg)} sortable />
          <Column field="variance_percent" header="Variance %" body={(r) => formatNumber(r.variance_percent, "%")} sortable />
          <Column field="report_status" header="Status" body={statusBadge} sortable />
          <Column field="total_trips" header="Trips" sortable />
          <Column field="collection_points_covered" header="Points" sortable />
          <Column field="collection_efficiency_percent" header="Coll. Eff. %" body={(r) => formatNumber(r.collection_efficiency_percent, "%")} sortable />
          <Column field="coverage_efficiency_percent" header="Coverage %" body={(r) => formatNumber(r.coverage_efficiency_percent, "%")} sortable />
          <Column field="average_weight_per_trip" header="Avg/Trip" body={(r) => formatNumber(r.average_weight_per_trip)} sortable />
          <Column header="Actions" body={actionTemplate} style={{ width: "90px" }} />
        </DataTable>
      </div>
    </div>
  );
}
