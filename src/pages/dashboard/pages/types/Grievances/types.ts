import type { LucideIcon } from "lucide-react";

export type GrievanceFilter =
  | "all"
  | "new"
  | "open"
  | "in_progress"
  | "priority_high"
  | "resolved";

export type SummaryCard = {
  label: string;
  value: number;
  subtext: string;
  /** Tailwind classes for the icon chip + active ring, per tone. */
  tone: { icon: string; active: string };
  Icon: LucideIcon;
  filter: GrievanceFilter;
};
