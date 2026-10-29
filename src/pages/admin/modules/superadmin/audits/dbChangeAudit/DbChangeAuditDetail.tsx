import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DbChangeAuditDetail as DetailRecord } from "./types";
import { formatDateTime, OPERATION_COLORS } from "./format";

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="break-words text-sm text-gray-800">{children || "-"}</div>
  </div>
);

const formatValue = (value: unknown) => {
  if (value === undefined) return "";
  if (value === null) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function DbChangeAuditDetail({
  record,
  onClose,
}: {
  record: DetailRecord | null;
  onClose: () => void;
}) {
  const changed = new Set(record?.changed_columns ?? []);
  const columns = Object.keys(record?.new_data ?? record?.old_data ?? {});
  // Changed columns first, so an update reads at a glance.
  columns.sort((a, b) => Number(changed.has(b)) - Number(changed.has(a)));
  const showOld = record?.operation !== "INSERT";
  const showNew = record?.operation !== "DELETE";

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 pb-4 pr-12 pt-6">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{record?.table_name}</span>
            {record && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${OPERATION_COLORS[record.operation]}`}>
                {record.operation_label}
              </span>
            )}
          </DialogTitle>
          {record?.object_id && <p className="text-sm text-gray-500">{record.object_id}</p>}
        </DialogHeader>

        {record && (
          <div className="space-y-6 overflow-y-auto px-6 py-5">
            <section className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 p-4 md:grid-cols-4">
              <Field label="Changed at">{formatDateTime(record.changed_at)}</Field>
              <Field label="DB user (client host)">{record.db_user}</Field>
              <Field label="DB account">{record.db_account}</Field>
              <Field label="Connection id">{record.connection_id}</Field>
              <Field label="Company">{record.company_name || record.company_id}</Field>
              <Field label="Project">{record.project_name || record.project_id}</Field>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-800">
                {record.operation === "UPDATE" ? `Changed ${changed.size} column(s)` : "Row"}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Column</th>
                      {showOld && <th className="px-3 py-2 font-medium">Before</th>}
                      {showNew && <th className="px-3 py-2 font-medium">After</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column) => {
                      const isChanged = changed.has(column);
                      return (
                        <tr key={column} className={`border-t border-gray-100 ${isChanged ? "bg-amber-50" : ""}`}>
                          <td className={`px-3 py-1.5 align-top ${isChanged ? "font-medium text-amber-800" : "text-gray-600"}`}>
                            {column}
                          </td>
                          {showOld && (
                            <td className={`break-all px-3 py-1.5 align-top ${isChanged ? "text-red-700 line-through" : "text-gray-800"}`}>
                              {formatValue(record.old_data?.[column])}
                            </td>
                          )}
                          {showNew && (
                            <td className={`break-all px-3 py-1.5 align-top ${isChanged ? "text-green-700" : "text-gray-800"}`}>
                              {formatValue(record.new_data?.[column])}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
