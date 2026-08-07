import type { StaffTemplate } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";

import { PencilIcon } from "@/icons";
import { staffTemplateApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar, type StatusFilterValue } from "@/components/common/FilterBar";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const STAFF_TEMPLATE_COLUMN_FIELDS: Record<string, string[]> = {
  unique_id: ["unique_id", "display_code", "template_id"],
  driver_name: ["driver_id", "driver_name", "primary_driver", "driver"],
  operator_name: ["operator_id", "operator_name", "primary_operator", "operator"],
  extra_operator_id: ["extra_operator_id", "extra_staff", "extra_operator"],
  status: ["status", "active_status"],
  created_at: ["created_at"],
  updated_at: ["updated_at"],
};

/* ================= TYPES ================= */


/* ================= COMPONENT ================= */

export default function StaffTemplateList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "staff-masters",
    "staff-template",
    STAFF_TEMPLATE_COLUMN_FIELDS
  );
  const location = useLocation();
  const [searchParams] = useSearchParams();
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
    initialCompanyId:
      restoredState?.companyUniqueId ?? searchParams.get("company_unique_id") ?? undefined,
    initialProjectId: restoredState?.projectId ?? searchParams.get("project_id") ?? undefined,
  });

  const [templates, setTemplates] = useState<StaffTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [statusFilterValue, setStatusFilterValue] = useState<StatusFilterValue>("all");
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const requestIdRef = useRef(0);

  const { encScheduleSetup, encStaffTemplate } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleSetup,
    encStaffTemplate,
  );
  const selectedProjectId =
    projectId && projects.some((project) => project.value === projectId)
      ? projectId
      : "";
  const selectedContext = { companyUniqueId, projectId: selectedProjectId };

  const activeStatusParam =
    statusFilterValue === "all" ? "" : statusFilterValue === "active" ? "ACTIVE" : "INACTIVE";

  const ordering = sortField
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  /* ================= FETCH (server-side pagination) ================= */

  const loadRows = async (
    page: number,
    limit: number,
    search: string,
    status: string,
    orderingParam?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (search) params.search = search;
      if (status) params.status = status;
      if (orderingParam) params.ordering = orderingParam;

      const response = await staffTemplateApi.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;

      const payload: any = response ?? [];
      const rows: StaffTemplate[] = Array.isArray(payload) ? payload : payload?.results ?? [];
      setTemplates(rows);
      setTotalRecords(typeof payload?.count === "number" ? payload.count : rows.length);
    } catch {
      if (requestId !== requestIdRef.current) return;
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setTemplates([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setTemplates([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    void loadRows(first / rowsPerPage + 1, rowsPerPage, globalSearchTerm, activeStatusParam, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyUniqueId,
    companies.length,
    isSuperAdmin,
    selectedProjectId,
    first,
    rowsPerPage,
    globalSearchTerm,
    activeStatusParam,
    ordering,
    t,
  ]);

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
      setGlobalSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  /* ================= FILTERS ================= */

  const onSearchValueChange = (value: string) => setGlobalFilterValue(value);

  const onStatusFilterChange = (value: StatusFilterValue) => {
    setStatusFilterValue(value);
    setFirst(0);
  };

  const fetchExportRows = async (): Promise<StaffTemplate[]> => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (selectedProjectId) params.project_id = selectedProjectId;
    if (globalSearchTerm) params.search = globalSearchTerm;
    if (activeStatusParam) params.status = activeStatusParam;

    const response = await staffTemplateApi.readAllForExport({ params });
    const payload: any = response ?? [];
    return Array.isArray(payload) ? payload : payload?.results ?? [];
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const rows = await fetchExportRows();
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No records to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "StaffTemplate");
    } finally {
      setIsExportingExcel(false);
    }
  };

  /* ================= STATUS TOGGLE ================= */

  const statusBodyTemplate = (row: StaffTemplate) => {
    const updateStatus = async (checked: boolean) => {
      const id = row.unique_id;
      setPendingStatusId(id);
      setIsUpdating(true);
      try {
        await staffTemplateApi.update(id, filterPayload({ status: checked ? "ACTIVE" : "INACTIVE" }));
        setTemplates((current) =>
          current.map((item) =>
            item.unique_id === id ? { ...item, status: checked ? "ACTIVE" : "INACTIVE" } : item
          )
        );
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={row.status === "ACTIVE"}
        disabled={isUpdating && pendingStatusId === row.unique_id}
        onCheckedChange={(checked) => void updateStatus(checked)}
      />
    );
  };

  /* ================= ACTIONS ================= */

  const actionTemplate = (row: StaffTemplate) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: { ...selectedContext, record: row },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: StaffTemplate, { rowIndex }: any) => rowIndex + 1;

  /* ================= HEADER ================= */

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.staff_template.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.staff_template.list_subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={selectedProjectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            {showAllProjectsOption && <option value="">All Projects</option>}
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label || project.value}
              </option>
            ))}
          </select>

          <Button
            label={isExportingExcel ? "Downloading..." : "Download Excel"}
            icon="pi pi-file-excel"
            className="p-button-outlined"
            disabled={isExportingExcel}
            onClick={handleDownloadExcel}
          />

          <Button
            label={t("admin.staff_template.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            onClick={() =>
              navigate(ENC_NEW_PATH, { state: selectedContext })
            }
          />
        </div>
      </div>

      <div className="flex justify-end">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={onSearchValueChange}
          searchPlaceholder={t("admin.staff_template.search_placeholder")}
          statusValue={showCol("status") ? statusFilterValue : undefined}
          onStatusChange={showCol("status") ? onStatusFilterChange : undefined}
        />
      </div>
    </div>
  );

  /* ================= RENDER ================= */

  return (
    <div className="p-3">
      <DataTable
        value={templates}
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
        loading={loading}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.staff_template.empty_message")}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />

        {showCol("unique_id") && (
          <Column
            field="unique_id"
            header={t("admin.staff_template.columns.template_id")}
            body={(r: StaffTemplate) => r.display_code ?? r.unique_id}
            sortable
          />
        )}

        {showCol("driver_name") && (
          <Column
            field="driver_name"
            header={t("admin.staff_template.columns.primary_driver")}
            body={(r: StaffTemplate) => r.driver_name}
          />
        )}

        {showCol("operator_name") && (
          <Column
            field="operator_name"
            header={t("admin.staff_template.columns.primary_operator")}
            body={(r: StaffTemplate) => r.operator_name}
          />
        )}

        {showCol("extra_operator_id") && (
          <Column
            header={t("admin.staff_template.columns.extra_staff")}
            body={(r: StaffTemplate) => r.extra_operator_id?.length ?? 0}
            style={{ width: 130 }}
          />
        )}

        {showCol("status") && (
          <Column
            header={t("common.status")}
            body={statusBodyTemplate}
            style={{ width: 120 }}
          />
        )}

        {showCol("created_at") && (
          <Column
            header={t("admin.staff_template.columns.created_at")}
            body={(r: StaffTemplate) => new Date(r.created_at).toLocaleDateString()}
          />
        )}

        {showCol("updated_at") && (
          <Column
            header={t("admin.staff_template.columns.updated_at")}
            body={(r: StaffTemplate) => new Date(r.updated_at).toLocaleDateString()}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>
    </div>
  );
}
