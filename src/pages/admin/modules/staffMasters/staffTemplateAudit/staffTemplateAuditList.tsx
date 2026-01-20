import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { staffTemplateAuditLogApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";

type StaffTemplateAuditRecord = {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by?: string | null;
  performed_by_name?: string | null;
  performed_role?: string | null;
  change_remarks?: string | null;
  performed_at?: string | null;
};

const normalizeList = (payload: any): StaffTemplateAuditRecord[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function StaffTemplateAuditList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [records, setRecords] = useState<StaffTemplateAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<any>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const { encStaffMasters, encStaffTemplateAudit } = getEncryptedRoute();
  const ENC_VIEW_PATH = (id: string) =>
    `/${encStaffMasters}/${encStaffTemplateAudit}/${id}/edit`;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const payload: any = await staffTemplateAuditLogApi.list();
      setRecords(normalizeList(payload));
    } catch {
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
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

  const actionTemplate = (row: StaffTemplateAuditRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.view")}
        onClick={() => navigate(ENC_VIEW_PATH(String(row.id)))}
        className="text-blue-600 hover:text-blue-800"
      >
        {t("common.view")}
      </button>
    </div>
  );

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.staff_template_audit.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.staff_template_audit.list_subtitle")}
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("common.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>

      <DataTable
        value={records}
        dataKey="id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "entity_type",
          "entity_id",
          "action",
          "performed_by",
          "performed_by_name",
          "performed_role",
          "change_remarks",
        ]}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.staff_template_audit.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />
        <Column
          header={t("admin.staff_template_audit.entity_type")}
          field="entity_type"
          sortable
        />
        <Column
          header={t("admin.staff_template_audit.entity_id")}
          field="entity_id"
          sortable
        />
        <Column
          header={t("admin.staff_template_audit.action")}
          field="action"
          sortable
        />
        <Column
          header={t("admin.staff_template_audit.performed_by")}
          body={(r: StaffTemplateAuditRecord) => r.performed_by_name ?? r.performed_by ?? "-"}
        />
        <Column
          header={t("admin.staff_template_audit.performed_role")}
          body={(r: StaffTemplateAuditRecord) => r.performed_role ?? "-"}
        />
        <Column
          header={t("admin.staff_template_audit.change_remarks")}
          body={(r: StaffTemplateAuditRecord) => r.change_remarks ?? "-"}
        />
        <Column
          header={t("admin.staff_template_audit.performed_at")}
          body={(r: StaffTemplateAuditRecord) =>
            r.performed_at ? new Date(r.performed_at).toLocaleString() : "-"
          }
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>
    </div>
  );
}
