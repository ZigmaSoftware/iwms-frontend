import type { CollectionPointRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { useScreenAccess } from "@/contexts/screenPermission";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { collectionPointApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { StackCell } from "@/components/common/TableCells";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import {
  combineFilters,
  useOptionFilter,
  useStatusFilter,
} from "@/components/filters/useOptionFilter";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const toDisplay = (value: unknown): string =>
  value === null || value === undefined || String(value).trim() === ""
    ? "-"
    : String(value);

const toOptionalString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

const toRecordList = (value: unknown): CollectionPointRecord[] => {
  if (Array.isArray(value)) return value as CollectionPointRecord[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
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
  zone_name: ["zone_id", "zone_name"],
  ward_name: ["ward_id", "ward_name"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  is_active: ["is_active"],
};

export default function CollectionPointListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAdd, canEdit } = useScreenAccess();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [records, setRecords] = useState<CollectionPointRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const requestIdRef = useRef(0);
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
  const resetPage = () => setFirst(0);
  const companyProject = useCompanyProjectFilter(resetPage, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const companyUniqueId = companyProject.companyId;
  const projectId = companyProject.projectId;
  const { companies, isSuperAdmin } = companyProject.selection;

  const collectionTypeFilter = useOptionFilter({
    param: "collection_type",
    label: "Collection type",
    options: [
      { value: "bin_collection", label: "Secondary Collection Point" },
      { value: "bulk_waste_collection", label: "Bulk Waste Collection" },
    ],
    allLabel: "All Types",
    onAppliedChange: resetPage,
  });
  const statusFilter = useStatusFilter(resetPage);

  const { encScheduleSetup, encCollectionPoints } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encScheduleSetup, encCollectionPoints);

  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "collection-points",
    COLLECTION_POINT_COLUMN_FIELDS,
  );

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const loadRows = async (
    page: number,
    limit: number,
    search: string,
    order?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRecords([]);
    try {
      const response = await collectionPointApi.readAllwithPaginated(
        page,
        limit,
        {
          params: {
            company_id: companyUniqueId,
            project_id: projectId || undefined,
            ...collectionTypeFilter.applied,
            ...(search ? { search } : {}),
            ...(order ? { ordering: order } : {}),
          },
        },
      );
      if (requestId !== requestIdRef.current) return;
      setRecords(toRecordList(response));
      setTotalRecords(
        typeof response?.count === "number"
          ? response.count
          : toRecordList(response).length,
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
    collectionTypeFilter.value,
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
    if (isSuperAdmin && companies.length === 0)
      return [] as CollectionPointRecord[];
    if (!companyUniqueId && !isSuperAdmin) return [] as CollectionPointRecord[];

    return records.filter(statusFilter.matches);
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
        ...collectionTypeFilter.applied,
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(ordering ? { ordering } : {}),
      },
    });
    const exportRows = data as CollectionPointRecord[];
    return exportRows.filter(statusFilter.matches);
  };

  const indexTemplate = (
    _: CollectionPointRecord,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await collectionPointApi.delete(id, withDeleteReason(reason));
      setRecords((current) => current.filter((item) => item.unique_id !== id));
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

  const actionTemplate = (row: CollectionPointRecord) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(String(row.unique_id)), {
            state: { companyUniqueId, projectId },
          })
        }
        onDelete={() => void handleDelete(String(row.unique_id))}
      />
    </div>
  );

  const statusTemplate = (row: CollectionPointRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        setPendingStatusId(String(row.unique_id));
        setIsUpdating(true);
        await collectionPointApi.update(
          row.unique_id,
          filterPayload({ is_active: value }) as { is_active: boolean },
        );
        setRecords((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, is_active: value }
              : item,
          ),
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
        disabled={
          !canEdit || (isUpdating && pendingStatusId === String(row.unique_id))
        }
        onCheckedChange={updateStatus}
      />
    );
  };

  const cap = (str?: string | null) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            {t("admin.nav.collection_point")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.collection_point"),
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canAdd && (
            <Button
              label={t("common.add_item", {
                item: t("admin.nav.collection_point"),
              })}
              icon="pi pi-plus"
              className="p-button-success"
              onClick={() =>
                navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
              }
            />
          )}
        </div>
      </div>

      <DataTable
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("common.search_placeholder", {
              item: t("admin.nav.collection_point"),
            })}
          />
        }
        filterPanel={combineFilters(
          companyProject,
          collectionTypeFilter,
          statusFilter,
        )}
        loadExportRows={async () => getFilteredExportRows()}
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
        fitWidth
        className="p-datatable-sm"
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.collection_point"),
        })}
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "5%" }}
        />
        <Column
          field={showCol("cp_name") ? "cp_name" : "collection_type"}
          header={
            showCol("cp_name") ? t("admin.nav.collection_point") : "Collection Type"
          }
          sortable={SORTABLE_FIELDS.has(
            showCol("cp_name") ? "cp_name" : "collection_type",
          )}
          style={{ width: "28%" }}
          body={(row: CollectionPointRecord) => {
            const type = row.collection_type;
            const isBin = !type || type === "bin_collection";
            return (
              <StackCell
                primary={
                  showCol("cp_name") &&
                  cap(toOptionalString(row.cp_name ?? row.collection_point_name))
                }
                lines={[
                  <span
                    key="type"
                    className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${isBin ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                  >
                    {COLLECTION_TYPE_LABELS[type ?? "bin_collection"]}
                  </span>,
                ]}
              />
            );
          }}
        />
        {locationColumn<CollectionPointRecord>({
          header: t("common.location"),
          style: { width: "32%" },
          levels: [
            showCol("state_name") && {
              label: t("common.state"),
              value: (row) => cap(toOptionalString(row.state_name)),
            },
            showCol("district_name") && {
              label: t("common.district"),
              value: (row) => cap(toOptionalString(row.district_name)),
            },
            showCol("city_name") && {
              label: t("common.city"),
              value: (row) => cap(toOptionalString(row.city_name)),
            },
            showCol("panchayat_name") && {
              label: t("common.panchayat"),
              value: (row) => toOptionalString(row.panchayat_name),
            },
            showCol("zone_name") && {
              label: t("admin.nav.zone"),
              value: (row) => toOptionalString(row.zone_name),
            },
            showCol("ward_name") && {
              label: t("admin.nav.ward"),
              value: (row) => {
                const wards = row.wards as
                  | { unique_id: string; ward_name: string }[]
                  | undefined;
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
                return toOptionalString(row.ward_name);
              },
            },
          ],
        })}
        {(showCol("latitude") || showCol("longitude")) && (
          <Column
            field="latitude"
            header="Coordinates"
            style={{ width: "17%" }}
            body={(row: CollectionPointRecord) => (
              <StackCell
                lines={[
                  showCol("latitude") && {
                    label: "Lat",
                    value: toDisplay(row.latitude),
                  },
                  showCol("longitude") && {
                    label: "Long",
                    value: toDisplay(row.longitude),
                  },
                ]}
              />
            )}
          />
        )}
        {showCol("is_active") && (
          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "10%" }}
          />
        )}
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "8%", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
