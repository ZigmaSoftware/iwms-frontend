import type { DailyTripLogRecord } from "./types";
import { formatCollectionTime } from "./collectionTime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import type { DataTablePageEvent, DataTableSortEvent, SortOrder } from "primereact/datatable";

import { MultiSelect } from "primereact/multiselect";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { dailyTripLogApi, wasteTypeApi } from "@/helpers/admin";
import { api } from "@/api";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import { downloadRecordsPdf } from "@/utils/exportPdf";
import { formatTimeOnly } from "@/utils/formatTime";
import { wasteTypeColorClass } from "@/utils/wasteTypeColors";


const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-700",
  Submitted: "bg-blue-100 text-blue-800",
  Verified: "bg-green-100 text-green-800",
};

const COLLECTION_STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-red-50 text-red-600",
  "In Progress": "bg-yellow-50 text-yellow-700",
  "Completed": "bg-green-100 text-green-700",
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
  const isPending  = bd.approval_status === "PENDING";

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isApproved ? "bg-green-100 text-green-700" :
        isPending  ? "bg-orange-100 text-orange-700" :
                     "bg-red-100 text-red-700"
      }`}>
        {isApproved ? "✓ Replaced" : isPending ? "⚠ Pending" : "✕ Rejected"}
      </span>
      {isApproved && bd.replacement_vehicle_no && (
        <div className="text-[10px] text-gray-600 leading-tight">
          <span className="font-medium">Veh:</span> {bd.replacement_vehicle_no}
        </div>
      )}
      {isApproved && (bd.replacement_driver || bd.replacement_operator) && (
        <div className="text-[10px] text-gray-600 leading-tight">
          {bd.replacement_driver && <span><span className="font-medium">Drv:</span> {bd.replacement_driver}</span>}
          {bd.replacement_driver && bd.replacement_operator && <span className="mx-1">·</span>}
          {bd.replacement_operator && <span><span className="font-medium">Opr:</span> {bd.replacement_operator}</span>}
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{children}</p>
);

const WasteChips = ({
  items,
}: {
  items?: { waste_type_name?: string | null; collected_weight_kg?: string | number | null }[];
}) => {
  if (!items || items.length === 0) return <span className="text-xs text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, index) => (
        <span
          key={`${item.waste_type_name}-${index}`}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
        >
          {item.waste_type_name ?? "—"}
          <span className="font-semibold">
            {item.collected_weight_kg != null ? `${Number(item.collected_weight_kg).toFixed(2)} kg` : "—"}
          </span>
        </span>
      ))}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="flex gap-2 text-sm">
    <span className="text-gray-500 w-36 shrink-0">{label}</span>
    <span className="font-medium text-gray-800">{value ?? "-"}</span>
  </div>
);

/* ── backend's manual `?ordering=` allowlist (see daily_trip_log_viewset.py) ── */
const SORTABLE_FIELDS = new Set(["unique_id", "trip_date", "collected_weight_kg", "log_status"]);

const toRecordList = (value: unknown): DailyTripLogRecord[] => {
  if (Array.isArray(value)) return value as DailyTripLogRecord[];
  if (value && typeof value === "object" && Array.isArray((value as { results?: unknown }).results)) {
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
  const zone = row.zone?.zone_name ?? row.trip_assignment?.zone?.zone_name ?? null;
  const parent = panchayat ? `Panchayat: ${panchayat}` : zone ? `Zone: ${zone}` : null;

  if (ward && parent) return `${ward} (${parent})`;
  if (ward) return ward;
  if (panchayat) return panchayat;
  if (zone) return zone;
  return "-";
};

const computeCollectedWeight = (collectionPoints?: DailyTripLogRecord["collection_points"]): number => {
  return (collectionPoints ?? []).reduce((sum, cp) => {
    if (cp?.collected_weight_kg === null || cp?.collected_weight_kg === undefined) {
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
    (cp) => cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined
  );
  const binWeight = hasPointWeights
    ? computeCollectedWeight(cps)
    : row.collected_weight_kg != null
    ? Number(row.collected_weight_kg)
    : 0;
  const householdWeight =
    row.household_collected_weight_kg != null ? Number(row.household_collected_weight_kg) : 0;
  return (Number.isFinite(binWeight) ? binWeight : 0) + (Number.isFinite(householdWeight) ? householdWeight : 0);
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
  mode: "view" | "verify" | "submit";
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
  const wasteTypeName = (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "-";
  const collectedWeightFromPoints = computeCollectedWeight(cps);
  const hasPointWeights = cps.some(
    (cp) => cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined
  );
  const weight = hasPointWeights
    ? `${collectedWeightFromPoints.toFixed(2)} kg`
    : row.collected_weight_kg != null
    ? `${Number(row.collected_weight_kg).toFixed(2)} kg`
    : "-";
  const totalWeight = computeTotalWeight(row);
  const canSubmit = totalWeight > 0;

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
          onClick={() => onConfirm(remarks)}
        />
      )}
      {mode === "submit" && (
        <Button
          label="Submit"
          icon="pi pi-send"
          className="p-button-info"
          loading={isLoading}
          disabled={!canSubmit}
          onClick={() => onConfirm(remarks)}
        />
      )}
    </div>
  );

  const title =
    mode === "verify" ? "Verify Trip Log" : mode === "submit" ? "Submit Trip Log" : "Trip Log Details";
  const statusColor: Record<string, string> = {
    Draft: "text-gray-600",
    Submitted: "text-blue-600",
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
            <p className="text-xs text-gray-400 font-normal mt-0.5">{row.unique_id}</p>
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
              value={row.trip_assignment?.display_code ?? row.trip_assignment_id}
            />
            <InfoRow label="Date" value={row.trip_date} />
            <div className="flex gap-2 text-sm">
              <span className="text-gray-500 w-36 shrink-0">Collection Status</span>
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
            <InfoRow label="Total Weight" value={`${totalWeight.toFixed(2)} kg`} />
            {Array.isArray(row.waste_type_breakdown) && row.waste_type_breakdown.length > 0 && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-500 w-36 shrink-0">Waste Breakdown</span>
                <WasteChips items={row.waste_type_breakdown} />
              </div>
            )}
            {row.actual_start_time && (
              <InfoRow label="Start Time" value={formatCollectionTime(row.actual_start_time)} />
            )}
            {row.actual_end_time && (
              <InfoRow label="End Time" value={formatCollectionTime(row.actual_end_time)} />
            )}
            {mode === "submit" && !canSubmit && (
              <p className="text-xs text-red-500 font-medium mt-1">
                Total weight must be greater than 0 kg before this log can be submitted.
              </p>
            )}
            {(row.vehicle as any)?.vehicle_no && (
              <InfoRow label="Vehicle" value={(row.vehicle as any).vehicle_no} />
            )}

            {/* Location — panchayat or ward */}
            {(() => {
              const ward = wardNameOf(row);
              const panchayat = row.panchayat?.panchayat_name ?? null;
              const zone = row.zone?.zone_name ?? row.trip_assignment?.zone?.zone_name ?? null;
              const parentLabel = panchayat ? "Panchayat" : zone ? "Zone" : null;
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
                          parentLabel === "Panchayat" ? "text-indigo-500" : "text-teal-500"
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
                <span className="font-semibold text-gray-700">{st.base.display_code}</span>
              </p>
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-gray-200">
                <InfoRow label="Driver" value={st.base.driver?.employee_name} />
                <InfoRow label="Operator" value={st.base.operator?.employee_name} />
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
                Alt Template <span className="text-orange-400">(Substitute)</span>:{" "}
                <span className="font-semibold text-orange-700">{st.alt.display_code}</span>
              </p>
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-orange-200">
                <InfoRow label="Driver" value={st.alt.driver?.employee_name} />
                <InfoRow label="Operator" value={st.alt.operator?.employee_name} />
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
                <InfoRow label="Reason" value={row.breakdown_info.breakdown_reason} />
                <InfoRow label="Reported At" value={row.breakdown_info.breakdown_time} />
                <InfoRow label="Broken Vehicle" value={row.breakdown_info.breakdown_vehicle_no} />
                <InfoRow label="Replacement Vehicle" value={row.breakdown_info.replacement_vehicle_no} />
                <InfoRow label="Replacement Driver" value={row.breakdown_info.replacement_driver} />
                <InfoRow label="Replacement Operator" value={row.breakdown_info.replacement_operator} />
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
            <p className="text-sm text-gray-400">No collection points recorded.</p>
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
                    <span className={cp.is_collected ? "text-gray-800" : "text-gray-400"}>
                      {cp.sequence != null ? `${cp.sequence}. ` : ""}
                      {cp.cp_name ?? cp.unique_id}
                    </span>
                    {!cp.is_collected && (
                      <span className="text-xs text-red-400">(Not collected)</span>
                    )}
                    {Array.isArray(cp.waste_type_breakdown) && cp.waste_type_breakdown.length > 0 && (
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
                      <span className={hh.is_collected ? "text-gray-800" : "text-gray-400"}>
                        {hh.sequence != null ? `${hh.sequence}. ` : ""}
                        {hh.customer_name ?? hh.customer_unique_id ?? hh.unique_id}
                      </span>
                      {!hh.is_collected && (
                        <span className="text-xs text-red-400">(Not collected)</span>
                      )}
                      {Array.isArray(hh.waste_type_breakdown) && hh.waste_type_breakdown.length > 0 && (
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
        {(mode === "verify" || mode === "submit" || row.remarks) && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>
                {mode === "verify" || mode === "submit" ? "Remarks (optional)" : "Remarks"}
              </SectionLabel>
              {mode === "verify" || mode === "submit" ? (
                <InputTextarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full text-sm"
                  placeholder={mode === "submit" ? "Add submission remarks..." : "Add verification remarks..."}
                  autoResize
                />
              ) : (
                <p className="text-sm text-gray-700">{row.remarks}</p>
              )}
            </div>
          </>
        )}

        {/* Verified by */}
        {mode === "view" && row.log_status === "Verified" && row.verified_by_name && (
          <>
            <Divider className="!my-0" />
            <div>
              <SectionLabel>Verification</SectionLabel>
              <div className="flex flex-col gap-1.5">
                <InfoRow label="Verified by" value={row.verified_by_name} />
                <InfoRow label="Verified at" value={row.verified_at ?? undefined} />
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
export default function DailyTripLogList() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

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

  const [rawRows, setRawRows] = useState<DailyTripLogRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [collectionType, setCollectionType] = useState<"all" | "bin" | "household">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [wasteTypeFilter, setWasteTypeFilter] = useState<string[]>([]);
  const [wasteTypeOptions, setWasteTypeOptions] = useState<{ label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    row: DailyTripLogRecord;
    mode: "view" | "verify" | "submit";
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const requestIdRef = useRef(0);

  /* ── waste type options for the filter multiselect ── */
  useEffect(() => {
    (wasteTypeApi.readAll() as Promise<any[]>)
      .then((data) => {
        setWasteTypeOptions(
          (Array.isArray(data) ? data : []).map((wt) => ({
            label: wt.waste_type_name ?? wt.name ?? wt.unique_id,
            value: wt.unique_id,
          }))
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
    if (wasteTypeFilter.length > 0) params.waste_type_id = wasteTypeFilter.join(",");
    return params;
  }, [companyUniqueId, projectId, dateFilter, wasteTypeFilter]);

  /* ── ordering param, from the sortField/sortOrder state, mapped through the
     backend's own manual `?ordering=` allowlist ── */
  const ordering = sortField && SORTABLE_FIELDS.has(sortField)
    ? `${sortOrder === -1 ? "-" : ""}${sortField}`
    : undefined;

  /* ── load logs (re-runs whenever pagination/sort/search/company/project/date/waste-type filters change) ── */
  useEffect(() => {
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

    let mounted = true;

    const loadRows = async (page: number, limit: number) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      if (mounted) setRawRows([]);
      try {
        const response = await dailyTripLogApi.readAllwithPaginated(page, limit, {
          params: {
            ...buildParams(),
            ...(searchTerm ? { search: searchTerm } : {}),
            ...(ordering ? { ordering } : {}),
          },
        });
        if (requestId !== requestIdRef.current) return;
        if (mounted) {
          const list = toRecordList(response);
          setRawRows(list);
          setTotalRecords(
            typeof (response as { count?: number })?.count === "number"
              ? (response as { count?: number }).count as number
              : list.length,
          );
        }
      } catch (err: any) {
        if (requestId !== requestIdRef.current) return;
        if (mounted)
          Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? String(err) });
      } finally {
        if (requestId === requestIdRef.current && mounted) setIsLoading(false);
      }
    };

    void loadRows(first / rowsPerPage + 1, rowsPerPage);

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, dateFilter, wasteTypeFilter, first, rowsPerPage, searchTerm, ordering, t]);

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

  /* ── enrich rows (current page only) ── */
  const rows = rawRows.map((rec) => {
    const zoneName = rec.trip_assignment?.zone?.zone_name ?? null;
    return {
      ...rec,
      trip_assignment: rec.trip_assignment
        ? { ...rec.trip_assignment, zone: zoneName }
        : null,
      _assignment:
        rec.trip_assignment?.display_code ??
        rec.trip_assignment?.unique_id ??
        rec.trip_assignment_id ??
        "",
      _waste: (rec.waste_type as any)?.waste_type_name ?? rec.waste_type_id ?? "",
      _base_template: rec.staff_template?.base?.display_code ?? "",
      _alt_template: rec.staff_template?.alt?.display_code ?? "",
      _location: locationText(rec),
      _computed_weight: computeCollectedWeight(rec.collection_points),
      _has_point_weights: (rec.collection_points ?? []).some(
        (cp) => cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined
      ),
    };
  });

  /* ── filter by collection type — a client-side post-filter applied to the
     CURRENT PAGE only (bin-vs-household split isn't a simple backend field);
     totalRecords above still reflects the server-side total. Company/project
     scoping is applied server-side via params in the fetch effect above. ── */
  const data = (() => {
    if (isSuperAdmin && companies.length === 0) return [];
    if (!companyUniqueId && !isSuperAdmin) return [];
    return rows.filter((row) => {
      if (collectionType === "bin") {
        const hasBinWeight =
          (row._has_point_weights && (row._computed_weight ?? 0) > 0) ||
          (row.collected_weight_kg != null && Number(row.collected_weight_kg) > 0);
        return hasBinWeight;
      }
      if (collectionType === "household") {
        return (
          row.household_collected_weight_kg != null &&
          Number(row.household_collected_weight_kg) > 0
        );
      }
      return true;
    });
  })();

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(e.target.value);
  };

  /* ── verify confirm (from modal) ── */
  const handleVerifyConfirm = async (remarks: string) => {
    if (!modalState) return;
    setIsVerifying(true);
    try {
      await api.patch(
        `/schedule-operations/daily-trip-logs/${modalState.row.unique_id}/verify/`,
        { remarks }
      );
      setRawRows((current) =>
        current.map((item) =>
          item.unique_id === modalState.row.unique_id
            ? { ...item, log_status: "Verified" }
            : item
        )
      );
      setModalState(null);
      Swal.fire({
        icon: "success",
        title: "Verified",
        text: "Trip log has been verified.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to verify trip log", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  /* ── submit confirm (from modal): Draft → Submitted via change-status,
     with a client-side weight>0 pre-check per the A6 contract. The server
     also enforces this gate in DailyTripLog.clean(); a 400 is still
     handled gracefully below in case source records change between the
     pre-check and the actual request. ── */
  const handleSubmitConfirm = async (remarks: string) => {
    if (!modalState) return;
    const totalWeight = computeTotalWeight(modalState.row);
    if (totalWeight <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Weight required",
        text: "Total collected weight must be greater than 0 kg before submitting this log.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.patch(
        `/schedule-operations/daily-trip-logs/${modalState.row.unique_id}/change-status/`,
        { log_status: "Submitted", ...(remarks ? { remarks } : {}) }
      );
      const updated = (res as any)?.data ?? res;
      setRawRows((current) =>
        current.map((item) =>
          item.unique_id === modalState.row.unique_id
            ? { ...item, log_status: updated.log_status ?? "Submitted", remarks: updated.remarks ?? item.remarks }
            : item
        )
      );
      setModalState(null);
      Swal.fire({
        icon: "success",
        title: "Submitted",
        text: "Trip log has been submitted.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to submit trip log", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── inline status change (Draft ↔ Verify) ── */
  const handleStatusChange = async (row: DailyTripLogRecord, newStatus: string) => {
    const result = await Swal.fire({
      title: `Change status to ${newStatus}?`,
      text: `This will move the log from "${row.log_status}" to "${newStatus}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes, change to ${newStatus}`,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.patch(
        `/schedule-operations/daily-trip-logs/${row.unique_id}/change-status/`,
        { log_status: newStatus }
      );
      const updated = (res as any)?.data ?? res;
      setRawRows((current) =>
        current.map((item) =>
          item.unique_id === row.unique_id
            ? {
                ...item,
                log_status: updated.log_status ?? newStatus,
                verified_by_name: updated.verified_by_name ?? null,
                verified_at: updated.verified_at ?? null,
              }
            : item
        )
      );
      Swal.fire({
        icon: "success",
        title: "Done",
        text: `Status changed to ${newStatus}.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(t("common.error"), extractError(err) ?? "Failed to change status", "error");
    }
  };

  /* ── inline action buttons ── */
  const actionTemplate = (row: DailyTripLogRecord) => {
    const isVerified = row.log_status === "Verified";
    const isDraft = row.log_status === "Draft";
    const isSubmitted = row.log_status === "Submitted";
    const totalWeight = computeTotalWeight(row);
    const canSubmit = isDraft && totalWeight > 0;

    return (
      <div className="flex items-center gap-1.5">
        {/* View — full trip detail report page */}
        <button
          title="View details"
          onClick={() => navigate(`${location.pathname.replace(/\/$/, "")}/${row.unique_id}/report`)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <i className="pi pi-eye text-xs" />
          View
        </button>

        {/* Submit — Draft only, requires total weight > 0 (A6 contract) */}
        {isDraft && (
          <button
            title={canSubmit ? "Submit this log" : "Total weight must be greater than 0 kg to submit"}
            disabled={!canSubmit}
            onClick={() => setModalState({ row, mode: "submit" })}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              canSubmit
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-blue-50 text-blue-300 cursor-not-allowed opacity-60"
            }`}
          >
            <i className="pi pi-send text-xs" />
            Submit
          </button>
        )}

        {/* Verify — Submitted/Draft only, disabled once already Verified (read-only) */}
        <button
          title={isVerified ? "Already verified" : "Verify this log"}
          disabled={isVerified}
          onClick={() => setModalState({ row, mode: "verify" })}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            isVerified
              ? "bg-green-50 text-green-400 cursor-not-allowed opacity-60"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
        >
          <i className="pi pi-check-circle text-xs" />
          Verify
        </button>

        {/* Draft — revert to Draft; disabled when already Draft, and
           disabled once Verified since the backend rejects any further
           change to a Verified log (read-only-once-Verified guard). */}
        <button
          title={isVerified ? "Verified logs are read-only" : isDraft ? "Already in draft" : "Revert to draft"}
          disabled={isDraft || isVerified}
          onClick={() => handleStatusChange(row, "Draft")}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            isDraft || isVerified
              ? "bg-gray-50 text-gray-300 cursor-not-allowed opacity-60"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <i className="pi pi-undo text-xs" />
          Draft
        </button>

        {isSubmitted && (
          <span className="text-[10px] text-gray-400 italic">awaiting verify</span>
        )}
      </div>
    );
  };

  /* ── build one detailed export row per collection point / household
     collection (row explosion) — mirrors the reference tniwms report shape,
     falling back to a single trip-level row when a log has no line items ── */
  const buildExportRows = (source: DailyTripLogRecord[]): Record<string, unknown>[] => {
    const out: Record<string, unknown>[] = [];
    source.forEach((row) => {
      const base = {
        "Trip ID": row.unique_id,
        "Trip Assignment": row.trip_assignment?.display_code ?? row.trip_assignment_id ?? "-",
        "Trip Date": row.trip_date ?? "-",
        Location:
          row.panchayat?.panchayat_name ??
          (Array.isArray(row.ward) ? row.ward[0]?.ward_name : row.ward?.ward_name) ??
          "-",
        Zone: row.trip_assignment?.zone?.zone_name ?? "-",
        Driver:
          row.staff_template?.base?.driver?.employee_name ?? row.driver?.employee_name ?? "-",
        Operator:
          row.staff_template?.base?.operator?.employee_name ?? row.operator?.employee_name ?? "-",
        Vehicle: row.vehicle?.vehicle_no ?? "-",
        "Log Status": row.log_status ?? "-",
        "Collection Status": row.collection_status ?? "-",
        "Collection Time": [
          row.actual_start_time ? formatTimeOnly(row.actual_start_time) : null,
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
          "Waste Type": (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "-",
          "Collected Weight (kg)": cp.collected_weight_kg ?? "-",
          "Is Collected": cp.is_collected ? "Yes" : "No",
        });
      });

      hhs.forEach((hh) => {
        out.push({
          ...base,
          "Point Type": "Household",
          "Collection Point / Customer": hh.customer_name ?? hh.customer_unique_id ?? "-",
          "Waste Type": (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "-",
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
          "Waste Type": (row.waste_type as any)?.waste_type_name ?? row.waste_type_id ?? "-",
          "Collected Weight (kg)": computeTotalWeight(row).toFixed(2),
          "Is Collected": "-",
        });
      }
    });
    return out;
  };

  /* ── download: fetch the FULL company/project/date/waste/search-filtered
     dataset fresh from the server (independent of whatever page is currently
     on screen), then apply the same enrichment + collectionType post-filter
     used for the on-screen rows, and explode into per-point/customer rows. ── */
  const handleDownload = async (format: "excel" | "pdf") => {
    setIsExporting(true);
    try {
      const exportRaw = toRecordList(
        await dailyTripLogApi.readAllForExport({
          params: { ...buildParams(), ...(searchTerm ? { search: searchTerm } : {}) },
        }),
      );
      const exportSourceRows = exportRaw.filter((row) => {
        const cps = row.collection_points ?? [];
        const hasPointWeights = cps.some(
          (cp) => cp?.collected_weight_kg !== null && cp?.collected_weight_kg !== undefined
        );
        const computedWeight = computeCollectedWeight(cps);
        if (collectionType === "bin") {
          const hasBinWeight =
            (hasPointWeights && computedWeight > 0) ||
            (row.collected_weight_kg != null && Number(row.collected_weight_kg) > 0);
          return hasBinWeight;
        }
        if (collectionType === "household") {
          return (
            row.household_collected_weight_kg != null &&
            Number(row.household_collected_weight_kg) > 0
          );
        }
        return true;
      });

      const exportRows = buildExportRows(exportSourceRows);
      if (exportRows.length === 0) {
        Swal.fire({ icon: "warning", title: "No records", text: "There are no trip logs to export." });
        return;
      }
      if (format === "excel") {
        exportRecordsToExcel(exportRows, getAdminScreenExcelFilename("all"), "Daily Trip Logs");
      } else {
        downloadRecordsPdf({
          title: "Daily Trip Logs",
          filename: "daily_trip_logs.pdf",
          rows: exportRows,
          columns: Object.keys(exportRows[0]).map((key) => ({ key, label: key })),
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: t("common.error"), text: extractError(err) ?? err?.message ?? String(err) });
    } finally {
      setIsExporting(false);
    }
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-3">
      <FilterBar hideSearch searchValue="" onSearchChange={() => {}}>
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
          value={collectionType}
          onChange={(value) => setCollectionType(value as "all" | "bin" | "household")}
          options={[
            { value: "all", label: "All Collections" },
            { value: "bin", label: "Bin Collection" },
            { value: "household", label: "Household Collection" },
          ]}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-2 text-sm text-gray-700"
          title="Filter by trip date"
        />
        <MultiSelect
          value={wasteTypeFilter}
          onChange={(e) => setWasteTypeFilter(e.value)}
          options={wasteTypeOptions}
          placeholder="Waste Type"
          display="chip"
          className="h-9 text-sm"
          style={{ minWidth: 180 }}
        />
      </FilterBar>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={(value) =>
          onGlobalFilterChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
        }
        searchPlaceholder="Search trip logs..."
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              label={isExporting ? "Exporting..." : "Download Excel"}
              icon="pi pi-file-excel"
              className="p-button-outlined p-button-sm"
              disabled={isExporting}
              onClick={() => handleDownload("excel")}
            />
            <Button
              label={isExporting ? "Exporting..." : "Download PDF"}
              icon="pi pi-file-pdf"
              className="p-button-outlined p-button-sm"
              disabled={isExporting}
              onClick={() => handleDownload("pdf")}
            />
          </div>
        }
      />
    </div>
  );

  /* ── KPI pills: computed from the CURRENT PAGE only (post-collectionType
     filter) — the backend has no aggregate endpoint for this deep a
     computation, so these are deliberately labeled "(page)" rather than
     implying dataset-wide totals. ── */
  const kpiRecordCount = data.length;
  const kpiOverallWeight = data.reduce(
    (sum, row) => sum + (row._computed_weight ?? 0) + Number(row.household_collected_weight_kg ?? 0),
    0
  );

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Daily Trip Logs</h1>
          <p className="text-sm text-gray-500">Capture and verify actual collection trip results</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Records (page)</p>
          <p className="text-lg font-bold text-gray-900">{kpiRecordCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Overall Weight (page)</p>
          <p className="text-lg font-bold text-gray-900">{kpiOverallWeight.toFixed(2)} kg</p>
        </div>
      </div>

      <DataTable
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
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading}
        header={renderHeader()}
        exportable={false}
        stripedRows
        showGridlines
        emptyMessage="No trip logs found. Select a company and project to load data."
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
          sortable
          style={{ minWidth: 150 }}
        />
        <Column
          field="_assignment"
          header="Trip Assignment"
          style={{ minWidth: 170 }}
        />
        <Column
          field="_location"
          header="Location"
          style={{ minWidth: 170 }}
          body={(row: DailyTripLogRecord) => {
            const ward = wardNameOf(row);
            const panchayat = row.panchayat?.panchayat_name ?? null;
            const zone = row.zone?.zone_name ?? row.trip_assignment?.zone?.zone_name ?? null;
            const parentLabel = panchayat ? "Panchayat" : zone ? "Zone" : null;
            const parentName = panchayat ?? zone ?? null;

            if (!ward && !parentName) {
              return <span className="text-sm text-gray-400">-</span>;
            }
            return (
              <span className="text-sm text-gray-800">
                {ward ?? parentName}
                {ward && parentName && (
                  <span
                    className={`ml-1 text-xs font-medium ${
                      parentLabel === "Panchayat" ? "text-indigo-500" : "text-teal-500"
                    }`}
                  >
                    ({parentLabel}: {parentName})
                  </span>
                )}
              </span>
            );
          }}
        />
        <Column
          field="_base_template"
          header="Staff Template"
          style={{ minWidth: 160 }}
          body={(row: DailyTripLogRecord) => (
            <span className="text-sm text-gray-800">
              {row.staff_template?.base?.display_code ?? "-"}
            </span>
          )}
        />
        <Column
          field="_alt_template"
          header="Alt Staff Template"
          style={{ minWidth: 170 }}
          body={(row: DailyTripLogRecord) =>
            row.staff_template?.alt ? (
              <span className="text-sm font-medium text-orange-700">
                {row.staff_template.alt.display_code}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )
          }
        />
        <Column
          header="Vehicle Breakdown"
          style={{ minWidth: 140 }}
          body={(row: DailyTripLogRecord) => <BreakdownCell row={row} />}
        />
        <Column
          field="_waste"
          header="Waste Type"
          body={(row: DailyTripLogRecord & { _waste?: string }) =>
            row._waste ? (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${wasteTypeColorClass(row._waste)}`}>
                {row._waste}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )
          }
        />
        <Column
          field="collected_weight_kg"
          header="Bin Weight (kg)"
          sortable
          style={{ minWidth: 130 }}
          body={(row: DailyTripLogRecord & { _computed_weight?: number; _has_point_weights?: boolean }) => {
            const weight = row._has_point_weights
              ? row._computed_weight
              : row.collected_weight_kg;
            return weight != null ? (
              <span className="font-semibold text-gray-800">
                {Number(weight).toFixed(2)}
              </span>
            ) : (
              "-"
            );
          }}
        />
        <Column
          field="household_collected_weight_kg"
          header="HH Weight (kg)"
          style={{ minWidth: 130 }}
          body={(row: DailyTripLogRecord) =>
            row.household_collected_weight_kg != null ? (
              <span className="font-semibold text-gray-800">
                {Number(row.household_collected_weight_kg).toFixed(2)}
              </span>
            ) : (
              "-"
            )
          }
        />
        <Column
          header="Total Weight (kg)"
          style={{ minWidth: 140 }}
          body={(row: DailyTripLogRecord) => (
            <span className="font-semibold text-gray-800">{computeTotalWeight(row).toFixed(2)}</span>
          )}
        />
        <Column
          field="actual_start_time"
          header="Start Time"
          style={{ minWidth: 110 }}
          body={(row: DailyTripLogRecord) => (
            <span className="text-sm text-gray-700">{formatCollectionTime(row.actual_start_time)}</span>
          )}
        />
        <Column
          field="actual_end_time"
          header="End Time"
          style={{ minWidth: 110 }}
          body={(row: DailyTripLogRecord) => (
            <span className="text-sm text-gray-700">{formatCollectionTime(row.actual_end_time)}</span>
          )}
        />
        <Column
          field="log_status"
          header="Log Status"
          body={(row: DailyTripLogRecord) => <Badge value={row.log_status} />}
          sortable
          style={{ minWidth: 110 }}
        />
        <Column
          field="collection_status"
          header="Collection Status"
          body={(row: DailyTripLogRecord) => <CollectionStatusBadge value={row.collection_status} />}
          style={{ minWidth: 145 }}
        />
        <Column
          field="trip_date"
          header="Trip Date"
          sortable
          style={{ minWidth: 110 }}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ minWidth: 260 }}
        />
      </DataTable>

      {modalState && (
        <TripLogModal
          row={modalState.row}
          mode={modalState.mode}
          onClose={() => setModalState(null)}
          onConfirm={modalState.mode === "submit" ? handleSubmitConfirm : handleVerifyConfirm}
          isLoading={modalState.mode === "submit" ? isSubmitting : isVerifying}
        />
      )}
    </div>
  );
}
