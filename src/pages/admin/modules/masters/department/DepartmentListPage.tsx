import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { Switch } from "@/components/ui/switch";
import { PencilIcon } from "@/icons";
import { departmentApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";

const { encMasters, encDepartments } = getEncryptedRoute();
const { newPath: NEW_PATH } = createCrudRoutePaths(encMasters, encDepartments);
const { editPath } = createCrudRoutePaths(encMasters, encDepartments);

type DepartmentRecord = {
  unique_id: string | number;
  department_name?: string;
  department_code?: string;
  description?: string;
  is_active?: boolean;
};

const unwrapRows = (response: unknown): DepartmentRecord[] => {
  if (Array.isArray(response)) return response as DepartmentRecord[];
  const results = (response as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as DepartmentRecord[]) : [];
};

const toRecordList = (value: unknown): DepartmentRecord[] => {
  if (Array.isArray(value)) return value as DepartmentRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: DepartmentRecord[] }).results;
  }
  return [];
};

const SORTABLE_FIELDS = new Set(["department_name", "department_code"]);

export default function DepartmentListPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<DepartmentRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const {
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters();

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number, search: string, status: string, orderingParam?: string) => {
    setIsLoading(true);
    setRecords([]);
    try {
      const response = await departmentApi.readAllwithPaginated(page, limit, {
        params: {
          ...(search ? { search } : {}),
          ...(status !== "all" ? { status } : {}),
          ...(orderingParam ? { ordering: orderingParam } : {}),
        },
      });
      const rows = toRecordList(response);
      setRecords(rows);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count: number }).count
          : rows.length,
      );
    } catch (error: any) {
      Swal.fire("Error", String(error?.response?.data?.detail ?? error?.message ?? "Failed to load departments"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, statusValue, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, rowsPerPage, searchTerm, statusValue, ordering]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const toggleStatus = async (row: DepartmentRecord, value: boolean) => {
    await departmentApi.update(row.unique_id, {
      department_name: row.department_name,
      department_code: row.department_code,
      description: row.description ?? "",
      status: value ? "active" : "inactive",
    });
    await loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, statusValue, ordering);
  };

  const getFilteredExportRows = (allRows: DepartmentRecord[]) => {
    const search = globalFilterValue.trim().toLowerCase();
    return allRows.filter((row) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(row.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [row.department_name, row.department_code, row.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const response: unknown = await departmentApi.readAllForExport();
      const rows = getFilteredExportRows(unwrapRows(response));
      if (rows.length === 0) {
        Swal.fire("Warning", "No departments to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "Departments");
    } catch (error: any) {
      Swal.fire("Error", String(error?.response?.data?.detail ?? error?.message ?? "Failed to export departments"), "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Department Master</h1>
          <p className="text-sm text-gray-500">Manage department records</p>
        </div>
        <Button label="Add Department" icon="pi pi-plus" className="p-button-success" onClick={() => navigate(NEW_PATH)} />
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder="Search departments"
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
        className="mb-4"
        trailing={
          <Button
            label={isExportingExcel ? "Downloading..." : "Download Excel"}
            icon="pi pi-file-excel"
            className="p-button-outlined"
            disabled={isExportingExcel}
            onClick={handleDownloadExcel}
          />
        }
      />

      <DataTable
        value={records}
        dataKey="unique_id"
        lazy
        paginator
        first={first}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPage={onPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        loading={isLoading}
      >
        <Column header="S.No" body={(_, opts) => opts.rowIndex + 1} />
        <Column field="department_name" header="Department Name" sortable={SORTABLE_FIELDS.has("department_name")} />
        <Column field="department_code" header="Code" sortable={SORTABLE_FIELDS.has("department_code")} />
        <Column field="description" header="Description" />
        <Column header="Status" body={(row) => <Switch checked={Boolean(row.is_active)} onCheckedChange={(value) => toggleStatus(row, value)} />} />
        <Column header="Action" body={(row) => <button className="text-blue-600" onClick={() => navigate(editPath(row.unique_id))}><PencilIcon className="size-5" /></button>} />
      </DataTable>
    </div>
  );
}
