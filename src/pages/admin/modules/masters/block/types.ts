import type { CompanyProjectFields } from "@/types";

export type BlockListRecord = CompanyProjectFields & {
  unique_id: string;
  block_name: string;
  ward_name?: string;
  is_active: boolean;
};
