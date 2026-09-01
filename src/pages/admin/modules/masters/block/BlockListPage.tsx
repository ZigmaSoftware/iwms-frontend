import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { getEncryptedRoute } from "@/utils/routeCache";
import Swal from "@/lib/notify";
import { PencilIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { blockApi, projectApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import type { BlockListRecord } from "./types";

const BLOCK_COLUMN_FIELDS: Record<string, string[]> = {
  block_name: ["block_name", "name"],
  ward_name: ["ward_id", "ward", "ward_name"],
  is_active: ["is_active"],
};

export default function BlockListPage() {
  const { t } = useTranslation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "blocks",
    BLOCK_COLUMN_FIELDS,
  );
  const [allBlocks, setAllBlocks] = useState<BlockListRecord[]>([]);
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
      block_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const [projectHasBlocks, setProjectHasBlocks] = useState(true);

  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId, projectId, projects, companies, isSuperAdmin, showAllProjectsOption, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const navigate = useNavigate();
  const { encMasters, encBlocks } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encBlocks,
  );

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = {};
        if (companyUniqueId) params.company_id = companyUniqueId;
        if (projectId) params.project_id = projectId;

        const data = await blockApi.readAll({ params });
        if (mounted) setAllBlocks(data as BlockListRecord[]);
      } catch (error) {
        if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: String(error) });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length]);

  useEffect(() => {
    if (!projectId) {
      setProjectHasBlocks(true);
      return;
    }
    let mounted = true;
    projectApi.read(projectId)
      .then((project: any) => {
        if (mounted) setProjectHasBlocks(Boolean(project?.has_blocks));
      })
      .catch(() => {
        if (mounted) setProjectHasBlocks(false);
      });
    return () => { mounted = false; };
  }, [projectId]);

  // Company/project scoping is applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const data = ((): BlockListRecord[] => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId && !isSuperAdmin) return [];
    return Array.isArray(allBlocks) ? allBlocks : [];
  })();

  const getFilteredExportRows = (): BlockListRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return data.filter((row) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(row.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [row.block_name, row.ward_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };


  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const actionTemplate = (row: BlockListRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        className="text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const statusTemplate = (row: BlockListRecord) => {
    const updateStatus = async (value: boolean) => {
      const id = String(row.unique_id);
      setPendingStatusId(id);
      setIsUpdating(true);
      try {
        await blockApi.update(row.unique_id, filterPayload({ is_active: value }) as { is_active: boolean });
        setAllBlocks((current) =>
          current.map((item) => item.unique_id === row.unique_id ? { ...item, is_active: value } : item)
        );
      } catch (error) {
        console.error("Failed to update block status", error);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };
    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={isUpdating && pendingStatusId === String(row.unique_id)}
        onCheckedChange={(checked) => void updateStatus(checked)}
      />
    );
  };

  const indexTemplate = (_: BlockListRecord, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  return (
    <div className="p-3">
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Block</h1>
          <p className="text-sm text-gray-500">Manage Block records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            label="Add Block"
            icon="pi pi-plus"
            className="p-button-success"
            disabled={Boolean(projectId) && !projectHasBlocks}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder="Search Block..."
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
        className="mb-4"
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

      {projectId && !projectHasBlocks && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          This project is not organized into Blocks. Enable "This project is organized into Blocks" on the project to create or view block records for it.
        </div>
      )}

      <DataTable
        loadExportRows={async () => getFilteredExportRows()}
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
        emptyMessage="No blocks found."
        globalFilterFields={["block_name", "ward_name", "company_name", "project_name"]}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        {showCol("block_name") && (
          <Column field="block_name" header="Block Name" sortable filter showFilterMatchModes={false}
            body={(row: BlockListRecord) => cap(row.block_name)} />
        )}
        {showCol("ward_name") && (
          <Column field="ward_name" header={t("admin.nav.ward")} sortable filter showFilterMatchModes={false}
            body={(row: BlockListRecord) => cap(row.ward_name)} />
        )}
        {showCol("is_active") && (
          <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />
        )}
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "150px", textAlign: "center" }} />
      </DataTable>
    </div>
  );
}
