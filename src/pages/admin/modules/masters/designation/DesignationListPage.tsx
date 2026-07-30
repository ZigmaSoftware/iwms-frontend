import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
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
  const data = (response as { data?: unknown } | null)?.data;
  if (Array.isArray(data)) return data as DesignationRecord[];
  return ((data as { results?: DesignationRecord[] } | null)?.results ?? []);
};

export default function DesignationListPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<DesignationRecord[]>([]);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      designation_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    },
  });

  const load = async () => {
    const response: unknown = await designationApi.readAll();
    setRecords(unwrapRows(response));
  };

  useEffect(() => {
    load().catch(() => Swal.fire("Error", "Failed to load designations", "error"));
  }, []);

  const toggleStatus = async (row: DesignationRecord, value: boolean) => {
    await designationApi.update(row.unique_id, {
      designation_name: row.designation_name,
      department_id: row.department_id ?? null,
      description: row.description ?? "",
      status: value ? "active" : "inactive",
    });
    await load();
  };

  const getFilteredExportRows = () => {
    const search = globalFilterValue.trim().toLowerCase();
    return records.filter((row) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(row.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [row.designation_name, row.department_name, row.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const handleDownloadExcel = () => {
    setIsExportingExcel(true);
    try {
      const rows = getFilteredExportRows();
      if (rows.length === 0) {
        Swal.fire("Warning", "No designations to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "Designations");
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
        paginator
        rows={10}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={["designation_name", "department_name", "description"]}
      >
        <Column header="S.No" body={(_, opts) => opts.rowIndex + 1} />
        <Column field="designation_name" header="Designation Name" sortable filter />
        <Column field="department_name" header="Department" sortable />
        <Column field="description" header="Description" />
        <Column header="Status" body={(row) => <Switch checked={Boolean(row.is_active)} onCheckedChange={(value) => toggleStatus(row, value)} />} />
        <Column header="Action" body={(row) => <button className="text-blue-600" onClick={() => navigate(editPath(row.unique_id))}><PencilIcon className="size-5" /></button>} />
      </DataTable>
    </div>
  );
}
