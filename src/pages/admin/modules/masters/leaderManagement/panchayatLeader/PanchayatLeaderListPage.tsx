import type { PanchayatLeader } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

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

  const [rows, setRows] = useState<PanchayatLeader[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const requestIdRef = useRef(0);
  const {
    globalFilterValue, onGlobalFilterChange,
    statusValue, onStatusFilterChange,
  } = useFilterBarFilters();

  const toRecordList = (value: unknown): PanchayatLeader[] => {
    if (Array.isArray(value)) return value as PanchayatLeader[];
    if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
      return (value as { results: PanchayatLeader[] }).results;
    }
    return [];
  };

  const SORTABLE_FIELDS = new Set(["username", "leader_name", "panchayat_name"]);

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  /* ── fetch, scoped server-side by company+project, search, sort, and pagination ── */
  const loadRows = async (page: number, limit: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRows([]);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (ordering) params.ordering = ordering;

      const response = await panchayatLeaderApi.readAllwithPaginated(page, limit, { params });
      if (requestId !== requestIdRef.current) return;
      const list = toRecordList(response);
      setRows(list);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count?: number }).count as number
          : list.length,
      );
    } catch {
      if (requestId !== requestIdRef.current) return;
      Swal.fire({ icon: "error", title: t("common.error"), text: t("common.load_failed") });
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setRows([]);
      setTotalRecords(0);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setRows([]);
      setTotalRecords(0);
      return;
    }

    void loadRows(first / rowsPerPage + 1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, companyUniqueId, projectId, isSuperAdmin, companies.length, first, rowsPerPage, searchTerm, ordering]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const data = rows;

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
        setRows((prev) =>
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
        loading={isLoading && data.length === 0}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.panchayat_leader") })}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

        <Column
          field="username"
          header="Username"
          sortable
          body={(r: PanchayatLeader) => cap(r.username)}
        />

        <Column
          field="leader_name"
          header="Leader Name"
          sortable
          body={(r: PanchayatLeader) => cap(r.leader_name) || "-"}
        />

        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          sortable
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
