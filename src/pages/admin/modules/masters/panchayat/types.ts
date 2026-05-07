import type { CompanyProjectFields } from "@/types";

export type LoginProfile = {
  role?: string;
  company_name?: string;
  company?: {
    name?: string;
  };
};

export type PanchayatListRecord = CompanyProjectFields & {
  unique_id: string;
  panchayat_name: string;
  state_name?: string;
  district_name?: string;
  city_name?: string;
  is_active: boolean;
};
