import type {
  AuditDashboardFilterOptions,
  AuditDashboardPage,
  AuditDashboardRow,
  AuditDashboardSummary,
  AuditModuleKey,
} from "./types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { saveAs } from "file-saver";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Paginator, type PaginatorPageChangeEvent } from "primereact/paginator";

import Swal from "@/lib/notify";
import { auditDashboardApi } from "@/helpers/admin";
import { recordExcelAudit } from "@/helpers/admin/commonAudit";
import { useTheme } from "@/contexts/ThemeContext";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const PAGE_SIZES = [10, 25, 50, 100];
const RANGES = [7, 30, 90] as const;
const ALL = "";

/* ---------- Formatting ---------- */

const formatDateTime = (value?: string | number | boolean | null) =>
  typeof value === "string"
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const dash = (value: unknown) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

type Tone = "ok" | "info" | "warn" | "bad" | "neutral";

const BADGE_CLASSES: Record<Tone, string> = {
  ok: "bg-[#e3f6e8] text-[#167a37] dark:bg-green-900/40 dark:text-green-300",
  info: "bg-[#e3eefc] text-[#2357a0] dark:bg-blue-900/40 dark:text-blue-300",
  warn: "bg-[#fff3d6] text-[#9a6c00] dark:bg-amber-900/40 dark:text-amber-300",
  bad: "bg-[#fde4e4] text-[#b42626] dark:bg-red-900/40 dark:text-red-300",
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const Badge = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span
    className={`inline-block rounded-full px-[9px] py-0.5 text-xs font-medium ${BADGE_CLASSES[tone]}`}
  >
    {children}
  </span>
);

const KPI_BORDER: Record<Tone, string> = {
  ok: "border-l-[#1f9d47]",
  info: "border-l-[#2f72c9]",
  warn: "border-l-[#d99a06]",
  bad: "border-l-[#d63b3b]",
  neutral: "border-l-[#1f9d47]",
};

const PALETTE = [
  "#1f9d47",
  "#2f72c9",
  "#d99a06",
  "#ef5a1c",
  "#d63b3b",
  "#7a5bd1",
  "#0f9488",
  "#9ca3af",
];

/* ---------- Module definitions ---------- */

type KpiDef = {
  key: string;
  label: string;
  tone?: Tone;
  format?: (value: number | null) => string;
};

type ColumnDef = {
  header: string;
  render: (row: AuditDashboardRow) => ReactNode;
  /** Plain text for the CSV export; defaults to the raw field. */
  csv: (row: AuditDashboardRow) => string;
};

type ModuleDef = {
  name: string;
  trendLabel: string;
  splitTitle: string;
  /** Slice labels by key; otherwise the server's label is shown. */
  splitLabels?: Record<string, string>;
  kpis: KpiDef[];
  columns: ColumnDef[];
};

const percent = (value: number | null) => (value === null ? "–" : `${value}%`);
const hours = (value: number | null) => (value === null ? "–" : `${value} hrs`);

const field = (header: string, key: string): ColumnDef => ({
  header,
  render: (row) => dash(row[key]),
  csv: (row) => dash(row[key]),
});

const dateColumn: ColumnDef = {
  header: "Date",
  render: (row) => formatDateTime(row.date),
  csv: (row) => formatDateTime(row.date),
};

const badgeColumn = (
  header: string,
  key: string,
  tones: Record<string, Tone>,
  labels: Record<string, string> = {},
  labelKey?: string,
): ColumnDef => {
  const text = (row: AuditDashboardRow) =>
    dash((labelKey && row[labelKey]) || labels[String(row[key])] || row[key]);
  return {
    header,
    render: (row) => (
      <Badge tone={tones[String(row[key])] ?? "neutral"}>{text(row)}</Badge>
    ),
    csv: text,
  };
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  OTHER: "Export / import",
  SUCCESS: "Success",
  FAILED: "Failed",
  CREATED: "Granted",
  UPDATED: "Updated",
  DELETED: "Revoked",
};

