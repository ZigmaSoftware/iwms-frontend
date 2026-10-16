import type { StaffTemplate } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { useScreenAccess } from "@/contexts/screenPermission";
import { staffTemplateApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar } from "@/components/common/FilterBar";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { combineFilters, useOptionFilter } from "@/components/filters/useOptionFilter";
import { ListPageHeader } from "@/components/common/ListPageHeader";
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

/* ================= COMPONENT ================= */

export default function StaffTemplateList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAdd, canEdit } = useScreenAccess();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "staff-masters",
    "staff-template",
    STAFF_TEMPLATE_COLUMN_FIELDS
  );
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const [first, setFirst] = useState(0);
  const resetPage = () => setFirst(0);
  const companyProject = useCompanyProjectFilter(resetPage, {
    initialCompanyId:
      restoredState?.companyUniqueId ?? searchParams.get("company_unique_id") ?? undefined,
    initialProjectId: restoredState?.projectId ?? searchParams.get("project_id") ?? undefined,
  });
  const companyUniqueId = companyProject.companyId;
  const selectedProjectId = companyProject.projectId;
  const { companies, isSuperAdmin } = companyProject.selection;

  const statusFilter = useOptionFilter({
    param: "status",
    label: "Status",
    options: [
      { label: "Active", value: "ACTIVE" },
      { label: "Inactive", value: "INACTIVE" },
    ],
    onAppliedChange: resetPage,
  });

  const [templates, setTemplates] = useState<StaffTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const requestIdRef = useRef(0);

  const { encScheduleSetup, encStaffTemplate } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleSetup,
    encStaffTemplate,
  );
  const selectedContext = { companyUniqueId, projectId: selectedProjectId };

  const activeStatusParam = statusFilter.value;

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

  // Feeds the table's single "Download Excel" button: the "All data" option
  // is exported on the server with the current filters, while "Current page"
  // uses the rows already on screen.
  const serverExport = (filename: string, sheetName: string) => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (selectedProjectId) params.project_id = selectedProjectId;
    if (globalSearchTerm) params.search = globalSearchTerm;
    if (activeStatusParam) params.status = activeStatusParam;

    return staffTemplateApi.exportToExcel({ params }, filename, sheetName);
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
        disabled={!canEdit || (isUpdating && pendingStatusId === row.unique_id)}
        onCheckedChange={(checked) => void updateStatus(checked)}
      />
    );
  };

  /* ================= ACTIONS ================= */

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await staffTemplateApi.delete(id, withDeleteReason(reason));
      setTemplates((current) => current.filter((item) => item.unique_id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: String(error ?? t("common.request_failed")),
      });
    }
  };

  const actionTemplate = (row: StaffTemplate) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: { ...selectedContext, record: row },
          })
        }
        onDelete={() => void handleDelete(row.unique_id)}
      />
    </div>
  );

  const indexTemplate = (_: StaffTemplate, { rowIndex }: any) => rowIndex + 1;

  /* ================= HEADER ================= */

  /* ================= RENDER ================= */

  return (
    <div className="p-3">
      <ListPageHeader
        title={t("admin.staff_template.list_title")}
        subtitle={t("admin.staff_template.list_subtitle")}
        actions={
          canAdd ? (
            <Button
              label={t("admin.staff_template.create_button")}
              icon="pi pi-plus"
              className="p-button-success p-button-sm"
              onClick={() => navigate(ENC_NEW_PATH, { state: selectedContext })}
            />
          ) : undefined
        }
        className="mb-4"
      />

      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onSearchValueChange}
            searchPlaceholder={t("admin.staff_template.search_placeholder")}
          />
        }
        filterPanel={
          showCol("status")
            ? combineFilters(companyProject, statusFilter)
            : combineFilters(companyProject)
        }
        onServerExport={serverExport}
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



        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>
    </div>
  );
}
