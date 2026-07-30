/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { filterRowsForExport } from "@/utils/adminListExport";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { userScreenPermissionApi } from "@/helpers/admin";
import { adminApi } from "@/helpers/admin/registry";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import {
  excelFileToCsvFile,
  exportTemplateToExcel,
  getAdminScreenExcelFilename,
  type ExcelTemplateColumn,
} from "@/utils/exportExcel";

import type { PermissionRow, ProjectPermissionSummaryRow } from "./types";

import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

/* -----------------------------------------------------------
   CONSTANTS
----------------------------------------------------------- */

const PERMISSION_SEARCH_FIELDS = ["project_name", "company_name", "permission_type_label"];

const BULK_TEMPLATE_COLUMNS: ExcelTemplateColumn[] = [
  { field: "company_id", header: "company_id", required: true, sample: "COMPANY-0001" },
  { field: "project_id", header: "project_id", required: true, sample: "PROJECT-0001" },
  { field: "permission_type", header: "permission_type", sample: "screen" },
  { field: "main_screen_id_or_name", header: "main_screen_id_or_name", required: true, sample: "Transport Masters" },
  { field: "user_screen_id_or_name", header: "user_screen_id_or_name", required: true, sample: "Vehicle Creation" },
  { field: "action_id_or_name", header: "action_id_or_name", required: true, sample: "view" },
  { field: "description", header: "description", sample: "" },
];

const toStrId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const PERMISSION_TYPE_LABELS: Record<string, string> = {
  screen: "Screen Permission",
  field: "Field Permission",
};

/* -----------------------------------------------------------
   COMPONENT
----------------------------------------------------------- */

