import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "@/lib/notify";
import ComponentCard from "@/components/common/ComponentCard";
import { Button } from "@/components/ui/button";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { getEncryptedRoute } from "@/utils/routeCache";
import { complaintTicketApi } from "@/features/complaintTicketing/api";
import type { ComplaintTicket } from "@/features/complaintTicketing/types";
import { errorText, formatDateTime } from "../utils";

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
    <div className="mt-1 text-sm text-gray-900">{value ? String(value) : "-"}</div>
  </div>
);

const ACTION_TAB_BUTTON_CLASS = (isActive: boolean) =>
  `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "!bg-[#22a855] !text-white shadow-sm"
      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400"
  }`;

type HistoryColumn<T> = { header: string; body: (row: T) => ReactNode };

function HistoryTable<T extends { unique_id: string }>({
  columns,
  rows,
  emptyMessage,
}: {
  columns: HistoryColumn<T>[];
  rows: T[];
  emptyMessage: string;
}) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-3 py-2 font-medium">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={row.unique_id}>
              {columns.map((col) => (
                <td key={col.header} className="px-3 py-2 align-top text-gray-700 dark:text-gray-300">{col.body(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { encComplaintTicket, encComplaint } = getEncryptedRoute();
  const { listPath } = createCrudRoutePaths(encComplaintTicket, encComplaint);
  const [ticket, setTicket] = useState<ComplaintTicket | null>(null);
  const [activeHistory, setActiveHistory] = useState(0);

  const load = async () => {
    if (!id) return;
    const ticketRow = await complaintTicketApi.read(id);
    setTicket(ticketRow as ComplaintTicket);
  };

  useEffect(() => {
    load().catch((err) => Swal.fire("Error", errorText(err, "Unable to load ticket"), "error"));
  }, [id]);

  if (!ticket || !id) return <div className="p-3">Loading...</div>;

  return (
    <div className="space-y-5 p-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">{ticket.ticket_no || ticket.unique_id}</h1>
          <p className="text-sm text-gray-500">Complaint ticket action center</p>
        </div>
        <Button variant="outline" onClick={() => navigate(listPath)}>Back</Button>
      </div>

      <ComponentCard title="Ticket Details">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Status" value={ticket.status_name || ticket.status_code} />
          <Field label="Priority" value={ticket.priority_code} />
          <Field label="Category" value={ticket.category_name} />
          <Field label="Subcategory" value={ticket.subcategory_name} />
          <Field label="Customer" value={ticket.customer_name || ticket.profile_name} />
          <Field label="Phone" value={ticket.wa_phone} />
          <Field label="Assigned Staff" value={ticket.assigned_staff_name} />
          <Field label="Escalated To" value={ticket.is_escalated ? ticket.escalated_to_staff_name : "-"} />
          <Field label="Escalation Level" value={ticket.escalation_level ?? 0} />
          <Field label="Next Escalation Due" value={formatDateTime(ticket.next_escalation_due_at)} />
          <Field label="Created" value={formatDateTime(ticket.created)} />
          <Field label="Resolved" value={formatDateTime(ticket.resolved_at)} />
          <Field label="Closed" value={formatDateTime(ticket.closed_at)} />
          <div className="md:col-span-4"><Field label="Title" value={ticket.title} /></div>
          <div className="md:col-span-4"><Field label="Description" value={ticket.description} /></div>
          <div className="md:col-span-4">
            <Field
              label="Location"
              value={
                [ticket.location_text, ticket.ward_name, ticket.zone_name, ticket.panchayat_name, ticket.district_name, ticket.state_name]
                  .filter(Boolean)
                  .join(", ")
              }
            />
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title="History">
        {(() => {
          const statusHistory = ticket.status_history ?? [];
          const escalationHistory = ticket.escalation_history ?? [];
          const historyTabs = [
            { label: "Status History", count: statusHistory.length },
            { label: "Escalations", count: escalationHistory.length },
          ];
          return (
            <>
              <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
                {historyTabs.map(({ label, count }, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveHistory(index)}
                    className={ACTION_TAB_BUTTON_CLASS(activeHistory === index)}
                  >
                    {label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs ${
                        activeHistory === index ? "bg-white/20" : "bg-gray-200 dark:bg-gray-800"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {activeHistory === 0 && (
                  <HistoryTable
                    rows={statusHistory}
                    emptyMessage="No status changes yet."
                    columns={[
                      { header: "Status", body: (item) => item.to_status_name || item.to_status_code || "-" },
                      { header: "Changed At", body: (item) => formatDateTime(item.changed_at) },
                      { header: "Remarks", body: (item) => item.remarks || "-" },
                    ]}
                  />
                )}
                {activeHistory === 1 && (
                  <HistoryTable
                    rows={escalationHistory}
                    emptyMessage="No escalations yet."
                    columns={[
                      { header: "Level", body: (item) => item.escalation_level ?? "-" },
                      { header: "To Staff", body: (item) => item.escalated_to_staff_name || "-" },
                      { header: "Escalated At", body: (item) => formatDateTime(item.escalated_at) },
                      { header: "Reason", body: (item) => item.reason || "-" },
                    ]}
                  />
                )}
              </div>
            </>
          );
        })()}
      </ComponentCard>
    </div>
  );
}
