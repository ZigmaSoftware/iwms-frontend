import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import { StackCell } from "@/components/common/TableCells";
import ComponentCard from "@/components/common/ComponentCard";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useTranslation } from "react-i18next";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";
import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { staffAccessConfigurationApi } from "@/helpers/admin";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { combineFilters } from "@/components/filters/useOptionFilter";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";

import type { StaffAccessConfigRecord } from "./types";
import { Can } from "@/contexts/ScreenPermissionContext";

type ListRow = StaffAccessConfigRecord;

// Backend allow-lists `ordering` to these dotted paths (see
// StaffAccessConfigurationViewSet.ordering_fields) — the serializer's flat
// response field names (employee_name / staff_unique_id / doj) don't match
// the model paths 1:1, so sortable columns are mapped to the backend's
// actual ordering param values here.
const SORTABLE_FIELD_ORDERING: Record<string, string> = {
  staff_name: "staff_id__employee_name",
  staff_id: "staff_id__staff_unique_id",
};

const toRecordList = (value: unknown): StaffAccessConfigRecord[] => {
  if (Array.isArray(value)) return value as StaffAccessConfigRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: StaffAccessConfigRecord[] }).results;
  }
  return [];
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    return Object.entries(record)
      .map(([key, value]) =>
        Array.isArray(value) ? `${key}: ${value.join(", ")}` : `${key}: ${String(value)}`
      )
      .join("\n");
  }
  return fallback;
};

export default function StaffAccessConfigList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [rows, setRows] = useState<StaffAccessConfigRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);

  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const companyProject = useCompanyProjectFilter(() => setFirst(0), {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { projectsLoaded, projectsCompanyId, companiesLoaded } =
    companyProject.selection;

  // The company/project selection resolves asynchronously after mount. Firing
  // the list + export fetches before it settles sends duplicate unscoped
  // requests that are immediately re-fired with the real scope, so gate both
  // effects until the hook reports the scope as settled. `projectsCompanyId`
  // also guards the company-switch gap (project list still from the previous
  // company for one render). Once settled it stays settled: later company
  // edits are a Filters-panel draft and only reach the list when applied.
  const [scopeReady, setScopeReady] = useState(false);
  if (
    !scopeReady &&
    companiesLoaded &&
    projectsLoaded &&
    projectsCompanyId === companyProject.selection.companyUniqueId
  ) {
    setScopeReady(true);
  }

  const {
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    statusFilter,
  } = useFilterBarFilters({ statusField: "is_active" });

  // A newly applied status starts again from page 1.
  const [pagedStatus, setPagedStatus] = useState(statusValue);
  if (pagedStatus !== statusValue) {
    setPagedStatus(statusValue);
    setFirst(0);
  }

  const { encAdmins, encStaffAccessConfiguration } = getEncryptedRoute();
  const { newPath, editPath } = createCrudRoutePaths(encAdmins, encStaffAccessConfiguration);
  const ENC_NEW_PATH = appendRouteQuery(newPath, {
    company_unique_id: companyUniqueId,
  });

  const ordering = sortField && SORTABLE_FIELD_ORDERING[sortField]
    ? `${sortOrder === -1 ? "-" : ""}${SORTABLE_FIELD_ORDERING[sortField]}`
    : undefined;

  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRows([]);
    try {
      const params: Record<string, string | number> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (searchTerm) params.search = searchTerm;
      if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";
      if (ordering) params.ordering = ordering;

      const response = await staffAccessConfigurationApi.readAllwithPaginated(page, limit, { params });
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
      Swal.fire(t("common.error"), extractErrorMessage(error, t("common.load_failed")), "error");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!scopeReady) return;
    void loadRows(first / rowsPerPage + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeReady, companyUniqueId, projectId, first, rowsPerPage, searchTerm, statusValue, ordering, t]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // "All data" is built server-side with the list's current scope and
  // filters; "Current page" uses the rows already on screen.
  const onServerExport = (filename: string, sheetName: string) => {
    const params: Record<string, string | number> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (searchTerm) params.search = searchTerm;
    if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";
    return staffAccessConfigurationApi.exportToExcel({ params }, filename, sheetName);
  };

  const records = rows;

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await staffAccessConfigurationApi.delete(id, withDeleteReason(reason));
      setRows((current) => current.filter((item) => item.unique_id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(t("common.error"), extractErrorMessage(error, t("common.delete_failed")), "error");
    }
  };

  const actionTemplate = (row: ListRow) => {
    const staffUniqueId = String(row.staff_unique_id ?? row.staff_id ?? "");
    return (
      <div className="flex justify-center">
        <ActionMenu
          onEdit={() => navigate(editPath(staffUniqueId), { state: { companyUniqueId, projectId } })}
          onDelete={() => void handleDelete(String(row.unique_id))}
        />
      </div>
    );
  };

  const roleTemplate = (row: ListRow) => {
    const record = row as Record<string, unknown>;
    return String(
      row.staffusertype_name || record.role_name || record.user_type_name || row.staffusertype_id || "-"
    );
  };

  const projectTemplate = (row: ListRow) => {
    const names = row.project_names ?? [];
    return names.length > 0 ? names.join(", ") : "All Projects";
  };

  const statusTemplate = (row: ListRow) => {
    const record = row as Record<string, unknown>;
    const active = record.active_status !== false && record.is_active !== false;
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}>
        {active ? "Active" : "Inactive"}
      </span>
    );
  };

  const indexTemplate = (_: unknown, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  // Title row, then the search with the Filters button + Documents menu.
  const renderHeader = (actions: ReactNode) => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.staff_access_configuration.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.staff_access_configuration.subtitle")}
          </p>
        </div>
        <Can action="add">
          <Button
            label={t("common.add_item", {
              item: t("admin.staff_access_configuration.item_label"),
            })}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </Can>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder")}
          />
        </div>
        <div className="ml-auto shrink-0">{actions}</div>
      </div>
    </div>
  );

  return (
    <ComponentCard title="">
      <DataTable
        value={records}
        onServerExport={onServerExport}
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
        renderHeaderWithActions={renderHeader}
        filterPanel={combineFilters(companyProject, statusFilter)}
        stripedRows
        emptyMessage={t("common.no_items_found", {
          item: t("admin.staff_access_configuration.item_label"),
        })}
        className="p-datatable-sm"
        fitWidth
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "5%" }} />
        <Column
          field="staff_id"
          header="ID"
          sortable={Boolean(SORTABLE_FIELD_ORDERING.staff_id)}
          style={{ width: "12%" }}
        />
        <Column
          field="staff_name"
          header={t("admin.staff_access_configuration.staff_name")}
          sortable={Boolean(SORTABLE_FIELD_ORDERING.staff_name)}
          style={{ width: "24%" }}
          body={(row: ListRow) => (
            <StackCell
              primary={row.staff_name}
              lines={[{ label: "Role", value: roleTemplate(row) }]}
            />
          )}
        />
        <Column
          field="company_name"
          header={t("admin.nav.company")}
          style={{ width: "31%" }}
          body={(row: ListRow) => (
            <StackCell
              primary={row.company_name}
              lines={[{ label: t("admin.nav.project"), value: projectTemplate(row) }]}
            />
          )}
        />
        <Column
          header="Permissions"
          body={(row: ListRow) => row.screen_count ?? row.main_screen_count ?? "-"}
          style={{ width: "10%" }}
        />
        <Column header="Status" body={statusTemplate} style={{ width: "10%" }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "8%", textAlign: "center" }} />
      </DataTable>
    </ComponentCard>
  );
}
