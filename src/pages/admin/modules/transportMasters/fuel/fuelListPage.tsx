import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type Fuel = {
  unique_id: string;
  fuel_type: string;
  description: string;
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
  fuel_type?: { value: string | null; matchMode: FilterMatchMode };
};

const fuelApi = adminApi.fuels;

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizeFuels = (payload: any): Fuel[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.results ?? [];

export default function FuelList() {
  const { t } = useTranslation();
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  //   fuel_type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    fuel_type: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
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
  const { encTransportMaster, encFuel } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encTransportMaster}/${encFuel}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encTransportMaster}/${encFuel}/${id}/edit`;

  const resolveId = (value: Fuel) => value.unique_id;

  const fetchFuels = async () => {
    if (isSuperAdmin && companies.length === 0) {
      setFuels([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setFuels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await fuelApi.list({ params });
      const rows = normalizeFuels(res);

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setFuels(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setFuels(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuels();
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

  const handleDelete = async (id: string) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    if (!confirmDelete.isConfirmed) return;

      await fuelApi.remove(id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchFuels();
  };

  const onGlobalFilterChange = (e: any) => {
    const updated = { ...filters };
    updated["global"].value = e.target.value;
    setFilters(updated);
    setGlobalFilterValue(e.target.value);
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  /* -------------------- STATUS TOGGLE -------------------- */
  const statusTemplate = (row: Fuel) => {
    const updateStatus = async (value: boolean) => {
      try {
        await fuelApi.update(resolveId(row), {
          fuel_type: row.fuel_type,
          description: row.description,
          is_active: value,
        });
        fetchFuels();
      } catch (err) {
        console.error("Failed to update status:", err);
      }
    };

    return (
      <Switch checked={row.is_active} onCheckedChange={updateStatus} />
    );
  };

  /* --------------------- ACTION BUTTONS --------------------- */
  const actionTemplate = (row: Fuel) => (
    <div className="flex gap-2 justify-center">
      <button
        title={t("common.edit")}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        onClick={() => navigate(ENC_EDIT_PATH(resolveId(row)))}
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        title="Delete"
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
        onClick={() => handleDelete(resolveId(row))}
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: Fuel, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const header = (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.fuel.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">


        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.fuel.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("admin.fuel.subtitle")}
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
              label={t("admin.fuel.add")}
              icon="pi pi-plus"
              className="p-button-success"
              disabled={!companyUniqueId || !projectId}
              onClick={() => navigate(ENC_NEW_PATH)}
            />
          </div>
        </div>

        <DataTable
          value={fuels}
          dataKey="unique_id"
          paginator
          rows={10}
          loading={loading}
          filters={filters}
          rowsPerPageOptions={[5, 10, 25, 50]}
          globalFilterFields={["fuel_type", "company_name", "project_name"]}
          header={header}
          emptyMessage={t("admin.fuel.empty_message")}
          stripedRows
          showGridlines
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="fuel_type"
            header={t("admin.fuel.fuel_type")}
            sortable
            body={(row: Fuel) => cap(row.fuel_type)}
            style={{ minWidth: "200px" }}
            filter
            showFilterMatchModes={false}
          />

          {/* NEW — Toggle Status */}
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
