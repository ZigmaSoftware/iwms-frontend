import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { adminApi } from "@/helpers/admin/registry";

import { DataTable } from "@/components/common/SafeDataTable";
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
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { collectionMonitoringApi } from "@/helpers/admin";

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
  company_unique_id?: string;
  company_name?: string;
  project_id?: string;
  project_unique_id?: string;
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

type CollectionMonitoringApiResponse =
  | CollectionMonitoringRecord[]
  | {
      collections?: CollectionMonitoringRecord[];
      results?: CollectionMonitoringRecord[];
    };

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  bin_name?: { value: string | null; matchMode: FilterMatchMode };
  wastetype_name?: { value: string | null; matchMode: FilterMatchMode };
  collection_point_name?: { value: string | null; matchMode: FilterMatchMode };
  trip_id?: { value: string | null; matchMode: FilterMatchMode };
  company_name?: { value: string | null; matchMode: FilterMatchMode };
  project_name?: { value: string | null; matchMode: FilterMatchMode };
  panchayat_name?: { value: string | null; matchMode: FilterMatchMode };
  ward_name?: { value: string | null; matchMode: FilterMatchMode };
};

export default function CollectionMonitoringListPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CollectionMonitoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  const { encWasteManagementMaster, encCollectionMonitoring } =
    getEncryptedRoute();

  const ENC_NEW_PATH = `/${encWasteManagementMaster}/${encCollectionMonitoring}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encWasteManagementMaster}/${encCollectionMonitoring}/${id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  //   bin_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    bin_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    wastetype_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    collection_point_name: {
      value: null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    trip_id: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    company_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    project_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  /* ---------------- FETCH DATA ---------------- */

  const fetchRows = useCallback(async () => {
    if (isSuperAdmin && companies.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = (await collectionMonitoringApi.list({
        params,
      })) as CollectionMonitoringApiResponse;

      console.log(res);

      let data: CollectionMonitoringRecord[] = [];

      if (Array.isArray(res)) {
        data = res;
      } else if (res && res.collections) {
        data = res.collections;
      } else if (res && res.results) {
        data = res.results;
      }

      const hasContextFields = data.some((row) => {
        const rowCompanyId = normalizeId(
          row.company_id || row.company_unique_id,
        );
        const rowProjectId = normalizeId(
          row.project_id || row.project_unique_id,
        );
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setRows(data);
        return;
      }

      const filtered = data.filter((row) => {
        const rowCompanyId = normalizeId(
          row.company_id || row.company_unique_id,
        );
        const rowProjectId = normalizeId(
          row.project_id || row.project_unique_id,
        );
        const companyMatches =
          !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setRows(filtered);
    } catch (error) {
      console.error("Failed to fetch collection monitoring data", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    companies.length,
    companyUniqueId,
    isSuperAdmin,
    collectionMonitoringApi,
    projectId,
  ]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  /* ---------------- FILTER ---------------- */

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        await collectionMonitoringApi.update(row.unique_id, { is_active: value });
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
        await collectionMonitoringApi.update(row.unique_id, { is_collected: value });
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

  const indexTemplate = (
    _: CollectionMonitoringRecord,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

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

        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", {
                item: t("admin.nav.company"),
              })}
            </option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", {
                item: t("admin.nav.project"),
              })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("common.add_item", {
              item: t("admin.nav.collection_monitoring"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
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
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="wastetype_name"
          header={t("common.waste_type")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.wastetype_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="collection_point_name"
          header={t("admin.nav.collection_point")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.collection_point_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="point_collection_weight"
          header="Weight (kg)"
          sortable
          body={(r: CollectionMonitoringRecord) =>
            toDisplay(r.point_collection_weight)
          }
        />

        <Column
          field="collection_date"
          header={t("common.date")}
          sortable
          style={{ minWidth: "115px" }}
        />

        <Column field="collection_time" header="Time" sortable />

        <Column
          field="trip_id"
          header="Trip ID"
          sortable
          body={(r: CollectionMonitoringRecord) => toDisplay(r.trip_id)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="company_name"
          header={t("admin.nav.company")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.company_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="project_name"
          header={t("admin.nav.project")}
          sortable
          body={(r: CollectionMonitoringRecord) => cap(r.project_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          sortable
          body={(r: CollectionMonitoringRecord) => toDisplay(r.panchayat_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="ward_name"
          header={t("common.ward")}
          sortable
          body={(r: CollectionMonitoringRecord) => toDisplay(r.ward_name)}
          filter
          showFilterMatchModes={false}
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
