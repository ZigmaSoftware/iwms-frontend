/** Consistent color coding for waste-type badges/chips across list pages. */
export const WASTE_TYPE_COLORS: Record<string, string> = {
  dry: "bg-amber-100 text-amber-800",
  wet: "bg-green-100 text-green-800",
  mixed: "bg-purple-100 text-purple-800",
  sanitary: "bg-rose-100 text-rose-800",
};

const DEFAULT_COLOR = "bg-slate-100 text-slate-700";

/** Matches a waste-type label (e.g. "Dry Waste", "wet") against the known palette. */
export const wasteTypeColorClass = (label?: string | null): string => {
  if (!label) return DEFAULT_COLOR;
  const key = label.toLowerCase();
  if (key.includes("dry")) return WASTE_TYPE_COLORS.dry;
  if (key.includes("wet")) return WASTE_TYPE_COLORS.wet;
  if (key.includes("mixed")) return WASTE_TYPE_COLORS.mixed;
  if (key.includes("sanitary")) return WASTE_TYPE_COLORS.sanitary;
  return DEFAULT_COLOR;
};
