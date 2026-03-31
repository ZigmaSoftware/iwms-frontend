import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/helpers/admin/registry";
import { useTranslation } from "react-i18next";

type feedback = {
  unique_id: string;
  customer: string;
  customer_id?: string | number;
  customer_unique_id?: string;
  customer_name: string;
  contact_no: string;
  building_no: string;
  zone_name: string;
  city_name: string;
  street: string;
  area: string;
  pincode: string;
  latitude: string;
  longitude: string;
  id_proof_type: string;
  id_no: string;
  qr_code: string;
  is_active_customer: boolean;
  category: string;
  feedback_details: string;
  is_deleted: boolean;
  is_active: boolean;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  customer_id?: { value: string | null; matchMode: FilterMatchMode };
  customer_name?: { value: string | null; matchMode: FilterMatchMode };
  category?: { value: string | null; matchMode: FilterMatchMode };
  zone_name?: { value: string | null; matchMode: FilterMatchMode };
  city_name?: { value: string | null; matchMode: FilterMatchMode };
};

const feedbackApi = adminApi.feedbacks;

export default function FeedBackFormList() {
  const { t } = useTranslation();
  const [feedbacks, setFeedbacks] = useState<feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { encCitizenGrivence, encFeedback } = getEncryptedRoute();

  const ENC_NEW_PATH = `/${encCitizenGrivence}/${encFeedback}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encCitizenGrivence}/${encFeedback}/${id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  //   customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  // });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    category: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });


  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await feedbackApi.list();
      setFeedbacks(data);
    } catch (error) {
      console.error("Failed to fetch feedbacks", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("admin.citizen_grievance.feedback.confirm_title"),
      text: t("admin.citizen_grievance.feedback.confirm_message"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t("admin.citizen_grievance.feedback.confirm_button"),
    });

    if (!confirm.isConfirmed) return;

    try {
      await feedbackApi.remove(id);
      Swal.fire({
        icon: "success",
        title: t("admin.citizen_grievance.feedback.deleted"),
        timer: 1500,
        showConfirmButton: false,
      });
      fetchFeedbacks();
    } catch {
      Swal.fire({
        icon: "error",
        title: t("admin.citizen_grievance.feedback.delete_failed_title"),
        text: t("admin.citizen_grievance.feedback.delete_failed_message"),
      });
    }
  };

  const onGlobalFilterChange = (e: any) => {
    const updated = { ...filters };
    updated["global"].value = e.target.value;
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
          placeholder={t("admin.citizen_grievance.feedback.search_placeholder")}
          className="p-inputtext-sm !border-0 !shadow-none"
        />
      </div>
    </div>
  );

  /* -------------------- NEW STATUS TOGGLE -------------------- */
  const statusTemplate = (row: feedback) => {
    const updateStatus = async (value: boolean) => {
      try {
        await feedbackApi.update(row.unique_id, { is_active: value });
        fetchFeedbacks();
      } catch (error) {
        console.error("Failed to update status", error);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionTemplate = (row: feedback) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800"
        title="Edit"
      >
        <PencilIcon className="size-5" />
      </button>

      {/* <button
        onClick={() => handleDelete(row.unique_id)}
        className="inline-flex items-center justify-center text-red-600 hover:text-red-800"
        title="Delete"
      >
        <TrashBinIcon className="size-5" />
      </button> */}
    </div>
  );

  const indexTemplate = (_: feedback, { rowIndex }: any) => rowIndex + 1;

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  if (loading) return <div className="p-6">{t("admin.citizen_grievance.feedback.loading")}</div>;

  return (
    <div className="p-6">

        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              {t("admin.citizen_grievance.feedback.title")}
            </h1>
            <p className="text-gray-500 text-sm">
              {t("admin.citizen_grievance.feedback.subtitle")}
            </p>
          </div>

          <Button
            label={t("common.add_new")}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        {/* Table */}
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
            body={(row: feedback) =>
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
            body={(row: feedback) => cap(row.customer_name)}
            filter
            showFilterMatchModes={false}
          />

          <Column
            field="category"
            header={t("admin.citizen_grievance.feedback.columns.category")}
            sortable
            body={(row: feedback) => cap(row.category)}
          />

          <Column
            field="feedback_details"
            header={t("admin.citizen_grievance.feedback.columns.feedback_details")}
            sortable
            body={(row: feedback) => cap(row.feedback_details)}
            filter
            showFilterMatchModes={false}

          />

          <Column
            field="zone_name"
            header={t("common.zone")}
            sortable
            body={(row: feedback) => cap(row.zone_name)}
            filter
            showFilterMatchModes={false}
          />

          <Column
            field="city_name"
            header={t("common.city")}
            sortable
            body={(row: feedback) => cap(row.city_name)}
            filter
            showFilterMatchModes={false}

          />

          {/* Status column removed per request */}

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "150px" }}
          />
        </DataTable>
    
    </div>
  );
}
