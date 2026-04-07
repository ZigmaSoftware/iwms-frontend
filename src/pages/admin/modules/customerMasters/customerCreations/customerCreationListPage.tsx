import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "@/helpers/admin/registry";
import Swal from "sweetalert2";
import ReactDOM from "react-dom/client";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import QRCode from "react-qr-code";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

type Customer = {
  unique_id: string;
  customer_name: string;
  contact_no: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  ward_name: string;
  zone_name: string;
  city_name: string;
  district_name: string;
  state_name: string;
  country_name: string;
  property_name: string;
  sub_property_name: string;
  id_proof_type: string;
  id_no: string;
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
  customer_name?: { value: string | null; matchMode: FilterMatchMode };
  contact_no?: { value: string | null; matchMode: FilterMatchMode };
  ward_name?: { value: string | null; matchMode: FilterMatchMode };
  zone_name?: { value: string | null; matchMode: FilterMatchMode };
  city_name?: { value: string | null; matchMode: FilterMatchMode };
  state_name?: { value: string | null; matchMode: FilterMatchMode };
  company_name?: { value: string | null; matchMode: FilterMatchMode };
  project_name?: { value: string | null; matchMode: FilterMatchMode };
};

const customerApi = adminApi.customerCreations;

const toCustomerList = (value: unknown): Customer[] => {
  if (Array.isArray(value)) {
    return value as Customer[];
  }

  if (value && typeof value === "object") {
    const payload = value as { data?: unknown; results?: unknown };
    if (Array.isArray(payload.data)) {
      return payload.data as Customer[];
    }
    if (Array.isArray(payload.results)) {
      return payload.results as Customer[];
    }
  }

  return [];
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

export default function CustomerCreationList() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    contact_no: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    state_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    company_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    project_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encCustomerMaster, encCustomerCreation } = getEncryptedRoute();
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false });

  const ENC_NEW_PATH = `/${encCustomerMaster}/${encCustomerCreation}/new`;
  const ENC_EDIT_PATH = (unique_id: string) =>
    `/${encCustomerMaster}/${encCustomerCreation}/${unique_id}/edit`;

  const fetchCustomers = useCallback(async () => {
    if (isSuperAdmin && companies.length === 0) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    if (!companyUniqueId) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: Record<string, string> = { company_id: companyUniqueId };
      if (projectId) {
        params.project_id = projectId;
      }

      const res = await customerApi.list({ params });
      const rows = toCustomerList(res);

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        return Boolean(rowCompanyId || rowProjectId);
      });

      if (!hasContextFields) {
        setCustomers(rows);
        return;
      }

      const filtered = rows.filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;
        return companyMatches && projectMatches;
      });

      setCustomers(filtered);
    } catch (err) {
      console.error("Failed to fetch customers", err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [companyUniqueId, companies.length, isSuperAdmin, projectId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

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
          placeholder={t("admin.customer_creation.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  const buildCustomerQrPayload = (customer: Customer) => ({
    id: customer.unique_id,
    name: customer.customer_name,
    mobile: customer.contact_no,
    address: `${customer.building_no}, ${customer.street}, ${customer.area}, ${customer.pincode}`,
    ward: customer.ward_name,
    zone: customer.zone_name,
    city: customer.city_name,
    state: customer.state_name,
  });

  const openQrPopup = (payload: Record<string, unknown>) => {
    Swal.fire({
      title: t("admin.customer_creation.qr_title"),
      html: `<div id="customer-qr-holder" class="flex justify-center"></div>`,
      width: 350,
      didOpen: () => {
        const div = document.getElementById("customer-qr-holder");
        if (div) {
          const root = ReactDOM.createRoot(div);
          root.render(<QRCode value={JSON.stringify(payload)} size={200} />);
        }
      },
    });
  };

  const qrTemplate = (customer: Customer) => {
    const payload = buildCustomerQrPayload(customer);
    return (
      <button
        className="p-1 border rounded bg-white shadow-sm hover:bg-gray-50"
        onClick={() => openQrPopup(payload)}
      >
        <QRCode value={JSON.stringify(payload)} size={45} />
      </button>
    );
  };

  const statusTemplate = (row: Customer) => {
    const updateStatus = async (value: boolean) => {
      try {
        await customerApi.update(row.unique_id, { is_active: value });
        fetchCustomers();
      } catch (err) {
        console.error("Status update failed:", err);
      }
    };

    return <Switch checked={row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (customer: Customer) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(customer.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Customer, options: { rowIndex: number }) =>
    options.rowIndex + 1;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">
            {t("admin.customer_creation.title")}
          </h1>
          <p className="text-gray-500 text-sm">
            {t("admin.customer_creation.subtitle")}
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
            label={t("admin.customer_creation.add")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>
      </div>

      <DataTable
        value={customers}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "customer_name",
          "contact_no",
          "ward_name",
          "zone_name",
          "city_name",
          "company_name",
          "project_name",
        ]}
        header={header}
        emptyMessage={t("admin.customer_creation.empty_message")}
        stripedRows
        showGridlines
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />

        <Column
          field="customer_name"
          header={t("admin.customer_creation.customer")}
          body={(row: Customer) => cap(row.customer_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="contact_no"
          header={t("common.mobile")}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="ward_name"
          header={t("common.ward")}
          body={(row: Customer) => cap(row.ward_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="zone_name"
          header={t("common.zone")}
          body={(row: Customer) => cap(row.zone_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="city_name"
          header={t("common.city")}
          body={(row: Customer) => cap(row.city_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="state_name"
          header={t("common.state")}
          body={(row: Customer) => cap(row.state_name)}
          sortable
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("admin.customer_creation.qr_label")}
          body={qrTemplate}
          style={{ width: "100px" }}
        />

        <Column
          field="is_active"
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "120px" }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "140px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
