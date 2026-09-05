import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardList, ShieldCheck, Users } from "lucide-react";
import Swal from "@/lib/notify";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MetricCard } from "@/components/MetricCard";
import { FormSelect } from "@/components/common/FormSelect";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { getEncryptedRoute } from "@/utils/routeCache";
import { departmentApi } from "@/helpers/admin";
import { complaintDepartmentMemberApi, ticketActions } from "@/features/complaintTicketing/api";
import type { ComplaintDepartmentMember, ComplaintTicket } from "@/features/complaintTicketing/types";
import { asArray, errorText, formatDateTime } from "../utils";

const CLOSED_CODES = new Set(["RESOLVED", "CLOSED", "REJECTED", "CANCELLED"]);

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  ASSIGNED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  ESCALATED: "bg-red-50 text-red-700 border-red-200",
  REOPENED: "bg-purple-50 text-purple-700 border-purple-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-50 text-slate-600 border-slate-200",
};

function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || name[0]?.toUpperCase() || "?";
}

/** Load-bar color follows magnitude (a sequential scale), never member identity. */
function loadBarClass(count: number, max: number) {
  if (max <= 0) return "bg-slate-300";
  const ratio = count / max;
  if (ratio >= 0.85) return "bg-red-500";
  if (ratio >= 0.5) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const routes = getEncryptedRoute();
  // Use the `encComplaint` alias (not `encTickets`) so ticket-detail links
  // match the sidebar's "Complaint Desk" entry and the breadcrumb map —
  // both are keyed on `encComplaint`, and the two aliases serve the exact
  // same TicketList/TicketDetail components (see AdminEncryptedRouter.tsx),
  // so this doesn't change what renders, only which nav entry lights up.
  const { editPath: ticketEditPath } = createCrudRoutePaths(routes.encComplaintTicket, routes.encComplaint);

  const [departments, setDepartments] = useState<{ unique_id: string; department_name?: string }[]>([]);
  const [department, setDepartment] = useState("");
  const [roster, setRoster] = useState<ComplaintDepartmentMember[]>([]);
  const [tickets, setTickets] = useState<ComplaintTicket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      const rows = await departmentApi.readAll().catch(() => []);
      const list = asArray<{ unique_id: string; department_name?: string }>(rows);
      setDepartments(list);
      if (list.length && !department) {
        setDepartment(String(list[0].unique_id));
      }
    };
    loadDepartments().catch((err) => Swal.fire("Error", errorText(err, "Unable to load departments"), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async (departmentId: string) => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const [rosterRows, ticketRows] = await Promise.all([
        complaintDepartmentMemberApi.readAll({ params: { department: departmentId } }),
        ticketActions.departmentQueue(departmentId),
      ]);
      setRoster(
        asArray<ComplaintDepartmentMember>(rosterRows).filter(
          (row) => String(row.department) === departmentId,
        ),
      );
      setTickets(asArray<ComplaintTicket>(ticketRows));
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to load dashboard"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard(department);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department]);

  const members = useMemo(() => roster.filter((row) => !row.is_supervisor), [roster]);
  const supervisor = useMemo(() => roster.find((row) => row.is_supervisor), [roster]);
  const maxLoad = useMemo(
    () => Math.max(1, ...members.map((m) => m.open_ticket_count ?? 0)),
    [members],
  );

  const escalatedTickets = useMemo(() => tickets.filter((t) => t.is_escalated), [tickets]);
  const openCount = tickets.filter((t) => !CLOSED_CODES.has(String(t.status_code))).length;
  const resolvedCount = tickets.filter((t) => t.status_code === "RESOLVED" || t.status_code === "CLOSED").length;

  return (
    <div className="space-y-6 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Supervisor Dashboard</h1>
          <p className="text-sm text-muted-foreground">Department-wide ticket load and escalations, at a glance.</p>
        </div>
        <div className="w-64">
          <FormSelect
            value={department}
            onChange={setDepartment}
            options={departments.map((item) => ({ value: String(item.unique_id), label: item.department_name ?? "" }))}
            placeholder="Select department"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Open Tickets" value={openCount} icon={ClipboardList} />
        <MetricCard title="Escalated" value={escalatedTickets.length} icon={AlertTriangle} variant="warning" />
        <MetricCard title="Resolved" value={resolvedCount} icon={CheckCircle2} variant="success" />
        <MetricCard title="Team Size" value={members.length} icon={Users} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="border-slate-200 lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Member Load</CardTitle>
            <span className="text-xs text-muted-foreground">Open tickets per member</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && members.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading roster…</p>
            ) : members.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No members in this department.</p>
            ) : (
              members.map((member) => {
                const count = member.open_ticket_count ?? 0;
                return (
                  <div key={member.unique_id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600">
                        {initials(member.staff_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{member.staff_name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{count} open</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${loadBarClass(count, maxLoad)}`}
                          style={{ width: `${Math.min(100, (count / maxLoad) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Supervisor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supervisor ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {initials(supervisor.staff_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-foreground">{supervisor.staff_name}</p>
                  <p className="text-xs text-muted-foreground">Oversees the whole department queue</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No supervisor configured for this department.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Escalated Tickets</CardTitle>
          {escalatedTickets.length > 0 && (
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
              {escalatedTickets.length} need attention
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {escalatedTickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No escalations right now.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {escalatedTickets.map((ticket) => (
                <button
                  key={ticket.unique_id}
                  onClick={() => navigate(ticketEditPath(ticket.unique_id))}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ticket.ticket_no} · {ticket.title || ticket.category_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From {ticket.assigned_staff_name || "unassigned"} · {formatDateTime(ticket.created)}
                    </p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[ticket.status_code ?? ""] ?? ""}>
                    {ticket.status_name || ticket.status_code}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All Department Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && tickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading tickets…</p>
          ) : tickets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tickets for this department.</p>
          ) : (
            tickets.map((ticket) => (
              <button
                key={ticket.unique_id}
                onClick={() => navigate(ticketEditPath(ticket.unique_id))}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {ticket.ticket_no} · {ticket.title || ticket.category_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.assigned_staff_name || "Unassigned"} · {formatDateTime(ticket.created)}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_STYLES[ticket.status_code ?? ""] ?? ""}>
                  {ticket.status_name || ticket.status_code}
                </Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
