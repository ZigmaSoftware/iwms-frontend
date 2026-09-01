import type { DailyTripHouseholdCollectionRecord, NamedRef } from "./types";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";
import { Column } from "primereact/column";

import { customerCreationApi, dailyTripHouseholdCollectionApi } from "@/helpers/admin";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { Button } from "primereact/button";
import { downloadCustomerQrStickerPdf } from "@/pages/admin/modules/masters/customerMasters/customerCreations/customerQrStickerPdf";
import type { Customer } from "@/pages/admin/modules/masters/customerMasters/customerCreations/types";


// A5: DailyTripHouseholdCollection.STATUS_CHOICES — Pending/Collected/Collect
// Later/Not Available (STATUS_MISSED renamed from "Missed"); "Not Collected"/
// "Skipped" kept only for legacy rows written before this rename.
const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Collected", label: "Collected" },
  { value: "Collect Later", label: "Collect Later" },
  { value: "Not Available", label: "Not Available" },
];

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-700",
  Collected: "bg-green-100 text-green-800",
  "Collect Later": "bg-amber-100 text-amber-800",
  "Not Available": "bg-red-100 text-red-800",
  // legacy values, kept for old rows
  Skipped: "bg-amber-100 text-amber-800",
  Missed: "bg-red-100 text-red-800",
  "Not Collected": "bg-red-100 text-red-800",
};

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  household_collection: "Household",
  bulk_waste_collection: "Bulk Waste",
};

// The viewset's `ordering_fields` allowlist (see
// daily_trip_household_collection_viewset.py) — only these fields may be
// passed through the `?ordering=` param, so only these columns are sortable.
const SORTABLE_FIELDS = new Set(["sequence", "status", "collected_at"]);

