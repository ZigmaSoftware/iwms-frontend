import type { ProjectStaffHierarchyRow } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { projectStaffHierarchyApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { filterRowsForExport } from "@/utils/adminListExport";

const SEARCH_FIELDS = [
  "project_name",
  "staffusertype_name",
  "reports_to_staffusertype_name",
];

const toRecordList = (value: unknown): ProjectStaffHierarchyRow[] => {
  if (Array.isArray(value)) return value as ProjectStaffHierarchyRow[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.results)) return record.results as ProjectStaffHierarchyRow[];
    if (Array.isArray(record.data)) return record.data as ProjectStaffHierarchyRow[];
  }
  return [];
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } }).response?.data;

  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
      )
      .join("\n");
  }

  return fallback;
};

export default function ProjectStaffHierarchyList() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ProjectStaffHierarchyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters();

  const navigate = useNavigate();
  const { encAdmins, encProjectStaffHierarchy } = getEncryptedRoute();

  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encAdmins,
    encProjectStaffHierarchy,
  );

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const res = await projectStaffHierarchyApi.readAll();
      setRows(toRecordList(res));
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (row: ProjectStaffHierarchyRow, checked: boolean) => {
    setPendingStatusId(row.unique_id);
    setIsUpdating(true);
    try {
      await projectStaffHierarchyApi.update(row.unique_id, { is_active: checked });
      await loadRecords();
    } catch (error: any) {
      console.error("Update Status Error:", error?.response?.data || error);
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.update_status_failed")),
        "error"
      );
    } finally {
      setIsUpdating(false);
      setPendingStatusId(null);
    }
  };

  const statusTemplate = (row: ProjectStaffHierarchyRow) => (
    <Switch
      checked={row.is_active}
      disabled={isUpdating && pendingStatusId === row.unique_id}
      onCheckedChange={(checked) => void updateStatus(row, checked)}
    />
  );

  const reportsToTemplate = (row: ProjectStaffHierarchyRow) =>
    row.reports_to_staffusertype_name || t("common.not_available");

  const actionTemplate = (row: ProjectStaffHierarchyRow) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: ProjectStaffHierarchyRow, { rowIndex }: any) => rowIndex + 1;

  const header = (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={onGlobalFilterChange}
      searchPlaceholder={t("common.search_placeholder")}
      statusValue={statusValue}
      onStatusChange={onStatusFilterChange}
    />
  );

  const exportRows = useMemo(
    () => filterRowsForExport(rows, SEARCH_FIELDS, globalFilterValue, statusValue),
    [rows, globalFilterValue, statusValue],
  );

  return (
    <div className="p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.nav.project_staff_hierarchy")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.project_staff_hierarchy"),
            })}
          </p>
        </div>

        <Button
          label={t("common.add_item", {
            item: t("admin.nav.project_staff_hierarchy"),
          })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <DataTable
        value={rows}
        exportRows={exportRows}
        paginator
        rows={10}
        loading={isLoading && rows.length === 0}
        filters={filters}
        onFilter={onFilter}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={SEARCH_FIELDS}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.project_staff_hierarchy"),
        })}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 80 }} />
        <Column
          field="project_name"
          header={t("admin.nav.project")}
          sortable
          style={{ minWidth: 160 }}
        />
        <Column
          field="staffusertype_name"
          header={t("admin.nav.staff_user_type")}
          sortable
          style={{ minWidth: 160 }}
        />
        <Column
          header={t("admin.project_staff_hierarchy.reports_to")}
          body={reportsToTemplate}
          sortable
          field="reports_to_staffusertype_name"
          style={{ minWidth: 160 }}
        />
        <Column
          field="level"
          header={t("admin.project_staff_hierarchy.level")}
          sortable
          style={{ width: 100 }}
        />
        <Column header={t("common.status")} body={statusTemplate} style={{ width: 120 }} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 150 }} />
      </DataTable>
    </div>
  );
}
