import { useEffect, useState } from "react";
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

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";


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
};

const customerApi = adminApi.customerCreations;


export default function CustomerCreationList() {
  const { t } = useTranslation();
    const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const { encCustomerMaster, encCustomerCreation } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encCustomerMaster}/${encCustomerCreation}/new`;
  const ENC_EDIT_PATH = (unique_id: string) =>
    `/${encCustomerMaster}/${encCustomerCreation}/${unique_id}/edit`;

  const fetchCustomers = async () => {
     try {
      const res = await customerApi.list();
      setCustomers(res as Customer[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (unique_id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    await customerApi.remove(unique_id);

    Swal.fire({
      icon: "success",
      title: t("common.deleted_success"),
      timer: 1500,
      showConfirmButton: false,
    });

    fetchCustomers();
  };

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const onGlobalFilterChange = (e: any) => {
    const updated = { ...filters };
    updated.global.value = e.target.value;
    setFilters(updated);
    setGlobalFilterValue(e.target.value);
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

  const buildCustomerQrPayload = (c: Customer) => ({
    id: c.unique_id,
    name: c.customer_name,
    mobile: c.contact_no,
    address: `${c.building_no}, ${c.street}, ${c.area}, ${c.pincode}`,
    ward: c.ward_name,
    zone: c.zone_name,
    city: c.city_name,
    state: c.state_name,
  });

  const openQrPopup = (payload: any) => {
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

  const qrTemplate = (c: Customer) => {
    const payload = buildCustomerQrPayload(c);
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

  const actionTemplate = (c: Customer) => (
    <div className="flex gap-3 justify-center">
      
        <button
          title={t("common.edit")}
          onClick={() => navigate(ENC_EDIT_PATH(c.unique_id))}
          className="text-blue-600 hover:text-blue-800"
        >
          <PencilIcon className="size-5" />
        </button>
     {/* <button
        title="Delete"

          onClick={() => handleDelete(c.unique_id)}
          className="text-red-600 hover:text-red-800"
        >
          <TrashBinIcon className="size-5" />
        </button>*/}
      
    </div>
  );

  const indexTemplate = (_: Customer, options: any) => options.rowIndex + 1;

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

          
            <Button
              label={t("admin.customer_creation.add")}
              icon="pi pi-plus"
              className="p-button-success"
              onClick={() => navigate(ENC_NEW_PATH)}
            />
          
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
          />
          <Column field="contact_no" header={t("common.mobile")} sortable />
          <Column
            field="ward_name"
            header={t("common.ward")}
            body={(row: Customer) => cap(row.ward_name)}
            sortable
          />
          <Column
            field="zone_name"
            header={t("common.zone")}
            body={(row: Customer) => cap(row.zone_name)}
            sortable
          />
          <Column
            field="city_name"
            header={t("common.city")}
            body={(row: Customer) => cap(row.city_name)}
            sortable
          />
          <Column
            field="state_name"
            header={t("common.state")}
            body={(row: Customer) => cap(row.state_name)}
            sortable
          />

          <Column header={t("admin.customer_creation.qr_label")} body={qrTemplate} style={{ width: "100px" }} />

          
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
