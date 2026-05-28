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

type WasteCollection = {
  unique_id: string;
  customer: string;
  customer_id?: string | number;
  customer_unique_id?: string;
  customer_name: string;
  contact_no: string;
  building_no: string;
  zone_name: string;
  city_name: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  id_proof_type: string;
  id_no: string;
  qr_code: string;
  is_active_customer: boolean;
  wet_waste: number;
  dry_waste: number;
  mixed_waste: number;
  total_quantity: number;
  collection_date: string;
  collection_time: string;
  is_deleted: boolean;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  customer_id?: { value: string | null; matchMode: FilterMatchMode };
  customer_name?: { value: string | null; matchMode: FilterMatchMode };
  zone_name?: { value: string | null; matchMode: FilterMatchMode };
  city_name?: { value: string | null; matchMode: FilterMatchMode };
  company_name?: { value: string | null; matchMode: FilterMatchMode };
  project_name?: { value: string | null; matchMode: FilterMatchMode };
};

const toWasteCollectionList = (value: unknown): WasteCollection[] => {
  if (Array.isArray(value)) {
    return value as WasteCollection[];
  }

  if (value && typeof value === "object") {
    const payload = value as { data?: unknown; results?: unknown };
    if (Array.isArray(payload.data)) {
      return payload.data as WasteCollection[];
    }
    if (Array.isArray(payload.results)) {
      return payload.results as WasteCollection[];
    }
  }

  return [];
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function WasteCollectedDataList() {
  const { t } = useTranslation();
  const [wasteCollectedDatas, setWasteCollectedDatas] = useState<WasteCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { encWasteManagementMaster, encWasteCollectedData } =
    getEncryptedRoute();
  const ENC_NEW_PATH = `/${encWasteManagementMaster}/${encWasteCollectedData}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encWasteManagementMaster}/${encWasteCollectedData}/${id}/edit`;

  const wasteApi = adminApi.wasteCollections;
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    company_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    project_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });
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

  const fetchWasteCollectedData = useCallback(async () => {
    if (isSuperAdmin && companies.length === 0) {
      setWasteCollectedDatas([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setWasteCollectedDatas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await wasteApi.list({ params });
      const rows = toWasteCollectionList(res);

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setWasteCollectedDatas(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setWasteCollectedDatas(filtered);
    } catch (error) {
      console.error("Failed to fetch waste collected data", error);
      setWasteCollectedDatas([]);
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId, wasteApi]);

  useEffect(() => {
    fetchWasteCollectedData();
  }, [fetchWasteCollectedData]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
    setGlobalFilterValue(value);
  };

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.waste_collected_data.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const statusTemplate = (row: WasteCollection) => {
    const updateStatus = async (value: boolean) => {
      try {
        await wasteApi.update(row.unique_id, { is_active: value });
        fetchWasteCollectedData();
      } catch (error) {
        console.error("Status update failed:", error);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: WasteCollection) => (
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

  const indexTemplate = (_: WasteCollection, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  if (loading) {
    return <div className="p-6">{t("admin.waste_collected_data.loading")}</div>;
  }

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.waste_collected_data.title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("admin.waste_collected_data.subtitle")}
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
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
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
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("admin.waste_collected_data.add_new")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={wasteCollectedDatas}
        paginator
        rows={10}
        filters={filters}
        globalFilterFields={[
          "customer_name",
          "zone_name",
          "city_name",
          "company_name",
          "project_name",
        ]}
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("admin.waste_collected_data.empty_message")}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

        <Column
          field="customer"
          header={t("admin.waste_collected_data.customer_id")}
          sortable
          body={(record: WasteCollection) =>
            record.customer ||
            (record.customer_unique_id ? String(record.customer_unique_id) : "") ||
            (record.customer_id ? String(record.customer_id) : "-")
          }
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="customer_name"
          header={t("admin.waste_collected_data.customer_name")}
          body={(record: WasteCollection) => cap(record.customer_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="dry_waste"
          header={t("admin.waste_collected_data.dry_waste")}
          sortable
        />
        <Column
          field="wet_waste"
          header={t("admin.waste_collected_data.wet_waste")}
          sortable
        />
        <Column
          field="total_quantity"
          header={t("admin.waste_collected_data.quantity")}
          sortable
        />
        <Column
          field="zone_name"
          header={t("common.zone")}
          body={(record: WasteCollection) => cap(record.zone_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="city_name"
          header={t("common.city")}
          body={(record: WasteCollection) => cap(record.city_name)}
          sortable
          filter
          showFilterMatchModes={false}
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
