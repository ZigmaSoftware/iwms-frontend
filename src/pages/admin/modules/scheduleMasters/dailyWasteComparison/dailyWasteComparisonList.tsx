import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { Download, Plus, Search, Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { dailyWasteComparisonApi } from "@/helpers/admin";
import { api } from "@/api";

type DailyReportRow = {
  unique_id: string;
  company_id: string;
  company_name?: string;
  project_id: string;
  project_name?: string;
  collection_date: string;
  panchayat_id: string;
  panchayat_name?: string;
  waste_type: string;
  agreed_weight_kg: number;
  actual_weight_kg: number;
  variance_kg: number;
  variance_percent: number;
  report_status: "Surplus" | "Deficit" | "On Target" | string;
  total_trips: number;
  collection_points_covered: number;
};

type DailyReportResponse = {
  results: DailyReportRow[];
  date_trends: Array<Record<string, number | string>>;
  panchayat_comparison: Array<Record<string, number | string>>;
  kpis: {
    total_agreed_weight_kg: number;
    total_actual_weight_kg: number;
    variance_kg: number;
    collection_efficiency_percent: number;
    total_trips: number;
    collection_points_covered: number;
  };
};

const initialKpis: DailyReportResponse["kpis"] = {
  total_agreed_weight_kg: 0,
  total_actual_weight_kg: 0,
  variance_kg: 0,
  collection_efficiency_percent: 0,
  total_trips: 0,
  collection_points_covered: 0,
};

const todayValue = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

export default function DailyWasteComparisonList() {
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

  const [dateValue, setDateValue] = useState(todayValue());
  const [appliedDate, setAppliedDate] = useState(todayValue());
  const [sortMode, setSortMode] = useState("absolute");
  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [dateTrends, setDateTrends] = useState<DailyReportResponse["date_trends"]>([]);
  const [panchayatComparison, setPanchayatComparison] = useState<DailyReportResponse["panchayat_comparison"]>([]);
  const [kpis, setKpis] = useState<DailyReportResponse["kpis"]>(initialKpis);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encScheduleMasters, encDailyWasteComparison } = getEncryptedRoute();
  const NEW_PATH = `/${encScheduleMasters}/${encDailyWasteComparison}/new`;

  const fetchReport = async () => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId) {
      setRows([]);
      setDateTrends([]);
      setPanchayatComparison([]);
      setKpis(initialKpis);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = { sort: sortMode };
      if (appliedDate) params.date = appliedDate;
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;

      const { data } = await api.get<DailyReportResponse>(
        "/schedule-masters/daily-waste-comparisons/",
        { params },
      );
      setRows(Array.isArray(data?.results) ? data.results : []);
      setDateTrends(Array.isArray(data?.date_trends) ? data.date_trends : []);
      setPanchayatComparison(
        Array.isArray(data?.panchayat_comparison) ? data.panchayat_comparison : [],
      );
      setKpis(data?.kpis ?? initialKpis);
    } catch {
      setRows([]);
      setDateTrends([]);
      setPanchayatComparison([]);
      setKpis(initialKpis);
      setError("Unable to load daily waste comparison data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
  }, [appliedDate, sortMode, companyUniqueId, projectId, companies.length]);

  const formatNumber = (value?: number | string | null, suffix = "") => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return "-";
    return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  };

  const statusBadge = (row: DailyReportRow) => {
    const status = String(row.report_status || "On Target");
    const cls =
      status === "Surplus"
        ? "bg-green-100 text-green-800 border border-green-200"
        : status === "Deficit"
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-blue-100 text-blue-800 border border-blue-200";
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
      >
        {status}
      </span>
    );
  };

  const handleDelete = async (row: DailyReportRow) => {
    const result = await Swal.fire({
      title: t("common.are_you_sure"),
      text: `Delete record for ${row.panchayat_name ?? row.panchayat_id} — ${row.collection_date}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: t("common.delete"),
      cancelButtonText: t("common.cancel"),
    });
    if (!result.isConfirmed) return;
    try {
      await dailyWasteComparisonApi.remove(row.unique_id);
      await fetchReport();
      Swal.fire(t("common.success"), t("common.deleted_success"), "success");
    } catch {
      Swal.fire(t("common.error"), "Failed to delete record.", "error");
    }
  };

  const actionTemplate = (row: DailyReportRow) => (
    <div className="flex gap-2 justify-center">
      <button
        onClick={() =>
          navigate(`/${encScheduleMasters}/${encDailyWasteComparison}/${row.unique_id}/edit`, {
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
          placeholder="Search records..."
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const exportRows = useMemo(
    () =>
      rows.map((row) => ({
        collection_date: row.collection_date,
        panchayat_id: row.panchayat_id,
        panchayat_name: row.panchayat_name,
        waste_type: row.waste_type,
        agreed_weight_kg: row.agreed_weight_kg,
        actual_weight_kg: row.actual_weight_kg,
        variance_kg: row.variance_kg,
        variance_percent: row.variance_percent,
        report_status: row.report_status,
        total_trips: row.total_trips,
        collection_points_covered: row.collection_points_covered,
      })),
    [rows],
  );

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Waste Comparison");
    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `daily-waste-comparison-${appliedDate || "all-dates"}.xlsx`,
    );
  };

  const kpiCards = [
    {
      label: "Collection Efficiency",
      value: formatNumber(kpis.collection_efficiency_percent, "%"),
      color: "border-l-blue-500",
      text: "text-blue-700",
    },
    {
      label: "Total Variance",
      value: formatNumber(kpis.variance_kg, " kg"),
      color: "border-l-orange-500",
      text: "text-orange-700",
    },
    {
      label: "Total Trips",
      value: formatNumber(kpis.total_trips),
      color: "border-l-teal-500",
      text: "text-teal-700",
    },
    {
      label: "Points Covered",
      value: formatNumber(kpis.collection_points_covered),
      color: "border-l-pink-500",
      text: "text-pink-700",
    },
    {
      label: "Agreed Weight",
      value: formatNumber(kpis.total_agreed_weight_kg, " kg"),
      color: "border-l-indigo-500",
      text: "text-indigo-700",
    },
    {
      label: "Actual Weight",
      value: formatNumber(kpis.total_actual_weight_kg, " kg"),
      color: "border-l-cyan-500",
      text: "text-cyan-700",
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daily Waste Collection Comparison</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agreed vs actual collection by date, panchayat, and waste type.
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
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
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
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateValue}
            max={todayValue()}
            onChange={(e) => setDateValue(e.target.value)}
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
            onClick={() => setAppliedDate(dateValue)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Go
          </button>
          <button
            onClick={() => {
              setDateValue("");
              setAppliedDate("");
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            All Dates
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Date-wise Collection Trend
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dateTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="collection_date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="agreed_weight_kg"
                name="Agreed"
                fill="#2563eb"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="actual_weight_kg"
                name="Actual"
                fill="#16a34a"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Panchayat Performance (Top 8)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={panchayatComparison.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="panchayat_name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar
                dataKey="variance_kg"
                name="Variance kg"
                fill="#f97316"
                radius={[3, 3, 0, 0]}
              />
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
          emptyMessage="No daily comparison data found."
          globalFilterFields={[
            "collection_date",
            "panchayat_id",
            "panchayat_name",
            "waste_type",
            "report_status",
          ]}
          className="p-datatable-sm"
        >
          <Column header="S.No" body={(_, opts) => opts.rowIndex + 1} style={{ width: "60px" }} />
          <Column field="collection_date" header="Date" sortable />
          <Column field="panchayat_id" header="Panchayat ID" sortable />
          <Column field="panchayat_name" header="Panchayat" sortable />
          <Column field="waste_type" header="Waste Type" sortable />
          <Column
            field="agreed_weight_kg"
            header="Agreed (kg)"
            body={(r) => formatNumber(r.agreed_weight_kg)}
            sortable
          />
          <Column
            field="actual_weight_kg"
            header="Actual (kg)"
            body={(r) => formatNumber(r.actual_weight_kg)}
            sortable
          />
          <Column
            field="variance_kg"
            header="Variance (kg)"
            body={(r) => formatNumber(r.variance_kg)}
            sortable
          />
          <Column
            field="variance_percent"
            header="Variance %"
            body={(r) => formatNumber(r.variance_percent, "%")}
            sortable
          />
          <Column field="report_status" header="Status" body={statusBadge} sortable />
          <Column field="total_trips" header="Trips" sortable />
          <Column field="collection_points_covered" header="Points" sortable />
          <Column header="Actions" body={actionTemplate} style={{ width: "90px" }} />
        </DataTable>
      </div>
    </div>
  );
}
