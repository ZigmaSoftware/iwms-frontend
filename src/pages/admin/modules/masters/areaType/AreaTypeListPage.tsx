import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { Dropdown } from "primereact/dropdown";
import { Switch } from "@/components/ui/switch";
import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { areaTypeApi, projectApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type AreaTypeRecord = {
  unique_id: string;
  name: string;
  is_active: boolean;
};

type ProjectOption = {
  label: string;
  value: string;
};

export default function AreaTypeListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [records, setRecords] = useState<AreaTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectUniqueId, setProjectUniqueId] = useState<string>("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [filters, setFilters] = useState({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const {
    companyUniqueId,
    companies,
    onCompanyChange,
    isSuperAdmin,
  } = useCompanyProjectSelection({ isEdit: false });
  const { encMasters, encAreaTypes } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encMasters}/${encAreaTypes}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encAreaTypes}/${id}/edit`;

  /* ── Fetch projects ─────────────────────────────────────── */
  useEffect(() => {
    if (!companyUniqueId) {
      setProjects([]);
      setProjectUniqueId("");
      return;
    }

    const loadProjects = async () => {
      setProjectsLoading(true);
      try {
        const res = await projectApi.list({ params: { company_id: companyUniqueId } });
        const data = res as any[];
        const filtered = data.filter(
          (p: any) =>
            String(p.company_id ?? p.company_unique_id ?? "") === companyUniqueId
        );
        setProjects(
          filtered.map((p: any) => ({
            label: p.name ?? p.project_name,
            value: p.unique_id,
          }))
        );
        setProjectUniqueId("");
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };

    loadProjects();
  }, [companyUniqueId]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectUniqueId) params.project_id = projectUniqueId;

      const list = await areaTypeApi.list({ params });
      setRecords(list);
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, projectUniqueId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as any);
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
            item: t("admin.nav.area_type"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const statusTemplate = (row: AreaTypeRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await areaTypeApi.update(row.unique_id, {
          name: row.name,
          is_active: value,
        });
        fetchRecords();
      } catch (error) {
        console.error("Failed to update area type status", error);
      }
    };
    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: AreaTypeRecord) => (
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

  const indexTemplate = (
    _: AreaTypeRecord,
    { rowIndex }: { rowIndex: number }
  ) => rowIndex + 1;

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.nav.area_type")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", {
              item: t("admin.nav.area_type"),
            })}
          </p>
        </div>

        <div className="flex gap-3 items-center flex-wrap justify-end">
          {isSuperAdmin ? (
            <select
              value={companyUniqueId || ""}
              onChange={(e) => onCompanyChange(e.target.value === "ALL" ? "" : e.target.value)}
              className="border rounded px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="ALL">N/A</option>
              {companies.map((c: any) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 border rounded px-3 py-2 text-sm bg-gray-50 min-w-[180px]">
              <span className="text-gray-700 font-medium">
                {companies.find((c: any) => c.value === companyUniqueId)?.label ?? t("admin.nav.company")}
              </span>
            </div>
          )}

          {companyUniqueId && (
            <Dropdown
              value={projectUniqueId || null}
              options={projects}
              onChange={(e) => setProjectUniqueId(e.value ?? "")}
              placeholder={t("admin.nav.project")}
              disabled={projectsLoading}
              className="text-sm min-w-[180px]"
            />
          )}

          <Button
            label={t("common.add_item", { item: t("admin.nav.area_type") })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={records}
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
          item: t("admin.nav.area_type"),
        })}
        globalFilterFields={["name"]}
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        <Column
          field="name"
          header={t("common.item_name", { item: t("admin.nav.area_type") })}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row) => cap(row.name)}
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
