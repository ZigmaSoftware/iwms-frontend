export type ProjectOption = {
  unique_id: string;
  name: string;
};

export type StaffUserTypeOption = {
  unique_id: string;
  name: string;
  usertype_name?: string;
};

export type ProjectStaffHierarchyRow = {
  unique_id: string;
  project_id: string;
  project_name?: string;
  staffusertype_id: string;
  staffusertype_name?: string;
  reports_to_staffusertype_id: string | null;
  reports_to_staffusertype_name?: string;
  level: number;
  is_active: boolean;
};
