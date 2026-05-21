import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  useCustomerCreationsQuery,
  useUpdateCustomerCreationMutation,
  useUploadCustomerCreationsMutation,
} from "@/tanstack/admin";

type Customer = {
  unique_id: string;
  customer_name: string;
  contact_no: string;
  building_no: string;
  street: string;
  area: string;
  pincode: string;
  panchayat_name: string;
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
  qr_code?: string;
  apartment_name?: string;
  block_no?: string;
  flat_no?: string;
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
  panchayat_name?: { value: string | null; matchMode: FilterMatchMode };
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const CUSTOMER_CREATION_COLUMN_FIELDS: Record<string, string[]> = {
  customer_name: ["customer_name", "name"],
  contact_no: ["contact_no", "mobile"],
  apartment_name: ["apartment_name"],
  unit: ["block_no", "flat_no"],
  ward_name: ["ward_id", "ward_name"],
  zone_name: ["zone_id", "zone_name"],
  city_name: ["city_id", "city_name"],
  state_name: ["state_id", "state_name"],
  panchayat_name: ["panchayat_id", "panchayat_name"],
  qr_code: ["qr_code"],
  is_active: ["is_active"],
};

export default function CustomerCreationListPage() {
  const { t } = useTranslation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "customer-master",
    "customer-creation",
    CUSTOMER_CREATION_COLUMN_FIELDS,
  );
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    contact_no: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    state_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
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

  // TanStack Query hooks
  const customersQuery = useCustomerCreationsQuery();
  const updateMutation = useUpdateCustomerCreationMutation();
  const uploadMutation = useUploadCustomerCreationsMutation();

  const allCustomers = customersQuery.data ?? [];
  const customers = useMemo<Customer[]>(() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId) return [];

    return (allCustomers as Customer[])
      .filter((row) => {
        const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
        const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

        const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
        const projectMatches = !projectId || rowProjectId === projectId;

        return companyMatches && projectMatches;
      })
      .sort((a, b) =>
        String(a.customer_name ?? "").localeCompare(String(b.customer_name ?? ""))
      );
  }, [allCustomers, companies.length, companyUniqueId, isSuperAdmin, projectId]);

  const ENC_NEW_PATH = `/${encCustomerMaster}/${encCustomerCreation}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encCustomerMaster}/${encCustomerCreation}/${id}/edit`;

  // Handle query errors
  useEffect(() => {
    if (!customersQuery.isError) return;
    Swal.fire({
      icon: "error",
      title: t("common.error"),
      text: String((customersQuery.error as any)?.response?.data ?? customersQuery.error),
    });
  }, [customersQuery.error, customersQuery.isError, t]);

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

  // ✅ DOWNLOAD TEMPLATE
  const downloadTemplate = () => {
    const headers = [
      "customer_name",
      "contact_no",
      "id_proof_type",
      "id_no",
      "building_no",
      "street",
      "area",
      "pincode",
      "ward_name",
      "zone_name",
      "city_name",
      "district_name",
      "state_name",
      "country_name",
      "property_name",
      "sub_property_name",
      "apartment_name",
      "block_no",
      "flat_no",
      "panchayat_name",
    ];

    const exampleRow = [
      "John Doe",
      "9876543210",
      "Aadhaar",
      "1234-5678-9012",
      "12",
      "Main Street",
      "Anna Nagar",
      "600040",
      "Ward 10",
      "North Zone",
      "Chennai",
      "Chennai",
      "Tamil Nadu",
      "India",
      "Residential",
      "Apartment",
      "Sunrise Apt",
      "A",
      "101",
      "N/A",
    ];

    const csvContent = [headers, exampleRow]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "customer_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ✅ BULK UPLOAD
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formDataObj = new FormData();
    formDataObj.append("file", file);
    formDataObj.append("company_id", companyUniqueId || "");
    formDataObj.append("project_id", projectId || "");

    try {
      const result = await uploadMutation.mutateAsync(formDataObj);
      const success = Number(result?.success ?? 0);
      const errors = Number(result?.errors ?? 0);
      const hasUploadCounts = "success" in (result ?? {}) || "errors" in (result ?? {});

      Swal.fire({
        title: result?.message || "Upload Completed",
        html: hasUploadCounts
          ? `<b>Success:</b> ${success} <br/> <b>Errors:</b> ${errors}`
          : undefined,
        icon: "success",
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Upload failed", "error");
    }

    // Reset input so same file can be re-uploaded if needed
    event.target.value = "";
  };

  const header = (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3 px-3 py-2 ">
        <Button
            label={t("admin.customer_creation.add")}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH)}
          />          
          <Button
            label="Download Template"
            icon="pi pi-download"
            className="p-button-secondary"
            onClick={downloadTemplate}
          />

          
          <Button
            label="Upload CSV"
            icon="pi pi-upload"
            className="p-button-info"
            disabled={!companyUniqueId || !projectId || uploadMutation.isPending}
            onClick={() => document.getElementById("csvUpload")?.click()}
          />
      </div>
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("admin.customer_creation.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
        <input
          id="csvUpload"
          type="file"
          accept=".csv"
          hidden
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );

  const openQrPopup = (qrUrl: string) => {
    Swal.fire({
      title: t("admin.customer_creation.qr_title"),
      html: `<div class="flex justify-center">
              <img src="${qrUrl}" style="width:200px;height:200px;" />
            </div>`,
      width: 350,
    });
  };

  const qrTemplate = (customer: Customer) => {
    if (!customer.qr_code) {
      return <span className="text-gray-400 text-xs">No QR</span>;
    }

    return (
      <button
        className="p-1 border rounded bg-white shadow-sm hover:bg-gray-50"
        onClick={() => openQrPopup(customer.qr_code!)}
      >
        <img
          src={customer.qr_code}
          alt="QR"
          className="w-12 h-12 object-contain"
        />
      </button>
    );
  };

  const statusTemplate = (row: Customer) => {
    const updateStatus = async (value: boolean) => {
      try {
        const rawPayload = {
          ...row,
          is_active: value,
        };
        await updateMutation.mutateAsync({
          id: row.unique_id,
          payload: filterPayload(rawPayload, ["company_id", "project_id"]) as typeof rawPayload,
        });
      } catch (err) {
        console.error("Status update failed:", err);
        Swal.fire("Error", "Failed to update status", "error");
      }
    };

    return (
      <Switch
        checked={row.is_active}
        onCheckedChange={updateStatus}
        disabled={updateMutation.isPending}
      />
    );
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
    <div className="p-3 ">
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
              {t("common.select_item_placeholder", {
                item: t("admin.nav.company"),
              })}
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
              {t("common.select_item_placeholder", {
                item: t("admin.nav.project"),
              })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        value={customers}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={customersQuery.isPending && customers.length === 0}
        filters={filters}
        globalFilterFields={[
          "customer_name",
          "contact_no",
          "apartment_name",
          "block_no",
          "flat_no",
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
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "80px" }}
        />
        {showCol("customer_name") && (
          <Column
            field="customer_name"
            header={t("admin.customer_creation.customer")}
            sortable
          />
        )}
        {showCol("contact_no") && (
          <Column field="contact_no" header={t("common.mobile")} sortable />
        )}

        {showCol("apartment_name") && (
          <Column
            field="apartment_name"
            header="Apartment"
            body={(row: Customer) =>
              row.apartment_name && row.apartment_name.trim() !== ""
                ? cap(row.apartment_name)
                : "-"
            }
          />
        )}

        {showCol("unit") && (
          <Column
            header="Unit"
            body={(row: Customer) =>
              row.block_no && row.flat_no
                ? `${row.block_no}-${row.flat_no}`
                : "-"
            }
          />
        )}
        {showCol("ward_name") && (
          <Column field="ward_name" 
            header={t("common.ward")}
            body={(row: Customer) => row.ward_name || "-"}
            sortable />
        )}
        {showCol("zone_name") && (
          <Column field="zone_name"
            header={t("common.zone")}
            body={(row: Customer) => row.zone_name || "-"}
            sortable />
        )}
        {showCol("city_name") && (
          <Column field="city_name" header={t("common.city")} sortable />
        )}
        {showCol("state_name") && (
          <Column field="state_name" header={t("common.state")} sortable />
        )}
        {showCol("panchayat_name") && (
          <Column field="panchayat_name"
            header={t("admin.nav.panchayat")}
            body={(row: Customer) => row.panchayat_name || "-"}
            sortable />
        )}
        {showCol("qr_code") && (
          <Column
            header={t("admin.customer_creation.qr_label")}
            body={qrTemplate}
            style={{ width: "100px" }}
          />
        )}

        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            body={statusTemplate}
          />
        )}

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
