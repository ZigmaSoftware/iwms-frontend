import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  MapPin,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import Swal from "@/lib/notify";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { getEncryptedRoute } from "@/utils/routeCache";
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

function TicketCard({
  ticket,
  busy,
  onResolve,
  onEscalate,
  onOpen,
}: {
  ticket: ComplaintTicket;
  busy: boolean;
  onResolve: (id: string) => void;
  onEscalate: (id: string) => void;
  onOpen: (id: string) => void;
}) {
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
        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="outline" className={statusClass}>
            {ticket.status_name || ticket.status_code}
          </Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpen(ticket.unique_id)}>
              Open
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onEscalate(ticket.unique_id)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Escalate
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onResolve(ticket.unique_id)}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Resolve
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
  // "Complaint Desk" entry and the breadcrumb map — see the note in
  // SupervisorDashboard.tsx.
  const { editPath } = createCrudRoutePaths(routes.encComplaintTicket, routes.encComplaint);

  const [tickets, setTickets] = useState<ComplaintTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justResolvedFlash, setJustResolvedFlash] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await complaintTicketApi.readAll();
      setTickets(asArray<ComplaintTicket>(rows));
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to load your tasks"), "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openTickets = useMemo(
    () => tickets.filter((t) => !CLOSED_CODES.has(String(t.status_code))),
    [tickets],
  );
  const escalatedCount = openTickets.filter((t) => t.is_escalated).length;

  const handleResolve = async (id: string) => {
    setBusyId(id);
    try {
      await ticketActions.resolve(id, {});
      setJustResolvedFlash(true);
      setTimeout(() => setJustResolvedFlash(false), 2500);
      await load();
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to resolve ticket"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleEscalate = async (id: string) => {
    setBusyId(id);
    try {
      await ticketActions.escalate(id, {});
      await load();
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to escalate ticket"), "error");
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
            Complaints assigned to you. Resolve one and your next ticket appears automatically.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Open</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{openTickets.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Escalated</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{escalatedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex items-center gap-2 p-4">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs font-medium text-emerald-700">Auto-assign</p>
              <p className="text-xs text-emerald-600">Next ticket lands here on resolve</p>
            </div>
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
              onEscalate={handleEscalate}
              onOpen={(id) => navigate(editPath(id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
