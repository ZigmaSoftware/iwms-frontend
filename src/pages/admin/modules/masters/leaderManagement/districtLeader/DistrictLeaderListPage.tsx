import type { DistrictLeader } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { districtLeaderApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";

const extractRows = (value: unknown): DistrictLeader[] => {
  if (Array.isArray(value)) return value as DistrictLeader[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.results)) return record.results as DistrictLeader[];
  if (Array.isArray(record.data)) return record.data as DistrictLeader[];

  const nestedData = record.data;
  if (nestedData && typeof nestedData === "object") {
    const nested = nestedData as Record<string, unknown>;
    if (Array.isArray(nested.results)) return nested.results as DistrictLeader[];
    if (Array.isArray(nested.data)) return nested.data as DistrictLeader[];
  }

  return [];
};

const cap = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

export default function DistrictLeaderListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encMasters, encDistrictLeaders } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(encMasters, encDistrictLeaders);

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
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [allRecords, setAllRecords] = useState<DistrictLeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      username: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      leader_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      district_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (isSuperAdmin && companies.length === 0) {
        setAllRecords([]);
        return;
      }

      if (!companyUniqueId && !isSuperAdmin) {
        setAllRecords([]);
        return;
      }

      if (mounted) setIsLoading(true);
      try {
        const params: Record<string, string> = {};
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;

        const data: unknown = await districtLeaderApi.readAll(
          Object.keys(params).length ? { params } : undefined
        );
        if (!mounted) return;
        const rows = extractRows(data);
        if (mounted) setAllRecords(rows);
      } catch {
        if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: t("common.load_failed") });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [companies.length, companyUniqueId, isSuperAdmin, projectId, t]);

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const data = (() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId && !isSuperAdmin) return [];

    return allRecords;
  })();

  const getFilteredExportRows = (): DistrictLeader[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return data.filter((row) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(row.is_active ?? row.active_status) !== wantActive) return false;
      }
      if (!search) return true;
      return [row.username, row.leader_name, row.district_name, row.email, row.company_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const handleDownloadExcel = () => {
    setIsExportingExcel(true);
    try {
      const rows = getFilteredExportRows();
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No district leaders to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "DistrictLeaders");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const statusTemplate = (row: DistrictLeader) => {
    const toggle = async (checked: boolean) => {
      setPendingStatusId(row.unique_id);
      setIsUpdating(true);
      try {
        await districtLeaderApi.update(row.unique_id, { is_active: checked });
        setAllRecords((prev) =>
          prev.map((r) => r.unique_id === row.unique_id ? { ...r, is_active: checked } : r)
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
        checked={row.is_active ?? row.active_status ?? false}
        disabled={isUpdating && pendingStatusId === row.unique_id}
        onCheckedChange={(v) => void toggle(v)}
      />
    );
  };

  const actionTemplate = (row: DistrictLeader) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id), { state: { companyUniqueId, projectId } })}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: DistrictLeader, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.district_leader")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.district_leader") })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.district_leader") })}
            icon="pi pi-plus"
            className="p-button-success"

            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.district_leader") })}
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
        className="mb-4"
        trailing={
          <Button
            label={isExportingExcel ? "Downloading..." : "Download Excel"}
            icon="pi pi-file-excel"
            className="p-button-outlined"
            disabled={isExportingExcel}
            onClick={handleDownloadExcel}
          />
        }
      >
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          options={companies}
          placeholder="All Companies"
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          options={projects}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
      </FilterBar>

      <DataTable
        value={data}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && data.length === 0}
        filters={filters}
        onFilter={onFilter}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.district_leader") })}
        globalFilterFields={["username", "leader_name", "district_name", "email", "company_name"]}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        <Column field="username" header={t("common.username")} sortable filter showFilterMatchModes={false} body={(r: DistrictLeader) => cap(r.username)} />
        <Column field="leader_name" header={t("common.name")} sortable filter showFilterMatchModes={false} body={(r: DistrictLeader) => cap(r.leader_name)} />
        <Column field="district_name" header={t("admin.nav.district")} sortable filter showFilterMatchModes={false} body={(r: DistrictLeader) => cap(r.district_name)} />
        <Column field="email" header={t("common.email")} body={(r: DistrictLeader) => r.email || "-"} />
        <Column field="company_name" header={t("common.company")} body={(r: DistrictLeader) => r.company_name || "-"} />
        <Column field="project_name" header={t("common.project")} body={(r: DistrictLeader) => r.project_name || "-"} />
        <Column field="is_active" header={t("common.status")} body={statusTemplate} />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "100px", textAlign: "center" }} />
      </DataTable>
    </div>
  );
}
