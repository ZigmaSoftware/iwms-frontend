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

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { adminApi } from "@/helpers/admin/registry";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackRecord = {
  unique_id: string;
  customer?: string;
  customer_id?: string | number;
  customer_unique_id?: string;
  customer_name?: string;
  category?: string;
  feedback_details?: string;
  zone_name?: string;
  city_name?: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const cap = (str?: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedBackFormList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encCitizenGrivence, encFeedback } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encCitizenGrivence}/${encFeedback}/new`;
  const ENC_EDIT_PATH = (id: string) => `/${encCitizenGrivence}/${encFeedback}/${id}/edit`;

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    category: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  /* ── load feedbacks ── */
  useEffect(() => {
    if (!companyUniqueId && !isSuperAdmin) { setFeedbackList([]); return; }
    let mounted = true;
    setIsLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    adminApi.feedbacks.list({ params })
      .then((res: any) => {
        if (!mounted) return;
        const rows: FeedbackRecord[] = Array.isArray(res) ? res : res?.results ?? [];

        // Only do client-side filtering if rows carry context fields
        const hasContextFields = rows.some((row) =>
          Boolean(normalizeId(row.company_id ?? row.company_unique_id) || normalizeId(row.project_id ?? row.project_unique_id))
        );

        if (!hasContextFields) {
          setFeedbackList(rows);
          return;
        }

        setFeedbackList(
          rows.filter((row) => {
            const rc = normalizeId(row.company_id ?? row.company_unique_id);
            const rp = normalizeId(row.project_id ?? row.project_unique_id);
            return (!companyUniqueId || rc === companyUniqueId) && (!projectId || rp === projectId);
          })
        );
      })
      .catch((err) => {
        if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: String(err) });
      })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, t]);

  const onFilter = (e: DataTableFilterEvent) => setFilters(e.filters as DataTableFilterMeta);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, global: { ...prev.global, value } }));
    setGlobalFilterValue(value);
  };

  const actionTemplate = (row: FeedbackRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        onClick={() =>
          navigate(ENC_EDIT_PATH(String(row.unique_id)), {
            state: { companyUniqueId, projectId },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: FeedbackRecord, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const renderHeader = () => (
    <div className="flex justify-end items-center">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.citizen_grievance.feedback.search_placeholder")}
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
            {t("admin.citizen_grievance.feedback.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.citizen_grievance.feedback.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <Button
            label={t("common.add_new")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={feedbackList}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading && feedbackList.length === 0}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        emptyMessage={t("admin.citizen_grievance.feedback.empty_message")}
        className="p-datatable-sm"
        globalFilterFields={["customer_name", "category", "feedback_details", "zone_name", "city_name"]}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "60px" }} />
        <Column
          field="customer_name"
          header={t("admin.citizen_grievance.feedback.columns.customer_name")}
          body={(row: FeedbackRecord) => cap(row.customer_name)}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="category"
          header={t("admin.citizen_grievance.feedback.columns.category")}
          body={(row: FeedbackRecord) => cap(row.category)}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="feedback_details"
          header={t("admin.citizen_grievance.feedback.columns.feedback_details")}
          body={(row: FeedbackRecord) => cap(row.feedback_details)}
          sortable
        />
        <Column
          field="zone_name"
          header={t("common.zone")}
          body={(row: FeedbackRecord) => cap(row.zone_name)}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="city_name"
          header={t("common.city")}
          body={(row: FeedbackRecord) => cap(row.city_name)}
          sortable filter showFilterMatchModes={false}
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
