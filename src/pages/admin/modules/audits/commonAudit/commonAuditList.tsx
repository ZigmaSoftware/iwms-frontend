import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import {
  type CommonAuditJsonValue,
  type CommonAuditRecord,
  useCommonAuditsQuery,
} from "@/helpers/admin/directQueries";
import { normalizeList } from "@/utils/forms";

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
};

type ModuleFilterOption = {
  label: string;
  value: string;
};

const ALL_MODULES = "__all__";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const formatJson = (value?: CommonAuditJsonValue) => {
  if (value === undefined || value === null) {
    return "-";
  }

  return JSON.stringify(value, null, 2);
};

const JsonViewer = ({
  title,
  value,
}: {
  title: string;
  value?: CommonAuditJsonValue;
}) => (
  <div className="min-w-0">
    <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
    <pre className="max-h-[420px] overflow-auto rounded-md border bg-gray-50 p-3 text-xs leading-relaxed text-gray-800">
      {formatJson(value)}
    </pre>
  </div>
);

export default function CommonAuditList() {
  const { t } = useTranslation();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [moduleFilter, setModuleFilter] = useState(ALL_MODULES);
  const [selectedRecord, setSelectedRecord] = useState<CommonAuditRecord | null>(null);
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const auditsQuery = useCommonAuditsQuery();

  const records = useMemo(
    () => normalizeList<CommonAuditRecord>(auditsQuery.data ?? []),
    [auditsQuery.data]
  );

  const moduleOptions = useMemo<ModuleFilterOption[]>(() => {
    const modules = Array.from(
      new Set(
        records
          .map((record) => record.module_name)
          .filter((moduleName): moduleName is string => Boolean(moduleName))
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { label: t("common.all"), value: ALL_MODULES },
      ...modules.map((moduleName) => ({
        label: moduleName,
        value: moduleName,
      })),
    ];
  }, [records, t]);

  const filteredRecords = useMemo(() => {
    if (moduleFilter === ALL_MODULES) {
      return records;
    }

    return records.filter((record) => record.module_name === moduleFilter);
  }, [moduleFilter, records]);

  const loading = auditsQuery.isPending && records.length === 0;

  const onGlobalFilterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
  }, []);

  const openDetails = useCallback((record: CommonAuditRecord) => {
    setSelectedRecord(record);
  }, []);

  const closeDetails = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  const actionTemplate = useCallback(
    (row: CommonAuditRecord) => (
      <div className="flex justify-center">
        <button
          title={t("common.view")}
          onClick={() => openDetails(row)}
          className="text-blue-600 hover:text-blue-800"
        >
          {t("common.view")}
        </button>
      </div>
    ),
    [openDetails, t]
  );

  const methodTemplate = useCallback(
    (row: CommonAuditRecord) => row.method ?? "-",
    []
  );

  useEffect(() => {
    if (auditsQuery.isError) {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    }
  }, [auditsQuery.isError, t]);

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.common_audit.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.common_audit.list_subtitle")}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col justify-end gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-64">
          <Dropdown
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.value)}
            options={moduleOptions}
            optionLabel="label"
            optionValue="value"
            placeholder={t("admin.common_audit.module_filter")}
            className="w-full text-sm"
          />
        </div>

        <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.common_audit.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>

      <DataTable
        value={filteredRecords}
        dataKey="uuid"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "module_name",
          "endpoint_name",
          "method",
          "object_id",
          "createdBy",
        ]}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.common_audit.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />
        <Column
          field="module_name"
          header={t("admin.common_audit.module_name")}
          sortable
        />
        <Column
          field="endpoint_name"
          header={t("admin.common_audit.endpoint_name")}
          sortable
        />
        <Column
          field="method"
          header={t("admin.common_audit.method")}
          body={methodTemplate}
          sortable
        />
        <Column
          field="object_id"
          header={t("admin.common_audit.object_id")}
          body={(r: CommonAuditRecord) => r.object_id ?? "-"}
          sortable
        />
        <Column
          field="createdBy"
          header={t("admin.common_audit.created_by")}
          body={(r: CommonAuditRecord) => r.createdBy ?? "-"}
          sortable
        />
        <Column
          field="createdAt"
          header={t("admin.common_audit.created_at")}
          body={(r: CommonAuditRecord) => formatDateTime(r.createdAt)}
          sortable
        />
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: 120 }} />
      </DataTable>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.common_audit.detail_title")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <JsonViewer
              title={t("admin.common_audit.previous_data")}
              value={selectedRecord?.previous_data}
            />
            <JsonViewer
              title={t("admin.common_audit.new_data")}
              value={selectedRecord?.new_data}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
