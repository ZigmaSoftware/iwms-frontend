import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  RefreshCw,
  Scale,
  Search,
  Truck,
  Weight,
  X,
  type LucideIcon,
} from "lucide-react";

import { ProjectSelectorBar } from "@/components/common/ProjectSelectorBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import { vehicleCreationApi } from "@/helpers/admin";
import { useInvisiblePageScroll } from "@/hooks/useInvisiblePageScroll";
import { cn } from "@/lib/utils";
import {
  checkTickets,
  type CheckedTicket,
  type FlagCode,
  type RawTicket,
  type Status,
  type Vehicle,
} from "./weighbridgeChecks";

/* =========================================================
   API CONFIG — same as the Day / Date reports: the project's day-wise
   weighment API is called directly.
========================================================= */
const API_KEY = import.meta.env.VITE_WEIGHBRIDGE_WASTE_COLLECTION_KEY || "ZIGMA-DELHI-WEIGHMENT-2025-SECURE";

const PAGE_SIZES = [10, 25, 50, 100];
const FLAG_CODES: FlagCode[] = [
  "INVALID_WEIGHT",
  "DUPLICATE_TICKET",
  "REPEAT_WEIGHING",
  "NET_MISMATCH",
  "UNKNOWN_VEHICLE",
  "NO_TICKET_NUMBER",
  "SPLIT_MISMATCH",
  "TARE_DRIFT",
];

type StatusFilter = "all" | Status;

const STATUS_BADGE: Record<Status, string> = {
  normal: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200",
  critical: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200",
};

const SEVERITY_DOT: Record<Status, string> = {
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
};

// Left edge of each list row, so problem entries stand out at a glance.
const ROW_ACCENT: Record<Status, string> = {
  normal: "border-l-transparent",
  warning: "border-l-amber-400",
  critical: "border-l-rose-500",
};

/* =========================================================
   HELPERS
========================================================= */
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const toTons = (kg: number | null) => (kg === null ? "-" : `${(kg / 1000).toFixed(2)} t`);
const formatTons = (kg: number | null) => (kg === null ? null : (kg / 1000).toFixed(2));
const toKg = (value: number | null) => (value === null ? "-" : `${value.toLocaleString()} kg`);
const formatWeighedAt = (d: Date | null) =>
  d
    ? d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "-";

/** Tickets of the project's day-wise weighment API for an inclusive range. */
async function fetchTickets(apiUrl: string, fromDate: string, toDate: string): Promise<RawTicket[]> {
  const res = await fetch(`${apiUrl}?action=day_wise_data&from_date=${fromDate}&to_date=${toDate}&key=${API_KEY}`);
  if (!res.ok) throw new Error(`Weighbridge API returned HTTP ${res.status}.`);
  const json = await res.json();
  if (json?.status !== true || !Array.isArray(json.data)) {
    throw new Error("Weighbridge API returned an invalid response.");
  }
  return json.data;
}

/** The project's vehicle master; null when it could not be read. */
async function readVehicles(projectId: string): Promise<Vehicle[] | null> {
  try {
    return (await vehicleCreationApi.readAllForExport({ params: { project_id: projectId } })) as Vehicle[];
  } catch {
    return null;
  }
}

type LoadedData = {
  tickets: CheckedTicket[];
  /** vehicle master could not be read: the unknown-vehicle check was skipped */
  limited: boolean;
};

type SummaryCard = {
  key: string;
  label: string;
  subtext: string;
  value: ReactNode;
  Icon: LucideIcon;
  /** Tailwind classes for the icon chip, active ring and top accent bar. */
  tone: { icon: string; active: string; bar: string };
  /** Tiles with a filter double as the list filter. */
  filter?: StatusFilter;
};

