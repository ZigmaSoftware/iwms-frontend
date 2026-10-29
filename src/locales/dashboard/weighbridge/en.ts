/* Dashboard: weighbridge.
   Keys are unchanged — this file only groups them by module.
   Merged back into one resource by locales/index.ts. */
export default {
  "weighbridge": {
    "title": "Weighbridge Log",
    "subtitle": "Weighbridge entries checked for missing, repeated and inconsistent weights",
    "refresh": "Refresh",
    "to": "to",
    "range_invalid": "From date must be on or before To date.",
    "limited_checks": "The vehicle master could not be loaded, so the unknown-vehicle check was skipped.",
    "summary": {
      "total": "Total Entries",
      "total_subtext": "Weighbridge tickets in range",
      "net": "Net Weight",
      "net_subtext": "Sum of valid net weights",
      "normal": "No Issues",
      "normal_subtext": "Passed every check",
      "warning": "Warnings",
      "warning_subtext": "Needs a second look",
      "critical": "Critical",
      "critical_subtext": "Investigate now"
    },
    "search_placeholder": "Search ticket or vehicle number",
    "all_issues": "All issue types",
    "showing": "{{count}} of {{total}}",
    "clear_filter": "Clear",
    "empty": "No weighbridge entries match.",
    "list": {
      "ticket": "Ticket",
      "vehicle": "Vehicle",
      "net": "Net Weight",
      "issues": "Issues",
      "status": "Status"
    },
    "more_issues": "+{{count}} more",
    "status": {
      "normal": "No issues",
      "warning": "Warning",
      "critical": "Critical"
    },
    "flags": {
      "INVALID_WEIGHT": "Invalid weight",
      "DUPLICATE_TICKET": "Duplicate ticket",
      "NO_TICKET_NUMBER": "No ticket number",
      "REPEAT_WEIGHING": "Repeat weighing",
      "NET_MISMATCH": "Net ≠ Loaded − Tare",
      "SPLIT_MISMATCH": "Waste split ≠ Net",
      "TARE_DRIFT": "Unusual tare",
      "UNKNOWN_VEHICLE": "Unknown vehicle"
    },
    "detail": {
      "title": "Ticket {{ticket}}",
      "no_ticket": "Entry without ticket number",
      "weighed_at": "Weighed at",
      "section_weighment": "Weighment",
      "section_split": "Waste split",
      "section_checks": "Checks",
      "loaded": "Loaded (W1)",
      "wet_with_vehicle": "Wet + Vehicle (W2)",
      "tare": "Tare (W3)",
      "net": "Net",
      "loaded_minus_tare": "W1 − W3",
      "dry": "Dry",
      "wet": "Wet",
      "mix": "Mix",
      "split_total": "Dry + Wet + Mix",
      "no_flags": "All checks passed."
    },
    "rows_per_page": "Rows per page",
    "page_range": "{{from}}–{{to}} of {{total}}",
    "previous": "Previous",
    "next": "Next"
  }
} as const;
