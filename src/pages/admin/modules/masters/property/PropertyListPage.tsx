import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

import { propertiesApi } from "@/helpers/admin";

type Property = {
  unique_id: string;
  property_name: string;
  is_active: boolean;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function PropertyList() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    property_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const { encMasters, encProperties } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encMasters}/${encProperties}/new`;
  const ENC_EDIT_PATH = (unique_id: string) =>
    `/${encMasters}/${encProperties}/${unique_id}/edit`;

  const fetchProperties = async () => {
    if (isSuperAdmin && companies.length === 0) {
      setProperties([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setProperties([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await propertiesApi.list({ params });
      const rows = Array.isArray(res) ? res : [];

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setProperties(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setProperties(filtered);
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as any);
  };

  const handleDelete = async (unique_id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.confirm_delete_button"),
    });

    if (!confirm.isConfirmed) return;

    await propertiesApi.remove(unique_id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchProperties();
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };
    _filters.global.value = value;
    setFilters(_filters);
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
            item: t("admin.nav.property"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";


  const statusTemplate = (row: Property) => {
    const updateStatus = async (value: boolean) => {
      try {
        await propertiesApi.update(row.unique_id, {
          property_name: row.property_name,
          is_active: value,
        });
        fetchProperties();
      } catch (err) {
        console.error("Status update failed:", err);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: Property) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
{/* 
      <button
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: Property, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  return (
    <div className="p-3">
    
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.property")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", { item: t("admin.nav.property") })}
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
              label={t("common.add_item", { item: t("admin.nav.property") })}
              icon="pi pi-plus"
              className="p-button-success"
              disabled={!companyUniqueId || !projectId}
              onClick={() => navigate(ENC_NEW_PATH)}
            />
          </div>
        </div>

        <DataTable
          value={properties}
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
            item: t("admin.nav.property"),
          })}
          globalFilterFields={["property_name", "company_name", "project_name"]}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="property_name"
            header={t("common.item_name", { item: t("admin.nav.property") })}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: Property) => cap(row.property_name)}
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
