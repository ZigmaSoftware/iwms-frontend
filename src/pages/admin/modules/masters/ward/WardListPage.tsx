import type { ErrorWithResponse } from "./types";
import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { wardApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import type { WardListRecord } from "./types";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";

const WARD_COLUMN_FIELDS: Record<string, string[]> = {
  zone_name: ["zone_id"],
  city_name: ["city_id"],
  ward_name: ["ward_name"],
  is_active: ["is_active"],
};


const extractErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (!error) return fallbackMessage;
  if (typeof error === "string") return error;

  const data = (error as ErrorWithResponse)?.response?.data;

  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) =>
        Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) return error.message;

  return fallbackMessage;
};

export default function WardList() {
  const { t } = useTranslation();
  const { showColumn: showCol } = useFieldVisibility(
    "masters",
    "wards",
    WARD_COLUMN_FIELDS,
  );

  const [rows, setRows] = useState<WardListRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);

  const {
    filters, onFilter, globalFilterValue, onGlobalFilterChange,
    statusValue, onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
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

  const navigate = useNavigate();

  const { encMasters, encWards } = getEncryptedRoute();

  const { newPath: wardNewPath, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encWards,
  );
  const ENC_NEW_PATH = (companyId?: string | null, selectedProjectId?: string | null) =>
    appendRouteQuery(wardNewPath, {
      company_unique_id: companyId,
      project_id: selectedProjectId,
    });

  useEffect(() => {
    if (typeof window === "undefined" || projects.length === 0) return;
    const storedProjectId = localStorage.getItem("selected_project_id");
    if (
      storedProjectId &&
      storedProjectId !== projectId &&
      projects.some((project) => project.value === storedProjectId)
    ) {
      setProjectId(storedProjectId);
    }
  }, [projectId, projects, setProjectId]);

  const onFilterCompanyChange = (value: string) => {
    localStorage.setItem("selected_company_unique_id", value);
    localStorage.removeItem("selected_project_id");
    onCompanyChange(value);
  };

  const onFilterProjectChange = (value: string) => {
    localStorage.setItem("selected_project_id", value);
    setProjectId(value);
  };

  const toRecordList = (value: unknown): WardListRecord[] => {
    if (Array.isArray(value)) return value as WardListRecord[];
    if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
      return (value as { results: WardListRecord[] }).results;
    }
    return [];
  };

  const SORTABLE_FIELDS = new Set(["zone_name", "city_name", "ward_name"]);

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  // Company/project scoping, search, sort, and pagination are all applied
  // server-side (tenant users are scoped automatically by the backend;
  // superadmin scoping is passed via company_id/project_id params below).
  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRows([]);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (globalFilterValue.trim()) params.search = globalFilterValue.trim();
      if (ordering) params.ordering = ordering;

      const response = await wardApi.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;
      const list = toRecordList(response);
      setRows(list);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count?: number }).count as number
          : list.length,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      const errorData = (error as ErrorWithResponse)?.response?.data;
      Swal.fire({ icon: "error", title: t("common.error"), text: String(errorData ?? error) });
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
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length, first, rowsPerPage, globalFilterValue, ordering]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const wards = rows;

  // ===========================
  //   Search
  // ===========================
  const exportRows = wards.filter((row) => {
    if (statusValue !== "all" && row.is_active !== (statusValue === "active")) return false;
    const search = globalFilterValue.trim().toLowerCase();
    return !search || Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(search));
  });

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  // ===========================
  //   Toggle Status
  // ===========================
  const updateStatus = async (row: WardListRecord, checked: boolean) => {
    const id = String(row.unique_id);

    setPendingStatusId(id);
    setIsUpdating(true);

    try {
      await wardApi.update(row.unique_id, { is_active: checked });
      setRows((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id ? { ...item, is_active: checked } : item
        )
      );
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.update_status_failed")),
        "error"
      );
    } finally {
      setPendingStatusId(null);
      setIsUpdating(false);
    }
  };

  const statusTemplate = (row: WardListRecord) => (
    <Switch
      checked={row.is_active}
      disabled={isUpdating && pendingStatusId === String(row.unique_id)}
      onCheckedChange={(checked) => {
        void updateStatus(row, checked);
      }}
    />
  );

  // ===========================
  //   Actions
  // ===========================
  const actionTemplate = (row: WardListRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: WardListRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  // ===========================
  //   UI
  // ===========================
  return (
    <div className="p-3">

        <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              {t("admin.nav.ward")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("common.manage_item_records", { item: t("admin.nav.ward") })}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <Button
              label={t("common.add_item", { item: t("admin.nav.ward") })}
              icon="pi pi-plus"
              className="p-button-success"
             
              onClick={() =>
                navigate(ENC_NEW_PATH(companyUniqueId, projectId), {
                  state: {
                    companyUniqueId,
                    projectId,
                  },
                })
              }
            />
          </div>
        </div>

        <FilterBar searchValue={globalFilterValue} onSearchChange={onGlobalFilterChange}
          searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.ward") })}
          statusValue={statusValue} onStatusChange={onStatusFilterChange} className="mb-4">
          <FilterBarSelect value={companyUniqueId || ""} onChange={onFilterCompanyChange} options={companies}
            placeholder="All Companies" disabled={!isSuperAdmin || companies.length === 0} />
          <FilterBarSelect value={projectId || ""} onChange={onFilterProjectChange} options={projects}
            placeholder={showAllProjectsOption ? "All Projects" : undefined}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0} />
        </FilterBar>

        <DataTable
          value={wards}
          exportRows={exportRows}
          exportSheetName="Wards"
          dataKey="unique_id"
          lazy
          paginator
          first={first}
          rows={rowsPerPage}
          totalRecords={totalRecords}
          onPage={onPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={isLoading}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={onSort}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.ward"),
          })}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          {showCol("zone_name") && (
            <Column
              field="zone_name"
              header={t("admin.nav.zone")}
              sortable={SORTABLE_FIELDS.has("zone_name")}
              body={(row) => cap(row.zone_name)}
            />
          )}

          {showCol("city_name") && (
            <Column
              field="city_name"
              header={t("admin.nav.city")}
              sortable={SORTABLE_FIELDS.has("city_name")}
              body={(row) => cap(row.city_name)}
            />
          )}

          {showCol("ward_name") && (
            <Column
              field="ward_name"
              header={t("admin.nav.ward")}
              sortable={SORTABLE_FIELDS.has("ward_name")}
              body={(row) => cap(row.ward_name)}
            />
          )}

          {showCol("is_active") && (
            <Column
              header={t("common.status")}
              body={statusTemplate}
              style={{ width: "140px" }}
            />
          )}

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "150px", textAlign: "center" }}
          />
        </DataTable>

    </div>
  );
}
