import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";
import { getEncryptedRoute } from "@/utils/routeCache";
import Swal from "@/lib/notify";
import { PencilIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { panchayatApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import type { PanchayatListRecord } from "./types";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";

const PANCHAYAT_COLUMN_FIELDS: Record<string, string[]> = {
  panchayat_name: ["panchayat_name", "name"],
  state_name: ["state_id", "state", "state_name"],
  district_name: ["district_id", "district", "district_name"],
  city_name: ["city_id", "city", "city_name"],
  agreed_weight_kg: ["agreed_weight_kg"],
  weight_unit: ["weight_unit"],
  effective_from: ["effective_from"],
  is_active: ["is_active"],
};

const SORTABLE_FIELDS = new Set(["panchayat_name", "is_active"]);

const toRecordList = (value: unknown): PanchayatListRecord[] => {
  if (Array.isArray(value)) return value as PanchayatListRecord[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: PanchayatListRecord[] }).results;
  }
  return [];
};

export default function PanchayatListPage() {
  const { t } = useTranslation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "panchayats",
    PANCHAYAT_COLUMN_FIELDS,
  );
  const [rows, setRows] = useState<PanchayatListRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);
  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      state_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      district_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      agreed_weight_kg: { value: null, matchMode: FilterMatchMode.CONTAINS },
      weight_unit: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      effective_from: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
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
  const navigate = useNavigate();
  const { encMasters, encPanchayats } = getEncryptedRoute();

  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encMasters, encPanchayats);

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
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
      if (globalFilterValue.trim()) params.search = globalFilterValue.trim();
      if (ordering) params.ordering = ordering;

      const response = await panchayatApi.readAllwithPaginated(page, limit, {
        params,
      });
      if (requestId !== requestIdRef.current) return;
      const list = toRecordList(response);
      setRows(list);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? ((response as { count?: number }).count as number)
          : list.length,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: String(error),
      });
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
  }, [
    t,
    companyUniqueId,
    projectId,
    isSuperAdmin,
    companies.length,
    first,
    rowsPerPage,
    globalFilterValue,
    ordering,
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

  // Company/project scoping, search, and ordering are applied server-side
  // (tenant users are scoped automatically by the backend; superadmin scoping
  // is passed via company_id/project_id params above).
  const data = rows;

  const exportRows = data.filter((row) => {
    if (
      statusValue !== "all" &&
      Boolean(row.is_active) !== (statusValue === "active")
    )
      return false;
    const search = globalFilterValue.trim().toLowerCase();
    return (
      !search ||
      Object.values(row).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search),
      )
    );
  });

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const displayValue = (value: unknown) =>
    value === null || value === undefined || value === "" ? "-" : String(value);

  const actionTemplate = (row: PanchayatListRecord) => (
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

  const statusTemplate = (row: PanchayatListRecord) => {
    const updateStatus = async (value: boolean) => {
      const id = String(row.unique_id);
      setPendingStatusId(id);
      setIsUpdating(true);

      try {
        await panchayatApi.update(
          row.unique_id,
          filterPayload({ is_active: value }) as { is_active: boolean },
        );
        setRows((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, is_active: value }
              : item,
          ),
        );
      } catch (error) {
        console.error("Failed to update panchayat status", error);
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

  const indexTemplate = (
    _: PanchayatListRecord,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

  return (
    <div className="p-3">
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            {t("admin.nav.panchayat")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.panchayat"),
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.panchayat") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() =>
              navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
            }
          />
        </div>
      </div>

      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder", {
              item: t("admin.nav.panchayat"),
            })}
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
              disabled={
                (!companyUniqueId && !isSuperAdmin) || projects.length === 0
              }
            />
          </FilterBar>
        }
        value={data}
        exportRows={exportRows}
        exportSheetName="Panchayats"
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
        loading={isLoading}
        filters={filters}
        onFilter={onFilter}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.panchayat"),
        })}
        globalFilterFields={[
          "panchayat_name",
          "name",
          "city_name",
          "district_name",
          "state_name",
          "country_name",
          "company_name",
          "project_name",
          "agreed_weight_kg",
          "weight_unit",
          "effective_from",
        ]}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        {showCol("panchayat_name") && (
          <Column
            field="panchayat_name"
            header={t("admin.nav.panchayat")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) => cap(row.panchayat_name)}
          />
        )}
        {showCol("state_name") && (
          <Column
            field="state_name"
            header={t("common.state")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) => cap(row.state_name)}
          />
        )}
        {showCol("district_name") && (
          <Column
            field="district_name"
            header={t("common.district")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) => cap(row.district_name)}
          />
        )}
        {showCol("city_name") && (
          <Column
            field="city_name"
            header={t("common.city")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) => cap(row.city_name)}
          />
        )}
        {showCol("agreed_weight_kg") && (
          <Column
            field="agreed_weight_kg"
            header="Agreed Weight"
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) =>
              displayValue(row.agreed_weight_kg)
            }
          />
        )}
        {showCol("weight_unit") && (
          <Column
            field="weight_unit"
            header="Weight Unit"
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) =>
              displayValue(row.weight_unit).toUpperCase()
            }
          />
        )}
        {showCol("effective_from") && (
          <Column
            field="effective_from"
            header="Effective From"
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: PanchayatListRecord) =>
              displayValue(row.effective_from)
            }
          />
        )}
        {showCol("is_active") && (
          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "140px" }}
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
