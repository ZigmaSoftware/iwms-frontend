import type { DailyTripLogRecord } from "./types";
import { formatCollectionTime } from "./collectionTime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";

import { MultiSelect } from "primereact/multiselect";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import {
  combineFilters,
  useOptionFilter,
} from "@/components/filters/useOptionFilter";
import { FilterSection } from "@/components/common/ListToolbar";
import { dailyTripLogApi, wasteTypeApi } from "@/helpers/admin";
import { api } from "@/api";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { ListPageHeader } from "@/components/common/ListPageHeader";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { downloadRecordsPdf } from "@/utils/exportPdf";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import { formatTimeOnly } from "@/utils/formatTime";
import { useScreenAccess } from "@/contexts/screenPermission";
import { KpiCard, WasteTypeChips } from "./tripLogDisplay";
import { EMPTY_SUMMARY, formatKg, type TripLogSummary } from "./tripLogSummary";

const STATUS_STYLES: Record<string, string> = {
  Unverified: "bg-gray-100 text-gray-700",
  Verified: "bg-green-100 text-green-800",
};

/* Status tabs above the table — "" = every status. */
const STATUS_TABS: Array<{ key: string; label: string; dot: string }> = [
  { key: "", label: "All", dot: "bg-slate-400" },
  { key: "Unverified", label: "Unverified", dot: "bg-gray-400" },
  { key: "Verified", label: "Verified", dot: "bg-green-500" },
];

const COLLECTION_STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-red-50 text-red-600",
  "In Progress": "bg-yellow-50 text-yellow-700",
  Completed: "bg-green-100 text-green-700",
};

const Badge = ({ value }: { value?: string }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      STATUS_STYLES[value ?? ""] ?? "bg-gray-100 text-gray-600"
    }`}
  >
    {value ?? "-"}
  </span>
);

const CollectionStatusBadge = ({ value }: { value?: string }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      COLLECTION_STATUS_STYLES[value ?? ""] ?? "bg-gray-100 text-gray-500"
    }`}
  >
    {value ?? "-"}
  </span>
);

const BreakdownCell = ({ row }: { row: DailyTripLogRecord }) => {
  const bd = row.breakdown_info;
  if (!bd) return <span className="text-xs text-gray-300">—</span>;

  const isApproved = bd.approval_status === "APPROVED";
  const isPending = bd.approval_status === "PENDING";

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          isApproved
            ? "bg-green-100 text-green-700"
            : isPending
              ? "bg-orange-100 text-orange-700"
              : "bg-red-100 text-red-700"
        }`}
      >
        {isApproved ? "✓ Replaced" : isPending ? "⚠ Pending" : "✕ Rejected"}
      </span>
      {isApproved && bd.replacement_vehicle_no && (
        <div className="text-[10px] text-gray-600 leading-tight">
          <span className="font-medium">Veh:</span> {bd.replacement_vehicle_no}
        </div>
      )}
      {isApproved && (bd.replacement_driver || bd.replacement_operator) && (
        <div className="text-[10px] text-gray-600 leading-tight">
          {bd.replacement_driver && (
            <span>
              <span className="font-medium">Drv:</span> {bd.replacement_driver}
            </span>
          )}
          {bd.replacement_driver && bd.replacement_operator && (
            <span className="mx-1">·</span>
          )}
          {bd.replacement_operator && (
            <span>
              <span className="font-medium">Opr:</span>{" "}
              {bd.replacement_operator}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * A trip assignment can carry several waste types, so show all of them
 * (`waste_types_detail`, sourced from the assignment) rather than the single
 * legacy `waste_type` field, which only ever holds the first one.
 */
const wasteTypesLabel = (row: DailyTripLogRecord): string => {
  const names = Array.isArray(row.waste_types_detail)
    ? row.waste_types_detail.map((wt) => wt?.waste_type_name).filter(Boolean)
    : [];
  if (names.length > 0) return names.join(", ");
  return (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "-";
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
    {children}
  </p>
);

const WasteChips = ({
  items,
}: {
  items?: {
    waste_type_name?: string | null;
    collected_weight_kg?: string | number | null;
  }[];
}) => {
  if (!items || items.length === 0)
    return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, index) => (
        <span
          key={`${item.waste_type_name}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
        >
          {item.waste_type_name ?? "—"}
          <span className="font-semibold">
            {item.collected_weight_kg != null
              ? `${Number(item.collected_weight_kg).toFixed(2)} kg`
              : "—"}
          </span>
        </span>
      ))}
    </div>
  );
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div className="flex gap-2 text-sm">
    <span className="text-gray-500 w-36 shrink-0">{label}</span>
    <span className="font-medium text-gray-800">{value ?? "-"}</span>
  </div>
);

/* ── backend's manual `?ordering=` allowlist (see daily_trip_log_viewset.py) ── */
const SORTABLE_FIELDS = new Set([
  "unique_id",
  "trip_date",
  "collected_weight_kg",
  "log_status",
]);

const toRecordList = (value: unknown): DailyTripLogRecord[] => {
  if (Array.isArray(value)) return value as DailyTripLogRecord[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: DailyTripLogRecord[] }).results;
  }
  return [];
};

const extractError = (error: any): string | null => {
  const data = error?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "object") {
    const first = Object.values(data)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
};

const wardNameOf = (row: DailyTripLogRecord): string | null => {
  const ward = row.ward;
  if (Array.isArray(ward)) return ward[0]?.ward_name ?? null;
  if (ward?.ward_name) return ward.ward_name;
  return row.wards_detail?.[0]?.ward_name ?? null;
};