const MODULES: Record<AuditModuleKey, ModuleDef> = {
  common: {
    name: "Common Audit",
    trendLabel: "Changes per day",
    splitTitle: "Changes by action",
    splitLabels: ACTION_LABELS,
    kpis: [
      { key: "total", label: "Total changes" },
      { key: "updates", label: "Updates", tone: "info" },
      { key: "deletions", label: "Deletions", tone: "bad" },
      { key: "active_users", label: "Active users" },
    ],
    columns: [
      dateColumn,
      field("User", "user"),
      field("Module", "module"),
      badgeColumn(
        "Action",
        "action",
        { CREATE: "ok", UPDATE: "info", DELETE: "bad" },
        ACTION_LABELS,
      ),
      field("Record", "record"),
      field("Project", "project"),
    ],
  },
  login: {
    name: "Login Audit",
    trendLabel: "Logins per day",
    splitTitle: "Login outcome",
    splitLabels: ACTION_LABELS,
    kpis: [
      { key: "total", label: "Total logins" },
      { key: "success_rate", label: "Success rate", format: percent },
      { key: "failed", label: "Failed attempts", tone: "warn" },
      { key: "unique_users", label: "Users signed in" },
    ],
    columns: [
      dateColumn,
      field("User", "user"),
      field("Device", "device"),
      field("IP address", "ip"),
      badgeColumn(
        "Status",
        "status",
        { SUCCESS: "ok", FAILED: "warn" },
        ACTION_LABELS,
      ),
      field("Project", "project"),
    ],
  },
  access: {
    name: "User Access Audit",
    trendLabel: "Access changes per day",
    splitTitle: "Changes by source",
    kpis: [
      { key: "total", label: "Access changes" },
      { key: "created", label: "Access granted", tone: "info" },
      { key: "updated", label: "Access updated", tone: "warn" },
      { key: "deleted", label: "Access revoked", tone: "bad" },
    ],
    columns: [
      dateColumn,
      field("Changed by", "user"),
      field("Access for", "target"),
      field("Source", "source_label"),
      badgeColumn(
        "Change",
        "change",
        { CREATED: "ok", UPDATED: "info", DELETED: "bad" },
        ACTION_LABELS,
      ),
      field("Project", "project"),
    ],
  },
  route: {
    name: "Static Route Audit",
    trendLabel: "Route changes per day",
    splitTitle: "Change type",
    kpis: [
      { key: "total", label: "Route changes" },
      { key: "detour_changes", label: "Detour changes", tone: "info" },
      { key: "trips_rerouted", label: "Trips re-routed", tone: "warn" },
      { key: "routing_errors", label: "Routing errors", tone: "bad" },
    ],
    columns: [
      dateColumn,
      field("Trip plan", "trip_plan"),
      badgeColumn(
        "Change",
        "change",
        {
          CREATED: "ok",
          DETOUR_ADDED: "info",
          DETOUR_MOVED: "info",
          DETOUR_REMOVED: "info",
          STOPS_CHANGED: "warn",
          ROUTE_CHANGED: "warn",
        },
        {},
        "change_label",
      ),
      {
        header: "Distance change",
        render: (row) => {
          const km = Number(row.distance_change_km ?? 0);
          return `${km > 0 ? "+" : ""}${km} km`;
        },
        csv: (row) => String(row.distance_change_km ?? 0),
      },
      field("Trips affected", "affected_trips"),
      field("Changed by", "user"),
      field("Project", "project"),
    ],
  },
  complaint: {
    name: "Complaint Audit",
    trendLabel: "Complaints per day",
    splitTitle: "Complaint status",
    kpis: [
      { key: "total", label: "Complaints" },
      { key: "resolved_rate", label: "Resolved", format: percent },
      {
        key: "avg_resolution_hours",
        label: "Avg resolution time",
        tone: "info",
        format: hours,
      },
      { key: "escalated", label: "Escalated", tone: "bad" },
    ],
    columns: [
      dateColumn,
      field("Complaint", "ticket_no"),
      field("Category", "category"),
      field("Assigned to", "user"),
      badgeColumn(
        "Status",
        "status",
        {
          RESOLVED: "ok",
          CLOSED: "ok",
          IN_PROGRESS: "info",
          ESCALATED: "bad",
          REOPENED: "warn",
          SUBMITTED: "warn",
        },
        {},
        "status_label",
      ),
      {
        header: "TAT (hrs)",
        // Unresolved tickets show time open so far.
        render: (row) =>
          row.tat_hours === null || row.tat_hours === undefined ? (
            "-"
          ) : row.resolved ? (
            String(row.tat_hours)
          ) : (
            <span className="text-[#66756b] dark:text-gray-400">
              {row.tat_hours} (open)
            </span>
          ),
        csv: (row) => dash(row.tat_hours),
      },
      field("Project", "project"),
    ],
  },
};

