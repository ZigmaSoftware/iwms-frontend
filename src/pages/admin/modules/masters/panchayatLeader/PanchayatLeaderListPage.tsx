import type { PanchayatLeader } from "./types";
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
import { panchayatLeaderApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";


const cap = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

export default function PanchayatLeaderListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encMasters, encPanchayatLeaders } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH } = createCrudRoutePaths(encMasters, encPanchayatLeaders);
  const { editPath: ENC_EDIT_PATH } = createCrudRoutePaths(encMasters, encPanchayatLeaders);

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

  const [allRecords, setAllRecords] = useState<PanchayatLeader[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const {
    filters, onFilter, globalFilterValue, onGlobalFilterChange,
    statusValue, onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      username: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      leader_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });

  /* ── fetch, scoped server-side by company+project ── */
  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    let mounted = true;

    const load = async () => {
      if (mounted) setIsLoading(true);
      try {
        const params: Record<string, string> = {};
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;

        const data: unknown = await panchayatLeaderApi.readAll({ params });
        if (!mounted) return;
        const rows: PanchayatLeader[] = Array.isArray(data)
          ? data as PanchayatLeader[]
          : ((data as { results?: PanchayatLeader[] } | null)?.results ?? []);
        if (mounted) setAllRecords(rows);
      } catch {
        if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: t("common.load_failed") });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length]);

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const data = (() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId && !isSuperAdmin) return [];

    return allRecords;
  })();

  const exportRows = data.filter((row) => {
    if (statusValue !== "all" && row.is_active !== (statusValue === "active")) return false;
    const search = globalFilterValue.trim().toLowerCase();
    return !search || Object.values(row).some((value) =>
      String(value ?? "").toLowerCase().includes(search));
  });

  const statusTemplate = (row: PanchayatLeader) => {
    const toggle = async (checked: boolean) => {
      setPendingStatusId(row.unique_id);
      setIsUpdating(true);
      try {
        await panchayatLeaderApi.update(row.unique_id, { is_active: checked });
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
        checked={row.is_active}
        disabled={isUpdating && pendingStatusId === row.unique_id}
        onCheckedChange={(v) => void toggle(v)}
      />
    );
  };

  const actionTemplate = (row: PanchayatLeader) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), { state: { companyUniqueId, projectId } })
        }
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: PanchayatLeader, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  return (
    <div className="p-3">

      {/* ── Title + company/project + Add button — outside DataTable (matches PanchayatListPage) ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.panchayat_leader")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.panchayat_leader") })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.panchayat_leader") })}
            icon="pi pi-plus"
            className="p-button-success"
           
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar searchValue={globalFilterValue} onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.panchayat_leader") })}
        statusValue={statusValue} onStatusChange={onStatusFilterChange} className="mb-4">
        <FilterBarSelect value={companyUniqueId || ""} onChange={onCompanyChange} options={companies}
          placeholder="All Companies" disabled={!isSuperAdmin || companies.length === 0} />
        <FilterBarSelect value={projectId || ""} onChange={setProjectId} options={projects}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0} />
      </FilterBar>

      {/* ── DataTable ── */}
      <DataTable
        value={data}
        exportRows={exportRows}
        exportSheetName="PanchayatLeaders"
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && data.length === 0}
        filters={filters}
        onFilter={onFilter}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.panchayat_leader") })}
        globalFilterFields={["username", "leader_name", "email", "panchayat_name", "company_name"]}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

        <Column
          field="username"
          header="Username"
          sortable
          filter
          showFilterMatchModes={false}
          body={(r: PanchayatLeader) => cap(r.username)}
        />

        <Column
          field="leader_name"
          header="Leader Name"
          sortable
          filter
          showFilterMatchModes={false}
          body={(r: PanchayatLeader) => cap(r.leader_name) || "-"}
        />

        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(r: PanchayatLeader) => cap(r.panchayat_name) || "-"}
        />

        <Column
          field="email"
          header="Email"
          body={(r: PanchayatLeader) => r.email || "-"}
        />

        <Column
          field="company_name"
          header="Company"
          body={(r: PanchayatLeader) => r.company_name || "-"}
        />

        <Column
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "140px" }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
