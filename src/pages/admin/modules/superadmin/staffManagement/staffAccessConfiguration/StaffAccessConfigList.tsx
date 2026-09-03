import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import ComponentCard from "@/components/common/ComponentCard";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useTranslation } from "react-i18next";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { staffAccessConfigurationApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";

import type { StaffAccessConfigRecord } from "./types";

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
  const [exportRows, setExportRows] = useState<StaffAccessConfigRecord[]>([]);
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
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    onCompanyChange,
    setProjectId,
    isSuperAdmin,
    showAllProjectsOption,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const {
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange: setStatusValueFilter,
  } = useFilterBarFilters({ statusField: "is_active" });

  const onStatusFilterChange = (value: Parameters<typeof setStatusValueFilter>[0]) => {
    setFirst(0);
    setStatusValueFilter(value);
  };

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
    void loadRows(first / rowsPerPage + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, first, rowsPerPage, searchTerm, statusValue, ordering, t]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // SafeDataTable's built-in "Download All Excel" button reads `exportRows`
  // synchronously, so keep it refreshed with the full (unpaginated),
  // currently-filtered result set whenever filters/company/project change.
  useEffect(() => {
    let mounted = true;
    const params: Record<string, string | number> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (searchTerm) params.search = searchTerm;
    if (statusValue !== "all") params.is_active = statusValue === "active" ? "true" : "false";

    staffAccessConfigurationApi
      .readAllForExport({ params })
      .then((data: unknown) => {
        if (mounted) setExportRows(toRecordList(data));
      })
      .catch(() => {
        if (mounted) setExportRows([]);
      });
    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId, searchTerm, statusValue]);

  const records = rows;

  const actionTemplate = (row: ListRow) => {
    const staffUniqueId = String(row.staff_unique_id ?? row.staff_id ?? "");
    return (
      <button
        type="button"
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(editPath(staffUniqueId), { state: { companyUniqueId, projectId } })}
      >
        <PencilIcon className="size-5" />
      </button>
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

  const header = (
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
        <Button
          label={t("common.add_item", {
            item: t("admin.staff_access_configuration.item_label"),
          })}
          icon="pi pi-plus"
          className="p-button-success p-button-sm"
          onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
        />
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder")}
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
      >
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          placeholder={t("common.all_companies") || "All Companies"}
          disabled={!isSuperAdmin || companies.length === 0}
          options={companies}
        />

        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          placeholder={showAllProjectsOption ? (t("common.all_projects") || "All Projects") : undefined}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
          options={projects}
        />
      </FilterBar>
    </div>
  );

  return (
    <ComponentCard title="">
      <DataTable
        value={records}
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
        stripedRows
        emptyMessage={t("common.no_items_found", {
          item: t("admin.staff_access_configuration.item_label"),
        })}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 80 }} />
        <Column field="staff_id" header="ID" sortable={Boolean(SORTABLE_FIELD_ORDERING.staff_id)} />
        <Column
          field="staff_name"
          header={t("admin.staff_access_configuration.staff_name")}
          sortable={Boolean(SORTABLE_FIELD_ORDERING.staff_name)}
        />
        <Column header="Role" body={roleTemplate} />
        <Column header={t("admin.nav.project")} body={projectTemplate} />
        <Column field="company_name" header={t("admin.nav.company")} />
        <Column
          header="Permissions"
          body={(row: ListRow) => row.screen_count ?? row.main_screen_count ?? "-"}
          style={{ width: 120 }}
        />
        <Column header="Status" body={statusTemplate} style={{ width: 120 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 100, textAlign: "center" }} />
      </DataTable>
    </ComponentCard>
  );
}
