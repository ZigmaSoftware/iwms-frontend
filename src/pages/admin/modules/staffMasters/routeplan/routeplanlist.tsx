/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { adminApi } from "@/helpers/admin/registry";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoutePlan = {
  unique_id: string;
  display_code?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  zone_name?: string | null;
  panchayat_name?: string | null;
  vehicle_no?: string | null;
  supervisor_name?: string | null;
  driver_name?: string | null;
  staff_template_name?: string | null;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  is_active?: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizeList = (payload: unknown): RoutePlan[] => {
  if (Array.isArray(payload)) return payload as RoutePlan[];
  if (payload && typeof payload === "object") {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as RoutePlan[];
    if (Array.isArray(p.data)) return p.data as RoutePlan[];
  }
  return [];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoutePlanList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encRoutePlans}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encStaffMasters}/${encRoutePlans}/${id}/edit`;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [list, setList] = useState<RoutePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    display_code: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    district_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_no: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    supervisor_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  /* ── load list ── */
  useEffect(() => {
    if (!companyUniqueId) { setList([]); return; }
    let mounted = true;
    setLoading(true);
    const params: Record<string, string> = { company_id: companyUniqueId };
    if (projectId) params.project_id = projectId;
    adminApi.routePlans.list({ params })
      .then((res) => {
        if (!mounted) return;
        const rows = normalizeList(res);
        const filtered = rows.filter((row) => {
          const rc = normalizeId(row.company_id ?? row.company_unique_id);
          const rp = normalizeId(row.project_id ?? row.project_unique_id);
          return (!companyUniqueId || rc === companyUniqueId) && (!projectId || rp === projectId);
        });
        setList(filtered);
      })
      .catch(() => { if (mounted) Swal.fire(t("common.error"), t("common.fetch_failed"), "error"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, t]);

  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters as DataTableFilterMeta);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, global: { ...prev.global, value } }));
    setGlobalFilterValue(value);
  };

  /* ── status toggle ── */
  const statusBodyTemplate = (row: RoutePlan) => {
    const updateStatus = async (checked: boolean) => {
      try {
        await adminApi.routePlans.update(row.unique_id, { is_active: checked });
        setList((prev) =>
          prev.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: checked } : item
          )
        );
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };
    return <Switch checked={!!row.is_active} onCheckedChange={updateStatus} />;
  };

  /* ── delete ── */
  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: "Are you sure you want to delete this route plan?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });
    if (!confirm.isConfirmed) return;
    try {
      await adminApi.routePlans.remove(id);
      setList((prev) => prev.filter((item) => item.unique_id !== id));
      Swal.fire(t("common.deleted_success"), t("common.record_removed"), "success");
    } catch {
      Swal.fire(t("common.error"), "Failed to delete route plan", "error");
    }
  };

  const actionTemplate = (row: RoutePlan) => (
    <div className="flex justify-center gap-3">
      <button
        title={t("common.edit")}
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: {
              companyUniqueId: row.company_unique_id ?? row.company_id,
              projectId: row.project_unique_id ?? row.project_id,
            },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
      <button
        title={t("common.delete")}
        onClick={() => handleDelete(row.unique_id)}
        className="text-red-600 hover:text-red-800"
      >
        <TrashBinIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: RoutePlan, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search") || "Search..."}
          className="p-inputtext-sm !border-0 !shadow-none !outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.route_plan.title") || "Route Plans"}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.route_plan.subtitle") || "Manage route plans"}
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
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
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
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <Button
            label={t("admin.route_plan.add") || "Add Route Plan"}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() =>
              navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
            }
          />
        </div>
      </div>

      <DataTable
        value={list}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading && list.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage="No route plans found. Select a company and project to load data."
        globalFilterFields={["display_code", "district_name", "city_name", "zone_name", "panchayat_name", "vehicle_no", "supervisor_name", "driver_name", "company_name", "project_name"]}
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "60px" }}
        />
        <Column
          field="display_code"
          header={t("common.code") || "Code"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="district_name"
          header={t("common.district") || "District"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="city_name"
          header={t("common.city") || "City"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="zone_name"
          header={t("common.zone") || "Zone"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat") || "Panchayat"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="vehicle_no"
          header={t("common.vehicle") || "Vehicle"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="supervisor_name"
          header={t("common.supervisor") || "Supervisor"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="is_active"
          header={t("common.status")}
          body={statusBodyTemplate}
          style={{ width: "120px" }}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "120px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
