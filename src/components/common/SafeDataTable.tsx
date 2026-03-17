import {
  DataTable as PrimeDataTable,
  type DataTableProps,
} from "primereact/datatable";

type SafeTableRow = Record<string, unknown>;
type SafeTableRows = SafeTableRow[];

const toSafeRows = <TValue extends SafeTableRows>(
  value: DataTableProps<TValue>["value"]
): TValue => (Array.isArray(value) ? value : ([] as unknown as TValue));

export const DataTable = <TValue extends SafeTableRows>(
  props: DataTableProps<TValue>
) => {
  const safeRows = toSafeRows(props.value);

  return <PrimeDataTable {...props} value={safeRows} />;
};

export type { DataTableFilterEvent } from "primereact/datatable";
