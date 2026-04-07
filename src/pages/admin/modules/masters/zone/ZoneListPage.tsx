import { useCallback, useEffect, useState } from "react";
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
import { zoneApi, projectApi } from "@/helpers/admin";
import { Dropdown } from "primereact/dropdown";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

// ===========================
//   Types
// ===========================
type ZoneRecord = {
  unique_id: string;
  zone_name: string;
  city_name: string;
  district_name: string;
  state_name: string;
  is_active: boolean;
};

type ProjectOption = {
  label: string;
  value: string;
};

type ErrorWithResponse = {
  response?: {
    data?: unknown;
  };
};

const extractErrorMessage = (error: unknown) => {
  if (!error) return "Something went wrong while processing the request.";
  if (typeof error === "string") return error;

  const data = (error as ErrorWithResponse)?.response?.data;

  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) =>
        Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${String(v)}`
      )
      .join("\n");
  }

  if (error instanceof Error && error.message) return error.message;

  return "Something went wrong while processing the request.";
};

// ===========================
//   Component
// ===========================
export default function ZoneList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [zones, setZones] = useState<ZoneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectUniqueId, setProjectUniqueId] = useState<string>("");
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const {
    companyUniqueId,
    companies,
    onCompanyChange,
    isSuperAdmin,
  } = useCompanyProjectSelection({ isEdit: false });

  const { encMasters, encZones } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encMasters}/${encZones}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encZones}/${id}/edit`;

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

  // ===========================
  //   Load Data
  // ===========================
  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectUniqueId) params.project_id = projectUniqueId;

      const data = (await zoneApi.list({ params })) as ZoneRecord[];
      setZones(data);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: extractErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, projectUniqueId]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as any);
  };

  // ===========================
  //   Delete
  // ===========================
  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: t("common.confirm_delete_button"),
    });

    if (!confirm.isConfirmed) return;

    await zoneApi.remove(id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchZones();
  };

  // ===========================
  //   Search
  // ===========================
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      ...filters,
      global: { ...filters.global, value },
    });

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
            item: t("admin.nav.zone"),
          })}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  // ===========================
  //   Toggle Status
  // ===========================
  const statusTemplate = (row: ZoneRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        await zoneApi.update(row.unique_id, { is_active: value });
        fetchZones();
      } catch (error) {
        console.error("Status update failed:", error);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  // ===========================
  //   Actions
  // ===========================
  const actionTemplate = (row: ZoneRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: ZoneRecord, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  // ===========================
  //   UI
  // ===========================
  return (
    <div className="p-3">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.nav.zone")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("common.manage_item_records", { item: t("admin.nav.zone") })}
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
              label={t("common.add_item", { item: t("admin.nav.zone") })}
              icon="pi pi-plus"
              className="p-button-success"
              onClick={() => navigate(ENC_NEW_PATH)}
            />
          </div>
        </div>

        <DataTable
          value={zones}
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
            item: t("admin.nav.zone"),
          })}
          globalFilterFields={[
            "zone_name",
            "city_name",
            "district_name",
            "state_name",
          ]}
          className="p-datatable-sm"
        >
          <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

          <Column
            field="city_name"
            header={t("admin.nav.city")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row) => cap(row.city_name)}
          />

          <Column
            field="zone_name"
            header={t("admin.nav.zone")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row) => cap(row.zone_name)}
          />

          <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "150px", textAlign: "center" }}
          />
        </DataTable>
    </div>
  );
}
