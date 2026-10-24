import { Column } from "primereact/column";
import { StackCell } from "@/components/common/TableCells";

// Matches the actual day-wise API response shape
export type DayTicketRow = {
  Ticket_No: string;
  date: string;
  Start_Time: string | null;
  Vehicle_No: string;
  Loaded_Wt_W1: number;
  Wet_Wt_with_Vehicle_W2: number;
  Vehicle_Tare_Wt_W3: number;
  Dry_Wt: number;
  Wet_Wt: number;
  Mix_Wt: number;
  Net_Wt: number;
};
type ApiRow = DayTicketRow;

export const DAY_REPORT_GLOBAL_FIELDS = ["Ticket_No", "Vehicle_No", "date", "Start_Time", "Net_Wt"];

// ---------- Helpers ----------
const parseNum = (v: string | undefined) => Number((v ?? "0").replace(/,/g, ""));
const fmtNum = (v: number) => v.toLocaleString();
const fmtTime = (v: string | null) => v ?? "-";

/** Fetches individual weighbridge tickets between two dates (inclusive). */
export async function fetchDayTickets(
  apiBase: string,
  apiKey: string,
  fromDate: string,
  toDate: string,
): Promise<DayTicketRow[]> {
  const url = `${apiBase}?action=day_wise_data&from_date=${fromDate}&to_date=${toDate}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json.status || !Array.isArray(json.data)) {
    throw new Error("Invalid API response");
  }

  return json.data.map((row: Record<string, string | undefined>) => {
    const [datePart, timePart] = (row.Date ?? "").split(" ");
    return {
      Ticket_No: row.Ticket_No ?? "-",
      date: datePart ?? "",
      Start_Time: timePart ?? null,
      Vehicle_No: row.Vehicle_No ?? "-",
      Loaded_Wt_W1: parseNum(row.Loaded_Wt_W1),
      Wet_Wt_with_Vehicle_W2: parseNum(row.Wet_Wt_with_Vehicle_W2),
      Vehicle_Tare_Wt_W3: parseNum(row.Vehicle_Tare_Wt_W3),
      Dry_Wt: parseNum(row.Dry_Wt),
      Wet_Wt: parseNum(row.Wet_Wt),
      Mix_Wt: parseNum(row.Mix_Wt),
      Net_Wt: parseNum(row.Net_Wt),
    };
  });
}

/**
 * Ticket columns shared by the Day Report page and the Date Report's
 * per-day popup. Returned as an array (not a fragment) so DataTable sees
 * each Column as a direct child.
 */
export const dayTicketColumns = () => [
  <Column
    key="index"
    header="#"
    body={(_: ApiRow, { rowIndex }: { rowIndex: number }) => rowIndex + 1}
    style={{ width: "5%" }}
  />,
  <Column
    key="date"
    field="date"
    header="Date"
    sortable
    style={{ width: "13%" }}
    body={(r: ApiRow) => (
      <StackCell
        primary={r.date}
        lines={[{ icon: "pi-clock", value: fmtTime(r.Start_Time) }]}
      />
    )}
  />,
  <Column
    key="ticket"
    field="Ticket_No"
    header="Ticket No"
    sortable
    style={{ width: "14%" }}
  />,
  <Column
    key="vehicle"
    field="Vehicle_No"
    header="Vehicle No"
    sortable
    style={{ width: "14%" }}
  />,
  <Column
    key="weighment"
    header="Weighment"
    style={{ width: "20%" }}
    body={(r: ApiRow) => (
      <StackCell
        lines={[
          { label: "Loaded (W1)", value: fmtNum(r.Loaded_Wt_W1) },
          {
            label: "Wet + Vehicle (W2)",
            value: fmtNum(r.Wet_Wt_with_Vehicle_W2),
          },
          { label: "Tare (W3)", value: fmtNum(r.Vehicle_Tare_Wt_W3) },
        ]}
      />
    )}
  />,
  <Column
    key="split"
    header="Waste Split"
    style={{ width: "20%" }}
    body={(r: ApiRow) => (
      <StackCell
        lines={[
          { label: "Dry", value: fmtNum(r.Dry_Wt) },
          { label: "Wet", value: fmtNum(r.Wet_Wt) },
          { label: "Mix", value: fmtNum(r.Mix_Wt) },
        ]}
      />
    )}
  />,
  <Column
    key="net"
    field="Net_Wt"
    header="Net Wt"
    body={(r: ApiRow) => fmtNum(r.Net_Wt)}
    sortable
    style={{ width: "14%" }}
  />,
];
