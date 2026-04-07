import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";
import { getEncryptedRoute } from "@/utils/routeCache";
import { PencilIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { panchayatApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type PanchayatRecord = {
  unique_id: string;
  panchayat_name: string;
  state_name?: string;
  district_name?: string;
  city_name?: string;
  company_id?: string;
  company_unique_id?: string;
  company_name?: string;
  project_id?: string;
  project_unique_id?: string;
  project_name?: string;
  is_active: boolean;
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function PanchayatListPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<PanchayatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    panchayat_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    state_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    district_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
    city_name: {
      value: null as string | null,
      matchMode: FilterMatchMode.STARTS_WITH,
    },
  });
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });
  const navigate = useNavigate();
  const { encMasters, encPanchayats } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encMasters}/${encPanchayats}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encMasters}/${encPanchayats}/${id}/edit`;

  const fetchData = useCallback(async () => {
    if (isSuperAdmin && companies.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const list = await panchayatApi.list({ params });
      const rows = Array.isArray(list) ? (list as PanchayatRecord[]) : [];

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;

        return companyMatches && projectMatches;
      });

      setData(filtered);
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { ...prev.global, value },
    }));
    setGlobalFilterValue(value);
  };

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", {
            item: t("admin.nav.panchayat"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const actionTemplate = (row: PanchayatRecord) => (
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

  const statusTemplate = (row: PanchayatRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await panchayatApi.update(row.unique_id, { is_active: value });
        fetchData();
      } catch (error) {
        console.error("Failed to update panchayat status", error);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        onCheckedChange={updateStatus}
      />
    );
  };

  const indexTemplate = (
    _: PanchayatRecord,
    { rowIndex }: { rowIndex: number }
  ) => rowIndex + 1;

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.panchayat")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.panchayat"),
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
            label={t("common.add_item", { item: t("admin.nav.panchayat") })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={data}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
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
        ]}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: PanchayatRecord) => cap(row.panchayat_name)}
        />
        <Column
          field="state_name"
          header={t("common.state")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: PanchayatRecord) => cap(row.state_name)}
        />
        <Column
          field="district_name"
          header={t("common.district")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: PanchayatRecord) => cap(row.district_name)}
        />
        <Column
          field="city_name"
          header={t("common.city")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: PanchayatRecord) => cap(row.city_name)}
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
