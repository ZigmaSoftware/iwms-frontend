import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

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
import {
  fetchGrievanceCount,
  fetchGrievancePage,
  fetchGrievancePriorities,
  type GrievanceParams,
} from "@/features/grievances/api";
import { AttachmentPreview } from "@/features/grievances/components/AttachmentPreview";
import { GrievanceAnalytics } from "@/features/grievances/components/GrievanceAnalytics";
import type { ComplaintPriority, ComplaintTicket } from "@/features/complaintTicketing/types";
import { cn } from "@/lib/utils";
import type { GrievanceFilter, SummaryCard } from "./types/Grievances/types";

// P1 = Emergency, P2 = High (see ticket_priority_seeder).
const HIGH_PRIORITIES = ["P1", "P2"];
const PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

// Each KPI tile maps to server-side filters on the ticket list / counts
// endpoints. Status buckets are defined in ticket_viewset._status_bucket_q.
const FILTER_PARAMS: Record<GrievanceFilter, GrievanceParams> = {
  all: {},
  new: { created_on: "today" },
  open: { status: "open" },
  in_progress: { status: "in_progress" },
  priority_high: { status: "open", priority: HIGH_PRIORITIES.join(",") },
  resolved: { status: "resolved" },
};
const FILTERS = Object.keys(FILTER_PARAMS) as GrievanceFilter[];
const EMPTY_COUNTS = Object.fromEntries(FILTERS.map((f) => [f, 0])) as Record<GrievanceFilter, number>;

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-200",
  ASSIGNED: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-200",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200",
  ESCALATED: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200",
  REOPENED: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-950/40 dark:text-orange-200",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200",
  default: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
};

const PRIORITY_DOT: Record<string, string> = {
  P1: "bg-rose-500",
  P2: "bg-orange-500",
  P3: "bg-sky-500",
  P4: "bg-slate-400",
};

