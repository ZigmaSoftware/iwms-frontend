import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Inbox, MapPin, RefreshCcw, Timer } from "lucide-react";
import Swal from "@/lib/notify";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterBarSelect } from "@/components/common/FilterBar";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { complaintTicketApi, ticketActions } from "@/features/complaintTicketing/api";
import type { ComplaintTicket } from "@/features/complaintTicketing/types";
import { asArray, errorText, formatDateTime } from "../utils";

const CLOSED_CODES = new Set(["RESOLVED", "CLOSED", "REJECTED", "CANCELLED"]);

const PRIORITY_STYLES: Record<string, string> = {
  P1: "bg-red-50 text-red-700 border-red-200",
  P2: "bg-orange-50 text-orange-700 border-orange-200",
  P3: "bg-amber-50 text-amber-700 border-amber-200",
  P4: "bg-slate-50 text-slate-600 border-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  ASSIGNED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  ESCALATED: "bg-red-50 text-red-700 border-red-200",
  REOPENED: "bg-purple-50 text-purple-700 border-purple-200",
};

/** "2h 14m" / "45m" / "38s" — always the single most significant unit pair. */
function formatDuration(totalSeconds: number) {
  const abs = Math.abs(totalSeconds);
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const seconds = Math.floor(abs % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Ticks every second so the escalation countdown stays live without a full data refresh. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Live "time left before this ticket auto-escalates to the next level"
 * readout. Since a breach auto-escalates the ticket (no manual Escalate
 * action needed), this replaces that button — resolve-within-minutes for
 * the ticket's current escalation_level (which varies by role/level) drives
 * both the deadline and, on breach, who it moves to next. */
function EscalationTimer({ ticket }: { ticket: ComplaintTicket }) {
  const now = useNow();
  if (!ticket.next_escalation_due_at) return null;

  const dueAt = new Date(ticket.next_escalation_due_at).getTime();
  const remainingSeconds = Math.floor((dueAt - now) / 1000);
  const levelLabel = ticket.escalation_level_name
    ? `Level ${ticket.escalation_level ?? 0} — ${ticket.escalation_level_name}`
    : `Level ${ticket.escalation_level ?? 0}`;
  const overdue = remainingSeconds <= 0;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${overdue ? "font-medium text-red-600" : "text-muted-foreground"}`}
    >
      <Timer className="h-3.5 w-3.5 shrink-0" />
      <span>
        {overdue ? "Overdue — escalating" : `Escalates in ${formatDuration(remainingSeconds)}`}
        {" · "}
        {levelLabel}
      </span>
    </div>
  );
}

function TicketCard({
  ticket,
  busy,
  onResolve,
  onOpen,
}: {
  ticket: ComplaintTicket;
  busy: boolean;
  onResolve: (id: string, remarks: string) => void;
  onOpen: (id: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const priorityClass = PRIORITY_STYLES[ticket.priority_code ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-200";
  const statusClass = STATUS_STYLES[ticket.status_code ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <Card className="group relative overflow-hidden border-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md">
      {ticket.is_escalated && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 to-orange-400" />
      )}
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {ticket.ticket_no || ticket.unique_id}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {ticket.category_name}
            {ticket.subcategory_name ? ` · ${ticket.subcategory_name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {ticket.priority_code && (
            <Badge variant="outline" className={priorityClass}>
              {ticket.priority_code}
            </Badge>
          )}
          {ticket.is_escalated && (
            <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700">
              <AlertTriangle className="h-3 w-3" /> Escalated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="line-clamp-2 text-sm text-foreground/90">
          {ticket.title || ticket.description || "No description provided."}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ticket.location_text && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {ticket.location_text}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatDateTime(ticket.created)}
          </span>
        </div>
        <EscalationTimer ticket={ticket} />
        <Input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks"
          className="h-8 text-xs"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="outline" className={statusClass}>
            {ticket.status_name || ticket.status_code}
          </Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpen(ticket.unique_id)}>
              Open
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onResolve(ticket.unique_id, remarks)}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Resolve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResolvedTicketCard({
  ticket,
  busy,
  onReopen,
  onOpen,
}: {
  ticket: ComplaintTicket;
  busy: boolean;
  onReopen: (id: string, remarks: string) => void;
  onOpen: (id: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const priorityClass = PRIORITY_STYLES[ticket.priority_code ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {ticket.ticket_no || ticket.unique_id}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {ticket.category_name}
            {ticket.subcategory_name ? ` · ${ticket.subcategory_name}` : ""}
          </p>
        </div>
        {ticket.priority_code && (
          <Badge variant="outline" className={priorityClass}>
            {ticket.priority_code}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="line-clamp-2 text-sm text-foreground/90">
          {ticket.title || ticket.description || "No description provided."}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Resolved {formatDateTime(ticket.resolved_at)}
          </span>
        </div>
        <Input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Remarks"
          className="h-8 text-xs"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Resolved
          </Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpen(ticket.unique_id)}>
              Open
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onReopen(ticket.unique_id, remarks)}>
              <RefreshCcw className="mr-1 h-4 w-4" /> Reopen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyTasks() {
  const navigate = useNavigate();
  const routes = getEncryptedRoute();
  // `encComplaint` (not `encTickets`) so ticket links match the sidebar's
  // "Complaint Desk" entry and the breadcrumb map.
  const { editPath } = createCrudRoutePaths(routes.encComplaintTicket, routes.encComplaint);

  const {
    companyUniqueId,
    projects,
    projectId,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, defaultToAll: true });

  const selectedProjectId =
    projectId && projects.some((project) => project.value === projectId) ? projectId : "";

  const [tickets, setTickets] = useState<ComplaintTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justResolvedFlash, setJustResolvedFlash] = useState(false);

  const buildParams = () => ({
    ...(companyUniqueId ? { company_id: companyUniqueId } : {}),
    ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
  });

  const loadOwnTasks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await complaintTicketApi.readAll({ params: buildParams() });
      setTickets(asArray<ComplaintTicket>(rows));
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to load your tasks"), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, selectedProjectId]);

  // Silent background poll — same fetch as `loadOwnTasks` but skips the
  // loading spinner and error toast, so a card's escalation/status flips to
  // its post-breach state within a few seconds of the backend cron sweep
  // actually escalating it, without the user needing to click Refresh.
  const pollOwnTasks = useCallback(async () => {
    try {
      const rows = await complaintTicketApi.readAll({ params: buildParams() });
      setTickets(asArray<ComplaintTicket>(rows));
    } catch {
      // Transient poll failure — the next tick retries; no need to surface it.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, selectedProjectId]);

  useEffect(() => {
    void loadOwnTasks();
  }, [loadOwnTasks]);

  useEffect(() => {
    const id = setInterval(() => void pollOwnTasks(), 5000);
    return () => clearInterval(id);
  }, [pollOwnTasks]);

  const [view, setView] = useState<"open" | "escalated" | "resolved">("open");

  const openTickets = useMemo(
    () => tickets.filter((t) => !CLOSED_CODES.has(String(t.status_code))),
    [tickets],
  );
  const escalatedTickets = useMemo(
    () => openTickets.filter((t) => t.is_escalated),
    [openTickets],
  );
  const resolvedTickets = useMemo(
    () => tickets.filter((t) => String(t.status_code) === "RESOLVED"),
    [tickets],
  );

  const summaryOpen = openTickets.length;
  const summaryTotal = tickets.length;
  const summaryEscalated = escalatedTickets.length;
  const summaryResolved = resolvedTickets.length;

  const handleResolve = async (id: string, remarks: string) => {
    setBusyId(id);
    try {
      await ticketActions.resolve(id, { resolution_note: remarks || undefined });
      setJustResolvedFlash(true);
      setTimeout(() => setJustResolvedFlash(false), 2500);
      await loadOwnTasks();
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to resolve ticket"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleReopen = async (id: string, remarks: string) => {
    setBusyId(id);
    try {
      await ticketActions.reopen(id, { reopen_reason: remarks || undefined });
      await loadOwnTasks();
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to reopen ticket"), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Complaints assigned to you or escalated to you.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterBarSelect
            value={companyUniqueId || ""}
            onChange={(value) => onCompanyChange(value)}
            options={companies}
            placeholder="All Companies"
            disabled={!isSuperAdmin || companies.length === 0}
          />
          <FilterBarSelect
            value={selectedProjectId}
            onChange={(value) => setProjectId(value)}
            options={projects.map((project) => ({
              value: String(project.value),
              label: project.label || project.value,
            }))}
            placeholder={showAllProjectsOption ? "All Projects" : undefined}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
          />
          <Button variant="outline" size="sm" onClick={() => loadOwnTasks()} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          className={`cursor-pointer border-slate-200 transition-colors ${view === "open" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setView("open")}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Open</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summaryOpen}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer border-slate-200 transition-colors ${view === "escalated" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setView("escalated")}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Escalated</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summaryEscalated}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer border-slate-200 transition-colors ${view === "resolved" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setView("resolved")}
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Resolved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{summaryResolved}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summaryTotal}</p>
          </CardContent>
        </Card>
      </div>

      {justResolvedFlash && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Resolved — checking for your next ticket…
        </div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading your tasks…</div>
      ) : view === "resolved" ? (
        resolvedTickets.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/60">
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <Inbox className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-foreground">No resolved tickets yet</p>
              <p className="text-xs text-muted-foreground">
                Tickets you resolve will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resolvedTickets.map((ticket) => (
              <ResolvedTicketCard
                key={ticket.unique_id}
                ticket={ticket}
                busy={busyId === ticket.unique_id}
                onReopen={handleReopen}
                onOpen={(id) => navigate(editPath(id))}
              />
            ))}
          </div>
        )
      ) : view === "escalated" ? (
        escalatedTickets.length === 0 ? (
          <Card className="border-dashed border-slate-300 bg-slate-50/60">
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <Inbox className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-foreground">Nothing escalated right now</p>
              <p className="text-xs text-muted-foreground">
                Tickets that breach their SLA and escalate will show up here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {escalatedTickets.map((ticket) => (
              <TicketCard
                key={ticket.unique_id}
                ticket={ticket}
                busy={busyId === ticket.unique_id}
                onResolve={handleResolve}
                onOpen={(id) => navigate(editPath(id))}
              />
            ))}
          </div>
        )
      ) : openTickets.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-slate-50/60">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-foreground">You're all caught up</p>
            <p className="text-xs text-muted-foreground">
              No open tickets right now — new ones will appear here as they're assigned.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {openTickets.map((ticket) => (
            <TicketCard
              key={ticket.unique_id}
              ticket={ticket}
              busy={busyId === ticket.unique_id}
              onResolve={handleResolve}
              onOpen={(id) => navigate(editPath(id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
