import type { FilterMatchMode } from "primereact/api";

export type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
};

export type ModuleFilterOption = {
  label: string;
  value: string;
};

export type CommonAuditJsonValue =
  | string
  | number
  | boolean
  | null
  | CommonAuditJsonValue[]
  | { [key: string]: CommonAuditJsonValue };

export type AuditFilterOption = {
  unique_id: string;
  name: string;
};

export type AuditFilterOptions = {
  companies: AuditFilterOption[];
  projects: AuditFilterOption[];
  modules: string[];
  methods: string[];
  users: AuditFilterOption[];
};

export type CommonAuditRecord = {
  uuid?: string | number;
  module_name?: string;
  endpoint_name?: string;
  method?: string;
  object_id?: string | number;
  createdBy?: string;
  createdAt?: string;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_by_type?: string | null;
  previous_data?: CommonAuditJsonValue;
  new_data?: CommonAuditJsonValue;
  [key: string]: unknown;
};

export type DiffLine = { content: string; changed: boolean };
