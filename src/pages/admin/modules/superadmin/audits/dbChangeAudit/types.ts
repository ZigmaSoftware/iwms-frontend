/** One row of the DB Change Audit list — a change made on the database
 *  directly (outside the app), recorded by a trigger. */
export type DbChangeOperation = "INSERT" | "UPDATE" | "DELETE";

export type DbChangeAuditRecord = {
  id: number;
  table_name: string;
  operation: DbChangeOperation;
  operation_label: string;
  object_id?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  /** Columns an UPDATE changed; null for INSERT/DELETE. */
  changed_columns?: string[] | null;
  /** DB login and client host, e.g. "root@192.168.1.20". */
  db_user?: string | null;
  db_account?: string | null;
  connection_id?: number | null;
  changed_at: string;
};

export type DbChangeAuditDetail = DbChangeAuditRecord & {
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

type Option = { unique_id: string; name: string };

export type DbChangeAuditFilterOptions = {
  companies: Option[];
  projects: Option[];
  tables: Option[];
  operations: Option[];
};
