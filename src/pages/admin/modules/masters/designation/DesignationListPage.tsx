import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { Switch } from "@/components/ui/switch";
import { PencilIcon } from "@/icons";
import { designationApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";

const { encMasters, encDesignations } = getEncryptedRoute();
const { newPath: NEW_PATH } = createCrudRoutePaths(encMasters, encDesignations);
const { editPath } = createCrudRoutePaths(encMasters, encDesignations);

type DesignationRecord = {
  unique_id: string | number;
  designation_name?: string;
  department_id?: string | number | null;
  department_name?: string;
  description?: string;
  is_active?: boolean;
};

const unwrapRows = (response: unknown): DesignationRecord[] => {
  if (Array.isArray(response)) return response as DesignationRecord[];
  const results = (response as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as DesignationRecord[]) : [];
};

const SORTABLE_FIELDS = new Set(["designation_name"]);

export default function DesignationListPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<DesignationRecord[]>([]);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);

  const {
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters();

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number, search: string, status: typeof statusValue, order?: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRecords([]);
    try {
      const response = await designationApi.readAllwithPaginated(page, limit, {
        params: {
          ...(search ? { search } : {}),
          ...(status !== "all" ? { is_active: status === "active" } : {}),
          ...(order ? { ordering: order } : {}),
        },
      });
      if (requestId !== requestIdRef.current) return;
      const rows = unwrapRows(response);
      setRecords(rows);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count?: number }).count!
          : rows.length,
      );
    } catch {
      if (requestId !== requestIdRef.current) return;
      Swal.fire("Error", "Failed to load designations", "error");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
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

  const toggleStatus = async (row: DesignationRecord, value: boolean) => {
    await designationApi.update(row.unique_id, {
      designation_name: row.designation_name,
      department_id: row.department_id ?? null,
      description: row.description ?? "",
      status: value ? "active" : "inactive",
    });
    await loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, statusValue, ordering);
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const response = await designationApi.readAllForExport({
        params: {
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(statusValue !== "all" ? { is_active: statusValue === "active" } : {}),
        },
      });
      const rows = unwrapRows(response);
      if (rows.length === 0) {
        Swal.fire("Warning", "No designations to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "Designations");
    } catch {
      Swal.fire("Error", "Failed to export designations", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Designation Master</h1>
          <p className="text-sm text-gray-500">Manage designation records</p>
        </div>
        <Button label="Add Designation" icon="pi pi-plus" className="p-button-success" onClick={() => navigate(NEW_PATH)} />
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder="Search designations"
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
        <Column field="designation_name" header="Designation Name" sortable={SORTABLE_FIELDS.has("designation_name")} />
        <Column field="department_name" header="Department" />
        <Column field="description" header="Description" />
        <Column header="Status" body={(row) => <Switch checked={Boolean(row.is_active)} onCheckedChange={(value) => toggleStatus(row, value)} />} />
        <Column header="Action" body={(row) => <button className="text-blue-600" onClick={() => navigate(editPath(row.unique_id))}><PencilIcon className="size-5" /></button>} />
      </DataTable>
    </div>
  );
}