export default function UserScreenPermissionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    defaultToAll: true, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    company_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    project_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
  });


  const { encAdmins, encUserScreenPermission } = getEncryptedRoute();
  const { newPath: permissionNewPath, editPath: permissionEditPath } =
    createCrudRoutePaths(encAdmins, encUserScreenPermission);
  const ENC_NEW_PATH = appendRouteQuery(permissionNewPath, {
    company_unique_id: companyUniqueId,
  });

  const ENC_EDIT_PATH = (
    projectIdValue: string,
    companyId: string,
    permissionType: string
  ) =>
    appendRouteQuery(permissionEditPath(projectIdValue), {
      company_unique_id: companyId,
      permission_type: permissionType,
    });

  useEffect(() => {
    let mounted = true;

    const loadPermissions = async () => {
      if (!companyUniqueId && !isSuperAdmin) {
        setPermissionRows([]);
        return;
      }

      setIsLoading(true);
      try {
        const params: Record<string, string | number> = { limit: 6000, offset: 0 };
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;
        const data = await userScreenPermissionApi.readAll({ params });
        if (mounted) setPermissionRows(data as PermissionRow[]);
      } catch {
        if (mounted) Swal.fire(t("common.error"), t("common.load_failed"), "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadPermissions();

    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId, t, refetchTrigger]);

  const records = useMemo<ProjectPermissionSummaryRow[]>(() => {
    if (!companyUniqueId && !isSuperAdmin) return [];
    const data = permissionRows;
    const selectedCompanyLabel = (
      companies.find((company) => company.value === companyUniqueId)?.label ?? ""
    )
      .trim()
      .toLowerCase();

    const filteredData = !companyUniqueId
      ? data
      : data.filter((item) => {
          const itemCompanyId = toStrId(item.company_id);
          const itemCompanyName = String(item.company_name ?? "")
            .trim()
            .toLowerCase();

          if (itemCompanyId && itemCompanyId === companyUniqueId) return true;
          if (!itemCompanyId && selectedCompanyLabel) {
            return itemCompanyName === selectedCompanyLabel;
          }

          return false;
        });

    // Group by project + permission type so screen and field grants are managed independently.
    type GroupAccum = {
      composite_key: string;
      project_id: string;
      project_name: string;
      company_id: string;
      company_name: string;
      permission_type: string;
      permission_type_label: string;
      mainScreenIds: Set<string>;
      userScreenIds: Set<string>;
    };

    const groupedObj: Record<string, GroupAccum> = filteredData.reduce(
      (acc, item) => {
        const projId = toStrId(item.project_id);
        const permissionType = String(item.permission_type ?? "screen") || "screen";
        const key = `${projId || "__no_project__"}__${permissionType}`;

        if (!acc[key]) {
          acc[key] = {
            composite_key: key,
            project_id: projId,
            project_name: String(item.project_name ?? t("common.unknown")),
            company_id: toStrId(item.company_id),
            company_name: String(item.company_name ?? t("common.unknown")),
            permission_type: permissionType,
            permission_type_label: PERMISSION_TYPE_LABELS[permissionType] ?? permissionType,
            mainScreenIds: new Set<string>(),
            userScreenIds: new Set<string>(),
          };
        }

        const mainScreenId = toStrId(item.mainscreen_id);
        if (mainScreenId) acc[key].mainScreenIds.add(mainScreenId);

        const userScreenId = toStrId(item.userscreen_id);
        if (userScreenId) acc[key].userScreenIds.add(userScreenId);

        return acc;
      },
      {} as Record<string, GroupAccum>
    );

    return Object.values(groupedObj).map((group) => ({
      project_id: group.project_id,
      project_name: group.project_name,
      company_id: group.company_id,
      company_name: group.company_name,
      permission_type: group.permission_type,
      permission_type_label: group.permission_type_label,
      main_screen_count: group.mainScreenIds.size,
      screen_count: group.userScreenIds.size,
      mainscreen_ids: Array.from(group.mainScreenIds),
      composite_key: group.composite_key,
    }));
  }, [companies, companyUniqueId, permissionRows, t]);

  /* -----------------------------------------------------------
     DELETE RECORD — loop delete-by-project per distinct mainscreen_id
  ----------------------------------------------------------- */

  const handleDelete = useCallback(async (row: ProjectPermissionSummaryRow) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("admin.user_screen_permission.confirm_delete"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirmDelete.isConfirmed) return;

    try {
      const mainScreenIds = row.mainscreen_ids.length > 0 ? row.mainscreen_ids : [""];

      await Promise.all(
        mainScreenIds.map((mainScreenId) =>
          userScreenPermissionApi.delete(
            `delete-by-project/${row.project_id}/?mainscreen_id=${encodeURIComponent(mainScreenId)}&permission_type=${encodeURIComponent(row.permission_type)}`
          )
        )
      );

      setPermissionRows((current) =>
        current.filter((item) => {
          const sameProject = toStrId(item.project_id) === row.project_id;
          const samePermissionType = String(item.permission_type ?? "screen") === row.permission_type;
          return !(sameProject && samePermissionType);
        })
      );

      Swal.fire(
        t("common.deleted_success"),
        t("admin.user_screen_permission.delete_success"),
        "success"
      );

    } catch (error) {
      console.error("DELETE ERROR:", error);

      Swal.fire(
        t("common.error"),
        t("admin.user_screen_permission.delete_failed"),
        "error"
      );
    }
  }, [t]);

  /* -----------------------------------------------------------
     BULK UPLOAD — Download Template / Upload Excel
  ----------------------------------------------------------- */

  const downloadTemplate = () => {
    exportTemplateToExcel(
      BULK_TEMPLATE_COLUMNS,
      getAdminScreenExcelFilename("template"),
      "ScreenPermissions",
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvFile = await excelFileToCsvFile(file, "screen_permission_bulk_upload.csv");
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await adminApi.companyWiseScreenPermissions.action(
        "bulk-upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const errors = Array.isArray(res.errors) ? res.errors : [];
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "completed",
        success_count: Number(res.success_count ?? 0),
        error_count: errors.length,
      });

      const errorPreview =
        errors.length > 0
          ? `<hr/><div class="text-left text-xs mt-2">${errors
              .slice(0, 3)
              .map((entry: { row: number; error: unknown }) => {
                const detail =
                  typeof entry.error === "string"
                    ? entry.error
                    : JSON.stringify(entry.error);
                return `Row ${entry.row}: ${detail}`;
              })
              .join("<br/>")}</div>`
          : "";

      Swal.fire({
        icon: "success",
        title: t("admin.user_screen_permission.upload_completed_title"),
        html: `<b>Success:</b> ${res.success_count}<br/><b>Errors:</b> ${errors.length}${errorPreview}`,
      });

      setRefetchTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Screen permission bulk upload failed:", err);
      recordExcelAudit("upload_excel", {
        file_name: file.name,
        status: "failed",
      });
      Swal.fire(t("common.error"), t("admin.user_screen_permission.upload_failed"), "error");
    } finally {
      event.target.value = "";
    }
  };

  /* -----------------------------------------------------------
     ACTION BUTTONS
  ----------------------------------------------------------- */

  const actionTemplate = (row: ProjectPermissionSummaryRow) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => {
          if (!row.project_id) {
            Swal.fire(
              t("common.warning"),
              t("admin.user_screen_permission.no_project_edit_warning"),
              "warning"
            );
            return;
          }
          navigate(
            ENC_EDIT_PATH(row.project_id, row.company_id, row.permission_type),
            { state: { companyUniqueId: row.company_id, projectId: row.project_id } }
          );
        }}
      >
        <PencilIcon className="size-5" />
      </button>

      <button
        title={t("common.delete")}
        className="text-red-600 hover:text-red-800"
        onClick={() => handleDelete(row)}
      >
        <TrashBinIcon className="size-5" />
      </button>

    </div>
  );

  const indexTemplate = (_: any, { rowIndex }: any) => rowIndex + 1;

  const mainScreenCountTemplate = (row: ProjectPermissionSummaryRow) =>
    t("admin.user_screen_permission.main_screens_count", { count: row.main_screen_count });

  const screenCountTemplate = (row: ProjectPermissionSummaryRow) =>
    t("admin.user_screen_permission.screens_count", { count: row.screen_count });

  /* -----------------------------------------------------------
     GLOBAL SEARCH
  ----------------------------------------------------------- */

  const onGlobalFilterChange = (e: any) => {
    const value = e.target.value;
    const updated = { ...filters };
    updated["global"].value = value;
    setFilters(updated);
    setGlobalFilterValue(value);
  };

  const header = (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={(value) => onGlobalFilterChange({ target: { value } })}
      searchPlaceholder={t("common.search_placeholder")}
    >
      {isSuperAdmin && (
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          placeholder="All Companies"
          disabled={companies.length === 0}
          options={companies}
        />
      )}

      {companyUniqueId && (
        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          disabled={projects.length === 0}
          options={projects}
        />
      )}
    </FilterBar>
  );

  const exportRows = useMemo(
    () => filterRowsForExport(records, PERMISSION_SEARCH_FIELDS, globalFilterValue),
    [records, globalFilterValue],
  );

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {t("admin.user_screen_permission.title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("admin.user_screen_permission.subtitle")}
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            label={t("admin.user_screen_permission.download_template")}
            icon="pi pi-download"
            severity="secondary"
            className="p-button-sm"
            onClick={downloadTemplate}
          />
          <Button
            label={t("admin.user_screen_permission.upload_excel")}
            icon="pi pi-upload"
            className="p-button-sm"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={handleFileUpload}
          />

          <Button
            label={t("common.add_item", {
              item: t("admin.user_screen_permission.permission_label"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={records}
        exportRows={exportRows}
        dataKey="composite_key"
        paginator
        rows={10}
        loading={isLoading}
        filters={filters}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={PERMISSION_SEARCH_FIELDS}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.user_screen_permission.permission_label"),
        })}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: 80 }}
        />

        <Column
          field="project_name"
          header={t("admin.nav.project")}
          sortable
        />

        <Column
          field="company_name"
          header={t("admin.nav.company")}
          sortable
        />

        <Column
          field="permission_type_label"
          header="Permission Type"
          sortable
        />

        <Column
          header={t("admin.nav.main_screen")}
          body={mainScreenCountTemplate}
          sortable
          sortField="main_screen_count"
        />

        <Column
          header={t("admin.nav.user_screen")}
          body={screenCountTemplate}
          sortable
          sortField="screen_count"
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 150 }}
        />
      </DataTable>
    </div>
  );
}
