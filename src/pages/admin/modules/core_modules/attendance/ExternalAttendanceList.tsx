import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterMatchMode } from "primereact/api";
import { Column } from "primereact/column";
import type { DataTableFilterMeta } from "primereact/datatable";

import { api } from "@/api";
import { DataTable } from "@/components/common/SafeDataTable";
import { Button } from "@/components/ui/button";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import Swal from "@/lib/notify";
import { FilterBar } from "@/components/common/FilterBar";
import { applyTableFilters } from "@/utils/tableFilterMatch";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const GLOBAL_FIELDS = ["emp_id", "employee_id", "name", "employee_name", "recognition_date", "recognition_time", "punch_type"];

type AttendanceRecord = Record<string, unknown>;

type AttendanceResponse = {
  company_name: string;
  project_name: string;
  count: number;
  records: AttendanceRecord[];
};

type ApiError = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

const today = () => new Date().toISOString().slice(0, 10);

const text = (row: AttendanceRecord, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return String(value);
  }
  return "-";
};

export default function ExternalAttendanceList() {
  const {
    companyUniqueId,
    projectId,
    companies,
    projects,
    isSuperAdmin,
    onCompanyChange,
    setProjectId,
  } =
    useCompanyProjectSelection({ isEdit: false });
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const fetchAttendance = useCallback(async () => {
    if (!companyUniqueId || !projectId) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get<AttendanceResponse>("/attendance/external-records/", {
        params: {
          company_id: companyUniqueId,
          project_id: projectId,
          from_date: fromDate,
          to_date: toDate,
        },
      });
      setRows(Array.isArray(data.records) ? data.records : []);
      setCompanyName(data.company_name ?? "");
      setProjectName(data.project_name ?? "");
    } catch (error: unknown) {
      setRows([]);
      Swal.fire(
        "Attendance load failed",
        (error as ApiError).response?.data?.detail ?? "Unable to load attendance records.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, fromDate, projectId, toDate]);

  useEffect(() => {
    if (companyUniqueId && projectId) fetchAttendance();
  }, [companyUniqueId, fetchAttendance, projectId]);

  const filteredForExport = useMemo(
    () => applyTableFilters(rows, filters, GLOBAL_FIELDS),
    [rows, filters],
  );

  const handleExport = () => {
    exportRecordsToExcel(
      filteredForExport,
      getAdminScreenExcelFilename("all"),
      "External Attendance",
    );
  };

  const header = (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Attendance</h1>
            <p className="text-sm text-gray-500">
              {[companyName, projectName].filter(Boolean).join(" / ") || "Project"} recognized attendance records
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {isSuperAdmin ? (
              <label className="text-sm text-gray-700">
                <span className="mb-1 block">Company</span>
                <select
                  value={companyUniqueId || ""}
                  onChange={(event) => onCompanyChange(event.target.value)}
                  className="h-10 rounded-md border bg-white px-3"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.value} value={company.value}>
                      {company.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-sm text-gray-700">
              <span className="mb-1 block">Project</span>
              <select
                value={projectId || ""}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={!companyUniqueId || projects.length === 0}
                className="h-10 rounded-md border bg-white px-3"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700">
              <span className="mb-1 block">From date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-10 rounded-md border px-3"
              />
            </label>
            <label className="text-sm text-gray-700">
              <span className="mb-1 block">To date</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-10 rounded-md border px-3"
              />
            </label>
            <Button onClick={fetchAttendance} disabled={loading || !companyUniqueId || !projectId}>
              {loading ? "Loading..." : "Load attendance"}
            </Button>
          </div>
        </div>
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={(value) => {
            setGlobalFilterValue(value);
            setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
          }}
          searchPlaceholder="Search attendance..."
          trailing={
            <button
              type="button"
              onClick={handleExport}
              disabled={filteredForExport.length === 0}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <i className="pi pi-file-excel mr-1.5 text-green-600" />
              Export to Excel
            </button>
          }
        />
      </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        onFilter={(event) => setFilters(event.filters as DataTableFilterMeta)}
        globalFilterFields={["emp_id", "name", "recognition_date", "recognition_time", "punch_type"]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={companyUniqueId && projectId ? "No attendance records found." : "Select a company and project."}
        className="p-datatable-sm"
      >
        <Column header="S.No" body={(_: AttendanceRecord, options: { rowIndex: number }) => options.rowIndex + 1} />
        <Column field="emp_id" header="Employee ID" body={(row: AttendanceRecord) => text(row, "emp_id", "employee_id")} sortable />
        <Column field="name" header="Name" body={(row: AttendanceRecord) => text(row, "name", "employee_name")} sortable />
        <Column field="recognition_date" header="Date" body={(row: AttendanceRecord) => text(row, "recognition_date", "date")} sortable />
        <Column field="recognition_time" header="Time" body={(row: AttendanceRecord) => text(row, "recognition_time", "time")} sortable />
        <Column field="punch_type" header="Punch" body={(row: AttendanceRecord) => text(row, "punch_type", "type")} />
        <Column field="similarity_score" header="Similarity" body={(row: AttendanceRecord) => text(row, "similarity_score")} />
        <Column field="latitude" header="Latitude" body={(row: AttendanceRecord) => text(row, "latitude")} />
        <Column field="longitude" header="Longitude" body={(row: AttendanceRecord) => text(row, "longitude")} />
      </DataTable>
    </div>
  );
}
