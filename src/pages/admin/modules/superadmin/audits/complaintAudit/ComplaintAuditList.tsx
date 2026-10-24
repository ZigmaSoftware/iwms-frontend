import type {
  ComplaintAuditDetail as DetailRecord,
  ComplaintAuditFilterOptions,
  ComplaintAuditRecord,
} from "./types";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import type { DataTablePageEvent } from "primereact/datatable";

import { complaintAuditApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { FormSelect } from "@/components/common/FormSelect";
import { FilterSection } from "@/components/common/ListToolbar";
import { useDateRangeFilter } from "@/components/filters/useDateRangeFilter";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import { combineFilters, useOptionFilter } from "@/components/filters/useOptionFilter";
import ComplaintAuditDetail from "./ComplaintAuditDetail";
import { formatDateTime, formatDuration, STATUS_COLORS } from "./format";

const toRecordList = (value: unknown): ComplaintAuditRecord[] => {
  if (Array.isArray(value)) return value as ComplaintAuditRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: ComplaintAuditRecord[] }).results;
  }
  return [];
};

const nameOf = (options: { label: string; value: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const StatTile = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-semibold text-gray-800">{value}</div>
  </div>
);

const HISTORY_OPTIONS = [
  { label: "Reopened", value: "reopened" },
  { label: "Escalated", value: "escalated" },
];

const DELETED_OPTIONS = [
  { label: "Exclude deleted", value: "exclude" },
  { label: "Deleted only", value: "only" },
];

const truncate = (value?: string | null, length = 60) =>
  !value ? "" : value.length > length ? `${value.slice(0, length)}…` : value;

export default function ComplaintAuditList() {
  const { t } = useTranslation();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOptions, setFilterOptions] = useState<ComplaintAuditFilterOptions | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<DetailRecord | null>(null);
  const [records, setRecords] = useState<ComplaintAuditRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  const loading = isLoading && records.length === 0;

  const toOptions = (items?: { unique_id: string; name: string }[]) =>
    (items ?? []).map((item) => ({ label: item.name, value: item.unique_id }));
  const companyOptions = useMemo(() => toOptions(filterOptions?.companies), [filterOptions]);
  const projectOptions = useMemo(() => toOptions(filterOptions?.projects), [filterOptions]);
  const statusOptions = useMemo(() => toOptions(filterOptions?.statuses), [filterOptions]);
  const categoryOptions = useMemo(() => toOptions(filterOptions?.categories), [filterOptions]);

  const resetPage = () => setFirst(0);

  // Company → Project, Status and Category, edited in the Filters panel as a
  // draft and sent once applied.
  const scope = useDraftFilter({
    empty: { company: "", project: "", status: "", category: "" },
    chips: {
      company: { label: "Company", format: (v) => nameOf(companyOptions, v), clears: ["project"] },
      project: { label: "Project", format: (v) => nameOf(projectOptions, v) },
      status: { label: "Status", format: (v) => nameOf(statusOptions, v) },
      category: { label: "Category", format: (v) => nameOf(categoryOptions, v) },
    },
    onAppliedChange: resetPage,
  });
  const {
    company: companyFilter,
    project: projectFilter,
    status: statusFilter,
    category: categoryFilter,
  } = scope.applied;
  const draft = scope.draft;

  const history = useOptionFilter({
    param: "history",
    label: "History",
    options: HISTORY_OPTIONS,
    allLabel: t("common.all"),
    onAppliedChange: resetPage,
  });
  const historyFilter = history.value;

  const deleted = useOptionFilter({
    param: "deleted",
    label: "Deleted",
    options: DELETED_OPTIONS,
    allLabel: "Include deleted",
    onAppliedChange: resetPage,
  });
  const deletedFilter = deleted.value;

  const raised = useDateRangeFilter({
    section: "Raised on",
    fromLabel: "Raised from",
    toLabel: "Raised to",
    fromParam: "date_from",
    toParam: "date_to",
    onAppliedChange: resetPage,
  });
  const dateFrom = raised.from;
  const dateTo = raised.to;

  const queryParams = useMemo(
    () => ({
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(companyFilter ? { company_id: companyFilter } : {}),
      ...(projectFilter ? { project_id: projectFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(historyFilter ? { [historyFilter]: "1" } : {}),
      ...(deletedFilter ? { deleted: deletedFilter } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }),
    [searchTerm, companyFilter, projectFilter, statusFilter, categoryFilter, historyFilter, deletedFilter, dateFrom, dateTo],
  );

  const loadRows = useCallback(
    async (page: number, limit: number, params: Record<string, string>) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const response = await complaintAuditApi.readAllwithPaginated(page, limit, { params });
        if (requestId !== requestIdRef.current) return;
        const rows = toRecordList(response);
        setRecords(rows);
        setTotalRecords(typeof response?.count === "number" ? response.count : rows.length);
      } catch {
        if (requestId !== requestIdRef.current) return;
        Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, queryParams);
  }, [first, rowsPerPage, queryParams, loadRows]);

  useEffect(() => {
    let mounted = true;
    const loadFilterOptions = async () => {
      try {
        const data = (await complaintAuditApi.read("filter-options", {
          params: draft.company ? { company_id: draft.company } : {},
        })) as unknown as ComplaintAuditFilterOptions;
        if (mounted && data) setFilterOptions(data);
      } catch {
        // Non-fatal: the list still works without dropdown options.
      }
    };
    void loadFilterOptions();
    return () => {
      mounted = false;
    };
  }, [draft.company]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const loadAllExportRows = async () => {
    const data = await complaintAuditApi.readAllForExport({ params: queryParams });
    return toRecordList(data).map((row) => ({
      "Ticket No": row.ticket_no,
      Title: row.title ?? "",
      Project: row.project_name ?? "",
      Category: [row.category_name, row.subcategory_name].filter(Boolean).join(" / "),
      Status: row.status_name ?? "",
      Deleted: row.is_deleted ? "Yes" : "No",
      "Delete Reason": row.delete_reason ?? "",
      "Raised On": formatDateTime(row.created),
      "Raised By": row.created_by_name ?? "",
      "Assigned To": row.assigned_staff_name ?? "",
      "First Resolved After": formatDuration(row.first_resolution_seconds),
      "Total Time Taken": formatDuration(row.total_resolution_seconds),
      "Open For": formatDuration(row.open_seconds),
      "Resolution Remarks": row.resolution_remarks ?? "",
      Reopens: row.reopen_count,
      "Last Reopen Reason": row.last_reopen_reason ?? "",
      Escalations: row.escalation_count,
      "Max Escalation Level": row.max_escalation_level ?? "",
      "Feedback Rating": row.feedback_rating ?? "",
    })) as unknown as Record<string, unknown>[];
  };

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const openDetail = useCallback(
    async (row: ComplaintAuditRecord) => {
      try {
        const detail = (await complaintAuditApi.read(row.unique_id)) as unknown as DetailRecord;
        setSelectedDetail(detail);
      } catch {
        Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      }
    },
    [t],
  );

  const resolvedOnPage = records.filter((r) => r.total_resolution_seconds != null);
  const averageResolution = resolvedOnPage.length
    ? Math.round(resolvedOnPage.reduce((s, r) => s + (r.total_resolution_seconds ?? 0), 0) / resolvedOnPage.length)
    : null;

  const scopeField = (
    <>
      <FilterSection label="Company & project">
        <div className="grid grid-cols-2 gap-2">
          <FormSelect
            label="Company"
            value={draft.company}
            onChange={(value) => scope.setDraft((d) => ({ ...d, company: value, project: "" }))}
            options={companyOptions}
            placeholder={t("common.all")}
          />
          <FormSelect
            label="Project"
            value={draft.project}
            onChange={(value) => scope.setField("project", value)}
            options={projectOptions}
            placeholder={t("common.all")}
          />
        </div>
      </FilterSection>
      <FilterSection label="Complaint">
        <div className="grid grid-cols-2 gap-2">
          <FormSelect
            label="Status"
            value={draft.status}
            onChange={(value) => scope.setField("status", value)}
            options={statusOptions}
            placeholder={t("common.all")}
          />
          <FormSelect
            label="Category"
            value={draft.category}
            onChange={(value) => scope.setField("category", value)}
            options={categoryOptions}
            placeholder={t("common.all")}
          />
        </div>
      </FilterSection>
    </>
  );

  return (
    <div className="p-3">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
              <i className="pi pi-comments" />
            </span>
            Complaint lifecycle
          </div>
          <h1 className="text-2xl font-semibold text-gray-800">Complaint Audit</h1>
          <p className="text-sm text-gray-500">
            When each complaint was raised, how it was resolved, why it was reopened, every escalation,
            and how long it took. Open a row for its full timeline.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Complaints" value={totalRecords.toLocaleString()} />
        <StatTile label="Reopened (this page)" value={records.filter((r) => r.reopen_count > 0).length} />
        <StatTile label="Escalated (this page)" value={records.filter((r) => r.escalation_count > 0).length} />
        <StatTile label="Avg. time to resolve (this page)" value={formatDuration(averageResolution)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
          header={
            <FilterBar
              searchValue={globalFilterValue}
              onSearchChange={setGlobalFilterValue}
              searchPlaceholder="Search ticket no, title, reporter, phone…"
            />
          }
          filterPanel={combineFilters({ ...scope, field: scopeField }, history, deleted, raised)}
          loadExportRows={loadAllExportRows}
          value={records}
          dataKey="unique_id"
          lazy
          paginator
          first={first}
          rows={rowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          totalRecords={totalRecords}
          onPage={onPage}
          loading={loading}
          stripedRows
          showGridlines
          fitWidth
          className="p-datatable-sm"
          emptyMessage="No complaints found"
        >
          <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "4%" }} />
          <Column
            header="Ticket"
            body={(r: ComplaintAuditRecord) => (
              <div className="leading-tight">
                <div className="font-medium">{r.ticket_no}</div>
                <div className="text-xs text-gray-500">{truncate(r.title, 40) || "-"}</div>
                <div className="text-xs text-gray-400">{r.project_name || ""}</div>
              </div>
            )}
            style={{ width: "17%" }}
          />
          <Column
            header="Category"
            body={(r: ComplaintAuditRecord) => (
              <div className="leading-tight">
                <div>{r.category_name || "-"}</div>
                {r.subcategory_name && <div className="text-xs text-gray-500">{r.subcategory_name}</div>}
              </div>
            )}
            style={{ width: "13%" }}
          />
          <Column
            header="Status"
            body={(r: ComplaintAuditRecord) => (
              <div className="flex flex-col items-start gap-1">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status_code ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                  {r.status_name || r.status_code || "-"}
                </span>
                {r.is_deleted && (
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-white" title={r.delete_reason ?? ""}>
                    Deleted
                  </span>
                )}
              </div>
            )}
            style={{ width: "10%" }}
          />
          <Column
            header="Raised"
            body={(r: ComplaintAuditRecord) => (
              <div className="leading-tight">
                <div className="text-xs">{formatDateTime(r.created)}</div>
                <div className="text-xs text-gray-500">{r.created_by_name || r.reporter_name || "-"}</div>
              </div>
            )}
            style={{ width: "13%" }}
          />
          <Column
            header="Resolution remarks"
            body={(r: ComplaintAuditRecord) => (
              <span className="text-xs" title={r.resolution_remarks ?? ""}>
                {truncate(r.resolution_remarks) || "-"}
              </span>
            )}
            style={{ width: "16%" }}
          />
          <Column
            header="Reopens / Escalations"
            body={(r: ComplaintAuditRecord) => (
              <div className="space-y-1 leading-tight">
                {r.reopen_count ? (
                  <div title={r.last_reopen_reason ?? ""}>
                    <div className="text-xs">
                      <span className="text-gray-500">Reopens:</span>{" "}
                      <span className="font-medium text-purple-700">{r.reopen_count}</span>
                    </div>
                    <div className="text-xs text-gray-500">{truncate(r.last_reopen_reason, 40)}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Reopens: 0</div>
                )}
                {r.escalation_count ? (
                  <div>
                    <div className="text-xs">
                      <span className="text-gray-500">Escalations:</span>{" "}
                      <span className="font-medium text-red-700">{r.escalation_count}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      up to L{r.max_escalation_level}
                      {r.auto_escalation_count ? ` · ${r.auto_escalation_count} auto` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Escalations: 0</div>
                )}
              </div>
            )}
            style={{ width: "12%" }}
          />
          <Column
            header="Time taken"
            body={(r: ComplaintAuditRecord) =>
              r.completed_at ? (
                <div className="leading-tight">
                  <div className="font-medium">{formatDuration(r.total_resolution_seconds)}</div>
                  {r.reopen_count > 0 && r.first_resolution_seconds != null && (
                    <div className="text-xs text-gray-500">first fix {formatDuration(r.first_resolution_seconds)}</div>
                  )}
                </div>
              ) : (
                <span className="text-xs font-medium text-amber-700">
                  {r.is_deleted ? "-" : `Open ${formatDuration(r.open_seconds)}`}
                </span>
              )
            }
            style={{ width: "9%" }}
          />
          <Column
            header={t("common.actions")}
            body={(row: ComplaintAuditRecord) => (
              <div className="flex justify-center">
                <Button
                  icon="pi pi-eye"
                  className="p-button-sm p-button-text p-button-info"
                  tooltip="Timeline"
                  tooltipOptions={{ position: "top" }}
                  aria-label="Timeline"
                  onClick={() => void openDetail(row)}
                />
              </div>
            )}
            style={{ width: "6%" }}
          />
        </DataTable>
      </div>

      <ComplaintAuditDetail record={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
}
