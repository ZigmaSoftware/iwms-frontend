import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import ComponentCard from "@/components/common/ComponentCard";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { appendRouteQuery, createCrudRoutePaths } from "@/utils/routePaths";
import { staffAccessConfigurationApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

import type { StaffAccessConfigRecord } from "./types";

type ListRow = StaffAccessConfigRecord;

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

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [rows, setRows] = useState<StaffAccessConfigRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encAdmins, encStaffAccessConfiguration } = getEncryptedRoute();
  const { newPath, editPath } = createCrudRoutePaths(encAdmins, encStaffAccessConfiguration);
  const ENC_NEW_PATH = appendRouteQuery(newPath, {
    company_unique_id: companyUniqueId,
  });

  useEffect(() => {
    let mounted = true;

    const loadRows = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string | number> = { limit: 6000, offset: 0 };
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;
        const data = await staffAccessConfigurationApi.readAll({ params });
        if (mounted) setRows(data as StaffAccessConfigRecord[]);
      } catch (error) {
        if (mounted) {
          Swal.fire(t("common.error"), extractErrorMessage(error, t("common.load_failed")), "error");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadRows();

    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId, t]);

  const records = useMemo<ListRow[]>(
    () => rows,
    [rows]
  );

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

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
    setGlobalFilterValue(value);
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

      <div className="flex flex-wrap items-center gap-3">
        <span className="p-input-icon-left w-full md:w-80">
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("common.search_placeholder")}
            className="w-full"
          />
        </span>

        {isSuperAdmin && (
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={companies.length === 0}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{t("common.all_companies") || "All Companies"}</option>
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        )}

        {companyUniqueId && (
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={projects.length === 0}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {showAllProjectsOption && (
              <option value="">{t("common.all_projects") || "All Projects"}</option>
            )}
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );

  return (
    <ComponentCard title="">
      <DataTable
        value={records}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={isLoading}
        filters={filters}
        rowsPerPageOptions={[5, 10, 25, 50]}
        globalFilterFields={["staff_name", "staffusertype_name", "project_name", "company_name"]}
        header={header}
        stripedRows
        emptyMessage={t("common.no_items_found", {
          item: t("admin.staff_access_configuration.item_label"),
        })}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: 80 }} />
        <Column field="staff_id" header="ID" />
        <Column field="staff_name" header={t("admin.staff_access_configuration.staff_name")} sortable />
        <Column header="Role" body={roleTemplate} />
        <Column field="project_name" header={t("admin.nav.project")} sortable />
        <Column field="company_name" header={t("admin.nav.company")} sortable />
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
