import type { PanchayatLeader } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { panchayatLeaderApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { StackCell } from "@/components/common/TableCells";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { combineFilters } from "@/components/filters/useOptionFilter";
import { Can } from "@/contexts/ScreenPermissionContext";
import { useScreenAccess } from "@/contexts/screenPermission";


const cap = (str?: string | null) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

export default function PanchayatLeaderListPage() {
  const { t } = useTranslation();
  const { canEdit } = useScreenAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encMasters, encPanchayatLeaders } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH } = createCrudRoutePaths(encMasters, encPanchayatLeaders);
  const { editPath: ENC_EDIT_PATH } = createCrudRoutePaths(encMasters, encPanchayatLeaders);

  const [rows, setRows] = useState<PanchayatLeader[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);

  const companyProject = useCompanyProjectFilter(() => setFirst(0), {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { companies, isSuperAdmin } = companyProject.selection;
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
    statusValue, statusFilter,
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
        disabled={!canEdit || (isUpdating && pendingStatusId === row.unique_id)}
        onCheckedChange={(v) => void toggle(v)}
      />
    );
  };

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await panchayatLeaderApi.delete(id, withDeleteReason(reason));
      setRows((current) => current.filter((item) => item.unique_id !== id));
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

  const actionTemplate = (row: PanchayatLeader) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), { state: { companyUniqueId, projectId } })
        }
        onDelete={() => void handleDelete(row.unique_id)}
      />
    </div>
  );

  const indexTemplate = (_: PanchayatLeader, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  return (
    <div className="min-h-full bg-gray-50/60 p-3 sm:p-5">

      {/* ── Title + company/project + Add button — outside DataTable (matches PanchayatListPage) ── */}
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
              <i className="pi pi-users" />
            </span>
            Leadership masters
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            {t("admin.nav.panchayat_leader")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.panchayat_leader") })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Can action="add">
            <Button
              label={t("common.add_item", { item: t("admin.nav.panchayat_leader") })}
              icon="pi pi-plus"
              className="p-button-success"
           
              onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
            />
          </Can>
        </div>
      </div>

      {/* ── DataTable ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.panchayat_leader") })}
          />
        }
        filterPanel={combineFilters(companyProject, statusFilter)}
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
        fitWidth
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.panchayat_leader") })}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "5%" }} />

        <Column
          field="leader_name"
          header="Leader Name"
          sortable
          style={{ width: "32%" }}
          body={(r: PanchayatLeader) => (
            <StackCell
              primary={cap(r.leader_name)}
              lines={[
                { icon: "pi-user", title: "Username", value: cap(r.username) },
                { icon: "pi-envelope", title: "Email", value: r.email },
              ]}
            />
          )}
        />

        {locationColumn<PanchayatLeader>({
          header: t("common.location"),
          style: { width: "20%" },
          levels: [
            { label: t("common.panchayat"), value: (r) => cap(r.panchayat_name) },
          ],
        })}

        <Column
          field="company_name"
          header="Company"
          style={{ width: "28%" }}
          body={(r: PanchayatLeader) => r.company_name || "-"}
        />

        <Column
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "8%" }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "7%", textAlign: "center" }}
        />
      </DataTable>
      </div>
    </div>
  );
}
