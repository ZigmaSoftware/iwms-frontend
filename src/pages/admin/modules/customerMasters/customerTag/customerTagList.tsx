import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ReactDOM from "react-dom/client";
import { useTranslation } from "react-i18next";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import QRCode from "react-qr-code";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";

type CustomerTagRecord = {
  unique_id: string;
  customer_id: string;
  customer_name?: string | null;
  tag_code: string;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

const normalizeList = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : payload?.results ?? [];

const buildLookup = (items: any[], key: string, label: string) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(item?.[label] ?? lookupKey);
    }
    return acc;
  }, {});

export default function CustomerTagList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const customerTagApi = adminApi.customerTags;
  const customerApi = adminApi.customerCreations;

  const [records, setRecords] = useState<CustomerTagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerLookup, setCustomerLookup] = useState<Record<string, string>>({});

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encCustomerMaster, encCustomerTag } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encCustomerMaster}/${encCustomerTag}/new`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [tagRes, customerRes] = await Promise.all([
        customerTagApi.list(),
        customerApi.list(),
      ]);

      setRecords(normalizeList(tagRes));
      setCustomerLookup(buildLookup(normalizeList(customerRes), "unique_id", "customer_name"));
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
  };

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : "-";

  const statusBodyTemplate = (row: CustomerTagRecord) => {
    const isActive = row.status === "ACTIVE";

    const updateStatus = async (checked: boolean) => {
      const nextStatus = checked ? "ACTIVE" : "INACTIVE";
      if (row.status === nextStatus) return;
      try {
        await customerTagApi.update(row.unique_id, { status: nextStatus });
        fetchRecords();
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return <Switch checked={isActive} onCheckedChange={updateStatus} />;
  };

  const buildQrPayload = (row: CustomerTagRecord) => ({
    unique_id: row.unique_id,
    customer_id: row.customer_id,
    customer_name: row.customer_name ?? customerLookup[row.customer_id] ?? null,
    tag_code: row.tag_code,
    status: row.status,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  });

  const openQRPopup = (row: CustomerTagRecord) => {
    const payload = buildQrPayload(row);
    Swal.fire({
      title: t("admin.user_creation.qr_title"),
      html: `<div id="qr-holder" class="flex justify-center"></div>`,
      width: 350,
      didOpen: () => {
        const div = document.getElementById("qr-holder");
        if (div) {
          const root = ReactDOM.createRoot(div);
          root.render(<QRCode value={JSON.stringify(payload)} size={180} />);
        }
      },
    });
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.customer_tag.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.customer_tag.list_subtitle")}
          </p>
        </div>

        <Button
          label={t("admin.customer_tag.create_button")}
          icon="pi pi-plus"
          className="p-button-success p-button-sm"
          onClick={() => navigate(ENC_NEW_PATH)}
        />
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.customer_tag.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-3">
      <DataTable
        value={records}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={["tag_code", "customer_id", "customer_name", "status"]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.customer_tag.empty_message")}
      >
        <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 70 }} />
        <Column field="tag_code" header={t("admin.customer_tag.tag_code")} />
        <Column
          header={t("admin.customer_tag.customer")}
          body={(row: CustomerTagRecord) =>
            row.customer_name || customerLookup[row.customer_id] || row.customer_id
          }
        />
        <Column header={t("admin.customer_tag.status")} body={statusBodyTemplate} style={{ width: 120 }} />
        <Column
          header={t("admin.customer_tag.issued_at")}
          body={(row: CustomerTagRecord) => formatDate(row.created_at)}
        />
        <Column
          header={t("admin.customer_tag.revoked_at")}
          body={(row: CustomerTagRecord) => formatDate(row.updated_at)}
        />
        <Column
          header={t("admin.user_creation.qr_label")}
          body={(row: CustomerTagRecord) => (
            <button
              className="p-1 border rounded"
              onClick={() => openQRPopup(row)}
              type="button"
            >
              <QRCode value={JSON.stringify(buildQrPayload(row))} size={48} />
            </button>
          )}
        />
      </DataTable>
    </div>
  );
}
