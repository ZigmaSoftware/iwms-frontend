import type {
  ComplaintAuditDetail as DetailRecord,
  ComplaintAuditFilterOptions,
  ComplaintAuditRecord,
} from "./types";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import type { DataTablePageEvent } from "primereact/datatable";

import { complaintAuditApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { Input } from "@/components/ui/input";
import ComplaintAuditDetail from "./ComplaintAuditDetail";
import { formatDateTime, formatDuration, STATUS_COLORS } from "./format";

const toRecordList = (value: unknown): ComplaintAuditRecord[] => {
  if (Array.isArray(value)) return value as ComplaintAuditRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: ComplaintAuditRecord[] }).results;
  }
  return [];
};

const LabeledFilter = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
    {children}
  </div>
);

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
  const [companyFilter, setCompanyFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [deletedFilter, setDeletedFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
          params: companyFilter ? { company_id: companyFilter } : {},
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
  }, [companyFilter]);

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

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setFirst(0);
    setter(value);
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

      <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={setGlobalFilterValue}
          searchPlaceholder="Search ticket no, title, reporter, phone…"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LabeledFilter label="Company">
            <FilterBarSelect
              value={companyFilter}
              onChange={(value) => {
                setFirst(0);
                setCompanyFilter(value);
                setProjectFilter("");
              }}
              options={companyOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
          <LabeledFilter label="Project">
            <FilterBarSelect
              value={projectFilter}
              onChange={resetPage(setProjectFilter)}
              options={projectOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
          <LabeledFilter label="Status">
            <FilterBarSelect
              value={statusFilter}
              onChange={resetPage(setStatusFilter)}
              options={statusOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
          <LabeledFilter label="Category">
            <FilterBarSelect
              value={categoryFilter}
              onChange={resetPage(setCategoryFilter)}
              options={categoryOptions}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
          <LabeledFilter label="History">
            <FilterBarSelect
              value={historyFilter}
              onChange={resetPage(setHistoryFilter)}
              options={HISTORY_OPTIONS}
              placeholder={t("common.all")}
              className="w-full"
            />
          </LabeledFilter>
          <LabeledFilter label="Deleted">
            <FilterBarSelect
              value={deletedFilter}
              onChange={resetPage(setDeletedFilter)}
              options={DELETED_OPTIONS}
              placeholder="Include deleted"
              className="w-full"
            />
          </LabeledFilter>
          <LabeledFilter label="Raised from">
            <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => resetPage(setDateFrom)(e.target.value)} />
          </LabeledFilter>
          <LabeledFilter label="Raised to">
            <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => resetPage(setDateTo)(e.target.value)} />
          </LabeledFilter>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable
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
          className="p-datatable-sm"
          emptyMessage="No complaints found"
        >
          <Column header={t("common.s_no")} body={(_, { rowIndex }) => rowIndex + 1} style={{ width: 60 }} />
          <Column
            header="Ticket"
            body={(r: ComplaintAuditRecord) => (
              <div className="leading-tight">
                <div className="font-medium">{r.ticket_no}</div>
                <div className="text-xs text-gray-500">{truncate(r.title, 40) || "-"}</div>
                <div className="text-xs text-gray-400">{r.project_name || ""}</div>
              </div>
            )}
          />
          <Column
            header="Category"
            body={(r: ComplaintAuditRecord) => (
              <div className="leading-tight">
                <div>{r.category_name || "-"}</div>
                {r.subcategory_name && <div className="text-xs text-gray-500">{r.subcategory_name}</div>}
              </div>
            )}
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
          />
          <Column
            header="Raised"
            body={(r: ComplaintAuditRecord) => (
              <div className="leading-tight">
                <div className="text-xs">{formatDateTime(r.created)}</div>
                <div className="text-xs text-gray-500">{r.created_by_name || r.reporter_name || "-"}</div>
              </div>
            )}
          />
          <Column
            header="Resolution remarks"
            body={(r: ComplaintAuditRecord) => (
              <span className="text-xs" title={r.resolution_remarks ?? ""}>
                {truncate(r.resolution_remarks) || "-"}
              </span>
            )}
            style={{ minWidth: 180 }}
          />
          <Column
            header="Reopens"
            body={(r: ComplaintAuditRecord) =>
              r.reopen_count ? (
                <div className="leading-tight" title={r.last_reopen_reason ?? ""}>
                  <div className="font-medium text-purple-700">{r.reopen_count}</div>
                  <div className="text-xs text-gray-500">{truncate(r.last_reopen_reason, 40)}</div>
                </div>
              ) : (
                <span className="text-gray-400">0</span>
              )
            }
            style={{ minWidth: 120 }}
          />
          <Column
            header="Escalations"
            body={(r: ComplaintAuditRecord) =>
              r.escalation_count ? (
                <div className="leading-tight">
                  <div className="font-medium text-red-700">{r.escalation_count}</div>
                  <div className="text-xs text-gray-500">
                    up to L{r.max_escalation_level}
                    {r.auto_escalation_count ? ` · ${r.auto_escalation_count} auto` : ""}
                  </div>
                </div>
              ) : (
                <span className="text-gray-400">0</span>
              )
            }
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
          />
          <Column
            header={t("common.actions")}
            body={(row: ComplaintAuditRecord) => (
              <div className="flex justify-center">
                <button onClick={() => void openDetail(row)} className="text-blue-600 hover:text-blue-800">
                  Timeline
                </button>
              </div>
            )}
            style={{ width: 100 }}
          />
        </DataTable>
      </div>

      <ComplaintAuditDetail record={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
}
