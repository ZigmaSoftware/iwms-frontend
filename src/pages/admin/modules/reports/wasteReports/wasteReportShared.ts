import { useEffect, useMemo, useState } from "react";
import { panchayatApi, wasteTypeApi, zoneApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

/* Data shapes, tokens and the filter hook shared by the Daily and Monthly
   Waste Collection reports (kept apart from WasteReportView.tsx so that
   file exports components only). */

export type ReportPeriodRow = {
  period: string;
  weight: number;
  trips: number;
  points: number;
  avgPerTrip: number;
};

export type ReportRecordRow = {
  id: string;
  period: string;
  locationName: string;
  locationType: string;
  companyName?: string;
  projectName?: string;
  wasteTypeId: string;
  wasteType: string;
  weight: number;
  trips: number;
  points: number;
  avgPerTrip: number;
  status?: string;
};

export type ReportLocationRow = {
  key: string;
  name: string;
  type: string;
  weight: number;
  trips: number;
  points: number;
  avgPerTrip: number;
};

export type ReportWasteTypeRow = {
  id: string;
  name: string;
  weight: number;
  trips: number;
  points: number;
  share: number;
  locations?: number;
};

export type ReportKpis = {
  weight: number;
  trips: number;
  points: number;
  avgPerTrip: number;
  locations: number;
  wasteTypes: number;
};


/* ── tokens — neutrals and brand follow the admin theme via CSS vars;
      the status colours stay fixed hex (they take alpha suffixes) ── */
export const C = {
  surface: "var(--admin-surfaceAlt)",
  surfaceSunk: "var(--admin-surfaceMuted)",
  ink: "var(--admin-text)",
  inkSoft: "var(--admin-mutedText)",
  inkFaint: "color-mix(in srgb, var(--admin-mutedText) 72%, transparent)",
  line: "var(--admin-border)",
  primary: "var(--admin-primary)",
  leaf: "#10B981",
  teal: "#0EA5E9",
  ochre: "#F59E0B",
  brick: "#EF4444",
} as const;


/* ── helpers ── */
export const fmtNum = (v?: number | string | null, dec = 0) => {
  const n = Number(v);
  return v == null || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-IN", { maximumFractionDigits: dec });
};

type GeoRecord = Record<string, unknown>;
const resolveGeoId = (record: GeoRecord): string => String(record?.unique_id ?? record?.id ?? "");
const resolveGeoName = (record: GeoRecord): string =>
  String(
    record?.name ??
      record?.panchayat_name ??
      record?.zone_name ??
      record?.ward_name ??
      resolveGeoId(record),
  );
const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.filter((x) => x && typeof x === "object");
  if (value && typeof value === "object") {
    const r = (value as { results?: unknown }).results;
    if (Array.isArray(r)) return r.filter((x) => x && typeof x === "object");
  }
  return [];
};
const toGeoOptions = (records: GeoRecord[]) =>
  records.filter((r) => resolveGeoId(r)).map((r) => ({ value: resolveGeoId(r), label: resolveGeoName(r) }));

/* ══════════════════════════════════════════════════════════════════
    FILTERS — company / project / panchayat / zone / source / waste type
══════════════════════════════════════════════════════════════════ */
export function useWasteReportFilters() {
  const selection = useCompanyProjectSelection({ isEdit: false, defaultToAll: true });
  const { companyUniqueId, projectId } = selection;
  const [source, setSource] = useState("bin");
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [wasteTypeOptions, setWasteTypeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [panchayatIds, setPanchayatIds] = useState<string[]>([]);
  const [panchayatRecords, setPanchayatRecords] = useState<Record<string, unknown>[]>([]);
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [zoneRecords, setZoneRecords] = useState<Record<string, unknown>[]>([]);

  /* panchayat / zone options follow the selected company + project */
  useEffect(() => {
    let active = true;
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    panchayatApi.readAll({ params }).then((value) => {
      if (active) setPanchayatRecords(toRecordList(value));
    }).catch(() => {
      if (active) setPanchayatRecords([]);
    });
    zoneApi.readAll({ params }).then((value) => {
      if (active) setZoneRecords(toRecordList(value));
    }).catch(() => {
      if (active) setZoneRecords([]);
    });
    return () => { active = false; };
  }, [companyUniqueId, projectId]);

  /* a new company / project scope invalidates the picked panchayats + zones
     (reset while rendering rather than in the effect above) */
  const scopeKey = `${companyUniqueId}|${projectId}`;
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey);
  if (prevScopeKey !== scopeKey) {
    setPrevScopeKey(scopeKey);
    setPanchayatIds([]);
    setZoneIds([]);
  }

  /* waste type filter options */
  useEffect(() => {
    let cancelled = false;
    wasteTypeApi
      .readAll({ params: { lite: 1 } })
      .then((list) => {
        if (cancelled) return;
        setWasteTypeOptions(
          toRecordList(list)
            .map((w) => ({ value: resolveGeoId(w), label: String(w.waste_type_name ?? w.name ?? resolveGeoId(w)) }))
            .filter((o) => o.value),
        );
      })
      .catch(() => { if (!cancelled) setWasteTypeOptions([]); });
    return () => { cancelled = true; };
  }, []);

  const panchayatOptions = useMemo(() => toGeoOptions(panchayatRecords), [panchayatRecords]);
  const zoneOptions = useMemo(() => toGeoOptions(zoneRecords), [zoneRecords]);

  /* query params shared by both reports (period + sort are added by the page) */
  const params = useMemo(() => {
    const p: Record<string, string> = { source };
    if (wasteTypeId) p.waste_type_id = wasteTypeId;
    if (companyUniqueId) p.company_id = companyUniqueId;
    if (projectId) p.project_id = projectId;
    if (panchayatIds.length) p.panchayat_id = panchayatIds.join(",");
    if (zoneIds.length) p.zone_id = zoneIds.join(",");
    return p;
  }, [source, wasteTypeId, companyUniqueId, projectId, panchayatIds, zoneIds]);

  const locationLabel =
    [
      ...panchayatOptions.filter((o) => panchayatIds.includes(o.value)),
      ...zoneOptions.filter((o) => zoneIds.includes(o.value)),
    ]
      .map((o) => o.label)
      .join(", ") || "All locations";

  return {
    selection,
    source,
    setSource,
    wasteTypeId,
    setWasteTypeId,
    wasteTypeOptions,
    panchayatIds,
    setPanchayatIds,
    panchayatOptions,
    zoneIds,
    setZoneIds,
    zoneOptions,
    params,
    locationLabel,
    locationFiltered: !!(panchayatIds.length || zoneIds.length),
    clearLocation: () => {
      setPanchayatIds([]);
      setZoneIds([]);
    },
  };
}

export type WasteReportFilters = ReturnType<typeof useWasteReportFilters>;

export const fieldCls = "h-9 rounded-lg border px-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-100";
export const fieldStyle = { borderColor: C.line, background: C.surface, color: C.ink };
