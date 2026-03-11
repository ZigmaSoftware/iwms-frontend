import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/helpers/admin/registry";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

type CollectionMonitoringRecord = {
  unique_id: string;
  bin_id?: string;
  bin_name?: string;
  waste_type_id?: string;
  wastetype_name?: string;
  collection_point_id?: string;
  collection_point_name?: string;
  point_collection_weight?: string | number;
  collection_date: string;
  collection_time: string;
  trip_id?: string | null;
  company_id?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  panchayat_id?: string | null;
  panchayat_name?: string | null;
  ward_id?: string | null;
  ward_name?: string | null;
  is_collected: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  is_deleted: boolean;
  is_active: boolean;
};

export default function CollectionMonitoringListPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CollectionMonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { encWasteManagementMaster, encCollectionMonitoring } =
    getEncryptedRoute();

  const ENC_NEW_PATH = `/${encWasteManagementMaster}/${encCollectionMonitoring}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encWasteManagementMaster}/${encCollectionMonitoring}/${id}/edit`;

  const wasteApi = adminApi.wasteCollections;

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    bin_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  /* ---------------- FETCH DATA ---------------- */

  const fetchRows = async () => {
  try {
    const res: any = await wasteApi.list();

    let data: CollectionMonitoringRecord[] = [];

    if (Array.isArray(res)) {
      data = res;
    } else if (res && res.collections) {
      data = res.collections;
    } else if (res && res.results) {
      data = res.results;
    }

    setRows(data);
  } catch (error) {
    console.error("Failed to fetch collection monitoring data", error);
    setRows([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRows();
  }, []);

  /* ---------------- FILTER ---------------- */

  const onGlobalFilterChange = (e: any) => {
    const updated = { ...filters };
    updated.global.value = e.target.value;
    setFilters(updated);
    setGlobalFilterValue(e.target.value);
  };

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.collection_monitoring"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  /* ---------------- HELPERS ---------------- */

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const toDisplay = (value?: unknown) =>
    value === null || value === undefined || String(value).trim() === ""
      ? "-"
      : String(value);

  /* ---------------- STATUS SWITCH ---------------- */

  const statusTemplate = (row: CollectionMonitoringRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await wasteApi.update(row.unique_id, { is_active: value });
        fetchRows();
      } catch (error) {
        console.error("Status update failed:", error);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const collectedTemplate = (row: CollectionMonitoringRecord) => {
    const updateCollected = async (value: boolean) => {
      try {
        await wasteApi.update(row.unique_id, { is_collected: value });
        fetchRows();
      } catch (error) {
        console.error("Collected status update failed:", error);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_collected)}
        onCheckedChange={updateCollected}
      />
    );
  };

  /* ---------------- ACTION ---------------- */

  const actionTemplate = (row: CollectionMonitoringRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: CollectionMonitoringRecord, { rowIndex }: any) =>
    rowIndex + 1;

  if (loading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  return (
    <div className="p-3">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.collection_monitoring")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", {
              item: t("admin.nav.collection_monitoring"),
            })}
          </p>
        </div>

        <Button
          label={t("common.add_item", {
            item: t("admin.nav.collection_monitoring"),
          })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      {/* DATATABLE */}

      <DataTable
        value={rows}
        paginator
        rows={10}
        filters={filters}
        globalFilterFields={[
          "unique_id",
          "bin_name",
          "wastetype_name",
          "collection_point_name",
          "trip_id",
          "company_name",
          "project_name",
          "panchayat_name",
          "ward_name",
        ]}
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.collection_monitoring"),
        })}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        <Column
          field="bin_name"
          header={t("common.item_name", { item: t("admin.nav.bin_master") })}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.bin_name)}
        />

        <Column
          field="wastetype_name"
          header={t("common.waste_type")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.wastetype_name)}
        />

        <Column
          field="collection_point_name"
          header={t("admin.nav.collection_point")}
          sortable
          body={(r: CollectionMonitoringRecord) =>
            cap(r.collection_point_name)
          }
        />

        <Column
          field="point_collection_weight"
          header="Weight (kg)"
          sortable
          body={(r: CollectionMonitoringRecord) =>
            toDisplay(r.point_collection_weight)
          }
        />

        <Column field="collection_date" header={t("common.date")} sortable style={{minWidth:"115px"}} />

        <Column field="collection_time" header="Time" sortable />

        <Column
          field="trip_id"
          header="Trip ID"
          sortable
          body={(r: CollectionMonitoringRecord) => toDisplay(r.trip_id)}
        />

        <Column
          field="company_name"
          header={t("admin.nav.company")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.company_name)}
        />

        <Column
          field="project_name"
          header={t("admin.nav.project")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.project_name)}
        />

        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          sortable
          body={(r: CollectionMonitoringRecord) => toDisplay(r.panchayat_name)}
        />

        <Column
          field="ward_name"
          header={t("common.ward")}
          sortable
          body={(r: CollectionMonitoringRecord) => toDisplay(r.ward_name)}
        />

        <Column
          field="is_collected"
          header={t("common.collected")}
          body={collectedTemplate}
          style={{ width: "150px" }}
        />

        <Column
          field="is_active"
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "150px" }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "150px" }}
        />
      </DataTable>
    </div>
  );
}
