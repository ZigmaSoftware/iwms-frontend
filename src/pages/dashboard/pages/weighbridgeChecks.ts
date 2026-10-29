/**
 * Weighbridge Log checks, run in the browser over the tickets the project's
 * day-wise weighment API returns for the selected range (nothing is stored).
 *
 * They check each entry's own consistency — weights, ticket numbers, repeat
 * weighings, tare — and that the vehicle is in the vehicle master. Weighbridge
 * entries are not linked to trips, so nothing is compared with trip data.
 * When the vehicle master could not be loaded (null) that check is skipped
 * rather than failing every ticket.
 */

// Two weights "agree" within max(this many kg, this % of the larger).
const WEIGHT_TOLERANCE_KG = 20;
const WEIGHT_TOLERANCE_PCT = 1;
// The same vehicle weighed again this soon is probably one load counted twice.
export const REPEAT_WINDOW_MINUTES = 30;
// Tare more than this far from the vehicle's usual tare (median over the
// range, needs TARE_MIN_SAMPLES tickets) is suspect.
export const TARE_DRIFT_PCT = 5;
const TARE_MIN_SAMPLES = 3;

export type Status = "normal" | "warning" | "critical";
const RANK: Record<Status, number> = { normal: 0, warning: 1, critical: 2 };

export type FlagCode =
  | "INVALID_WEIGHT"
  | "DUPLICATE_TICKET"
  | "NO_TICKET_NUMBER"
  | "REPEAT_WEIGHING"
  | "NET_MISMATCH"
  | "SPLIT_MISMATCH"
  | "TARE_DRIFT"
  | "UNKNOWN_VEHICLE";

export type Flag = { code: FlagCode; severity: "warning" | "critical"; message: string };

/** A row of the day-wise weighment API, as sent. */
export type RawTicket = Record<string, unknown>;

export type Vehicle = { unique_id: string; vehicle_no: string };

export type CheckedTicket = {
  key: string;
  ticketNo: string;
  date: string | null;
  time: string | null;
  weighedAt: Date | null;
  vehicleNo: string;
  loaded: number | null;
  wetWithVehicle: number | null;
  tare: number | null;
  dry: number | null;
  wet: number | null;
  mix: number | null;
  net: number | null;
  status: Status;
  flags: Flag[];
};

export const vehicleKey = (value: unknown) =>
  String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** "1,234.5" -> 1234.5; null for blank or non-numeric values. */
export const parseWeight = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/,/g, "").trim();
  if (!text) return null;
  const weight = Number(text);
  return Number.isFinite(weight) ? weight : null;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD HH:MM[:SS]" or "DD-MM-YYYY HH:MM[:SS]" (also "/" and "T"). */
const parseWeighedAt = (value: unknown): Date | null => {
  const text = String(value ?? "").trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = text.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return null;
};

