import type { DistrictApiRow } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { useTranslation } from "react-i18next";
import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { districtApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import type { DistrictListRecord } from "./types";

/**
 * Maps each DataTable column to the backend field names that control its visibility.
 * A column is shown if allowed is null (no restrictions) OR if any of its fieldNames
 * are present in the allowed set.
 */
const DISTRICT_COLUMN_FIELDS: Record<string, string[]> = {
  countryName: ["country_id"],
  stateName: ["state_id"],
  name: ["name"],
  is_active: ["is_active"],
};

// Backend (district_viewset.py) only supports ordering on "name" and
// "is_active"; the DataTable's sortField values are the frontend column
// names, so map them onto the backend's ordering field names below.
const SORTABLE_FIELDS = new Set(["name", "is_active"]);
const BACKEND_ORDER_FIELD: Record<string, string> = {
  name: "name",
  is_active: "is_active",
};

export default function DistrictListPage() {
  const { t } = useTranslation();
  const { showColumn: showCol } = useFieldVisibility(
    "masters",
    "districts",
    DISTRICT_COLUMN_FIELDS,
  );

  const [districts, setDistricts] = useState<DistrictListRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
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
    defaultToAll: true, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  const navigate = useNavigate();
  const { encMasters, encDistricts } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encDistricts,
  );

  const mapRow = (d: DistrictApiRow): DistrictListRecord => ({
    unique_id: String(d.unique_id ?? ""),
    countryName: String(d.country_name ?? ""),
    stateName: String(d.state_name ?? ""),
    name: String(d.name ?? ""),
    is_active: Boolean(d.is_active),
    company_id: d.company_id ? String(d.company_id) : undefined,
    company_unique_id: d.company_unique_id ? String(d.company_unique_id) : undefined,
    company_name: d.company_name ? String(d.company_name) : undefined,
    project_id: d.project_id ? String(d.project_id) : undefined,
    project_unique_id: d.project_unique_id ? String(d.project_unique_id) : undefined,
    project_name: d.project_name ? String(d.project_name) : undefined,
  });

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${BACKEND_ORDER_FIELD[sortField] ?? sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number, search: string, order?: string) => {
    if (isSuperAdmin && companies.length === 0) {
      setDistricts([]);
      setTotalRecords(0);
      return;
    }

    if (!companyUniqueId && !isSuperAdmin) {
      setDistricts([]);
      setTotalRecords(0);
      return;
    }

    setIsLoading(true);
    setDistricts([]);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (search) params.search = search;
      if (order) params.ordering = order;

      const response = await districtApi.readAllwithPaginated(page, limit, {
        params,
      });
      const rows: DistrictApiRow[] = Array.isArray(response?.results)
        ? (response.results as unknown as DistrictApiRow[])
        : [];
      setDistricts(rows.map(mapRow));
      setTotalRecords(typeof response?.count === "number" ? response.count : rows.length);
    } catch (error) {
      const errorData = (error as { response?: { data?: unknown } })?.response?.data;
      Swal.fire({ icon: "error", title: t("common.error"), text: String(errorData ?? error) });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, rowsPerPage, searchTerm, ordering, companies.length, companyUniqueId, isSuperAdmin, projectId]);

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

  const onGlobalFilterChange = (value: string) => {
    setGlobalFilterValue(value);
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;

      const allRows = await districtApi.readAllForExport(
        Object.keys(params).length ? { params } : undefined,
      );
      const rows = (Array.isArray(allRows) ? (allRows as unknown as DistrictApiRow[]) : []).map(mapRow);
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No districts to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "Districts");
    } catch (error) {
      const errorData = (error as { response?: { data?: unknown } })?.response?.data;
      Swal.fire({ icon: "error", title: t("common.error"), text: String(errorData ?? error) });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const updateStatus = async (row: DistrictListRecord, checked: boolean) => {
    const id = String(row.unique_id);
    setPendingStatusId(id);
    setIsUpdating(true);

    try {
      await districtApi.update(row.unique_id, { is_active: checked });
      setDistricts((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id ? { ...item, is_active: checked } : item
        )
      );
    } catch (e) {
      console.error("Toggle update failed:", e);
    } finally {
      setPendingStatusId(null);
      setIsUpdating(false);
    }
  };

  const statusTemplate = (row: DistrictListRecord) => (
    <Switch checked={row.is_active} disabled={isUpdating && pendingStatusId === String(row.unique_id)} onCheckedChange={(checked) => void updateStatus(row, checked)} />
  );


  const actionTemplate = (row: DistrictListRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: {
              district: row,
              companyUniqueId: row.company_id ?? row.company_unique_id,
              projectId: row.project_id ?? row.project_unique_id,
            },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: DistrictListRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.district")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", { item: t("admin.nav.district") })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.district") })}
            icon="pi pi-plus"
            className="p-button-success"

            onClick={() =>
              navigate(ENC_NEW_PATH, {
                state: {
                  companyUniqueId,
                  projectId,
                },
              })
            }
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.district") })}
        className="mb-4"
        trailing={
          <Button
            label={isExportingExcel ? "Downloading..." : "Download Excel"}
            icon="pi pi-file-excel"
            className="p-button-outlined"
            disabled={isExportingExcel}
            onClick={() => void handleDownloadExcel()}
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
        value={districts}
        dataKey="unique_id"
        lazy
        loading={isLoading}
        paginator
        first={first}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPage={onPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        rowsPerPageOptions={[5, 10, 25, 50]}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.district") })}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        {showCol("countryName") && (
          <Column
            field="countryName"
            header={t("admin.nav.country")}
            body={(row) => cap(row.countryName)}
          />
        )}
        {showCol("stateName") && (
          <Column
            field="stateName"
            header={t("admin.nav.state")}
            body={(row) => cap(row.stateName)}
          />
        )}
        {showCol("name") && (
          <Column
            field="name"
            header={t("admin.nav.district")}
            body={(row) => cap(row.name)}
            sortable
          />
        )}
        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            body={statusTemplate}
            sortable
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "100px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
