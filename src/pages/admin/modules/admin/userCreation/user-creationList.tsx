import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ReactDOM from "react-dom/client";

import QRCode from "react-qr-code";
import { DataTable } from "primereact/datatable";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";
import { Switch } from "@/components/ui/switch";
import { customerCreationApi, userCreationApi } from "@/helpers/admin";

const normalizeList = (payload: any) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.data?.results ?? [];

export default function UserCreationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { encAdmins, encUserCreation } = getEncryptedRoute();

  const ENC_NEW = `/${encAdmins}/${encUserCreation}/new`;
  const ENC_EDIT = (unique_id: string) =>
    `/${encAdmins}/${encUserCreation}/${unique_id}/edit`;

  const [users, setUsers] = useState<any[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, any>>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  /* ---------------- FETCH ---------------- */
  const fetchUsers = async () => {
    try {
      const [usersRes, customersRes] = await Promise.all([
        userCreationApi.list(),
        customerCreationApi.list(),
      ]);

      setUsers(normalizeList(usersRes));
      console.log("Users:", normalizeList(usersRes));  

      const map: Record<string, any> = {};
      const customers = normalizeList(customersRes);

      customers.forEach((c: any) => {
        const key = c?.unique_id ?? c?.id;
        if (key) map[String(key)] = c;
      });

      setCustomerMap(map);
      console.log("Customer Map:", map);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ---------------- FILTERS ---------------- */
  const staffList = users.filter(
    (u) => u.user_type_name?.toLowerCase() === "staff"
  );

  const composeCustomerInfo = (row: any) => {
  const key =
    row?.customer_unique_id ||
    row?.customer_id ||
    row?.customer ||
    row?.unique_id;

  return key ? customerMap[String(key)] ?? null : null;
};

console.log(users);

  const customerList = users
    .filter((u) => u.user_type_name?.toLowerCase() === "customer")
    .map((u) => ({ ...u, customer: composeCustomerInfo(u) }));
  console.log(customerList);

  /* ---------------- QR ---------------- */
  const buildCustomerQrPayload = (c: any) =>
    c
      ? {
          id: c.unique_id,
          name: c.customer_name,
          mobile: c.contact_no,
          address: `${c.building_no}, ${c.street}, ${c.area}`,
        }
      : null;

  const openQRPopup = (data: any) => {
    Swal.fire({
      title: t("admin.user_creation.qr_title"),
      html: `<div id="qr-holder" class="flex justify-center"></div>`,
      width: 350,
      didOpen: () => {
        const div = document.getElementById("qr-holder");
        if (div) {
          const root = ReactDOM.createRoot(div);
          root.render(<QRCode value={JSON.stringify(data)} size={180} />);
        }
      },
    });
  };

  /* ---------------- ACTIONS ---------------- */
  const handleDelete = async (unique_id: string) => {
    const r = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("admin.user_creation.delete_confirm"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!r.isConfirmed) return;

    try {
      await userCreationApi.remove(unique_id);
      Swal.fire(t("common.deleted_success"), t("admin.user_creation.delete_success"), "success");
      fetchUsers();
    } catch (err) {
      Swal.fire(t("common.error"), t("admin.user_creation.delete_failed"), "error");
    }
  };

  /**
   *  ONLY FIX APPLIED HERE
   * Backend expects 1 / 0, not true / false
   */
  const handleStatusToggle = async (unique_id: string, value: boolean) => {
    try {
      await userCreationApi.update(unique_id, {
        is_active: value ? 1 : 0,
      });
      fetchUsers();
    } catch (err: any) {
      console.error("Status update error:", err?.response?.data || err);
      Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
    }
  };

  /* ---------------- SEARCH ---------------- */
  const cap = (t?: string) =>
    t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : "";

  const onSearch = (e: any) => {
    const val = e.target.value;
    setFilters({ global: { value: val, matchMode: FilterMatchMode.CONTAINS } });
    setGlobalFilter(val);
  };

  const searchBar = (
    <div className="flex justify-end p-2">
      <div className="flex items-center gap-2 px-3 py-1 border rounded bg-white">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilter}
          onChange={onSearch}
          placeholder={t("common.search_placeholder")}
          className="border-0 shadow-none"
        />
      </div>
    </div>
  );

  /* ================= RENDER ================= */
  return (
    <>
        <div className="p-3">
      <div className="flex justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">{t("admin.user_creation.title")}</h1>
          <p className="text-gray-500 text-sm">{t("admin.user_creation.subtitle")}</p>
        </div>

        <Button
          label={t("common.add_item", { item: t("admin.user_creation.user_label") })}
          icon="pi pi-plus"
          className="p-button-success"
          onClick={() => navigate(ENC_NEW)}
        />
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="flex gap-3 pb-2">
          <TabsTrigger value="staff" className="px-4 py-2 border rounded">
            {t("admin.roles.staff")}
          </TabsTrigger>
          <TabsTrigger value="customer" className="px-4 py-2 border rounded">
            {t("admin.roles.customer")}
          </TabsTrigger>
        </TabsList>

        {/* ================= STAFF ================= */}
        <TabsContent value="staff">
          <DataTable
            value={staffList}
            dataKey="unique_id"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            filters={filters}
            globalFilterFields={["staff_name", "staffusertype_name", "zone_name", "ward_name", "user_type_name"]}
            header={searchBar}
            stripedRows
            showGridlines
            className="p-datatable-sm mt-4"
          >
            <Column header={t("common.s_no")} body={(_, o) => o.rowIndex + 1} />
            <Column header={t("admin.nav.user_type")} body={(r) => cap(r.user_type_name)} />
            <Column
              header={t("admin.nav.staff_user_type")}
              body={(r) => cap(r.staffusertype_name)}
            />
            <Column header={t("admin.user_creation.staff_name")} body={(r) => cap(r.staff_name)} />
            <Column header={t("common.zone")} field="zone_name" />
            <Column header={t("common.ward")} field="ward_name" />
            <Column
              header={t("common.status")}
              body={(r) => (
                <Switch
                  checked={!!r.is_active}
                  onCheckedChange={(v) =>
                    handleStatusToggle(r.unique_id, v)
                  }
                />
              )}
            />
            <Column
              header={t("common.actions")}
              body={(r) => (
                <div className="flex gap-3">
                  <PencilIcon onClick={() => navigate(ENC_EDIT(r.unique_id))} />
                </div>
              )}
            />
          </DataTable>
        </TabsContent>

        {/* ================= CUSTOMER ================= */}
        <TabsContent value="customer">
          <DataTable
            value={customerList}
            dataKey="unique_id"
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            filters={filters}
            globalFilterFields={[
              "customer.customer_name",
              "customer.contact_no",
              "customer.ward_name",
              "customer.zone_name",
              "customer.city_name",
              "customer.state_name",
            ]}
            header={searchBar}
            stripedRows
            showGridlines
            className="p-datatable-sm mt-4"
          >
            <Column header={t("common.s_no")} body={(_, o) => o.rowIndex + 1} />
            <Column header={t("admin.nav.user_type")} body={(r) => cap(r.user_type_name)} />
            <Column header={t("admin.user_creation.customer_name")} body={(r) => cap(r.customer?.customer_name)} />
            <Column header={t("common.mobile")} body={(r) => r.customer?.contact_no} />
            <Column header={t("common.ward")} body={(r) => cap(r.customer?.ward_name)} />
            <Column header={t("common.zone")} body={(r) => cap(r.customer?.zone_name)} />
            <Column header={t("common.city")} body={(r) => cap(r.customer?.city_name)} />
            <Column header={t("common.state")} body={(r) => cap(r.customer?.state_name)} />
            <Column
              header={t("admin.user_creation.qr_label")}
              body={(r) => {
                const payload = buildCustomerQrPayload(r.customer);
                return payload ? (
                  <button
                    className="p-1 border rounded"
                    onClick={() => openQRPopup(payload)}
                  >
                    <QRCode value={JSON.stringify(payload)} size={48} />
                  </button>
                ) : (
                  t("common.not_available")
                );
              }}
            />
            <Column
              header={t("common.status")}
              body={(r) => (
                <Switch
                  checked={!!r.is_active}
                  onCheckedChange={(v) =>
                    handleStatusToggle(r.unique_id, v)
                  }
                />
              )}
            />
            <Column
              header={t("common.actions")}
              body={(r) => (
                <div className="flex gap-3">
                  <PencilIcon 
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => navigate(ENC_EDIT(r.unique_id))} />
                </div>
              )}
            />
          </DataTable>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