const agrees = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(WEIGHT_TOLERANCE_KG, (Math.max(Math.abs(a), Math.abs(b)) * WEIGHT_TOLERANCE_PCT) / 100);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function checkTickets(rows: RawTicket[], vehicles: Vehicle[] | null): CheckedTicket[] {
  const knownVehicles = new Set((vehicles ?? []).map((v) => vehicleKey(v.vehicle_no)).filter(Boolean));

  const ticketCounts = new Map<string, number>();
  for (const row of rows) {
    const no = String(row.Ticket_No ?? "").trim();
    if (no) ticketCounts.set(no, (ticketCounts.get(no) ?? 0) + 1);
  }

  const parsed = rows.map((row, index) => {
    const weighedAt = parseWeighedAt(row.Date);
    return {
      index,
      ticketNo: String(row.Ticket_No ?? "").trim(),
      weighedAt,
      date: weighedAt
        ? `${weighedAt.getFullYear()}-${pad(weighedAt.getMonth() + 1)}-${pad(weighedAt.getDate())}`
        : null,
      time: weighedAt ? `${pad(weighedAt.getHours())}:${pad(weighedAt.getMinutes())}:${pad(weighedAt.getSeconds())}` : null,
      vehicleNo: String(row.Vehicle_No ?? "").trim(),
      vKey: vehicleKey(row.Vehicle_No),
      loaded: parseWeight(row.Loaded_Wt_W1),
      wetWithVehicle: parseWeight(row.Wet_Wt_with_Vehicle_W2),
      tare: parseWeight(row.Vehicle_Tare_Wt_W3),
      dry: parseWeight(row.Dry_Wt),
      wet: parseWeight(row.Wet_Wt),
      mix: parseWeight(row.Mix_Wt),
      net: parseWeight(row.Net_Wt),
    };
  });

  // Usual tare per vehicle over the range.
  const tares = new Map<string, number[]>();
  for (const t of parsed) {
    if (t.vKey && t.tare && t.tare > 0) tares.set(t.vKey, [...(tares.get(t.vKey) ?? []), t.tare]);
  }
  const usualTare = new Map(
    [...tares].filter(([, v]) => v.length >= TARE_MIN_SAMPLES).map(([k, v]) => [k, median(v)]),
  );

  // Previous weighing of the same vehicle (time order).
  const previous = new Map<number, (typeof parsed)[number]>();
  const lastSeen = new Map<string, (typeof parsed)[number]>();
  for (const t of [...parsed].filter((p) => p.weighedAt && p.vKey).sort((a, b) => a.weighedAt!.getTime() - b.weighedAt!.getTime())) {
    const prior = lastSeen.get(t.vKey);
    if (prior) previous.set(t.index, prior);
    lastSeen.set(t.vKey, t);
  }

  return parsed.map((t) => {
    const flags: Flag[] = [];
    const { net, loaded, tare } = t;
    const netValid = net !== null && net > 0;

    if (!netValid) {
      flags.push({ code: "INVALID_WEIGHT", severity: "critical", message: "Net weight is missing, zero or not a number." });
    }
    if (!t.ticketNo) {
      flags.push({ code: "NO_TICKET_NUMBER", severity: "warning", message: "Weighbridge entry has no ticket number." });
    } else if ((ticketCounts.get(t.ticketNo) ?? 0) > 1) {
      flags.push({
        code: "DUPLICATE_TICKET",
        severity: "critical",
        message: `Ticket number appears ${ticketCounts.get(t.ticketNo)} times in the weighbridge data.`,
      });
    }

    const prior = previous.get(t.index);
    if (prior && t.weighedAt && prior.weighedAt) {
      const gap = (t.weighedAt.getTime() - prior.weighedAt.getTime()) / 60000;
      if (gap < REPEAT_WINDOW_MINUTES) {
        flags.push({
          code: "REPEAT_WEIGHING",
          severity: "critical",
          message: `Same vehicle weighed ${Math.round(gap)} min earlier (ticket ${prior.ticketNo || "—"}).`,
        });
      }
    }

    if (netValid && loaded && tare && !agrees(net!, loaded - tare)) {
      flags.push({
        code: "NET_MISMATCH",
        severity: "critical",
        message: `Net ${net} kg does not equal Loaded ${loaded} − Tare ${tare} = ${loaded - tare} kg.`,
      });
    }
    const split = [t.dry, t.wet, t.mix].filter((w): w is number => w !== null);
    const splitSum = split.reduce((s, w) => s + w, 0);
    if (netValid && split.some((w) => w) && !agrees(net!, splitSum)) {
      flags.push({
        code: "SPLIT_MISMATCH",
        severity: "warning",
        message: `Dry + Wet + Mix = ${splitSum} kg but Net is ${net} kg.`,
      });
    }

    const baseline = usualTare.get(t.vKey);
    if (tare && baseline && (Math.abs(tare - baseline) / baseline) * 100 > TARE_DRIFT_PCT) {
      flags.push({
        code: "TARE_DRIFT",
        severity: "warning",
        message: `Tare ${tare} kg differs from this vehicle's usual ${baseline} kg.`,
      });
    }

    if (vehicles !== null && !knownVehicles.has(t.vKey)) {
      flags.push({ code: "UNKNOWN_VEHICLE", severity: "critical", message: "Vehicle is not in this project's vehicle master." });
    }

    let status: Status = "normal";
    for (const flag of flags) {
      if (RANK[flag.severity] > RANK[status]) status = flag.severity;
    }

    return {
      key: `${t.ticketNo || "no-ticket"}-${t.index}`,
      ticketNo: t.ticketNo,
      date: t.date,
      time: t.time,
      weighedAt: t.weighedAt,
      vehicleNo: t.vehicleNo,
      loaded: t.loaded,
      wetWithVehicle: t.wetWithVehicle,
      tare: t.tare,
      dry: t.dry,
      wet: t.wet,
      mix: t.mix,
      net,
      status,
      flags,
    };
  });
}
