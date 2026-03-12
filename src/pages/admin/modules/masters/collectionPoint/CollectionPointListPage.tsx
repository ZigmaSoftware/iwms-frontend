import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { collectionPointApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";

type CollectionPointRecord = {
  unique_id: string;
  company_id?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  state_id?: string;
  state_name?: string;
  district_id?: string;
  district_name?: string;
  city_id?: string;
  city_name?: string;
  panchayat_id?: string | null;
  panchayat_name?: string | null;
  ward_id?: string | null;
  ward_name?: string | null;
  cp_name?: string;
  latitude?: string | null;
  longitude?: string | null;
  is_active: boolean;
};

const toRecordList = (value: unknown): CollectionPointRecord[] => {
  if (Array.isArray(value)) {
    return value as CollectionPointRecord[];
  }
  if (value && typeof value === "object") {
    const results = (value as { results?: unknown }).results;
    if (Array.isArray(results)) {
      return results as CollectionPointRecord[];
    }
  }
  return [];
};

const toDisplay = (value: unknown): string =>
  value === null || value === undefined || String(value).trim() === ""
    ? "-"
    : String(value);

export default function CollectionPointListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CollectionPointRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encMasters, encCollectionPoints } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encMasters}/${encCollectionPoints}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encMasters}/${encCollectionPoints}/${id}/edit`;

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await collectionPointApi.list();
      setRows(toRecordList(data));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
  };

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.collection_point"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const indexTemplate = (_: CollectionPointRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const actionTemplate = (row: CollectionPointRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
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
        await collectionPointApi.update(row.unique_id, { is_active: value });
        fetchRows();
      } catch (error) {
        console.error("Failed to update collection point status", error);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        onCheckedChange={updateStatus}
      />
    );
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.collection_point")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.collection_point"),
            })}
          </p>
        </div>
        <Button
          label={t("common.add_item", { item: t("admin.nav.collection_point") })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        globalFilterFields={[
          "unique_id",
          "cp_name",
          "company_id",
          "company_name",
          "project_id",
          "project_name",
          "state_id",
          "state_name",
          "district_id",
          "district_name",
          "city_id",
          "city_name",
          "panchayat_id",
          "panchayat_name",
          "ward_id",
          "ward_name",
        ]}
        emptyMessage={t("common.no_items_found", {
          item: t("admin.nav.collection_point"),
        })}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        {/* <Column
          field="unique_id"
          header="Unique ID"
          sortable
          body={(row: CollectionPointRecord) => toDisplay(row.unique_id)}
        /> */}
        <Column
          field="cp_name"
          header={t("admin.nav.collection_point")}
          sortable
          body={(row: CollectionPointRecord) => cap(row.cp_name)}
        />
        <Column
          field="company_name"
          header={t("admin.nav.company")}
          sortable
          body={(row: CollectionPointRecord) => cap(row.company_name)}
        />
        <Column
          field="project_name"
          header={t("admin.nav.project")}
          sortable
          body={(row: CollectionPointRecord) => cap(row.project_name)}
        />
        <Column
          field="state_name"
          header={t("common.state")}
          sortable
          body={(row: CollectionPointRecord) => cap(row.state_name)}
        />
        <Column
          field="district_name"
          header={t("common.district")}
          sortable
          body={(row: CollectionPointRecord) => cap(row.district_name)}
        />
        <Column
          field="city_name"
          header={t("common.city")}
          sortable
          body={(row: CollectionPointRecord) => cap(row.city_name)}
        />
        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          sortable
          body={(row: CollectionPointRecord) => toDisplay(row.panchayat_name)}
        />
        <Column
          field="ward_name"
          header={t("admin.nav.ward")}
          sortable
          body={(row: CollectionPointRecord) => toDisplay(row.ward_name)}
        />
        <Column
          field="latitude"
          header="Latitude"
          body={(row: CollectionPointRecord) => toDisplay(row.latitude)}
        />
        <Column
          field="longitude"
          header="Longitude"
          body={(row: CollectionPointRecord) => toDisplay(row.longitude)}
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
