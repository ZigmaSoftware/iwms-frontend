import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ComplaintAuditDetail as DetailRecord,
  ComplaintAuditEvent,
  ComplaintAuditEventType,
} from "./types";
import { formatDateTime, formatDuration, STATUS_COLORS } from "./format";

const EVENT_STYLES: Record<ComplaintAuditEventType, { dot: string; icon: string }> = {
  CREATED: { dot: "bg-slate-500", icon: "pi pi-plus" },
  STATUS_CHANGED: { dot: "bg-blue-500", icon: "pi pi-arrow-right" },
  ASSIGNED: { dot: "bg-sky-500", icon: "pi pi-user" },
  ESCALATED: { dot: "bg-red-500", icon: "pi pi-arrow-up" },
  RESOLVED: { dot: "bg-green-600", icon: "pi pi-check" },
  CLOSED: { dot: "bg-emerald-700", icon: "pi pi-lock" },
  REOPENED: { dot: "bg-purple-600", icon: "pi pi-refresh" },
  FEEDBACK: { dot: "bg-amber-500", icon: "pi pi-star" },
  DELETED: { dot: "bg-gray-700", icon: "pi pi-trash" },
};

// Label shown above an event's remarks, so a resolution reads as the
// solution and a reopen as its reason rather than generic "remarks".
const REMARKS_LABEL: Partial<Record<ComplaintAuditEventType, string>> = {
  CREATED: "Complaint",
  RESOLVED: "Resolution / solution",
  REOPENED: "Reopen reason",
  ESCALATED: "Escalation reason",
  FEEDBACK: "Feedback",
  DELETED: "Delete reason",
  ASSIGNED: "Reason",
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="break-words text-sm text-gray-800">{children || "-"}</div>
  </div>
);

function eventDetails(event: ComplaintAuditEvent): string[] {
  const d = event.details;
  switch (event.type) {
    case "STATUS_CHANGED":
    case "RESOLVED":
    case "CLOSED":
      return d.from_status ? [`From ${d.from_status}`] : [];
    case "REOPENED":
      return d.previous_status ? [`Was ${d.previous_status}`] : [];
    case "ESCALATED":
      return [
        d.automatic ? "Automatic (SLA)" : "Manual",
        ...(d.escalated_to ? [`To ${d.escalated_to}`] : []),
      ];
    case "ASSIGNED":
      return [
        ...(d.from_staff ? [`From ${d.from_staff}`] : []),
        ...(d.to_staff ? [`To ${d.to_staff}`] : []),
      ];
    case "FEEDBACK":
      return [
        ...(d.rating != null ? [`Rating ${d.rating}/5`] : []),
        d.issue_solved ? "Issue solved" : "Issue not solved",
      ];
    case "CREATED":
      return [
        ...(d.reporter ? [`Reporter ${d.reporter}`] : []),
        ...(d.phone ? [String(d.phone)] : []),
      ];
    default:
      return [];
  }
}

export default function ComplaintAuditDetail({
  record,
  onClose,
}: {
  record: DetailRecord | null;
  onClose: () => void;
}) {
  const longestStatus = Math.max(1, ...(record?.status_durations ?? []).map((d) => d.seconds));

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 pb-4 pr-12 pt-6">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{record?.ticket_no}</span>
            {record?.status_name && (
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[record.status_code ?? ""] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {record.status_name}
              </span>
            )}
            {record?.is_deleted && (
              <span className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-white">Deleted</span>
            )}
          </DialogTitle>
          {record?.title && <p className="text-sm text-gray-500">{record.title}</p>}
        </DialogHeader>

        {record && (
          <div className="space-y-6 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-4">
              <Field label="Raised on">{formatDateTime(record.created)}</Field>
              <Field label="Raised by">{record.created_by_name}</Field>
              <Field label="Reporter">{record.reporter_name}</Field>
              <Field label="Source">{record.source_name}</Field>
              <Field label="Category">
                {[record.category_name, record.subcategory_name].filter(Boolean).join(" / ")}
              </Field>
              <Field label="Priority">{record.priority_name}</Field>
              <Field label="Assigned to">{record.assigned_staff_name}</Field>
              <Field label="Project">{record.project_name}</Field>
              <Field label="First resolved after">{formatDuration(record.first_resolution_seconds)}</Field>
              <Field label={record.completed_at ? "Total time taken" : "Open for"}>
                <span className={record.completed_at ? "" : "font-medium text-amber-700"}>
                  {formatDuration(record.completed_at ? record.total_resolution_seconds : record.open_seconds)}
                </span>
              </Field>
              <Field label="Reopened">{`${record.reopen_count} time(s)`}</Field>
              <Field label="Escalations">
                {record.escalation_count
                  ? `${record.escalation_count} (up to level ${record.max_escalation_level}, ${record.auto_escalation_count} automatic)`
                  : "None"}
              </Field>
              {record.feedback_rating != null && (
                <Field label="Feedback">
                  {`${record.feedback_rating}/5 · ${record.feedback_issue_solved ? "solved" : "not solved"}`}
                </Field>
              )}
              {record.is_deleted && <Field label="Delete reason">{record.delete_reason}</Field>}
            </section>

            {record.status_durations.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Time in each status</h3>
                <div className="space-y-2">
                  {record.status_durations.map((d) => (
                    <div key={d.status_code ?? d.status_name ?? ""} className="flex items-center gap-3 text-sm">
                      <span className="w-28 shrink-0 truncate text-gray-600">{d.status_name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-green-600"
                          style={{ width: `${Math.max(2, (d.seconds / longestStatus) * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right tabular-nums text-gray-800">
                        {formatDuration(d.seconds)}
                      </span>
                      {d.times_entered > 1 && (
                        <span className="w-12 shrink-0 text-xs text-gray-500">×{d.times_entered}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-800">Timeline</h3>
              <ol>
                {record.timeline.map((event, index) => {
                  const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.STATUS_CHANGED;
                  const details = eventDetails(event);
                  const isLast = index === record.timeline.length - 1;
                  return (
                    <li key={`${event.type}-${event.at}-${index}`} className="flex gap-3">
                      {/* Icon column: the dot, plus a line down to the next event. */}
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white ${style.dot}`}
                        >
                          <i className={style.icon} />
                        </span>
                        {!isLast && <span className="w-px flex-1 bg-gray-200" />}
                      </div>
                      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-5"}`}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 pt-0.5">
                          <span className="font-medium text-gray-800">{event.title}</span>
                          <span className="text-xs text-gray-500">
                            {event.at ? formatDateTime(event.at) : "Time not recorded"}
                            {event.type !== "CREATED" && event.elapsed_seconds != null
                              ? ` · +${formatDuration(event.elapsed_seconds)} after creation`
                              : ""}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {[event.actor_name ? `by ${event.actor_name}` : null, ...details]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        {event.remarks && (
                          <div className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {REMARKS_LABEL[event.type] && (
                              <div className="mb-0.5 text-xs font-medium text-gray-500">
                                {REMARKS_LABEL[event.type]}
                              </div>
                            )}
                            <div className="whitespace-pre-line">{event.remarks}</div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
