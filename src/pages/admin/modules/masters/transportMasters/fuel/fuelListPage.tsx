import type { Fuel } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { fuelApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect, type StatusFilterValue } from "@/components/common/FilterBar";

// ─── Types ────────────────────────────────────────────────────────────────────


const FUEL_COLUMN_FIELDS: Record<string, string[]> = {
  fuel_type: ["fuel_type", "fuel"],
  is_active: ["is_active", "active_status", "status"],
};

const SORTABLE_FIELDS = new Set(["fuel_type", "is_active"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cap = (str?: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const toRecordList = (value: unknown): Fuel[] => {
  if (Array.isArray(value)) return value as Fuel[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: Fuel[] }).results;
  }
  return [];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuelList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "transport-master",
    "fuel",
    FUEL_COLUMN_FIELDS
  );

  const [rows, setRows] = useState<Fuel[]>([]);
  const [exportRows, setExportRows] = useState<Fuel[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusValue, setStatusValue] = useState<StatusFilterValue>("all");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);

  // ── Company / project selection ───────────────────────────────────────────
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
    defaultToAll: true, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  // ── Routes ────────────────────────────────────────────────────────────────
  const { encTransportMaster, encFuel } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encTransportMaster,
    encFuel,
  );

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRows([]);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (searchTerm) params.search = searchTerm;
      if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";
      if (ordering) params.ordering = ordering;

      const response = await fuelApi.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;

      const list = toRecordList(response);
      setRows(list);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count?: number }).count as number
          : list.length,
      );
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire({ icon: "error", title: t("common.error"), text: String(error) });
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setRows([]);
      setTotalRecords(0);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setRows([]);
      setTotalRecords(0);
      return;
    }
    void loadRows(first / rowsPerPage + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length, first, rowsPerPage, searchTerm, statusValue, ordering]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // ── Pagination / sort handlers ────────────────────────────────────────────
  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  // ── Filter handlers ───────────────────────────────────────────────────────
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(e.target.value);
  };

  const onStatusFilterChange = (value: StatusFilterValue) => {
    setStatusValue(value);
    setFirst(0);
  };

  // ── Status toggle ─────────────────────────────────────────────────────────
  const statusTemplate = (row: Fuel) => {
    const updateStatus = async (value: boolean) => {
      setPendingStatusId(row.unique_id);
      setIsUpdating(true);
      try {
        await fuelApi.update(
          row.unique_id,
          filterPayload({
            fuel_type: row.fuel_type,
            description: row.description,
            is_active: value,
          }) as Record<string, unknown>
        );
        setRows((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch (err) {
        console.error("Failed to update status:", err);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        disabled={isUpdating && pendingStatusId === row.unique_id}
        onCheckedChange={updateStatus}
      />
    );
  };

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionTemplate = (row: Fuel) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Fuel, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  // ── Export ────────────────────────────────────────────────────────────────
  // SafeDataTable's built-in "Download All Excel" button reads the `exportRows`
  // prop synchronously, so keep it refreshed with the full (unpaginated),
  // currently-filtered result set whenever the filters/company/project change.
  useEffect(() => {
    if ((isSuperAdmin && companies.length === 0) || (!companyUniqueId && !isSuperAdmin)) {
      setExportRows([]);
      return;
    }
    let mounted = true;
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (searchTerm) params.search = searchTerm;
    if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";

    fuelApi.readAllForExport({ params })
      .then((data: unknown) => { if (mounted) setExportRows(toRecordList(data)); })
      .catch(() => { if (mounted) setExportRows([]); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, searchTerm, statusValue]);

  // ── Table header ──────────────────────────────────────────────────────────
  const header = (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={(value) =>
        onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
      }
      searchPlaceholder={t("admin.fuel.search_placeholder")}
      statusValue={statusValue}
      onStatusChange={onStatusFilterChange}
    >
      <FilterBarSelect
        value={companyUniqueId || ""}
        onChange={onCompanyChange}
        placeholder="All Companies"
        options={companies}
        disabled={!isSuperAdmin || companies.length === 0}
      />
      <FilterBarSelect
        value={projectId || ""}
        onChange={setProjectId}
        placeholder={showAllProjectsOption ? "All Projects" : undefined}
        options={projects}
        disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
      />
    </FilterBar>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            {t("admin.fuel.title")}
          </h1>
          <p className="text-sm text-gray-500">{t("admin.fuel.subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add button */}
          <Button
            label={t("admin.fuel.add")}
            icon="pi pi-plus"
            className="p-button-success"
           
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={rows}
        exportRows={exportRows}
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
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={header}
        emptyMessage={t("admin.fuel.empty_message")}
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        {showCol("fuel_type") && (
          <Column
            field="fuel_type"
            header={t("admin.fuel.fuel_type")}
            sortable={SORTABLE_FIELDS.has("fuel_type")}
            body={(row: Fuel) => cap(row.fuel_type)}
            style={{ minWidth: "200px" }}
          />
        )}

        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            sortable={SORTABLE_FIELDS.has("is_active")}
            body={statusTemplate}
            style={{ width: "150px" }}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px" }}
        />
      </DataTable>
    </div>
  );
}