/* =========================================================
   COMPONENT
========================================================= */
export default function Weighbridge() {
  const { t } = useTranslation();
  const { projectId, dayWiseWeighmentApiUrl, loading: contextLoading } = useProjectSelector();
  useInvisiblePageScroll();

  const today = formatDate(new Date());
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [flagFilter, setFlagFilter] = useState<"all" | FlagCode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const rangeInvalid = fromDate > toDate;
  // Only the newest request may write: changing dates quickly must not let an
  // older, slower response overwrite a newer one.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    if (!dayWiseWeighmentApiUrl || rangeInvalid) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [rows, vehicles] = await Promise.all([
        fetchTickets(dayWiseWeighmentApiUrl, fromDate, toDate),
        readVehicles(projectId),
      ]);
      if (requestId !== latestRequest.current) return;
      setData({ tickets: checkTickets(rows, vehicles), limited: vehicles === null });
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setData(null);
      setError(err instanceof Error ? err.message : "Unable to load weighbridge data.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [projectId, dayWiseWeighmentApiUrl, fromDate, toDate, rangeInvalid]);

  useEffect(() => {
    if (contextLoading) return;
    load();
  }, [contextLoading, load]);

  const tickets = useMemo(
    () =>
      [...(data?.tickets ?? [])].sort(
        (a, b) => (b.weighedAt?.getTime() ?? 0) - (a.weighedAt?.getTime() ?? 0),
      ),
    [data],
  );

  const counts = useMemo(() => {
    const result: Record<Status, number> = { normal: 0, warning: 0, critical: 0 };
    for (const ticket of tickets) result[ticket.status] += 1;
    return result;
  }, [tickets]);
  const netTotal = useMemo(
    () => tickets.reduce((sum, ticket) => sum + (ticket.net && ticket.net > 0 ? ticket.net : 0), 0),
    [tickets],
  );

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets
      .filter((ticket) => statusFilter === "all" || ticket.status === statusFilter)
      .filter((ticket) => flagFilter === "all" || ticket.flags.some((f) => f.code === flagFilter))
      .filter((ticket) => !q || [ticket.ticketNo, ticket.vehicleNo].some((v) => v.toLowerCase().includes(q)));
  }, [tickets, statusFilter, flagFilter, searchQuery]);

  // Any change to what's listed starts back at the first page.
  useEffect(() => setPage(1), [statusFilter, flagFilter, searchQuery, pageSize, projectId, fromDate, toDate]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const paged = visible.slice(pageStart, pageStart + pageSize);
  const selected = tickets.find((ticket) => ticket.key === selectedKey) ?? null;

  const summaryCards: SummaryCard[] = [
    {
      key: "total",
      label: t("dashboard.weighbridge.summary.total"),
      subtext: t("dashboard.weighbridge.summary.total_subtext"),
      value: tickets.length,
      Icon: Scale,
      filter: "all",
      tone: { icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300", active: "ring-sky-500", bar: "bg-sky-500" },
    },
    {
      key: "net",
      label: t("dashboard.weighbridge.summary.net"),
      subtext: t("dashboard.weighbridge.summary.net_subtext"),
      value: toTons(netTotal),
      Icon: Weight,
      tone: { icon: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300", active: "ring-violet-500", bar: "bg-violet-500" },
    },
    {
      key: "normal",
      label: t("dashboard.weighbridge.summary.normal"),
      subtext: t("dashboard.weighbridge.summary.normal_subtext"),
      value: counts.normal,
      Icon: CheckCircle2,
      filter: "normal",
      tone: { icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", active: "ring-emerald-500", bar: "bg-emerald-500" },
    },
    {
      key: "warning",
      label: t("dashboard.weighbridge.summary.warning"),
      subtext: t("dashboard.weighbridge.summary.warning_subtext"),
      value: counts.warning,
      Icon: Clock,
      filter: "warning",
      tone: { icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", active: "ring-amber-500", bar: "bg-amber-500" },
    },
    {
      key: "critical",
      label: t("dashboard.weighbridge.summary.critical"),
      subtext: t("dashboard.weighbridge.summary.critical_subtext"),
      value: counts.critical,
      Icon: AlertTriangle,
      filter: "critical",
      tone: { icon: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300", active: "ring-rose-500", bar: "bg-rose-500" },
    },
  ];

  const statusBadge = (status: Status) => (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", STATUS_BADGE[status])}>
      {t(`dashboard.weighbridge.status.${status}`)}
    </Badge>
  );

  const issueSummary = (ticket: CheckedTicket) =>
    ticket.flags.length === 0 ? (
      <span className="text-xs text-muted-foreground">-</span>
    ) : (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span
          title={ticket.flags.map((f) => f.message).join("\n")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
            STATUS_BADGE[ticket.flags[0].severity],
          )}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_DOT[ticket.flags[0].severity])} />
          {t(`dashboard.weighbridge.flags.${ticket.flags[0].code}`)}
        </span>
        {ticket.flags.length > 1 && (
          <span className="text-xs text-muted-foreground">
            {t("dashboard.weighbridge.more_issues", { count: ticket.flags.length - 1 })}
          </span>
        )}
      </span>
    );

  const filtersActive = statusFilter !== "all" || flagFilter !== "all" || searchQuery !== "";

  /* ================= RENDER ================= */

  if (!contextLoading && !dayWiseWeighmentApiUrl) {
    return (
      <div className="space-y-5">
        <ProjectSelectorBar />
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-20 text-center text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
          <Scale className="mb-2 h-8 w-8 opacity-50" />
          <p className="text-base font-medium">Weighment API not configured for this project.</p>
          <p className="text-sm">Set a Weighment API URL in the project settings to enable weighbridge data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="space-y-5 pb-10">
        <ProjectSelectorBar />

        {/* HEADER */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/60 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20" />
          <div className="relative flex items-center gap-3">
            <span className="rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 p-2.5 text-white shadow-sm">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t("dashboard.weighbridge.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("dashboard.weighbridge.subtitle")}</p>
            </div>
          </div>
          <div className="relative flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value || today)}
                className="w-40 bg-white dark:bg-slate-900"
                aria-label="From date"
              />
              <span className="text-sm text-muted-foreground">{t("dashboard.weighbridge.to")}</span>
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value || today)}
                className="w-40 bg-white dark:bg-slate-900"
                aria-label="To date"
              />
            </div>
            <Button variant="outline" onClick={load} disabled={loading} className="gap-2 bg-white dark:bg-slate-900">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {t("dashboard.weighbridge.refresh")}
            </Button>
          </div>
        </div>

        {rangeInvalid && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
            {t("dashboard.weighbridge.range_invalid")}
          </div>
        )}

        {/* KPI TILES — the status tiles double as the list filter */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {summaryCards.map(({ key, label, subtext, value, Icon, filter: f, tone }) => {
            const active = f !== undefined && statusFilter === f;
            const body = (
              <>
                <span className={cn("absolute inset-x-0 top-0 h-1", tone.bar)} />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
                  <span className={cn("rounded-lg p-1.5", tone.icon)}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums">{loading ? "–" : value}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtext}</p>
              </>
            );
            const tileClass =
              "relative overflow-hidden rounded-2xl border bg-white p-4 pt-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900";
            return f === undefined ? (
              <div key={key} className={cn(tileClass, "border-slate-200")}>{body}</div>
            ) : (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(active && f !== "all" ? "all" : f)}
                aria-pressed={active}
                className={cn(
                  tileClass,
                  "group transition hover:shadow-md",
                  active ? cn("ring-2", tone.active) : "border-slate-200",
                )}
              >
                {body}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}
        {data?.limited && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
            {t("dashboard.weighbridge.limited_checks")}
          </div>
        )}

        {/* LIST */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.weighbridge.search_placeholder")}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={flagFilter} onValueChange={(v) => setFlagFilter(v as "all" | FlagCode)}>
              <SelectTrigger className="md:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.weighbridge.all_issues")}</SelectItem>
                {FLAG_CODES.map((code) => (
                  <SelectItem key={code} value={code}>{t(`dashboard.weighbridge.flags.${code}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {t("dashboard.weighbridge.showing", { count: visible.length, total: tickets.length })}
              </span>
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    setStatusFilter("all");
                    setFlagFilter("all");
                    setSearchQuery("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("dashboard.weighbridge.clear_filter")}
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-50" />
              {t("dashboard.weighbridge.empty")}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full table-fixed text-sm md:table">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                  <col className="w-[26%]" />
                  <col className="w-[13%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                  <tr>
                    <th className="py-3 pl-5 pr-4 font-semibold">{t("dashboard.weighbridge.list.ticket")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.weighbridge.list.vehicle")}</th>
                    <th className="py-3 pl-4 pr-8 text-right font-semibold">{t("dashboard.weighbridge.list.net")}</th>
                    <th className="py-3 pl-8 pr-4 font-semibold">{t("dashboard.weighbridge.list.issues")}</th>
                    <th className="px-4 py-3 font-semibold">{t("dashboard.weighbridge.list.status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paged.map((ticket) => (
                    <tr
                      key={ticket.key}
                      onClick={() => setSelectedKey(ticket.key)}
                      className="group cursor-pointer transition-colors hover:bg-sky-50/50 dark:hover:bg-slate-800/50"
                    >
                      <td className={cn("border-l-4 py-3.5 pl-4 pr-4", ROW_ACCENT[ticket.status])}>
                        <p className="font-mono text-sm font-semibold">{ticket.ticketNo || "-"}</p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatWeighedAt(ticket.weighedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold dark:bg-slate-800">
                          <Truck className="h-3.5 w-3.5 text-slate-500" />
                          {ticket.vehicleNo || "-"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-8 text-right tabular-nums">
                        {formatTons(ticket.net) === null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <>
                            <span className="text-base font-semibold">{formatTons(ticket.net)}</span>
                            <span className="ml-1 text-xs text-muted-foreground">t</span>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 pl-8 pr-4">{issueSummary(ticket)}</td>
                      <td className="px-4 py-3.5">{statusBadge(ticket.status)}</td>
                      <td className="pr-4 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                {paged.map((ticket) => (
                  <li key={ticket.key}>
                    <button
                      type="button"
                      onClick={() => setSelectedKey(ticket.key)}
                      className={cn("w-full space-y-1.5 border-l-4 px-4 py-3 text-left", ROW_ACCENT[ticket.status])}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{ticket.ticketNo || "-"}</span>
                        {statusBadge(ticket.status)}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          {ticket.vehicleNo || "-"}
                        </span>
                        <span className="tabular-nums">{toTons(ticket.net)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {issueSummary(ticket)}
                        <span>{formatWeighedAt(ticket.weighedAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <Pager
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                total={visible.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelectedKey(null)}>
        <SheetContent className="scrollbar-none w-full overflow-y-auto p-0 sm:max-w-xl">
          {selected && <TicketDetail ticket={selected} statusBadge={statusBadge(selected.status)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* =========================================================
   TICKET DETAIL (read-only)
========================================================= */
function TicketDetail({ ticket, statusBadge }: { ticket: CheckedTicket; statusBadge: ReactNode }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`dashboard.weighbridge.detail.${key}`);
  const { loaded, tare, dry, wet, mix } = ticket;
  const splitParts = [dry, wet, mix].filter((w): w is number => w !== null);

  return (
    <div className="flex flex-col">
      <SheetHeader className="space-y-3 border-b border-slate-200 bg-slate-50 p-6 text-left dark:border-slate-800 dark:bg-slate-900/60">
        <p className="font-mono text-xs text-muted-foreground">
          {ticket.ticketNo ? t("dashboard.weighbridge.detail.title", { ticket: ticket.ticketNo }) : k("no_ticket")}
        </p>
        <SheetTitle className="flex items-center gap-2 text-xl leading-snug">
          <Truck className="h-5 w-5 text-muted-foreground" />
          {ticket.vehicleNo || "-"}
        </SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-3">
            {statusBadge}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatWeighedAt(ticket.weighedAt)}
            </span>
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-6">
        <Section title={k("section_checks")}>
          {ticket.flags.length === 0 ? (
            <p className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              {k("no_flags")}
            </p>
          ) : (
            <ul className="space-y-2">
              {ticket.flags.map((flag) => (
                <li
                  key={flag.code}
                  className={cn("rounded-lg border px-3 py-2 text-sm", STATUS_BADGE[flag.severity])}
                >
                  <p className="font-semibold">{t(`dashboard.weighbridge.flags.${flag.code}`)}</p>
                  <p className="text-xs opacity-90">{flag.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={k("section_weighment")}>
          <FieldGrid>
            <Field label={k("loaded")} value={toKg(loaded)} />
            <Field label={k("wet_with_vehicle")} value={toKg(ticket.wetWithVehicle)} />
            <Field label={k("tare")} value={toKg(tare)} />
            <Field label={k("net")} value={toKg(ticket.net)} />
            {loaded !== null && tare !== null && <Field label={k("loaded_minus_tare")} value={toKg(loaded - tare)} />}
          </FieldGrid>
        </Section>

        <Section title={k("section_split")}>
          <FieldGrid>
            <Field label={k("dry")} value={toKg(dry)} />
            <Field label={k("wet")} value={toKg(wet)} />
            <Field label={k("mix")} value={toKg(mix)} />
            {splitParts.length > 0 && (
              <Field label={k("split_total")} value={toKg(splitParts.reduce((s, w) => s + w, 0))} />
            )}
          </FieldGrid>
        </Section>
      </div>
    </div>
  );
}

// Page numbers to show: first, last, and a window around the current page, with gaps as null.
const pageWindow = (page: number, pageCount: number): (number | null)[] => {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
};

function Pager({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-800 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">{t("dashboard.weighbridge.rows_per_page")}</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="whitespace-nowrap">{t("dashboard.weighbridge.page_range", { from, to, total })}</span>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t("dashboard.weighbridge.previous")}</span>
        </Button>
        {pageWindow(page, pageCount).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="sm"
              className="h-8 min-w-8 px-2 tabular-nums"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">{t("dashboard.weighbridge.next")}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</dl>;
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word text-sm font-medium tabular-nums">{value === undefined || value === null || value === "" ? "-" : value}</dd>
    </div>
  );
}