const MODULE_KEYS = Object.keys(MODULES) as AuditModuleKey[];

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/* ---------- Page ---------- */

const selectClass =
  "rounded-lg border border-[#dfe8e2] bg-white px-[10px] py-[7px] text-sm text-[#1d2b22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f9d47] dark:border-[#26352b] dark:bg-[#17221b] dark:text-[#e6efe8]";
const panelClass =
  "rounded-[10px] border border-[#dfe8e2] bg-white p-4 dark:border-[#26352b] dark:bg-[#17221b]";

export default function AuditDashboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [current, setCurrent] = useState<AuditModuleKey>("common");
  const [days, setDays] = useState<number>(30);
  const [projectId, setProjectId] = useState(ALL);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[0]);

  const [options, setOptions] = useState<AuditDashboardFilterOptions | null>(
    null,
  );
  const [summary, setSummary] = useState<AuditDashboardSummary | null>(null);
  const [records, setRecords] = useState<AuditDashboardPage | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [exporting, setExporting] = useState(false);

  const summaryRequest = useRef(0);
  const recordsRequest = useRef(0);

  const module = MODULES[current];

  const scopeParams = useMemo(
    () => ({
      module: current,
      days,
      ...(projectId ? { project_id: projectId } : {}),
    }),
    [current, days, projectId],
  );

  useEffect(() => {
    auditDashboardApi
      .read("filter-options")
      .then((data) => setOptions(data as AuditDashboardFilterOptions))
      .catch(() => {
        // Non-fatal: the scope dropdown just offers "All projects".
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const id = ++summaryRequest.current;
    setSummary(null);
    auditDashboardApi
      .read("summary/", { params: scopeParams })
      .then((data) => {
        if (id === summaryRequest.current)
          setSummary(data as AuditDashboardSummary);
      })
      .catch(() => {
        if (id === summaryRequest.current)
          Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
      });
  }, [scopeParams, t]);

  useEffect(() => {
    const id = ++recordsRequest.current;
    setLoadingRecords(true);
    auditDashboardApi
      .read("records/", {
        params: {
          ...scopeParams,
          page,
          limit: rowsPerPage,
          ...(search ? { search } : {}),
        },
      })
      .then((data) => {
        if (id === recordsRequest.current)
          setRecords(data as unknown as AuditDashboardPage);
      })
      .catch(() => {
        if (id === recordsRequest.current) {
          setRecords(null);
          Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
        }
      })
      .finally(() => {
        if (id === recordsRequest.current) setLoadingRecords(false);
      });
  }, [scopeParams, page, rowsPerPage, search, t]);

  const switchModule = (key: AuditModuleKey) => {
    setCurrent(key);
    setPage(1);
    setSearchInput("");
    setSearch("");
  };

  // Every row matching the filters, fetched in pages since the table only
  // holds one. Logged like the other audit screens' exports.
  const exportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const rows: AuditDashboardRow[] = [];
      for (let next = 1, total = 1; next <= total; next++) {
        const data = (await auditDashboardApi.read("records/", {
          params: {
            ...scopeParams,
            page: next,
            limit: 500,
            ...(search ? { search } : {}),
          },
        })) as unknown as AuditDashboardPage;
        rows.push(...data.results);
        total = data.total_pages;
      }
      const lines = [
        module.columns.map((c) => csvCell(c.header)).join(","),
        ...rows.map((row) =>
          module.columns.map((c) => csvCell(c.csv(row))).join(","),
        ),
      ];
      const stamp = new Date().toISOString().slice(0, 10);
      saveAs(
        new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
        `${current}-audit-${days}d-${stamp}.csv`,
      );
      void recordExcelAudit("download_all_excel", {
        format: "csv",
        audit: current,
        days,
        project_id: projectId || null,
        search: search || null,
        rows: rows.length,
      });
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setExporting(false);
    }
  }, [current, days, module, projectId, scopeParams, search, t]);

  /* ---------- Charts ---------- */

  const gridColor = dark ? "#26352b" : "#dfe8e2";
  const tickColor = dark ? "#9aaba0" : "#66756b";

  const trendData = useMemo(
    () => ({
      labels: (summary?.trend ?? []).map((d) => formatDay(d.date)),
      datasets: [
        {
          data: (summary?.trend ?? []).map((d) => d.count),
          backgroundColor: "#1f9d47",
          borderRadius: 4,
        },
      ],
    }),
    [summary],
  );

  const trendOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, maxTicksLimit: 10 },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: tickColor, precision: 0 },
        },
      },
    }),
    [gridColor, tickColor],
  );

  const splitData = useMemo(
    () => ({
      labels: (summary?.breakdown ?? []).map(
        (s) => module.splitLabels?.[s.key] ?? s.label,
      ),
      datasets: [
        {
          data: (summary?.breakdown ?? []).map((s) => s.count),
          backgroundColor: PALETTE,
          borderWidth: 0,
        },
      ],
    }),
    [module, summary],
  );

  const splitOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: tickColor,
            boxWidth: 12,
            font: { family: "Poppins" },
          },
        },
      },
    }),
    [tickColor],
  );

  /* ---------- KPIs ---------- */

  const delta =
    summary && summary.previous_total
      ? Math.round(
          (((summary.kpis.total ?? 0) - summary.previous_total) /
            summary.previous_total) *
            100,
        )
      : null;

  const projectsByCompany = useMemo(() => {
    const groups = new Map<string, AuditDashboardFilterOptions["projects"]>();
    for (const project of options?.projects ?? []) {
      const company = project.company_name ?? project.company_id;
      groups.set(company, [...(groups.get(company) ?? []), project]);
    }
    return [...groups.entries()];
  }, [options]);

  return (
    <div className="p-3 text-sm text-[#1d2b22] dark:text-[#e6efe8]">
      <header className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px] font-semibold">Audit dashboard</h1>
          <p className="mt-0.5 text-[#66756b] dark:text-[#9aaba0]">
            Activity and changes across IWMS audit modules
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Date range"
            className={selectClass}
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setPage(1);
            }}
          >
            {RANGES.map((n) => (
              <option key={n} value={n}>
                Last {n} days
              </option>
            ))}
          </select>
          <select
            aria-label="Project"
            className={selectClass}
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
          >
            <option value={ALL}>All projects</option>
            {projectsByCompany.length > 1
              ? projectsByCompany.map(([company, projects]) => (
                  <optgroup key={company} label={company}>
                    {projects.map((p) => (
                      <option key={p.unique_id} value={p.unique_id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))
              : (options?.projects ?? []).map((p) => (
                  <option key={p.unique_id} value={p.unique_id}>
                    {p.name}
                  </option>
                ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || !records?.count}
            className="rounded-lg border border-[#1f9d47] bg-[#1f9d47] px-[10px] py-[7px] text-sm font-medium text-white hover:bg-[#167a37] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </header>

      <nav
        role="tablist"
        className="mb-[18px] flex gap-1.5 overflow-x-auto pb-1"
      >
        {MODULE_KEYS.map((key) => {
          const selected = key === current;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => switchModule(key)}
              className={`whitespace-nowrap rounded-[10px] border px-[14px] py-2 text-sm font-medium ${
                selected
                  ? "border-[#9fd7ae] bg-[#fdeee6] text-[#ef5a1c] dark:bg-[#3a2216]"
                  : "border-[#dfe8e2] bg-white text-[#66756b] hover:text-[#1d2b22] dark:border-[#26352b] dark:bg-[#17221b] dark:text-[#9aaba0] dark:hover:text-[#e6efe8]"
              }`}
            >
              {MODULES[key].name}
            </button>
          );
        })}
      </nav>

      <section className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        {module.kpis.map((kpi, i) => {
          const value = summary ? (summary.kpis[kpi.key] ?? null) : null;
          return (
            <div
              key={kpi.key}
              className={`rounded-[10px] border border-l-4 border-[#dfe8e2] bg-white px-4 py-[14px] dark:border-[#26352b] dark:bg-[#17221b] ${
                KPI_BORDER[kpi.tone ?? "ok"]
              }`}
            >
              <div className="text-[#66756b] dark:text-[#9aaba0]">
                {kpi.label}
              </div>
              <div className="text-[26px] font-semibold">
                {summary ? (kpi.format ? kpi.format(value) : dash(value)) : "…"}
              </div>
              {i === 0 && delta !== null ? (
                <div
                  className={`mt-0.5 text-xs ${delta >= 0 ? "text-[#1f9d47]" : "text-[#d63b3b]"}`}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta}% vs previous period
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className={`${panelClass} lg:col-span-2`}>
          <h2 className="mb-3 mt-0 text-[15px] font-semibold">
            {module.trendLabel}
          </h2>
          <div className="relative h-[260px]">
            <Bar data={trendData} options={trendOptions} />
          </div>
        </div>
        <div className={panelClass}>
          <h2 className="mb-3 mt-0 text-[15px] font-semibold">
            {module.splitTitle}
          </h2>
          <div className="relative h-[260px]">
            {summary && summary.breakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#66756b] dark:text-[#9aaba0]">
                No activity in this period
              </div>
            ) : (
              <Doughnut data={splitData} options={splitOptions} />
            )}
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-[15px] font-semibold">
            {module.name} records
          </h2>
          <input
            type="search"
            aria-label="Search records"
            placeholder="Search user, action, record…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`${selectClass} w-full sm:w-[290px]`}
          />
        </div>
        <div className="overflow-x-auto">
          <table
            className={`w-full min-w-[680px] border-collapse ${loadingRecords ? "opacity-60" : ""}`}
          >
            <thead>
              <tr>
                {module.columns.map((c) => (
                  <th
                    key={c.header}
                    className="whitespace-nowrap border-b border-[#dfe8e2] px-2.5 py-[9px] text-left text-[13px] font-medium text-[#66756b] dark:border-[#26352b] dark:text-[#9aaba0]"
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records?.results.length ? (
                records.results.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[#e6f5ea] dark:hover:bg-[#1b3323]"
                  >
                    {module.columns.map((c) => (
                      <td
                        key={c.header}
                        className="whitespace-nowrap border-b border-[#dfe8e2] px-2.5 py-[9px] text-left dark:border-[#26352b]"
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={module.columns.length}
                    className="p-6 text-center text-[#66756b] dark:text-[#9aaba0]"
                  >
                    {loadingRecords
                      ? "Loading…"
                      : "No records match these filters. Widen the date range or clear the search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Paginator
          className="mt-2.5 justify-end bg-transparent p-0"
          first={(page - 1) * rowsPerPage}
          rows={rowsPerPage}
          totalRecords={records?.count ?? 0}
          rowsPerPageOptions={PAGE_SIZES}
          onPageChange={(event: PaginatorPageChangeEvent) => {
            setRowsPerPage(event.rows);
            setPage(event.page + 1);
          }}
          template="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          currentPageReportTemplate="{first}–{last} of {totalRecords} records"
        />
      </section>
    </div>
  );
}