/** Ward name plus which zone/panchayat it belongs to, e.g. "Ward 4 (Zone: North Zone)". */
const locationText = (row: DailyTripLogRecord): string => {
  const ward = wardNameOf(row);
  const panchayat = row.panchayat?.panchayat_name ?? null;
  const zone =
    row.zone?.zone_name ?? row.trip_assignment?.zone?.zone_name ?? null;
  const parent = panchayat
    ? `Panchayat: ${panchayat}`
    : zone
      ? `Zone: ${zone}`
      : null;

  if (ward && parent) return `${ward} (${parent})`;
  if (ward) return ward;
  if (panchayat) return panchayat;
  if (zone) return zone;
  return "-";
};

const computeCollectedWeight = (
  collectionPoints?: DailyTripLogRecord["collection_points"],
): number => {
  return (collectionPoints ?? []).reduce((sum, cp) => {
    if (
      cp?.collected_weight_kg === null ||
      cp?.collected_weight_kg === undefined
    ) {
      return sum;
    }
    const weight = Number(cp.collected_weight_kg);
    return sum + (Number.isFinite(weight) ? weight : 0);
  }, 0);
};

/**
 * Total weight = bin-sourced weight (collected_weight_kg, auto-synced from
 * BinCollectionEvent when such records exist, otherwise the last manually
 * entered value per A6) + household-sourced weight
 * (household_collected_weight_kg, synced from WasteCollection similarly).
 * Read-only display — mirrors the linked assignment's aggregate.
 */
const computeTotalWeight = (row: DailyTripLogRecord): number => {
  const cps = row.collection_points ?? [];
  const hasPointWeights = cps.some(
    (cp) =>
      cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined,
  );
  const binWeight = hasPointWeights
    ? computeCollectedWeight(cps)
    : row.collected_weight_kg != null
      ? Number(row.collected_weight_kg)
      : 0;
  const householdWeight =
    row.household_collected_weight_kg != null
      ? Number(row.household_collected_weight_kg)
      : 0;
  return (
    (Number.isFinite(binWeight) ? binWeight : 0) +
    (Number.isFinite(householdWeight) ? householdWeight : 0)
  );
};

type CollectionType = "all" | "bin" | "household";

/* ── client-side "bin vs household" post-filter ── */
const matchesCollectionType = (row: DailyTripLogRecord, collectionType: CollectionType): boolean => {
  if (collectionType === "bin") {
    const cps = row.collection_points ?? [];
    const hasPointWeights = cps.some(
      (cp) => cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined,
    );
    return (
      (hasPointWeights && computeCollectedWeight(cps) > 0) ||
      (row.collected_weight_kg != null && Number(row.collected_weight_kg) > 0)
    );
  }
  if (collectionType === "household") {
    return row.household_collected_weight_kg != null && Number(row.household_collected_weight_kg) > 0;
  }
  return true;
};