const Badge = ({ value }: { value?: string }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      STATUS_STYLES[value ?? ""] ?? "bg-gray-100 text-gray-600"
    }`}
  >
    {value ?? "-"}
  </span>
);

const text = (value: unknown): string =>
  value === null || value === undefined || String(value).trim() === ""
    ? "-"
    : String(value);

const nestedText = (obj: NamedRef, keys: string[]): string => {
  if (!obj || typeof obj !== "object") return "-";
  for (const key of keys) {
    const value = obj[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "-";
};

const extractError = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data !== "object") return null;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  const first = Object.values(data as object)[0];
  if (Array.isArray(first)) return String(first[0]);
  if (typeof first === "string") return first;
  return null;
};

const toRecordList = (value: unknown): DailyTripHouseholdCollectionRecord[] => {
  if (Array.isArray(value)) return value as DailyTripHouseholdCollectionRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
    return (value as { results: DailyTripHouseholdCollectionRecord[] }).results;
  }
  return [];
};

export default function DailyTripHouseholdCollectionList() {
  const { t } = useTranslation();
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;

  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [rawRows, setRawRows] = useState<DailyTripHouseholdCollectionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("");
  // unique_id of the stop whose QR is being prepared, so only that row's
  // button shows a spinner.
  const [qrDownloadingId, setQrDownloadingId] = useState<string | null>(null);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<string>("");
  const [filteredRows, setFilteredRows] = useState<DailyTripHouseholdCollectionRecord[]>([]);
  const requestIdRef = useRef(0);

  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  const loadRows = async (page: number, limit: number, search: string, order?: string) => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setRawRows([]);
      setTotalRecords(0);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setRawRows([]);
      setTotalRecords(0);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setRawRows([]);
    try {
      const params: Record<string, string> = {};
      if (companyUniqueId) params.company_id = companyUniqueId;
      if (projectId) params.project_id = projectId;
      if (statusFilter) params.status = statusFilter;
      if (collectionTypeFilter) params.collection_type = collectionTypeFilter;
      if (search) params.search = search;
      if (order) params.ordering = order;

      const response = await dailyTripHouseholdCollectionApi.readAllwithPaginated(page, limit, {
        params,
      });
      if (requestId !== requestIdRef.current) return;
      const rows = toRecordList(response);
      setRawRows(rows);
      setTotalRecords(
        typeof (response as any)?.count === "number" ? (response as any).count : rows.length,
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: extractError(err) ?? String(err),
      });
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  // Reset to first page whenever a non-pagination filter changes.
  useEffect(() => {
    setFirst(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, statusFilter, collectionTypeFilter]);

  // Load rows — re-runs whenever pagination/sort/search/company/project/status
  // /collection-type filters change.
  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    first,
    rowsPerPage,
    searchTerm,
    ordering,
    companyUniqueId,
    projectId,
    isSuperAdmin,
    companies.length,
    statusFilter,
    collectionTypeFilter,
  ]);

  // Debounce the global search box into the server-side `?search=` param.
  // Note: the backend's search only matches customer name and trip
  // assignment unique_id (see ModelFieldSearchFilter usage in the viewset),
  // not every column shown below.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // Keeps exported Excel rows in sync with the currently applied
  // (filtered/searched) query rather than only the rows on the visible
  // page — fetches the full filtered dataset fresh from the server,
  // independent of pagination, whenever the filters/search change.
  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      setFilteredRows([]);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      setFilteredRows([]);
      return;
    }
    let mounted = true;
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (statusFilter) params.status = statusFilter;
    if (collectionTypeFilter) params.collection_type = collectionTypeFilter;
    if (searchTerm) params.search = searchTerm;

    dailyTripHouseholdCollectionApi
      .readAllForExport({ params })
      .then((data) => {
        if (mounted) setFilteredRows(toRecordList(data));
      })
      .catch(() => {
        /* export sync failure is non-fatal; button will just show stale rows */
      });
    return () => {
      mounted = false;
    };
  }, [
    companyUniqueId,
    projectId,
    isSuperAdmin,
    companies.length,
    statusFilter,
    collectionTypeFilter,
    searchTerm,
  ]);

  const rows = rawRows.map((rec) => ({
    ...rec,
    _assignment:
      nestedText(rec.trip_assignment as NamedRef, [
        "trip_plan_display_code",
        "unique_id",
      ]) || rec.trip_assignment_id || "",
    _customer: nestedText(rec.customer as NamedRef, ["customer_name"]) || "",
    _location:
      nestedText(rec.panchayat as NamedRef, ["panchayat_name"]) !== "-"
        ? nestedText(rec.panchayat as NamedRef, ["panchayat_name"])
        : nestedText(rec.ward as NamedRef, ["ward_name"]),
    company_name: text(
      (rec as any).company_name ??
        (rec as any).company_id?.name ??
        rec.company_id
    ),
    project_name: text(
      (rec as any).project_name ??
        (rec as any).project_id?.name ??
        rec.project_id
    ),
  }));

  /**
   * Per-stop QR sticker download, using the same A4 sticker template as
   * Customer Creation.
   *
   * The stop row only carries four customer fields (unique_id, name,
   * building_no, street) — the sticker needs the QR image plus the project /
   * ward / address fields — so the full customer is fetched on click. That
   * also keeps the sheet in step with any customer edit made since this list
   * was loaded.
   */
  const handleDownloadQr = async (row: DailyTripHouseholdCollectionRecord) => {
    const customerRef = row.customer as Record<string, unknown> | null | undefined;
    const customerUniqueId =
      (customerRef?.unique_id as string | undefined) ??
      (typeof row.customer_id === "string" ? row.customer_id : undefined);

    if (!customerUniqueId) {
      Swal.fire({
        icon: "warning",
        title: t("common.warning") || "Warning",
        text: "This stop has no linked customer, so there is no QR to download.",
      });
      return;
    }

    setQrDownloadingId(String(row.unique_id));
    try {
      const customer = (await customerCreationApi.read(customerUniqueId)) as Customer;
      if (!customer?.qr_code) {
        Swal.fire({
          icon: "warning",
          title: t("common.warning") || "Warning",
          text: "No QR code has been generated for this customer yet.",
        });
        return;
      }
      await downloadCustomerQrStickerPdf([customer], {
        companyName: customer.company_name,
        projectName: customer.project_name,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text:
          error instanceof Error
            ? error.message
            : "Failed to generate the QR sticker for this stop.",
      });
    } finally {
      setQrDownloadingId(null);
    }
  };

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(e.target.value);
  };

  const renderHeader = () => (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={(value) =>
        onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
      }
      searchPlaceholder="Search household collections..."
    >
      <FilterBarSelect
        value={companyUniqueId || ""}
        onChange={onCompanyChange}
        placeholder="All Companies"
        options={companies}
        disabled={!isSuperAdmin || companies.length === 0}
      />
      <FilterBarSelect
        value={projectId || ""}
        onChange={setProjectId}
        placeholder={showAllProjectsOption ? "All Projects" : undefined}
        options={projects}
        disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
      />
      <FilterBarSelect
        value={statusFilter}
        onChange={(value) => setStatusFilter(value)}
        options={STATUS_OPTIONS}
        placeholder={"All Statuses"}
      />
      <FilterBarSelect
        value={collectionTypeFilter}
        onChange={(value) => setCollectionTypeFilter(value)}
        options={Object.entries(COLLECTION_TYPE_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
        placeholder="All Collection Types"
        aria-label="Collection type filter"
      />
    </FilterBar>
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            Household Collection Points
          </h1>
          <p className="text-sm text-gray-500">
            Per-household collection status within daily trip assignments
          </p>
        </div>
      </div>

      <DataTable
        value={rows}
        exportRows={filteredRows}
        onValueChange={(value) => setFilteredRows(value as typeof filteredRows)}
        dataKey="unique_id"
        lazy
        paginator
        first={first}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPage={onPage}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={onSort}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading}
        header={renderHeader()}
        stripedRows
        showGridlines
        emptyMessage="No household collection records found."
        className="p-datatable-sm"
      >
        <Column
          header={t("common.s_no")}
          body={(_: any, { rowIndex }: any) => rowIndex + 1}
          style={{ width: 60 }}
        />
        <Column
          field="unique_id"
          header="ID"
          style={{ minWidth: 150 }}
        />
        <Column
          field="company_name"
          header="Company"
          style={{ minWidth: 140 }}
        />
        <Column
          field="project_name"
          header="Project"
          style={{ minWidth: 140 }}
        />
        <Column
          field="_assignment"
          header="Trip Assignment"
          style={{ minWidth: 170 }}
          body={(row) =>
            nestedText(row.trip_assignment as NamedRef, [
              "trip_plan_display_code",
              "unique_id",
            ])
          }
        />
        <Column
          field="_customer"
          header="Customer"
          style={{ minWidth: 160 }}
          body={(row) =>
            nestedText(row.customer as NamedRef, ["customer_name"])
          }
        />
        <Column
          field="collection_type"
          header="Collection Type"
          style={{ minWidth: 140 }}
          body={(row: DailyTripHouseholdCollectionRecord) =>
            COLLECTION_TYPE_LABELS[String(row.collection_type ?? "")] ?? text(row.collection_type)
          }
        />
        <Column
          field="_location"
          header="Location (PLB / Ward)"
          style={{ minWidth: 180 }}
          body={(row: DailyTripHouseholdCollectionRecord) => {
            if (row.panchayat && (row.panchayat as any).panchayat_name) {
              return (
                <span className="text-sm text-gray-800">
                  {String((row.panchayat as any).panchayat_name)}
                  <span className="ml-1 text-xs text-indigo-500 font-medium">
                    (PLB)
                  </span>
                </span>
              );
            }
            if (row.ward && (row.ward as any).ward_name) {
              return (
                <span className="text-sm text-gray-800">
                  {String((row.ward as any).ward_name)}
                  <span className="ml-1 text-xs text-teal-500 font-medium">
                    (Ward)
                  </span>
                </span>
              );
            }
            return <span className="text-sm text-gray-400">-</span>;
          }}
        />
        <Column
          field="sequence"
          header="Seq"
          sortable={SORTABLE_FIELDS.has("sequence")}
          style={{ width: 70 }}
          body={(row) => text(row.sequence)}
        />
        <Column
          field="collected_weight_kg"
          header="Weight (kg)"
          style={{ minWidth: 110 }}
          body={(row: DailyTripHouseholdCollectionRecord) =>
            row.collected_weight_kg != null ? (
              <span className="font-semibold text-gray-800">
                {Number(row.collected_weight_kg).toFixed(2)}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )
          }
        />
        <Column
          field="status"
          header="Status"
          sortable={SORTABLE_FIELDS.has("status")}
          style={{ minWidth: 110 }}
          body={(row: DailyTripHouseholdCollectionRecord) => (
            <Badge value={row.status} />
          )}
        />
        <Column
          field="status_reason"
          header="Status Reason"
          style={{ minWidth: 160 }}
          body={(row: DailyTripHouseholdCollectionRecord) => text(row.status_reason)}
        />
        <Column
          header="Waste Breakdown (Wet/Dry/Mixed/Sanitary/Total)"
          style={{ minWidth: 220 }}
          body={(row: DailyTripHouseholdCollectionRecord) => {
            const wb = row.waste_breakdown;
            if (!wb) return <span className="text-gray-400">-</span>;
            const fmt = (v: unknown) => (v === null || v === undefined ? "0" : Number(v).toFixed(2));
            return (
              <span className="text-xs text-gray-700">
                W:{fmt(wb.wet_waste)} / D:{fmt(wb.dry_waste)} / M:{fmt(wb.mixed_waste)} / S:{fmt(wb.sanitary_waste)} / T:
                <span className="font-semibold">{fmt(wb.total_quantity)}</span>
              </span>
            );
          }}
        />
        <Column
          field="collected_at"
          header="Collected At"
          sortable={SORTABLE_FIELDS.has("collected_at")}
          style={{ minWidth: 150 }}
          body={(row: DailyTripHouseholdCollectionRecord) =>
            text(row.collected_at)
          }
        />
        <Column
          field="waste_collection_id"
          header="Waste Collection"
          style={{ minWidth: 160 }}
          body={(row: DailyTripHouseholdCollectionRecord) =>
            row.waste_collection_id ? (
              <span className="text-xs font-mono text-gray-600">
                {String(row.waste_collection_id)}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )
          }
        />
        <Column
          field="_qr"
          header="Download QR"
          exportable={false}
          style={{ minWidth: 140 }}
          body={(row: DailyTripHouseholdCollectionRecord) => {
            const isBusy = qrDownloadingId === String(row.unique_id);
            const hasCustomer = Boolean(
              (row.customer as Record<string, unknown> | null)?.unique_id ??
                row.customer_id,
            );
            return (
              <Button
                type="button"
                label={isBusy ? "Preparing..." : "Download QR"}
                icon={isBusy ? "pi pi-spin pi-spinner" : "pi pi-qrcode"}
                className="p-button-sm p-button-outlined"
                disabled={isBusy || !hasCustomer}
                tooltip={hasCustomer ? undefined : "No customer linked to this stop"}
                onClick={() => void handleDownloadQr(row)}
              />
            );
          }}
        />
      </DataTable>
    </div>
  );
}
