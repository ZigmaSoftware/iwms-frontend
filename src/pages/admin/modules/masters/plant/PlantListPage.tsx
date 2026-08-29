import type { PlantRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { plantApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";

const toDisplay = (value: unknown): string =>
  value === null || value === undefined || String(value).trim() === "" ? "-" : String(value);

const toRecordList = (value: unknown): PlantRecord[] => {
  if (Array.isArray(value)) return value as PlantRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: PlantRecord[] }).results;
  }
  return [];
};

const SORTABLE_FIELDS = new Set(["name", "is_active"]);

export default function PlantListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [records, setRecords] = useState<PlantRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusValue, setStatusValue] = useState<"all" | "active" | "inactive">("all");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const { encMasters, encPlants } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encPlants,
  );

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number, search: string, order?: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRecords([]);
    try {
      const response = await plantApi.readAllwithPaginated(page, limit, {
        params: {
          company_id: companyUniqueId,
          project_id: projectId || undefined,
          ...(search ? { search } : {}),
          ...(order ? { ordering: order } : {}),
        },
      });
      if (requestId !== requestIdRef.current) return;
      setRecords(toRecordList(response));
      setTotalRecords(
        typeof response?.count === "number" ? response.count : toRecordList(response).length,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to fetch plants", error);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, first, rowsPerPage, searchTerm, ordering]);

  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as PlantRecord[];
    if (!companyUniqueId && !isSuperAdmin) return [] as PlantRecord[];

    if (statusValue === "all") return records;

    const wantActive = statusValue === "active";
    return records.filter((row) => Boolean(row.is_active) === wantActive);
  })();

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const indexTemplate = (_: PlantRecord, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const actionTemplate = (row: PlantRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() =>
          navigate(ENC_EDIT_PATH(String(row.unique_id)), {
            state: { companyUniqueId, projectId },
          })
        }
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const statusTemplate = (row: PlantRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        setPendingStatusId(String(row.unique_id));
        setIsUpdating(true);
        await plantApi.update(row.unique_id, { is_active: value });
        setRecords((current) =>
          current.map((item) => (item.unique_id === row.unique_id ? { ...item, is_active: value } : item)),
        );
      } catch (error) {
        console.error("Failed to update plant status", error);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={isUpdating && pendingStatusId === String(row.unique_id)}
        onCheckedChange={updateStatus}
      />
    );
  };

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Plant</h1>
          <p className="text-sm text-gray-500">Manage plant records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            label="Add Plant"
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={setGlobalFilterValue}
        searchPlaceholder="Search plants…"
        statusValue={statusValue}
        onStatusChange={setStatusValue}
        className="mb-4"
      >
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          options={companies}
          placeholder="All Companies"
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          options={projects}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
      </FilterBar>

      <DataTable
        value={rows}
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
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No plants found"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        <Column
          field="name"
          header="Plant Name"
          sortable={SORTABLE_FIELDS.has("name")}
          body={(row: PlantRecord) => toDisplay(row.name)}
        />
        <Column
          field="project_name"
          header={t("admin.nav.project")}
          body={(row: PlantRecord) => toDisplay(row.project_name)}
        />
        <Column field="latitude" header="Latitude" body={(row: PlantRecord) => toDisplay(row.latitude)} />
        <Column field="longitude" header="Longitude" body={(row: PlantRecord) => toDisplay(row.longitude)} />
        <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "150px", textAlign: "center" }} />
      </DataTable>
    </div>
  );
}