const statusCode = (g: ComplaintTicket) => (g.status_code ?? "").toUpperCase();
const priorityCode = (g: ComplaintTicket) => (g.priority_code ?? "").toUpperCase();

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDuration = (seconds: number) => {
  const mins = Math.round(Math.abs(seconds) / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
};

// The tile filter and the priority dropdown both narrow `priority`; combine
// them so "High priority" + "Normal" correctly yields nothing.
const buildListParams = (filter: GrievanceFilter, priority: string, search: string): GrievanceParams => {
  const params = { ...FILTER_PARAMS[filter] };
  if (priority !== "all") {
    const allowed = params.priority?.split(",");
    params.priority = !allowed || allowed.includes(priority) ? priority : "__none__";
  }
  if (search) params.search = search;
  return params;
};

const locationLabel = (g: ComplaintTicket) =>
  [g.ward_name, g.zone_name, g.panchayat_name].filter(Boolean).join(", ") ||
  g.district_name ||
  "-";

export default function Grievances() {
  const { t } = useTranslation();
  const [priorities, setPriorities] = useState<ComplaintPriority[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GrievanceFilter>("all");
  const [priority, setPriority] = useState("all");
  const [selected, setSelected] = useState<ComplaintTicket | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  // Bumped by Refresh to re-run both fetches with unchanged filters.
  const [reloadKey, setReloadKey] = useState(0);

  // Each result remembers which request produced it; a mismatch with the
  // current request key means that fetch is still in flight.
  const listKey = JSON.stringify([page, pageSize, filter, priority, search, reloadKey]);
  const [list, setList] = useState<{ key: string; rows: ComplaintTicket[]; total: number; error: boolean }>({
    key: "",
    rows: [],
    total: 0,
    error: false,
  });
  const [countsResult, setCountsResult] = useState({ key: -1, counts: EMPTY_COUNTS });

  // Any change to what's listed starts back at the first page.
  const changeFilter = (next: GrievanceFilter) => {
    setFilter(next);
    setPage(1);
  };
  const changePriority = (next: string) => {
    setPriority(next);
    setPage(1);
  };
  const changePageSize = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // One page of the table, fetched from the server.
  useEffect(() => {
    const controller = new AbortController();
    fetchGrievancePage(page, pageSize, buildListParams(filter, priority, search), controller.signal)
      .then(({ rows, total }) => setList({ key: listKey, rows, total, error: false }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load complaints", err);
        setList((prev) => ({ ...prev, key: listKey, error: true }));
      });
    return () => controller.abort();
  }, [listKey, page, pageSize, filter, priority, search]);

  // KPI totals — independent of the table's search/priority/page.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(FILTERS.map((f) => fetchGrievanceCount(FILTER_PARAMS[f], controller.signal)))
      .then((values) =>
        setCountsResult({
          key: reloadKey,
          counts: Object.fromEntries(FILTERS.map((f, i) => [f, values[i]])) as Record<GrievanceFilter, number>,
        }),
      )
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Unable to load complaint counts", err);
        setCountsResult((prev) => ({ ...prev, key: reloadKey }));
      });
    return () => controller.abort();
  }, [reloadKey]);

  const { rows, total } = list;
  const listLoading = list.key !== listKey;
  const error = !listLoading && list.error ? t("dashboard.grievances.error_load_failed") : null;
  const counts = countsResult.counts;
  const countsLoading = countsResult.key !== reloadKey;

  useEffect(() => {
    const controller = new AbortController();
    fetchGrievancePriorities(controller.signal)
      .then(setPriorities)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // The layout scrolls the window; hide its scrollbar on this page only.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("scrollbar-none");
    return () => root.classList.remove("scrollbar-none");
  }, []);

  const loading = listLoading || countsLoading;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);

  const summaryCards: SummaryCard[] = [
    {
      label: t("dashboard.grievances.summary_total"),
      subtext: t("dashboard.grievances.summary_total_subtext"),
      value: counts.all,
      Icon: MessageSquare,
      filter: "all",
      tone: { icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300", active: "ring-sky-500" },
    },
    {
      label: t("dashboard.grievances.summary_new"),
      subtext: t("dashboard.grievances.summary_new_subtext"),
      value: counts.new,
      Icon: Sparkles,
      filter: "new",
      tone: { icon: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300", active: "ring-violet-500" },
    },
    {
      label: t("dashboard.grievances.summary_open"),
      subtext: t("dashboard.grievances.summary_open_subtext"),
      value: counts.open,
      Icon: Inbox,
      filter: "open",
      tone: { icon: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300", active: "ring-rose-500" },
    },
    {
      label: t("dashboard.grievances.summary_in_progress"),
      subtext: t("dashboard.grievances.summary_in_progress_subtext"),
      value: counts.in_progress,
      Icon: Clock,
      filter: "in_progress",
      tone: { icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300", active: "ring-amber-500" },
    },
    {
      label: t("dashboard.grievances.summary_priority"),
      subtext: t("dashboard.grievances.summary_priority_subtext"),
      value: counts.priority_high,
      Icon: AlertTriangle,
      filter: "priority_high",
      tone: { icon: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300", active: "ring-orange-500" },
    },
    {
      label: t("dashboard.grievances.summary_resolved"),
      subtext: t("dashboard.grievances.summary_resolved_subtext"),
      value: counts.resolved,
      Icon: CheckCircle2,
      filter: "resolved",
      tone: { icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", active: "ring-emerald-500" },
    },
  ];

  const statusBadge = (g: ComplaintTicket) => (
    <Badge variant="outline" className={cn("whitespace-nowrap font-medium", STATUS_BADGE[statusCode(g)] ?? STATUS_BADGE.default)}>
      {g.status_name || g.status_code || t("dashboard.grievances.status_unknown")}
    </Badge>
  );

  const priorityTag = (g: ComplaintTicket) =>
    g.priority_code ? (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
        <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[priorityCode(g)] ?? "bg-slate-400")} />
        {g.priority_name || g.priority_code}
      </span>
    ) : (
      <span className="text-xs text-muted-foreground">-</span>
    );

  const filtersActive = filter !== "all" || priority !== "all" || searchInput !== "";

  return (
    <div className="text-slate-900 dark:text-slate-100">
      <div className="space-y-5 pb-10">
        {/* HEADER */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t("dashboard.grievances.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("dashboard.grievances.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} disabled={loading} className="gap-2 bg-white dark:bg-slate-900">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {t("dashboard.grievances.refresh")}
          </Button>
        </div>

        {/* KPI TILES — double as the list filter */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {summaryCards.map(({ label, subtext, value, Icon, filter: f, tone }) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => changeFilter(active && f !== "all" ? "all" : f)}
                aria-pressed={active}
                className={cn(
                  "group rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
                  active ? cn("ring-2", tone.active) : "border-slate-200",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
                  <span className={cn("rounded-lg p-1.5", tone.icon)}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums">{countsLoading ? "–" : value}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtext}</p>
              </button>
            );
          })}
        </div>

        <GrievanceAnalytics reloadKey={reloadKey} />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        {/* LIST */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("dashboard.grievances.search_placeholder")}
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select value={priority} onValueChange={changePriority}>
              <SelectTrigger className="md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dashboard.grievances.all_priorities")}</SelectItem>
                {priorities.map((p) => (
                  <SelectItem key={p.priority_code} value={p.priority_code}>{p.priority_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-3">
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => {
                    setFilter("all");
                    setPriority("all");
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("dashboard.grievances.clear_filter")}
                </Button>
              )}
            </div>
          </div>

          {listLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-50" />
              {t("dashboard.grievances.empty")}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-sm md:table">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t("dashboard.grievances.list.ticket")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("dashboard.grievances.list.category")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("dashboard.grievances.list.location")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("dashboard.grievances.list.priority")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("dashboard.grievances.list.status")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("dashboard.grievances.list.raised")}</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((g) => (
                    <tr
                      key={g.unique_id}
                      onClick={() => setSelected(g)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="max-w-xs px-4 py-3">
                        <p className="font-mono text-xs text-muted-foreground">{g.ticket_no || g.unique_id}</p>
                        <p className="truncate font-medium">{g.title || g.category_name || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{g.category_name || "-"}</p>
                        {g.subcategory_name && <p className="text-xs text-muted-foreground">{g.subcategory_name}</p>}
                      </td>
                      <td className="max-w-56 px-4 py-3">
                        <p className="truncate">{locationLabel(g)}</p>
                      </td>
                      <td className="px-4 py-3">{priorityTag(g)}</td>
                      <td className="px-4 py-3">{statusBadge(g)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateTime(g.created)}</td>
                      <td className="pr-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile list */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                {rows.map((g) => (
                  <li key={g.unique_id}>
                    <button type="button" onClick={() => setSelected(g)} className="w-full space-y-1.5 px-4 py-3 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{g.ticket_no || g.unique_id}</span>
                        {statusBadge(g)}
                      </div>
                      <p className="font-medium">{g.title || g.category_name || "-"}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {priorityTag(g)}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {locationLabel(g)}
                        </span>
                        <span>{formatDateTime(g.created)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <Pager
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={changePageSize}
              />
            </>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {selected && <GrievanceDetail ticket={selected} statusBadge={statusBadge(selected)} priorityTag={priorityTag(selected)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function GrievanceDetail({
  ticket: g,
  statusBadge,
  priorityTag,
}: {
  ticket: ComplaintTicket;
  statusBadge: ReactNode;
  priorityTag: ReactNode;
}) {
  const { t } = useTranslation();
  const k = (key: string) => t(`dashboard.grievances.${key}`);

  const sla = g.sla_time_remaining_seconds;
  const timeline = g.public_timeline ?? [];
  const attachments = (g.attachments ?? []).filter((a) => a.file_url);
  const hasCoords = g.latitude && g.longitude;

  return (
    <div className="flex flex-col">
      <SheetHeader className="space-y-3 border-b border-slate-200 bg-slate-50 p-6 text-left dark:border-slate-800 dark:bg-slate-900/60">
        <p className="font-mono text-xs text-muted-foreground">{g.ticket_no || g.unique_id}</p>
        <SheetTitle className="text-xl leading-snug">{g.title || g.category_name || k("dialog_title")}</SheetTitle>
        <SheetDescription asChild>
          <div className="flex flex-wrap items-center gap-3">
            {statusBadge}
            {priorityTag}
            {typeof sla === "number" && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  sla < 0 ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {sla < 0 ? k("sla_overdue") : t("dashboard.grievances.sla_left", { time: formatDuration(sla) })}
              </span>
            )}
          </div>
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-6">
        <Section title={k("section.description")}>
          <p className="whitespace-pre-wrap text-sm">{g.description || k("info.no_description")}</p>
        </Section>

        <Section title={k("section.complaint")}>
          <FieldGrid>
            <Field label={k("fields.category")} value={g.category_name} />
            <Field label={k("info.subcategory")} value={g.subcategory_name} />
            <Field label={k("info.module")} value={g.module_name} />
            <Field label={k("info.source")} value={g.source_code} />
            <Field label={k("detail.created")} value={formatDateTime(g.created)} />
            {g.waste_type_names?.length ? <Field label={k("info.waste_types")} value={g.waste_type_names.join(", ")} /> : null}
          </FieldGrid>
        </Section>

        <Section title={k("section.reporter")}>
          <FieldGrid>
            <Field label={k("info.name")} value={g.reporter_name || g.customer_name || g.profile_name || k("info.anonymous")} />
            <Field label={k("info.type")} value={g.reporter_type} />
            <Field label={k("info.phone")} value={g.wa_phone} />
            <Field label={k("info.email")} value={g.email} />
          </FieldGrid>
        </Section>

        <Section title={k("section.location")}>
          <FieldGrid>
            <Field label={k("info.district")} value={g.district_name} />
            <Field label={k("info.panchayat")} value={g.panchayat_name} />
            <Field label={k("fields.zone")} value={g.zone_name} />
            <Field label={k("fields.ward")} value={g.ward_name} />
          </FieldGrid>
          {(g.location_text || hasCoords) && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900/60">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                {g.location_text && <p>{g.location_text}</p>}
                {hasCoords && (
                  <a
                    href={`https://www.google.com/maps?q=${g.latitude},${g.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-300"
                  >
                    {k("info.open_map")}
                  </a>
                )}
              </div>
            </div>
          )}
        </Section>

        <Section title={k("section.handling")}>
          <FieldGrid>
            <Field label={k("info.assigned_to")} value={g.assigned_staff_name || k("info.unassigned")} />
            <Field label={k("info.escalation_level")} value={g.escalation_level_name} />
            {g.is_escalated && <Field label={k("info.escalated_to")} value={g.escalated_to_staff_name} />}
            <Field label={k("info.sla_due")} value={formatDateTime(g.next_escalation_due_at)} />
            <Field label={k("info.resolved_at")} value={formatDateTime(g.resolved_at)} />
            <Field label={k("detail.closed_at")} value={formatDateTime(g.closed_at)} />
            {!!g.reopened_count && <Field label={k("info.reopened")} value={g.reopened_count} />}
          </FieldGrid>
        </Section>

        <Section title={k("section.attachments")}>
          {g.image_url || g.close_image_url || attachments.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {g.image_url && <AttachmentPreview label={k("detail.uploaded_file")} fileUrl={g.image_url} />}
              {g.close_image_url && <AttachmentPreview label={k("detail.close_file")} fileUrl={g.close_image_url} />}
              {attachments.map((a) => (
                <AttachmentPreview key={a.unique_id} label={a.file_name || a.file_type || ""} fileUrl={a.file_url} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{k("info.no_attachments")}</p>
          )}
        </Section>

        <Section title={k("section.timeline")}>
          {timeline.length ? (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
              {timeline.map((item, i) => (
                <li key={`${item.status_code}-${item.at}-${i}`} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-sky-500 dark:border-slate-950" />
                  <p className="text-sm font-medium">{item.status_name || item.status_code}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(item.at)}</p>
                  {item.remarks && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.remarks}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">{k("info.no_timeline")}</p>
          )}
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
        <span className="whitespace-nowrap">{t("dashboard.grievances.rows_per_page")}</span>
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
        <span className="whitespace-nowrap">
          {t("dashboard.grievances.page_range", { from, to, total })}
        </span>
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
          <span className="hidden sm:inline">{t("dashboard.grievances.previous")}</span>
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
          <span className="hidden sm:inline">{t("dashboard.grievances.next")}</span>
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
      <dd className="wrap-break-word text-sm font-medium">{value === undefined || value === null || value === "" ? "-" : value}</dd>
    </div>
  );
}
