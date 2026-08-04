import type { ReactNode } from "react";

export type GrievanceStatus =
  | "open"
  | "processing"
  | "progressing"
  | "in-progress"
  | "resolved"
  | "closed"
  | string;

export interface Grievance {
  id: number;
  unique_id: string;
  title?: string;
  category?: string;
  zone_id?: string;
  zone_name?: string;
  ward_id?: string;
  ward_name?: string;
  description?: string;
  details?: string;
  status?: GrievanceStatus;
  created?: string;
  complaint_closed_at?: string;
  contact_no?: string;
  address?: string;
  image_url?: string;
  close_image_url?: string;
  action_remarks?: string;
  main_category?: string;
  sub_category?: string;
  // Backend's ComplaintSerializer uses `fields = "__all__"` on the Complaint
  // model, which has a `priority` field (HIGH/MEDIUM/LOW) — it's already
  // returned by the API, this type was just incomplete.
  priority?: string;
}

export interface InfoFieldProps {
  label: string;
  value?: ReactNode;
}

export interface AttachmentPreviewProps {
  label: string;
  fileUrl?: string | null;
}