/* ─────────────────────────────────────────────────────
   Trip Log Modal  (mode="view" | "verify")
───────────────────────────────────────────────────── */
function TripLogModal({
  row,
  mode,
  onClose,
  onConfirm,
  isLoading,
}: {
  row: DailyTripLogRecord;
  mode: "view" | "verify";
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  isLoading: boolean;
}) {
  const [remarks, setRemarks] = useState(row.remarks ?? "");
  const cps = row.collection_points ?? [];
  const collectedCount = cps.filter((cp) => cp.is_collected).length;
  const hhCollections = row.household_collections ?? [];
  const hhCollectedCount = hhCollections.filter((hh) => hh.is_collected).length;
  const st = row.staff_template;
  const wasteTypeName = wasteTypesLabel(row);
  const collectedWeightFromPoints = computeCollectedWeight(cps);
  const hasPointWeights = cps.some(
    (cp) =>
      cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined,
  );
  const weight = hasPointWeights
    ? `${collectedWeightFromPoints.toFixed(2)} kg`
    : row.collected_weight_kg != null
      ? `${Number(row.collected_weight_kg).toFixed(2)} kg`
      : "-";
  const totalWeight = computeTotalWeight(row);

  const footer = (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        label={mode === "view" ? "Close" : "Cancel"}
        className="p-button-text p-button-secondary"
        onClick={onClose}
        disabled={isLoading}
      />
      {mode === "verify" && (
        <Button
          label="Verify"
          icon="pi pi-check"
          className="p-button-success"
          loading={isLoading}
          disabled={!row.actual_end_time}
          onClick={() => onConfirm(remarks)}
        />
      )}
    </div>
  );

  const title = mode === "verify" ? "Verify Trip Log" : "Trip Log Details";
  const statusColor: Record<string, string> = {
    Unverified: "text-gray-600",
    Verified: "text-green-600",
  };

  return (
    <Dialog
      visible
      onHide={onClose}
      header={
        <div className="flex items-start justify-between gap-4 pr-4">
          <div>
            <p className="text-lg font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 font-normal mt-0.5">
              {row.unique_id}
            </p>
          </div>
          <span
            className={`mt-1 text-xs font-semibold uppercase tracking-wide ${
              statusColor[row.log_status ?? ""] ?? "text-gray-500"
            }`}
          >
            {row.log_status}
          </span>
        </div>
      }
      footer={footer}
      style={{ width: "580px" }}
      modal
      draggable={false}
      resizable={false}
    >
      <div className="flex flex-col gap-5 pt-1">
        {/* Trip details */}
        <div>
          <SectionLabel>Trip Details</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <InfoRow
              label="Trip Assignment"
              value={
                row.trip_assignment?.display_code ?? row.trip_assignment_id
              }
            />
            <InfoRow label="Date" value={row.trip_date} />
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-36 shrink-0">
                Collection Status
              </span>
              <CollectionStatusBadge value={row.collection_status} />
            </div>
            <InfoRow label="Waste Type" value={wasteTypeName} />
            <InfoRow label="Bin Weight" value={weight} />
            {row.household_collected_weight_kg != null && (
              <InfoRow
                label="Household Weight"
                value={`${Number(row.household_collected_weight_kg).toFixed(2)} kg`}
              />
            )}
            <InfoRow
              label="Total Weight"
              value={`${totalWeight.toFixed(2)} kg`}
            />
            {Array.isArray(row.waste_type_breakdown) &&
              row.waste_type_breakdown.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-36 shrink-0">
                    Waste Breakdown
                  </span>
                  <WasteChips items={row.waste_type_breakdown} />
                </div>
              )}
            {row.actual_start_time && (
              <InfoRow
                label="Start Time"
                value={formatTimeOnly(row.actual_start_time)}
              />
            )}
            {row.actual_end_time && (
              <InfoRow
                label="End Time"
                value={formatTimeOnly(row.actual_end_time)}
              />
            )}
            {(row.vehicle as any)?.vehicle_no && (
              <InfoRow
                label="Vehicle"
                value={(row.vehicle as any).vehicle_no}
              />
            )}

            {/* Location — panchayat or ward */}
            {(() => {
              const ward = wardNameOf(row);
              const panchayat = row.panchayat?.panchayat_name ?? null;
              const zone =
                row.zone?.zone_name ??
                row.trip_assignment?.zone?.zone_name ??
                null;
              const parentLabel = panchayat
                ? "Panchayat"
                : zone
                  ? "Zone"
                  : null;
              const parentName = panchayat ?? zone ?? null;

              if (!ward && !parentName) return null;
              return (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-36 shrink-0">Location</span>
                  <span className="font-medium text-gray-800">
                    {ward ?? parentName}
                    {ward && parentName && (
                      <span
                        className={`ml-1.5 text-xs font-semibold ${
                          parentLabel === "Panchayat"
                            ? "text-indigo-500"
                            : "text-teal-500"
                        }`}
                      >
                        ({parentLabel}: {parentName})
                      </span>
                    )}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        <Divider className="!my-0" />

        {/* Staff */}
        <div>
          <SectionLabel>Staff</SectionLabel>
          {st?.base ? (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1.5">
                Base Template:{" "}
                <span className="font-semibold text-gray-700">
                  {st.base.display_code}
                </span>
              </p>
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-gray-200">
                <InfoRow label="Driver" value={st.base.driver?.employee_name} />
                <InfoRow
                  label="Operator"
                  value={st.base.operator?.employee_name}
                />
              </div>
            </div>
          ) : (
            <div className="mb-3 flex flex-col gap-1">
              <InfoRow label="Driver" value={row.driver?.employee_name} />
              <InfoRow label="Operator" value={row.operator?.employee_name} />
            </div>
          )}
          {st?.alt && (
            <div>
              <p className="text-xs text-orange-500 mb-1.5">
                Alt Template{" "}
                <span className="text-orange-400">(Substitute)</span>:{" "}
                <span className="font-semibold text-orange-700">
                  {st.alt.display_code}
                </span>
              </p>
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-orange-200">
                <InfoRow label="Driver" value={st.alt.driver?.employee_name} />
                <InfoRow
                  label="Operator"
                  value={st.alt.operator?.employee_name}
                />
              </div>
            </div>
          )}
        </div>

        {row.breakdown_info && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>Vehicle Breakdown</SectionLabel>
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  ✓ Replacement Arranged
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <InfoRow
                  label="Reason"
                  value={row.breakdown_info.breakdown_reason}
                />
                <InfoRow
                  label="Reported At"
                  value={row.breakdown_info.breakdown_time}
                />
                <InfoRow
                  label="Broken Vehicle"
                  value={row.breakdown_info.breakdown_vehicle_no}
                />
                <InfoRow
                  label="Replacement Vehicle"
                  value={row.breakdown_info.replacement_vehicle_no}
                />
                <InfoRow
                  label="Replacement Driver"
                  value={row.breakdown_info.replacement_driver}
                />
                <InfoRow
                  label="Replacement Operator"
                  value={row.breakdown_info.replacement_operator}
                />
              </div>
            </div>
          </>
        )}

        <Divider className="!my-0" />

        {/* Collection Points */}
        <div>
          <SectionLabel>
            Collection Points
            {cps.length > 0 && (
              <span className="ml-1 normal-case font-normal text-gray-400">
                — {collectedCount} / {cps.length} collected
              </span>
            )}
          </SectionLabel>
          {cps.length === 0 ? (
            <p className="text-sm text-gray-400">
              No collection points recorded.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cps.map((cp) => (
                <li
                  key={cp.unique_id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {cp.is_collected ? (
                      <i className="pi pi-check-circle text-green-500 text-base" />
                    ) : (
                      <i className="pi pi-times-circle text-red-400 text-base" />
                    )}
                    <span
                      className={
                        cp.is_collected ? "text-gray-800" : "text-gray-400"
                      }
                    >
                      {cp.sequence != null ? `${cp.sequence}. ` : ""}
                      {cp.cp_name ?? cp.unique_id}
                    </span>
                    {!cp.is_collected && (
                      <span className="text-xs text-red-400">
                        (Not collected)
                      </span>
                    )}
                    {Array.isArray(cp.waste_type_breakdown) &&
                      cp.waste_type_breakdown.length > 0 && (
                        <WasteChips items={cp.waste_type_breakdown} />
                      )}
                  </div>
                  {cp.collected_weight_kg != null ? (
                    <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full shrink-0">
                      {Number(cp.collected_weight_kg).toFixed(2)} kg
                    </span>
                  ) : cp.is_collected ? (
                    <span className="text-xs text-gray-400 shrink-0">— kg</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Household Collection Points */}
        {hhCollections.length > 0 && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>
                Household Collections
                <span className="ml-1 normal-case font-normal text-gray-400">
                  — {hhCollectedCount} / {hhCollections.length} collected
                </span>
              </SectionLabel>
              <ul className="flex flex-col gap-2">
                {hhCollections.map((hh) => (
                  <li
                    key={hh.unique_id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {hh.is_collected ? (
                        <i className="pi pi-check-circle text-green-500 text-base" />
                      ) : (
                        <i className="pi pi-times-circle text-red-400 text-base" />
                      )}
                      <span
                        className={
                          hh.is_collected ? "text-gray-800" : "text-gray-400"
                        }
                      >
                        {hh.sequence != null ? `${hh.sequence}. ` : ""}
                        {hh.customer_name ??
                          hh.customer_unique_id ??
                          hh.unique_id}
                      </span>
                      {!hh.is_collected && (
                        <span className="text-xs text-red-400">
                          (Not collected)
                        </span>
                      )}
                      {Array.isArray(hh.waste_type_breakdown) &&
                        hh.waste_type_breakdown.length > 0 && (
                          <WasteChips items={hh.waste_type_breakdown} />
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hh.collected_weight_kg != null ? (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          {Number(hh.collected_weight_kg).toFixed(2)} kg
                        </span>
                      ) : hh.is_collected ? (
                        <span className="text-xs text-gray-400">— kg</span>
                      ) : null}
                      {hh.collected_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(hh.collected_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Remarks */}
        {(mode === "verify" || row.remarks) && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>
                {mode === "verify" ? "Remarks (optional)" : "Remarks"}
              </SectionLabel>
              {mode === "verify" ? (
                <InputTextarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full text-sm"
                  placeholder="Add verification remarks..."
                  autoResize
                />
              ) : (
                <p className="text-sm text-gray-700">{row.remarks}</p>
              )}
            </div>
          </>
        )}

        {/* Verified by */}
        {mode === "view" &&
          row.log_status === "Verified" &&
          row.verified_by_name && (
            <>
              <Divider className="!my-0" />
              <div>
                <SectionLabel>Verification</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  <InfoRow label="Verified by" value={row.verified_by_name} />
                  <InfoRow
                    label="Verified at"
                    value={row.verified_at ?? undefined}
                  />
                </div>
              </div>
            </>
          )}
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────
   Main list component
───────────────────────────────────────────────────── */
type EnrichedTripLog = DailyTripLogRecord & {
  _assignment: string;
  _waste: string;
  _base_template: string;
  _alt_template: string;
  _location: string;
  _driver: string;
  _operator: string;
  _vehicle: string;
  _computed_weight: number;
  _has_point_weights: boolean;
};

/* ── client-side enrichment applied to every raw API row ── */
const enrichTripLogRow = (rec: DailyTripLogRecord): EnrichedTripLog => {
  return {
    ...rec,
    _assignment:
      rec.trip_assignment?.display_code ??
      rec.trip_assignment?.unique_id ??
      rec.trip_assignment_id ??
      "",
    _waste: wasteTypesLabel(rec),
    _base_template: rec.staff_template?.base?.display_code ?? "",
    _alt_template: rec.staff_template?.alt?.display_code ?? "",
    _location: locationText(rec),
    _driver:
      rec.staff_template?.base?.driver?.employee_name ??
      rec.driver?.employee_name ??
      "",
    _operator:
      rec.staff_template?.base?.operator?.employee_name ??
      rec.operator?.employee_name ??
      "",
    _vehicle: rec.vehicle?.vehicle_no ?? "",
    _computed_weight: computeCollectedWeight(rec.collection_points),
    _has_point_weights: (rec.collection_points ?? []).some(
      (cp) =>
        cp?.collected_weight_kg !== null &&
        cp?.collected_weight_kg !== undefined,
    ),
  };
};

export default function DailyTripLogList() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { canEdit } = useScreenAccess();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;

  // Company/Project (applied values), Collection type, Trip date and Waste
  // type live in the table's Filters panel as a draft and reach the list
  // once applied.
  const companyProject = useCompanyProjectFilter(() => setFirst(0), {
    // coming back from the form restores the company/project it was opened with
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { companies, isSuperAdmin } = companyProject.selection;

  const [rawRows, setRawRows] = useState<DailyTripLogRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const collectionTypeFilter = useOptionFilter({
    param: "collection_type",
    label: "Collection",
    allLabel: "All Collections",
    options: [
      { value: "bin", label: "Bin Collection" },
      { value: "household", label: "Household Collection" },
    ],
    onAppliedChange: () => setFirst(0),
  });
  const collectionType = (collectionTypeFilter.value || "all") as CollectionType;
  const [wasteTypeOptions, setWasteTypeOptions] = useState<
    { label: string; value: string }[]
  >([]);
  // Waste types are kept as one comma-joined string in the draft/applied
  // state (the multiselect splits it back into ids).
  const tripFilters = useDraftFilter({
    empty: { date: "", wasteTypes: "" },
    chips: {
      date: { label: "Trip date" },
      wasteTypes: {
        label: "Waste type",
        format: (ids) =>
          ids
            .split(",")
            .map(
              (id) =>
                wasteTypeOptions.find((option) => option.value === id)
                  ?.label ?? id,
            )
            .join(", "),
      },
    },
    onAppliedChange: () => setFirst(0),
  });
  const dateFilter = tripFilters.applied.date;
  const appliedWasteTypes = tripFilters.applied.wasteTypes;
  const wasteTypeFilter = useMemo(
    () => (appliedWasteTypes ? appliedWasteTypes.split(",") : []),
    [appliedWasteTypes],
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    row: DailyTripLogRecord;
    mode: "view" | "verify";
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [summary, setSummary] = useState<TripLogSummary>(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryVersion, setSummaryVersion] = useState(0);
  const requestIdRef = useRef(0);

  // Nothing loads until there is a company to scope to.
  const noScope =
    (isSuperAdmin && companies.length === 0) ||
    (!companyUniqueId && !isSuperAdmin);

  /* ── waste type options for the filter multiselect ── */
  useEffect(() => {
    (wasteTypeApi.readAll() as Promise<any[]>)
      .then((data) => {
        setWasteTypeOptions(
          (Array.isArray(data) ? data : []).map((wt) => ({
            label: wt.waste_type_name ?? wt.name ?? wt.unique_id,
            value: wt.unique_id,
          })),
        );
      })
      .catch(() => setWasteTypeOptions([]));
  }, []);

  /* ── build server query params from the company/project/date/waste-type filters ──
     waste_type_id is sent as one comma-separated string, which the backend's
     `params.getlist("waste_type_id")` splits back apart on "," (see
     daily_trip_log_viewset.py get_queryset). ── */
  const buildParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    if (dateFilter) params.date = dateFilter;
    if (wasteTypeFilter.length > 0)
      params.waste_type_id = wasteTypeFilter.join(",");
    return params;
  }, [companyUniqueId, projectId, dateFilter, wasteTypeFilter]);

  /* ── ordering param, from the sortField/sortOrder state, mapped through the
     backend's own manual `?ordering=` allowlist ── */
  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  /* ── load logs (re-runs whenever pagination/sort/search/status/company/project/date/waste-type filters change) ── */
  useEffect(() => {
    if (noScope) {
      requestIdRef.current += 1;
      setRawRows([]);
      setTotalRecords(0);
      return;
    }

    let mounted = true;

    const loadRows = async (page: number, limit: number) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      if (mounted) setRawRows([]);
      try {
        const response = await dailyTripLogApi.readAllwithPaginated(
          page,
          limit,
          {
            params: {
              ...buildParams(),
              ...(searchTerm ? { search: searchTerm } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(ordering ? { ordering } : {}),
            },
          },
        );
        if (requestId !== requestIdRef.current) return;
        if (mounted) {
          const list = toRecordList(response);
          setRawRows(list);
          setTotalRecords(
            typeof (response as { count?: number })?.count === "number"
              ? ((response as { count?: number }).count as number)
              : list.length,
          );
        }
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        if (mounted)
          Swal.fire({
            icon: "error",
            title: t("common.error"),
            text: extractError(err) ?? String(err),
          });
      } finally {
        if (requestId === requestIdRef.current && mounted) setIsLoading(false);
      }
    };

    void loadRows(first / rowsPerPage + 1, rowsPerPage);

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    noScope,
    companyUniqueId,
    projectId,
    dateFilter,
    wasteTypeFilter,
    statusFilter,
    first,
    rowsPerPage,
    searchTerm,
    ordering,
    t,
  ]);

  /* ── KPIs + status-tab counts over EVERY matching log (server-side), not
     just this page. The status tab is left out so its counts stay visible. ── */
  const summaryKey = JSON.stringify({
    ...buildParams(),
    ...(searchTerm ? { search: searchTerm } : {}),
  });
  useEffect(() => {
    if (noScope) {
      setSummary(EMPTY_SUMMARY);
      return;
    }
    let active = true;
    setSummaryLoading(true);
    api
      .get<TripLogSummary>("/schedule-operations/daily-trip-logs/summary/", {
        params: JSON.parse(summaryKey),
      })
      .then((res) => {
        if (active) setSummary({ ...EMPTY_SUMMARY, ...res.data });
      })
      .catch(() => {
        if (active) setSummary(EMPTY_SUMMARY);
      })
      .finally(() => {
        if (active) setSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [noScope, summaryKey, summaryVersion]);

  /* ── reset to first page whenever a non-pagination filter changes ── */
  useEffect(() => {
    setFirst(0);
  }, [companyUniqueId, projectId, dateFilter, wasteTypeFilter, collectionType]);

  /* ── debounce the global search box into the server-side `?search=` param ── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  /* ── filter by collection type — a client-side post-filter applied to the
     CURRENT PAGE only (bin-vs-household split isn't a simple backend field);
     totalRecords above still reflects the server-side total. Company/project
     scoping is applied server-side via params in the fetch effect above. ── */
  const data = noScope
    ? []
    : rawRows
        .map(enrichTripLogRow)
        .filter((row) => matchesCollectionType(row, collectionType));

  /* ── verify confirm (from modal) ── */
  const handleVerifyConfirm = async (remarks: string) => {
    if (!modalState) return;
    setIsVerifying(true);
    try {
      await api.patch(
        `/schedule-operations/daily-trip-logs/${modalState.row.unique_id}/verify/`,
        { remarks },
      );
      setRawRows((current) =>
        current.map((item) =>
          item.unique_id === modalState.row.unique_id
            ? { ...item, log_status: "Verified" }
            : item,
        ),
      );
      setModalState(null);
      setSummaryVersion((v) => v + 1);
      Swal.fire({
        icon: "success",
        title: "Verified",
        text: "Trip log has been verified.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        t("common.error"),
        extractError(err) ?? "Failed to verify trip log",
        "error",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  /* ── revert a verified log back to Unverified ── */
  const handleRevertToUnverified = async (row: DailyTripLogRecord) => {
    const result = await Swal.fire({
      title: "Revert to Unverified?",
      text: `This will move the log from "${row.log_status}" back to "Unverified".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, revert",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.patch(
        `/schedule-operations/daily-trip-logs/${row.unique_id}/change-status/`,
        { log_status: "Unverified" },
      );
      const updated = (res as any)?.data ?? res;
      setRawRows((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id
            ? {
                ...item,
                log_status: updated.log_status ?? "Unverified",
                verified_by_name: updated.verified_by_name ?? null,
                verified_at: updated.verified_at ?? null,
              }
            : item,
        ),
      );
      setSummaryVersion((v) => v + 1);
      Swal.fire({
        icon: "success",
        title: "Done",
        text: "Status changed to Unverified.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        t("common.error"),
        extractError(err) ?? "Failed to change status",
        "error",
      );
    }
  };

  /* ── kebab action menu: View / Verify / Revert ── */
  const actionTemplate = (row: DailyTripLogRecord) => {
    const isVerified = row.log_status === "Verified";
    // Verify requires the trip to have actually ended (actual_end_time set).
    const canVerify = !isVerified && Boolean(row.actual_end_time);

    return (
      <div className="flex justify-center">
        <ActionMenu
          actions={[
            {
              key: "view",
              label: "View details",
              icon: <i className="pi pi-eye" />,
              onClick: () =>
                navigate(
                  `${location.pathname.replace(/\/$/, "")}/${row.unique_id}/report`,
                ),
            },
            ...(canEdit
              ? [
                  {
                    key: "verify",
                    label: "Verify this log",
                    icon: <i className="pi pi-check-circle" />,
                    onClick: () => setModalState({ row, mode: "verify" as const }),
                    disabled: !canVerify,
                    disabledReason: isVerified
                      ? "Already verified"
                      : "Trip must have an actual end time before it can be verified",
                  },
                  {
                    key: "revert",
                    label: "Revert to unverified",
                    icon: <i className="pi pi-undo" />,
                    onClick: () => void handleRevertToUnverified(row),
                    disabled: !isVerified,
                    disabledReason: "Not verified yet",
                  },
                ]
              : []),
          ]}
        />
      </div>
    );
  };

  /* ── build one detailed export row per collection point / household
     collection (row explosion) — mirrors the reference tniwms report shape,
     falling back to a single trip-level row when a log has no line items ── */
  const buildExportRows = (
    source: DailyTripLogRecord[],
  ): Record<string, unknown>[] => {
    const out: Record<string, unknown>[] = [];
    source.forEach((row) => {
      const base = {
        "Trip ID": row.unique_id,
        "Trip Assignment":
          row.trip_assignment?.display_code ?? row.trip_assignment_id ?? "-",
        "Trip Date": row.trip_date ?? "-",
        Location:
          row.panchayat?.panchayat_name ??
          (Array.isArray(row.ward)
            ? row.ward[0]?.ward_name
            : row.ward?.ward_name) ??
          "-",
        Zone: row.trip_assignment?.zone?.zone_name ?? "-",
        Driver:
          row.staff_template?.base?.driver?.employee_name ??
          row.driver?.employee_name ??
          "-",
        Operator:
          row.staff_template?.base?.operator?.employee_name ??
          row.operator?.employee_name ??
          "-",
        Vehicle: row.vehicle?.vehicle_no ?? "-",
        "Log Status": row.log_status ?? "-",
        "Collection Status": row.collection_status ?? "-",
        "Collection Time":
          [
            row.actual_start_time
              ? formatTimeOnly(row.actual_start_time)
              : null,
            row.actual_end_time ? formatTimeOnly(row.actual_end_time) : null,
          ]
            .filter(Boolean)
            .join(" - ") || "-",
      };

      const cps = row.collection_points ?? [];
      const hhs = row.household_collections ?? [];

      cps.forEach((cp) => {
        out.push({
          ...base,
          "Point Type": "Collection Point",
          "Collection Point / Customer": cp.cp_name ?? cp.unique_id ?? "-",
          "Waste Type": wasteTypesLabel(row),
          "Collected Weight (kg)": cp.collected_weight_kg ?? "-",
          "Is Collected": cp.is_collected ? "Yes" : "No",
        });
      });

      hhs.forEach((hh) => {
        out.push({
          ...base,
          "Point Type": "Household",
          "Collection Point / Customer":
            hh.customer_name ?? hh.customer_unique_id ?? "-",
          "Waste Type": wasteTypesLabel(row),
          "Collected Weight (kg)": hh.collected_weight_kg ?? "-",
          "Is Collected": hh.is_collected ? "Yes" : "No",
          "Collection Time": hh.collected_at
            ? formatCollectionTime(hh.collected_at)
            : base["Collection Time"],
        });
      });

      if (cps.length === 0 && hhs.length === 0) {
        out.push({
          ...base,
          "Point Type": "-",
          "Collection Point / Customer": "-",
          "Waste Type": wasteTypesLabel(row),
          "Collected Weight (kg)": computeTotalWeight(row).toFixed(2),
          "Is Collected": "-",
        });
      }
    });
    return out;
  };

  /* ── download: fetch the FULL company/project/date/waste/status/search-filtered
     dataset fresh from the server (independent of whatever page is currently
     on screen), then apply the same collectionType post-filter used for the
     on-screen rows, and explode into per-point/customer rows. ── */
  const handleDownload = async (format: "excel" | "pdf") => {
    setExporting(format);
    try {
      const exportRaw = toRecordList(
        await dailyTripLogApi.readAllForExport({
          params: {
            ...buildParams(),
            ...(searchTerm ? { search: searchTerm } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
          },
        }),
      );
      const exportRows = buildExportRows(
        exportRaw.filter((row) => matchesCollectionType(row, collectionType)),
      );
      if (exportRows.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "No records",
          text: "There are no trip logs to export.",
        });
        return;
      }
      if (format === "excel") {
        await exportRecordsToExcel(
          exportRows,
          getAdminScreenExcelFilename("all"),
          "Daily Trip Logs",
        );
      } else {
        await downloadRecordsPdf({
          title: "Daily Trip Logs",
          filename: "daily_trip_logs.pdf",
          rows: exportRows,
          columns: Object.keys(exportRows[0]).map((key) => ({
            key,
            label: key,
          })),
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: t("common.error"),
        text: extractError(err) ?? err?.message ?? String(err),
      });
    } finally {
      setExporting(null);
    }
  };

  const tripFiltersField = (
    <>
      <FilterSection label="Trip date">
        <input
          type="date"
          value={tripFilters.draft.date}
          onChange={(e) => tripFilters.setField("date", e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Trip date"
          title="Filter by trip date"
        />
      </FilterSection>
      <FilterSection label="Waste type">
        <MultiSelect
          value={
            tripFilters.draft.wasteTypes
              ? tripFilters.draft.wasteTypes.split(",")
              : []
          }
          onChange={(e) =>
            tripFilters.setField("wasteTypes", (e.value as string[]).join(","))
          }
          options={wasteTypeOptions}
          placeholder="Waste Type"
          display="chip"
          className="w-full text-sm"
        />
      </FilterSection>
    </>
  );

  const statusCounts = summary.status_counts ?? {};
  const verifiedCount = statusCounts.Verified ?? 0;
  const unverifiedCount = statusCounts.Unverified ?? 0;
  const verifiedShare = summary.total_logs
    ? Math.round((verifiedCount / summary.total_logs) * 100)
    : 0;
  const kpiValue = (value: string | number) =>
    summaryLoading && summary.total_logs === 0 ? "…" : value;

  const changeStatusTab = (key: string) => {
    setStatusFilter(key);
    setFirst(0);
  };

  return (
    <div className="min-h-full bg-gray-50/60 p-3 sm:p-5">
      <ListPageHeader
        title="Daily Trip Logs"
        subtitle="Capture and verify actual collection trip results"
        className="mb-3 shrink-0"
      />

      {/* ── KPIs: every log matching the filters ── */}
      <div className="mb-3 grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon="pi pi-truck"
          tone="bg-slate-100 text-slate-600"
          label="Trip logs"
          value={kpiValue(summary.total_logs.toLocaleString())}
          hint={`${summary.trips.toLocaleString()} trips`}
        />
        <KpiCard
          icon="pi pi-box"
          tone="bg-emerald-50 text-emerald-600"
          label="Total weight"
          value={kpiValue(formatKg(summary.total_weight_kg))}
          hint={`Bin ${formatKg(summary.bin_weight_kg)} · HH ${formatKg(summary.household_weight_kg)}`}
        />
        <KpiCard
          icon="pi pi-calendar"
          tone="bg-cyan-50 text-cyan-600"
          label="Today"
          value={kpiValue(formatKg(summary.today_weight_kg))}
          hint="collected today"
        />
        <KpiCard
          icon="pi pi-verified"
          tone="bg-green-50 text-green-600"
          label="Verified"
          value={kpiValue(verifiedCount.toLocaleString())}
          hint={`${verifiedShare}% of logs`}
        />
        <KpiCard
          icon="pi pi-clock"
          tone="bg-amber-50 text-amber-600"
          label="Unverified"
          value={kpiValue(unverifiedCount.toLocaleString())}
          hint="awaiting verification"
        />
      </div>

      {/* Fixed table layout at 100% width: columns wrap their content
          instead of widening the table, so there is no horizontal scroll. */}
      <div className="overflow-x-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Log status">
          {STATUS_TABS.map((tab) => {
            const count = tab.key ? statusCounts[tab.key] ?? 0 : summary.total_logs;
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeStatusTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : tab.dot}`} />
                {tab.label}
                <span className={`tabular-nums ${active ? "text-white/80" : "text-gray-400"}`}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <DataTable
          exportable={false}
          filterPanel={combineFilters(companyProject, collectionTypeFilter, {
            ...tripFilters,
            field: tripFiltersField,
          })}
          documentActions={{
            downloadExcel: {
              onClick: () => void handleDownload("excel"),
              busy: exporting === "excel",
              disabled: exporting !== null || totalRecords === 0,
            },
            downloadPdf: {
              onClick: () => void handleDownload("pdf"),
              busy: exporting === "pdf",
              disabled: exporting !== null || totalRecords === 0,
            },
          }}
          value={data}
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
          rowsPerPageOptions={[10, 25, 50]}
          loading={isLoading}
          header={
            <FilterBar
              searchValue={globalFilterValue}
              onSearchChange={setGlobalFilterValue}
              searchPlaceholder="Search trip logs..."
              className="mb-4"
            />
          }
          stripedRows
          showGridlines
          emptyMessage="No trip logs found. Select a company and project to load data."
          tableStyle={{ tableLayout: "fixed", width: "100%", maxWidth: "100%" }}
          // The columns already fit the width (fixed layout, wrapping cells);
          // only the gridline borders poke a few px past it, which was enough
          // to show a horizontal scrollbar.
          className="p-datatable-sm [&_.p-datatable-wrapper]:overflow-x-hidden!"
        >
          <Column
            header={t("common.s_no")}
            // In lazy mode rowIndex already counts from the page's first record.
            body={(_: any, { rowIndex }: any) => rowIndex + 1}
            style={{ width: "4%" }}
          />
          <Column
            field="trip_date"
            header="Trip"
            sortable
            style={{ width: "14%" }}
            body={(row: EnrichedTripLog) => (
              <div className="min-w-0">
                <p className="break-all text-sm font-semibold text-gray-900">{row.unique_id}</p>
                <p className="break-all text-xs text-gray-500">{row._assignment || "-"}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-600">
                  <i className="pi pi-calendar text-[10px] text-gray-400" />
                  {row.trip_date ?? "-"}
                </p>
              </div>
            )}
          />
          {locationColumn<EnrichedTripLog>({
            header: "Location",
            style: { width: "14%" },
            levels: [
              {
                label: "Panchayat",
                value: (row) => row.panchayat?.panchayat_name,
              },
              {
                label: "Zone",
                value: (row) =>
                  row.zone?.zone_name ?? row.trip_assignment?.zone?.zone_name,
              },
              { label: "Ward", value: wardNameOf },
            ],
          })}
          <Column
            field="_driver"
            header="Crew & Vehicle"
            style={{ width: "16%" }}
            body={(row: EnrichedTripLog) => (
              <div className="min-w-0 space-y-0.5 text-xs">
                <p className="truncate font-semibold text-gray-800">
                  {row._base_template || "-"}
                  {row._alt_template ? (
                    <span className="ml-1 font-medium text-orange-600" title="Alternative (substitute) template">
                      → {row._alt_template}
                    </span>
                  ) : null}
                </p>
                <p
                  className="truncate text-gray-600"
                  title={`Driver: ${row._driver || "-"} · Operator: ${row._operator || "-"}`}
                >
                  <i className="pi pi-user mr-1 text-[10px] text-gray-400" />
                  {row._driver || "-"}
                  <span className="text-gray-300"> · </span>
                  {row._operator || "-"}
                </p>
                {row._vehicle ? (
                  <p className="truncate font-mono text-[10px] font-semibold text-gray-500">{row._vehicle}</p>
                ) : null}
                {row.breakdown_info ? <BreakdownCell row={row} /> : null}
              </div>
            )}
          />
          <Column
            field="_waste"
            header="Waste Type"
            style={{ width: "15%" }}
            body={(row: EnrichedTripLog) => (
              <WasteTypeChips
                breakdown={Array.isArray(row.waste_type_breakdown) ? row.waste_type_breakdown : undefined}
                names={row._waste && row._waste !== "-" ? row._waste.split(", ") : []}
              />
            )}
          />
          <Column
            field="collected_weight_kg"
            header="Weight"
            sortable
            style={{ width: "9%" }}
            body={(row: EnrichedTripLog) => {
              const bin = row._has_point_weights
                ? row._computed_weight
                : row.collected_weight_kg != null
                  ? Number(row.collected_weight_kg)
                  : null;
              const hh =
                row.household_collected_weight_kg != null
                  ? Number(row.household_collected_weight_kg)
                  : null;
              if (bin == null && hh == null) return <span className="text-sm text-gray-400">—</span>;
              return (
                <div className="min-w-0">
                  <p className="text-sm font-semibold tabular-nums text-gray-900">{formatKg((bin ?? 0) + (hh ?? 0))}</p>
                  <p className="text-[11px] tabular-nums text-gray-500">
                    {bin != null ? `Bin ${Number(bin).toFixed(1)}` : null}
                    {bin != null && hh != null ? " · " : null}
                    {hh != null ? `HH ${hh.toFixed(1)}` : null}
                  </p>
                </div>
              );
            }}
          />
          <Column
            field="actual_start_time"
            header="Time"
            style={{ width: "10%" }}
            body={(row: EnrichedTripLog) =>
              row.actual_start_time || row.actual_end_time ? (
                <div className="text-xs tabular-nums text-gray-700">
                  <p>
                    <i className="pi pi-play mr-1 text-[9px] text-green-500" />
                    {formatTimeOnly(row.actual_start_time)}
                  </p>
                  <p>
                    <i className="pi pi-stop mr-1 text-[9px] text-red-400" />
                    {formatTimeOnly(row.actual_end_time)}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )
            }
          />
          <Column
            field="log_status"
            header="Status"
            sortable
            style={{ width: "10%" }}
            body={(row: EnrichedTripLog) => (
              <div className="flex flex-col items-start gap-1">
                <Badge value={row.log_status} />
                {row.collection_status ? <CollectionStatusBadge value={row.collection_status} /> : null}
              </div>
            )}
          />
          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "8%" }}
          />
        </DataTable>
      </div>

      {modalState && (
        <TripLogModal
          row={modalState.row}
          mode={modalState.mode}
          onClose={() => setModalState(null)}
          onConfirm={handleVerifyConfirm}
          isLoading={isVerifying}
        />
      )}
    </div>
  );
}
