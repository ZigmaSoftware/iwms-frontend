export type ApiError = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

export type HierarchyPayload = Record<string, unknown>;

export type HierarchyRecord = {
  unique_id?: string | number;
  level_name?: string;
  is_active?: boolean;
  company_id?: string | number | null;
  company_unique_id?: string | number | null;
  project_id?: string | number | null;
  project_unique_id?: string | number | null;
};
