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
import { blockPanchayatUnionApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import type { BlockPanchayatUnionListRecord } from "./types";

const BLOCK_COLUMN_FIELDS: Record<string, string[]> = {
  block_name: ["block_name", "name"],
  state_name: ["state_id", "state", "state_name"],
  district_name: ["district_id", "district", "district_name"],
  is_active: ["is_active"],
};

export default function BlockPanchayatUnionListPage() {
  const { t } = useTranslation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "block-panchayat-unions",
    BLOCK_COLUMN_FIELDS,
  );
  const [allBlocks, setAllBlocks] = useState<BlockPanchayatUnionListRecord[]>([]);
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
      state_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      district_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const [isExportingExcel, setIsExportingExcel] = useState(false);

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
  const { encMasters, encBlockPanchayatUnions } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encBlockPanchayatUnions,
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

        const data = await blockPanchayatUnionApi.readAll({ params });
        if (mounted) setAllBlocks(data as BlockPanchayatUnionListRecord[]);
      } catch (error) {
        if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: String(error) });
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
  const data = ((): BlockPanchayatUnionListRecord[] => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId && !isSuperAdmin) return [];
    return Array.isArray(allBlocks) ? allBlocks : [];
  })();

  const getFilteredExportRows = (): BlockPanchayatUnionListRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return data.filter((row) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(row.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [row.block_name, row.state_name, row.district_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const handleDownloadExcel = () => {
    setIsExportingExcel(true);
    try {
      const rows = getFilteredExportRows();
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No records to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "BlockPanchayatUnions");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const actionTemplate = (row: BlockPanchayatUnionListRecord) => (
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

  const statusTemplate = (row: BlockPanchayatUnionListRecord) => {
    const updateStatus = async (value: boolean) => {
      const id = String(row.unique_id);
      setPendingStatusId(id);
      setIsUpdating(true);
      try {
        await blockPanchayatUnionApi.update(row.unique_id, filterPayload({ is_active: value }) as { is_active: boolean });
        setAllBlocks((current) =>
          current.map((item) => item.unique_id === row.unique_id ? { ...item, is_active: value } : item)
        );
      } catch (error) {
        console.error("Failed to update block panchayat union status", error);
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

  const indexTemplate = (_: BlockPanchayatUnionListRecord, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Block / Panchayat Union</h1>
          <p className="text-sm text-gray-500">Manage Block / Panchayat Union records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            label="Add Block / PU"
            icon="pi pi-plus"
            className="p-button-success"

            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder="Search Block / Panchayat Union..."
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
        emptyMessage="No block / panchayat unions found."
        globalFilterFields={["block_name", "state_name", "district_name", "company_name", "project_name"]}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        {showCol("block_name") && (
          <Column field="block_name" header="Block / PU Name" sortable filter showFilterMatchModes={false}
            body={(row: BlockPanchayatUnionListRecord) => cap(row.block_name)} />
        )}
        {showCol("district_name") && (
          <Column field="district_name" header={t("common.district")} sortable filter showFilterMatchModes={false}
            body={(row: BlockPanchayatUnionListRecord) => cap(row.district_name)} />
        )}
        {showCol("state_name") && (
          <Column field="state_name" header={t("common.state")} sortable filter showFilterMatchModes={false}
            body={(row: BlockPanchayatUnionListRecord) => cap(row.state_name)} />
        )}
        {showCol("is_active") && (
          <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />
        )}
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "150px", textAlign: "center" }} />
      </DataTable>
    </div>
  );
}
