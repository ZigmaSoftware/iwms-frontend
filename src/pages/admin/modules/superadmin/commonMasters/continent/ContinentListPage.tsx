import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";

import { DataTable } from "@/components/common/SafeDataTable";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { PencilIcon } from "@/icons";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import type { ContinentRecord } from "./types";


const { encMasters, encContinents } = getEncryptedRoute();

const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(

  encMasters,

  encContinents,

);

const CONTINENT_COLUMN_FIELDS: Record<string, string[]> = {
  name: ["name"],
  is_active: ["is_active"],
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } }).response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(", ");
  }

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) =>
        `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export default function ContinentList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [continents, setContinents] = useState<ContinentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "continents",
    CONTINENT_COLUMN_FIELDS,
  );

  const loadContinents = async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.continents.readAll();
      setContinents(Array.isArray(response) ? response : []);
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.fetch_failed")),
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContinents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getFilteredExportRows = (): ContinentRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return continents.filter((row) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(row.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return String(row.name ?? "").toLowerCase().includes(search);
    });
  };

  const handleDownloadExcel = () => {
    setIsExportingExcel(true);
    try {
      const rows = getFilteredExportRows();
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No continents to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "Continents");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const updateStatus = async (
    continent: ContinentRecord,
    checked: boolean
  ) => {
    const continentId = String(continent.unique_id);

    setPendingStatusId(continentId);

    try {
      await adminApi.continents.update(
        continent.unique_id,
        filterPayload({ is_active: checked })
      );
      setContinents((current) =>
        current.map((row) =>
          row.unique_id === continent.unique_id
            ? { ...row, is_active: checked }
            : row
        )
      );
    } catch (error) {
      Swal.fire(
        t("common.error"),
        extractErrorMessage(error, t("common.update_status_failed")),
        "error"
      );
    } finally {
      setPendingStatusId(null);
    }
  };

  const statusBodyTemplate = (row: ContinentRecord) => {
    const continentId = String(row.unique_id);

    return (
      <Switch
        checked={row.is_active}
        disabled={
          pendingStatusId === continentId
        }
        onCheckedChange={(checked) => {
          void updateStatus(row, checked);
        }}
      />
    );
  };

  const actionBodyTemplate = (row: ContinentRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(String(row.unique_id)))}
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (
    _: ContinentRecord,
    options: { rowIndex: number }
  ) => options.rowIndex + 1;

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {t("admin.nav.continent")}
          </h1>

          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.continent"),
            })}
          </p>
        </div>

        <Button
          label={t("common.add_item", { item: t("admin.nav.continent") })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.continent") })}
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
        value={continents}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && continents.length === 0}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={["name"]}
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        {showCol("name") && (
          <Column
            field="name"
            header={t("common.item_name", { item: t("admin.nav.continent") })}
            body={(record: ContinentRecord) => record.name}
            sortable
            filter
            showFilterMatchModes={false}
            style={{ minWidth: "200px" }}
          />
        )}

        {showCol("is_active") && (
          <Column
            header={t("common.status")}
            body={statusBodyTemplate}
            style={{ width: "150px", textAlign: "center" }}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionBodyTemplate}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
