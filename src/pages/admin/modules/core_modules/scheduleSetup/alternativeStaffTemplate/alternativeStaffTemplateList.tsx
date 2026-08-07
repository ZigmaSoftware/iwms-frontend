import type { AlternativeStaffTemplate } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar } from "@/components/common/FilterBar";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const ALTERNATIVE_STAFF_TEMPLATE_COLUMN_FIELDS: Record<string, string[]> = {
  unique_id: ["unique_id", "display_code"],
  staff_template: ["staff_template", "staff_template_display_code", "staff_template_id"],
  effective_date: ["effective_date"],
  driver_name: ["driver", "driver_id", "driver_name"],
  operator_name: ["operator", "operator_id", "operator_name"],
  extra_operator: ["extra_operator", "extra_operator_id", "extra_staff"],
  change_reason: ["change_reason"],
  approval_status: ["approval_status"],
  created_at: ["created_at"],
};


export default function AlternativeStaffTemplateList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showColumn: showCol } = useFieldVisibility(
    "staff-masters",
    "alternative-staff-template",
    ALTERNATIVE_STAFF_TEMPLATE_COLUMN_FIELDS
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

  const [records, setRecords] = useState<AlternativeStaffTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const requestIdRef = useRef(0);

  const { encScheduleSetup, encAlternativeStaffTemplate } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleSetup,
    encAlternativeStaffTemplate,
  );
  const selectedProjectId =
    projectId && projects.some((project) => project.value === projectId)
      ? projectId
      : "";
  const selectedContext = { companyUniqueId, projectId: selectedProjectId };

  const ordering = sortField
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  /* ================= FETCH (server-side pagination) ================= */

  const loadRows = async (
    page: number,
    limit: number,
    search: string,
    orderingParam?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (search) params.search = search;
      if (orderingParam) params.ordering = orderingParam;

      const response = await adminApi.alternativeStaffTemplate.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;

      const payload: any = response ?? [];
      const rows: AlternativeStaffTemplate[] = Array.isArray(payload) ? payload : payload?.results ?? [];
      setRecords(rows);
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
      setRecords([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setRecords([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    void loadRows(first / rowsPerPage + 1, rowsPerPage, globalSearchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyUniqueId,
    companies.length,
    isSuperAdmin,
    selectedProjectId,
    first,
    rowsPerPage,
    globalSearchTerm,
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

  const onGlobalFilterChange = (value: string) => setGlobalFilterValue(value);

  const fetchExportRows = async (): Promise<AlternativeStaffTemplate[]> => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (selectedProjectId) params.project_id = selectedProjectId;
    if (globalSearchTerm) params.search = globalSearchTerm;

    const response = await adminApi.alternativeStaffTemplate.readAllForExport({ params });
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
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "AlternativeStaffTemplate");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.alternative_staff_template.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.alternative_staff_template.list_subtitle")}
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
            label={t("admin.alternative_staff_template.create_button")}
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
          onSearchChange={onGlobalFilterChange}
          searchPlaceholder={t("admin.alternative_staff_template.search_placeholder")}
        />
      </div>
    </div>
  );

  const indexTemplate = (_: AlternativeStaffTemplate, { rowIndex }: any) =>
    rowIndex + 1;

  const actionTemplate = (row: AlternativeStaffTemplate) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() =>
          navigate(`${ENC_EDIT_PATH(row.unique_id)}?company_unique_id=${encodeURIComponent(
            companyUniqueId
          )}&project_id=${encodeURIComponent(selectedProjectId)}`, {
            state: { record: row, ...selectedContext },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <i className="pi pi-pencil" />
      </button>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={records}
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
        emptyMessage={t("admin.alternative_staff_template.empty_message")}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 70 }} />

        {showCol("unique_id") && (
          <Column
            header={t("admin.alternative_staff_template.columns.template_id")}
            body={(row: AlternativeStaffTemplate) => row.display_code ?? row.unique_id}
          />
        )}

        {showCol("staff_template") && (
          <Column
            header={t("admin.alternative_staff_template.columns.staff_template")}
            body={(row: AlternativeStaffTemplate) =>
              row.staff_template_display_code ?? row.staff_template
            }
          />
        )}

        {/* {showCol("effective_date") && (
          <Column
            field="effective_date"
            header={t("admin.alternative_staff_template.columns.effective_date")}
            filter
            showFilterMatchModes={false}
          />
        )} */}

        {showCol("driver_name") && (
          <Column
            field="driver_name"
            header={t("admin.alternative_staff_template.columns.driver")}
            body={(row: AlternativeStaffTemplate) => row.driver_name ?? row.driver}
          />
        )}

        {showCol("operator_name") && (
          <Column
            field="operator_name"
            header={t("admin.alternative_staff_template.columns.operator")}
            body={(row: AlternativeStaffTemplate) => row.operator_name ?? row.operator}
          />
        )}

        {showCol("extra_operator") && (
          <Column
            header={t("admin.alternative_staff_template.columns.extra_operator")}
            body={(row: AlternativeStaffTemplate) => {
              const names = Array.isArray(row.extra_operator_names)
                ? row.extra_operator_names
                : [];
              if (names.length) return names.join(", ");
              if (Array.isArray(row.extra_operator)) return row.extra_operator.join(", ");
              return row.extra_operator || "-";
            }}
          />
        )}

        {showCol("change_reason") && (
          <Column
            field="change_reason"
            header={t("admin.alternative_staff_template.columns.change_reason")}
          />
        )}

        {showCol("approval_status") && (
          <Column
            field="approval_status"
            header={t("admin.alternative_staff_template.columns.approval_status")}
          />
        )}

        {showCol("created_at") && (
          <Column
            header={t("common.created_at")}
            body={(r: AlternativeStaffTemplate) =>
              r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"
            }
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
