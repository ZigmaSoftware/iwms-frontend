import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FilterMatchMode } from "primereact/api";
import type { DataTableFilterMeta } from "primereact/datatable";

import { DataTable } from "@/components/common/SafeDataTable";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { filterRowsForExport } from "@/utils/adminListExport";

import type { LoginAuditRecord } from "./types";
import { SESSION_STATE_OPTIONS } from "./sessionState";
import { useLoginAudits } from "./useLoginAudits";
import { renderLoginAuditColumns } from "./loginAuditColumns";
import LoginAuditDetail from "./LoginAuditDetail";

const LOGIN_AUDIT_SEARCH_FIELDS = [
  "unique_id",
  "username",
  "ip_address",
  "user_agent",
  "reason",
  "logout_type_display",
  "company_name",
  "project_name",
];

export default function LoginAuditList() {
  const { t } = useTranslation();

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
  });

  const [selectedAudit, setSelectedAudit] = useState<LoginAuditRecord | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [sessionState, setSessionState] = useState("");
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    session_state: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const { rows, isLoading } = useLoginAudits({
    companyUniqueId,
    projectId,
    sessionState,
    isSuperAdmin,
  });

  const onGlobalFilterChange = (value: string) => {
    setGlobalFilterValue(value);
    setFilters((prev) => ({ ...prev, global: { value, matchMode: FilterMatchMode.CONTAINS } }));
  };

  const onSessionStateChange = (value: string) => {
    setSessionState(value);
    setFilters((prev) => ({
      ...prev,
      session_state: { value: value || null, matchMode: FilterMatchMode.EQUALS },
    }));
  };

  const columns = useMemo(() => renderLoginAuditColumns({ t, onView: setSelectedAudit }), [t]);

  const exportRows = useMemo(
    () => filterRowsForExport(rows, LOGIN_AUDIT_SEARCH_FIELDS, globalFilterValue),
    [rows, globalFilterValue],
  );

  const filterBar = (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("admin.login_audit.search", "Search login audits...")}
      >
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={(value) => onCompanyChange(value)}
          options={companies}
          placeholder={isSuperAdmin ? "All Companies" : t("common.select_item_placeholder", { item: t("admin.nav.company") })}
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FilterBarSelect
          value={projectId || ""}
          onChange={(value) => setProjectId(value)}
          options={projects}
          placeholder={showAllProjectsOption ? "All Projects" : t("common.select_item_placeholder", { item: t("admin.nav.project") })}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
        <FilterBarSelect
          value={sessionState}
          onChange={onSessionStateChange}
          options={SESSION_STATE_OPTIONS}
          placeholder="All Logout Types"
          aria-label="Logout type"
        />
      </FilterBar>
    </div>
  );

  // Excel button sits inside the header card, top-right beside the title.
  const renderHeaderWithActions = (actions: ReactNode) => (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{t("admin.nav.login_audit")}</h1>
          <p className="text-sm text-gray-500">{t("admin.login_audit.subtitle", "Login audit records")}</p>
        </div>
        <div className="shrink-0">{actions}</div>
      </div>
      {filterBar}
    </div>
  );

  return (
    <div className="min-h-full bg-gray-50/60 p-3 sm:p-5">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          value={rows}
          exportRows={exportRows}
          dataKey="unique_id"
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={isLoading && rows.length === 0}
          filters={filters}
          onFilter={(e) => setFilters(e.filters as DataTableFilterMeta)}
          renderHeaderWithActions={renderHeaderWithActions}
          stripedRows
          showGridlines
          emptyMessage={t("common.no_records")}
          globalFilterFields={LOGIN_AUDIT_SEARCH_FIELDS}
          tableStyle={{ tableLayout: "fixed", width: "100%" }}
          className="p-datatable-sm"
        >
          {columns}
        </DataTable>
      </div>

      <LoginAuditDetail audit={selectedAudit} onClose={() => setSelectedAudit(null)} />
    </div>
  );
}
