import type { ErrorWithResponse, StateRecord } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { stateApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";


const STATE_COLUMN_FIELDS: Record<string, string[]> = {
  country_name: ["country_id"],
  name: ["name"],
  label: ["label"],
  is_active: ["is_active"],
};

const SORTABLE_FIELDS = new Set(["name"]);

const unwrapRows = (response: unknown): StateRecord[] => {
  if (Array.isArray(response)) return response as StateRecord[];
  const results = (response as { results?: unknown } | null)?.results;
  return Array.isArray(results) ? (results as StateRecord[]) : [];
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as ErrorWithResponse).response?.data;

  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
};

export default function StateList() {
  const { t } = useTranslation();

  const [states, setStates] = useState<StateRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "states",
    STATE_COLUMN_FIELDS,
  );

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);

  const {
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters();

  const navigate = useNavigate();

  const { encMasters, encStates } = getEncryptedRoute();

  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encMasters,
    encStates,
  );

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (
    page: number,
    limit: number,
    search: string,
    status: typeof statusValue,
    order?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setStates([]);
    try {
      const response = await stateApi.readAllwithPaginated(page, limit, {
        params: {
          ...(search ? { search } : {}),
          ...(status !== "all" ? { is_active: status === "active" } : {}),
          ...(order ? { ordering: order } : {}),
        },
      });
      if (requestId !== requestIdRef.current) return;

      const rows = unwrapRows(response);
      setStates(rows);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count?: number }).count!
          : rows.length,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.fetch_failed")),
        "error"
      );
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, statusValue, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, rowsPerPage, searchTerm, statusValue, ordering]);

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

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const response = await stateApi.readAllForExport({
        params: {
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(statusValue !== "all" ? { is_active: statusValue === "active" } : {}),
        },
      });
      const rows = unwrapRows(response);
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No states to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "States");
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.fetch_failed")),
        "error"
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const updateStatus = async (row: StateRecord, checked: boolean) => {
    const stateId = String(row.unique_id);
    setPendingStatusId(stateId);
    setIsUpdating(true);

    try {
      await stateApi.update(
        row.unique_id,
        filterPayload({ is_active: checked }) as {
          is_active: boolean;
        }
      );
      setStates((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id ? { ...item, is_active: checked } : item
        )
      );
    } catch {
      Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
    } finally {
      setPendingStatusId(null);
      setIsUpdating(false);
    }
  };

  const statusTemplate = (row: StateRecord) => {
    const stateId = String(row.unique_id);
    return (
      <Switch
        checked={row.is_active}
        disabled={isUpdating && pendingStatusId === stateId}
        onCheckedChange={(checked) => void updateStatus(row, checked)}
      />
    );
  };

  const actionTemplate = (row: StateRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: StateRecord, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  return (
    <div className="p-3">

      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.state")}
          </h1>

          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", {
              item: t("admin.nav.state"),
            })}
          </p>
        </div>

        <Button
          label={t("common.add_item", { item: t("admin.nav.state") })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW_PATH)}
        />

      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.state") })}
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
      />

      <DataTable
        value={states}
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
      >

        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "70px" }}
        />

        {showCol("country_name") && (
          <Column
            field="country_name"
            header={t("admin.nav.country")}
            body={(r) => cap(r.country_name)}
          />
        )}

        {showCol("name") && (
          <Column
            field="name"
            header={t("admin.nav.state")}
            body={(r) => cap(r.name)}
            sortable={SORTABLE_FIELDS.has("name")}
          />
        )}

        {showCol("label") && (
          <Column
            field="label"
            header={t("common.label")}
            body={(r) => r.label.toUpperCase()}
          />
        )}

        {showCol("is_active") && (
          <Column
            header={t("common.status")}
            body={statusTemplate}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionTemplate}
        />

      </DataTable>

    </div>
  );
}
