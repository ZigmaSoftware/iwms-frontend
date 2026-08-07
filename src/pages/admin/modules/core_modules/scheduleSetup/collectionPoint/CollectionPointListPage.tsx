import type { CollectionPointCollectionType, CollectionPointRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { useTranslation } from "react-i18next";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { collectionPointApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";


const toDisplay = (value: unknown): string =>
  value === null || value === undefined || String(value).trim() === "" ? "-" : String(value);

const toOptionalString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

const toRecordList = (value: unknown): CollectionPointRecord[] => {
  if (Array.isArray(value)) return value as CollectionPointRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: CollectionPointRecord[] }).results;
  }
  return [];
};

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  bin_collection: "Secondary Collection Point",
  bulk_waste_collection: "Bulk Waste Collection",
  household_collection: "Household Collection",
};

const SORTABLE_FIELDS = new Set(["cp_name", "collection_type", "is_active"]);

const COLLECTION_POINT_COLUMN_FIELDS: Record<string, string[]> = {
  cp_name: ["cp_name", "collection_point_name", "name"],
  company_name: ["company_id", "company_name"],
  project_name: ["project_id", "project_name"],
  state_name: ["state_id", "state_name"],
  district_name: ["district_id", "district_name"],
  city_name: ["city_id", "city_name"],
  panchayat_name: ["panchayat_id", "panchayat_name"],
  ward_name: ["ward_id", "ward_name"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  is_active: ["is_active"],
};

export default function CollectionPointListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [records, setRecords] = useState<CollectionPointRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | CollectionPointCollectionType>("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusValue, setStatusValue] = useState<"all" | "active" | "inactive">("all");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const requestIdRef = useRef(0);
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

  const { encScheduleSetup, encCollectionPoints } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleSetup,
    encCollectionPoints,
  );

  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "collection-points",
    COLLECTION_POINT_COLUMN_FIELDS,
  );

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number, search: string, order?: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRecords([]);
    try {
      const response = await collectionPointApi.readAllwithPaginated(page, limit, {
        params: {
          company_id: companyUniqueId,
          project_id: projectId || undefined,
          ...(collectionTypeFilter !== "all" ? { collection_type: collectionTypeFilter } : {}),
          ...(search ? { search } : {}),
          ...(order ? { ordering: order } : {}),
        },
      });
      if (requestId !== requestIdRef.current) return;
      setRecords(toRecordList(response));
      setTotalRecords(
        typeof response?.count === "number" ? response.count : toRecordList(response).length,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to fetch collection points", error);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyUniqueId,
    projectId,
    isSuperAdmin,
    companies.length,
    collectionTypeFilter,
    first,
    rowsPerPage,
    searchTerm,
    ordering,
  ]);

  // Company/project and collection-type scoping are applied server-side
  // (tenant users are scoped automatically by the backend; superadmin
  // scoping and the collection-type filter are passed via query params
  // above) — only the local status filter still needs to be applied
  // client-side, since the backend has no is_active filter param.
  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as CollectionPointRecord[];
    if (!companyUniqueId && !isSuperAdmin) return [] as CollectionPointRecord[];

    if (statusValue === "all") return records;

    const wantActive = statusValue === "active";
    return records.filter((row) => Boolean(row.is_active) === wantActive);
  })();

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

  const onStatusFilterChange = (value: "all" | "active" | "inactive") => {
    setStatusValue(value);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // Excel export needs the full filtered dataset, not just the current page,
  // so it re-fetches every page (readAllForExport) with the same server-side
  // filters used by the table, then applies the client-only status filter.
  const getFilteredExportRows = async (): Promise<CollectionPointRecord[]> => {
    const data = await collectionPointApi.readAllForExport({
      params: {
        company_id: companyUniqueId,
        project_id: projectId || undefined,
        ...(collectionTypeFilter !== "all" ? { collection_type: collectionTypeFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(ordering ? { ordering } : {}),
      },
    });
    const exportRows = data as CollectionPointRecord[];
    if (statusValue === "all") return exportRows;

    const wantActive = statusValue === "active";
    return exportRows.filter((row) => Boolean(row.is_active) === wantActive);
  };

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const exportRows = await getFilteredExportRows();
      if (exportRows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No collection points to export", "warning");
        return;
      }
      exportRecordsToExcel(exportRows, getAdminScreenExcelFilename("all"), "CollectionPoints");
    } catch (error) {
      console.error("Failed to export collection points", error);
      Swal.fire(t("common.error") || "Error", "Failed to export collection points", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const indexTemplate = (_: CollectionPointRecord, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const actionTemplate = (row: CollectionPointRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() =>
          navigate(ENC_EDIT_PATH(String(row.unique_id)), {
            state: { companyUniqueId, projectId },
          })
        }
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const statusTemplate = (row: CollectionPointRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        setPendingStatusId(String(row.unique_id));
        setIsUpdating(true);
        await collectionPointApi.update(
          row.unique_id,
          filterPayload({ is_active: value }) as { is_active: boolean }
        );
        setRecords((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch (error) {
        console.error("Failed to update collection point status", error);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={isUpdating && pendingStatusId === String(row.unique_id)}
        onCheckedChange={updateStatus}
      />
    );
  };

  const cap = (str?: string | null) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{t("admin.nav.collection_point")}</h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.collection_point") })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.collection_point") })}
            icon="pi pi-plus"
            className="p-button-success"

            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.collection_point") })}
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
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
        <FilterBarSelect
          value={collectionTypeFilter}
          onChange={(value) => {
            setFirst(0);
            setCollectionTypeFilter(value as "all" | CollectionPointCollectionType);
          }}
          aria-label="Collection type filter"
        >
          <option value="all">All Types</option>
          <option value="bin_collection">Secondary Collection Point</option>
          <option value="bulk_waste_collection">Bulk Waste Collection</option>
        </FilterBarSelect>
      </FilterBar>

      <DataTable
        value={rows}
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
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.collection_point") })}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        <Column
          header="Collection Type"
          style={{ minWidth: 160 }}
          sortable={SORTABLE_FIELDS.has("collection_type")}
          field="collection_type"
          body={(row: CollectionPointRecord) => {
            const type = row.collection_type;
            const isBin = !type || type === "bin_collection";
            return (
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${isBin ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                {COLLECTION_TYPE_LABELS[type ?? "bin_collection"]}
              </span>
            );
          }}
        />
        {showCol("cp_name") && (
          <Column
            field="cp_name"
            header={t("admin.nav.collection_point")}
            sortable={SORTABLE_FIELDS.has("cp_name")}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.cp_name ?? row.collection_point_name))}
          />
        )}
        {showCol("state_name") && (
          <Column
            field="state_name"
            header={t("common.state")}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.state_name))}
          />
        )}
        {showCol("district_name") && (
          <Column
            field="district_name"
            header={t("common.district")}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.district_name))}
          />
        )}
        {showCol("city_name") && (
          <Column
            field="city_name"
            header={t("common.city")}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.city_name))}
          />
        )}
        {showCol("panchayat_name") && (
          <Column
            field="panchayat_name"
            header={t("admin.nav.panchayat")}
            body={(row: CollectionPointRecord) => toDisplay(row.panchayat_name)}
          />
        )}
        {showCol("ward_name") && (
          <Column
            field="ward_name"
            header={t("admin.nav.ward")}
            body={(row: CollectionPointRecord) => {
              const wards = row.wards as { unique_id: string; ward_name: string }[] | undefined;
              if (wards && wards.length > 0) {
                return (
                  <div className="flex flex-wrap gap-1">
                    {wards.map((w) => (
                      <span
                        key={w.unique_id}
                        className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        {cap(w.ward_name)}
                      </span>
                    ))}
                  </div>
                );
              }
              return <span>{toDisplay(row.ward_name)}</span>;
            }}
          />
        )}
        {showCol("latitude") && (
          <Column field="latitude" header="Latitude" body={(row: CollectionPointRecord) => toDisplay(row.latitude)} />
        )}
        {showCol("longitude") && (
          <Column field="longitude" header="Longitude" body={(row: CollectionPointRecord) => toDisplay(row.longitude)} />
        )}
        {showCol("is_active") && (
          <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />
        )}
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "150px", textAlign: "center" }} />
      </DataTable>
    </div>
  );
}
