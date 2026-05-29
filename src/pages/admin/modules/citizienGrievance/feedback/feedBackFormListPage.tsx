import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "sweetalert2";

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
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { customerCreationApi, feedbackApi } from "@/helpers/admin";

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  customer_id?: { value: string | null; matchMode: FilterMatchMode };
  customer_name?: { value: string | null; matchMode: FilterMatchMode };
  category?: { value: string | null; matchMode: FilterMatchMode };
  zone_name?: { value: string | null; matchMode: FilterMatchMode };
  city_name?: { value: string | null; matchMode: FilterMatchMode };
  company_name?: { value: string | null; matchMode: FilterMatchMode };
  project_name?: { value: string | null; matchMode: FilterMatchMode };
};

type ListRecord = {
  unique_id?: string | number;
  id?: string | number;
  is_active?: boolean;
  [key: string]: unknown;
};

type FeedbackRecord = ListRecord & {
  customer?: string | number;
  customer_unique_id?: string | number;
  customer_id?: string | number;
  customer_name?: string;
  category?: string;
  feedback_details?: string;
  zone_name?: string;
  city_name?: string;
  company_id?: string | number;
  company_unique_id?: string | number;
  project_id?: string | number;
  project_unique_id?: string | number;
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function FeedBackFormList() {
  const { t } = useTranslation();
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRecord[]>([]);
  const [customerRows, setCustomerRows] = useState<ListRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    category: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    company_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    project_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });
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
  const { encCitizenGrivence, encFeedback } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encCitizenGrivence}/${encFeedback}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encCitizenGrivence}/${encFeedback}/${id}/edit`;

  useEffect(() => {
    let mounted = true;

    const loadRecords = async () => {
      setIsLoading(true);
      try {
        const [feedbackData, customerData] = await Promise.all([
          feedbackApi.list(),
          customerCreationApi.list(),
        ]);
        if (mounted) {
          setFeedbackRows(feedbackData as FeedbackRecord[]);
          setCustomerRows(customerData as ListRecord[]);
        }
      } catch (error) {
        if (mounted) {
          Swal.fire({
            icon: "error",
            title: t("common.error"),
            text: String((error as { response?: { data?: unknown } })?.response?.data ?? error),
          });
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadRecords();

    return () => {
      mounted = false;
    };
  }, [t]);

  const customerIdsForSelection = useMemo(() => {
    if (isSuperAdmin && companies.length === 0) return new Set<string>();
    if (!companyUniqueId) return new Set<string>();

    const ids = new Set<string>();
    customerRows.forEach((customer) => {
      const rowCompanyId = normalizeId(customer.company_id || customer.company_unique_id);
      const rowProjectId = normalizeId(customer.project_id || customer.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;

      if (!companyMatches || !projectMatches) return;

      [customer.unique_id, customer.id, customer.customer_id].forEach((value) => {
        const id = normalizeId(value);
        if (id) ids.add(id);
      });
    });

    return ids;
  }, [companies.length, companyUniqueId, customerRows, isSuperAdmin, projectId]);

  const feedbacks = useMemo<FeedbackRecord[]>(() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId) return [];

    return feedbackRows.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const hasContextFields = Boolean(rowCompanyId || rowProjectId);

      if (hasContextFields) {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      }

      const feedbackCustomerId = normalizeId(
        row.customer || row.customer_unique_id || row.customer_id
      );
      return Boolean(feedbackCustomerId && customerIdsForSelection.has(feedbackCustomerId));
    });
  }, [
    companies.length,
    companyUniqueId,
    customerIdsForSelection,
    feedbackRows,
    isSuperAdmin,
    projectId,
  ]);

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
          placeholder={t("admin.citizen_grievance.feedback.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const actionTemplate = (row: FeedbackRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(String(row.unique_id)))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: FeedbackRecord, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const loading = isLoading && feedbacks.length === 0;

  if (loading) {
    return <div className="p-6">{t("admin.citizen_grievance.feedback.loading")}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.citizen_grievance.feedback.title")}
          </h1>
          <p className="text-gray-500 text-sm">
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
            label={t("common.add_new")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={feedbacks}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "customer_name",
          "category",
          "city_name",
          "zone_name",
          "company_name",
          "project_name",
        ]}
        rowsPerPageOptions={[5, 10, 25, 50]}
        header={header}
        stripedRows
        showGridlines
        emptyMessage={t("admin.citizen_grievance.feedback.empty_message")}
        className="p-datatable-sm"
      >
        <Column
          header={t("admin.citizen_grievance.feedback.columns.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />

        <Column
          field="customer"
          header={t("admin.citizen_grievance.feedback.columns.customer_id")}
          sortable
          body={(row: FeedbackRecord) =>
            row.customer ||
            (row.customer_unique_id ? String(row.customer_unique_id) : "") ||
            (row.customer_id ? String(row.customer_id) : "-")
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="customer_name"
          header={t("admin.citizen_grievance.feedback.columns.customer_name")}
          sortable
          body={(row: FeedbackRecord) => cap(row.customer_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="category"
          header={t("admin.citizen_grievance.feedback.columns.category")}
          sortable
          body={(row: FeedbackRecord) => cap(row.category)}
        />

        <Column
          field="feedback_details"
          header={t("admin.citizen_grievance.feedback.columns.feedback_details")}
          sortable
          body={(row: FeedbackRecord) => cap(row.feedback_details)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="zone_name"
          header={t("common.zone")}
          sortable
          body={(row: FeedbackRecord) => cap(row.zone_name)}
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="city_name"
          header={t("common.city")}
          sortable
          body={(row: FeedbackRecord) => cap(row.city_name)}
          filter
          showFilterMatchModes={false}
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
