import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterMatchMode } from "primereact/api";
import { Column } from "primereact/column";
import type { DataTableFilterMeta } from "primereact/datatable";

import { api } from "@/api";
import { DataTable } from "@/components/common/SafeDataTable";
import { Button } from "@/components/ui/button";
import Swal from "@/lib/notify";
import { FilterBar } from "@/components/common/FilterBar";
import { FilterSection, type ActiveFilterChip } from "@/components/common/ListToolbar";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import { combineFilters } from "@/components/filters/useOptionFilter";
import { applyTableFilters } from "@/utils/tableFilterMatch";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const GLOBAL_FIELDS = [
  "emp_id",
  "employee_id",
  "name",
  "employee_name",
  "recognition_date",
  "recognition_time",
  "punch_type",
];

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

const DATE_INPUT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const text = (row: AttendanceRecord, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "")
      return String(value);
  }
  return "-";
};

export default function ExternalAttendanceList() {
  // Company / Project and the date range live in the table's Filters panel.
  // The attendance provider needs one company + project, so there is no
  // "All" choice: the first ones are picked by default, as before.
  const companyProject = useCompanyProjectFilter(undefined, {
    defaultToAll: false,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;

  // Both dates are required and default to today; Reset and the chips' ✕
  // go back to today rather than to an empty date.
  const [defaultDate] = useState(today);
  const dates = useDraftFilter({ empty: { from: defaultDate, to: defaultDate } });
  const { from: fromDate, to: toDate } = dates.applied;
  const dateChips: ActiveFilterChip[] = (
    [
      ["from", "From date"],
      ["to", "To date"],
    ] as const
  )
    .filter(([key]) => dates.applied[key] !== defaultDate)
    .map(([key, label]) => ({
      key,
      label,
      value: dates.applied[key],
      onRemove: () => dates.commit({ ...dates.applied, [key]: defaultDate }),
    }));
  const datePart = {
    ...dates,
    chips: dateChips,
    count: dateChips.length,
    // an emptied input falls back to today
    apply: () =>
      dates.commit({
        from: dates.draft.from || defaultDate,
        to: dates.draft.to || defaultDate,
      }),
    field: (
      <FilterSection label="Date range">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block">From date</span>
            <input
              type="date"
              value={dates.draft.from}
              max={dates.draft.to || undefined}
              onChange={(event) => dates.setField("from", event.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </label>
          <label className="text-sm text-gray-700">
            <span className="mb-1 block">To date</span>
            <input
              type="date"
              value={dates.draft.to}
              min={dates.draft.from || undefined}
              onChange={(event) => dates.setField("to", event.target.value)}
              className={DATE_INPUT_CLASS}
            />
          </label>
        </div>
      </FilterSection>
    ),
  };
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
      const { data } = await api.get<AttendanceResponse>(
        "/attendance/external-records/",
        {
          params: {
            company_id: companyUniqueId,
            project_id: projectId,
            from_date: fromDate,
            to_date: toDate,
          },
        },
      );
      setRows(Array.isArray(data.records) ? data.records : []);
      setCompanyName(data.company_name ?? "");
      setProjectName(data.project_name ?? "");
    } catch (error: unknown) {
      setRows([]);
      Swal.fire(
        "Attendance load failed",
        (error as ApiError).response?.data?.detail ??
          "Unable to load attendance records.",
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

  const renderHeader = (actions: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Attendance</h1>
          <p className="text-sm text-gray-500">
            {[companyName, projectName].filter(Boolean).join(" / ") ||
              "Project"}{" "}
            recognized attendance records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={fetchAttendance}
            disabled={loading || !companyUniqueId || !projectId}
          >
            {loading ? "Loading..." : "Load attendance"}
          </Button>
          {actions}
        </div>
      </div>
      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={(value) => {
          setGlobalFilterValue(value);
          setFilters({
            global: { value, matchMode: FilterMatchMode.CONTAINS },
          });
        }}
        searchPlaceholder="Search attendance..."
      />
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        loadExportRows={async () => filteredForExport}
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        onFilter={(event) => setFilters(event.filters as DataTableFilterMeta)}
        globalFilterFields={[
          "emp_id",
          "name",
          "recognition_date",
          "recognition_time",
          "punch_type",
        ]}
        renderHeaderWithActions={renderHeader}
        filterPanel={combineFilters(companyProject, datePart)}
        stripedRows
        showGridlines
        emptyMessage={
          companyUniqueId && projectId
            ? "No attendance records found."
            : "Select a company and project."
        }
        className="p-datatable-sm"
      >
        <Column
          header="S.No"
          body={(_: AttendanceRecord, options: { rowIndex: number }) =>
            options.rowIndex + 1
          }
        />
        <Column
          field="emp_id"
          header="Employee ID"
          body={(row: AttendanceRecord) => text(row, "emp_id", "employee_id")}
          sortable
        />
        <Column
          field="name"
          header="Name"
          body={(row: AttendanceRecord) => text(row, "name", "employee_name")}
          sortable
        />
        <Column
          field="recognition_date"
          header="Date"
          body={(row: AttendanceRecord) =>
            text(row, "recognition_date", "date")
          }
          sortable
        />
        <Column
          field="recognition_time"
          header="Time"
          body={(row: AttendanceRecord) =>
            text(row, "recognition_time", "time")
          }
          sortable
        />
        <Column
          field="punch_type"
          header="Punch"
          body={(row: AttendanceRecord) => text(row, "punch_type", "type")}
        />
        <Column
          field="similarity_score"
          header="Similarity"
          body={(row: AttendanceRecord) => text(row, "similarity_score")}
        />
        <Column
          field="latitude"
          header="Latitude"
          body={(row: AttendanceRecord) => text(row, "latitude")}
        />
        <Column
          field="longitude"
          header="Longitude"
          body={(row: AttendanceRecord) => text(row, "longitude")}
        />
      </DataTable>
    </div>
  );
}
