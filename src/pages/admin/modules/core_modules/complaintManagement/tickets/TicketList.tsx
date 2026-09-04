import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";
import { Eye } from "lucide-react";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { getEncryptedRoute } from "@/utils/routeCache";
import {
  complaintFeedbackApi,
  complaintTicketApi,
  geoApi,
} from "@/features/complaintTicketing/api";
import type {
  ComplaintFeedback,
  ComplaintTicket,
  GeoOption,
  LocalBodyOption,
} from "@/features/complaintTicketing/types";
import { asArray, errorText, formatDateTime } from "../utils";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { ListPageHeader } from "@/components/common/ListPageHeader";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";

const PUBLIC_SOURCE_CODE = "PUBLIC_GRIEVANCE";

type SourceFilter = "all" | "public" | "internal";

const isPublic = (row: ComplaintTicket) =>
  row.source_code === PUBLIC_SOURCE_CODE;

const toRecordList = (value: unknown): ComplaintTicket[] => {
  if (Array.isArray(value)) return value as ComplaintTicket[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: ComplaintTicket[] }).results;
  }
  return [];
};

// Backend `ordering_fields` also includes updated/sla_due_at, but only these
// two are rendered as columns whose field name matches a real orderable
// backend column - keep sorting limited to what the server can honor.
const SORTABLE_FIELDS = new Set(["ticket_no", "created"]);

export default function TicketList() {
  const navigate = useNavigate();
  const { encComplaintTicket, encComplaint } = getEncryptedRoute();
  const { newPath, editPath } = createCrudRoutePaths(
    encComplaintTicket,
    encComplaint,
  );
  // Table view: one server-paginated page of raw ticket rows.
  const [tableRows, setTableRows] = useState<ComplaintTicket[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tableLoading, setTableLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);

  // Tab counts (All / Public Grievances / Internal) - sourced from the
  // backend so all three are correct regardless of page/sort/source tab.
  const [counts, setCounts] = useState<{
    all: number;
    public: number;
    internal: number;
  }>({
    all: 0,
    public: 0,
    internal: 0,
  });

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  // Feedback used to be its own top-level screen; it's read-only and
  // ticket-scoped (also viewable per-ticket via the Detail screen's Feedback
  // tab), so it lives here now as a column + quick-filter instead.
  const [feedbackByTicket, setFeedbackByTicket] = useState<
    Map<string, ComplaintFeedback>
  >(new Map());

  const [states, setStates] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [panchayats, setPanchayats] = useState<LocalBodyOption[]>([]);
  const [zones, setZones] = useState<LocalBodyOption[]>([]);
  const [wards, setWards] = useState<LocalBodyOption[]>([]);
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [panchayatFilter, setPanchayatFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [wardFilter, setWardFilter] = useState("");

  useEffect(() => {
    complaintFeedbackApi
      .readAll({ params: { all: 1 } })
      .then((response) => {
        const rows = asArray<ComplaintFeedback>(response);
        setFeedbackByTicket(
          new Map(rows.map((row) => [String(row.ticket), row])),
        );
      })
      .catch(() => setFeedbackByTicket(new Map()));
    geoApi
      .states()
      .then(setStates)
      .catch(() => setStates([]));
    geoApi
      .districts()
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, []);

  // Tickets are company/project-scoped (`CompanyScopedViewSet`), so the list
  // gets the same Company/Project pickers every scoped list uses — see
  // `staffTemplateList.tsx`. Public grievances are exempt: they arrive with no
  // logged-in tenant and are stamped server-side by
  // `_resolve_company_project`, so nothing here filters them out.
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, defaultToAll: true });

  const selectedProjectId =
    projectId && projects.some((project) => project.value === projectId)
      ? projectId
      : "";

  const buildTicketParams = () => ({
    ...(companyUniqueId ? { company_id: companyUniqueId } : {}),
    ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
    ...(sourceFilter !== "all" ? { source: sourceFilter } : {}),
    ...(stateFilter ? { state: stateFilter } : {}),
    ...(districtFilter ? { district: districtFilter } : {}),
    ...(panchayatFilter ? { panchayat: panchayatFilter } : {}),
    ...(zoneFilter ? { zone: zoneFilter } : {}),
    ...(wardFilter ? { ward: wardFilter } : {}),
  });

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const loadTableRows = async (
    page: number,
    limit: number,
    search: string,
    orderingParam?: string,
  ) => {
    setTableLoading(true);
    try {
      const response = await complaintTicketApi.readAllwithPaginated(
        page,
        limit,
        {
          params: {
            ...buildTicketParams(),
            ...(search ? { search } : {}),
            ...(orderingParam ? { ordering: orderingParam } : {}),
          },
        },
      );
      setTableRows(toRecordList(response));
      setTotalRecords(
        typeof response?.count === "number"
          ? response.count
          : toRecordList(response).length,
      );
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to load tickets"), "error");
    } finally {
      setTableLoading(false);
    }
  };

  // Reset to the first page whenever any filter other than pagination
  // itself changes, so the user isn't left stranded on an out-of-range page.
  useEffect(() => {
    setFirst(0);
  }, [
    searchTerm,
    ordering,
    companyUniqueId,
    selectedProjectId,
    sourceFilter,
    stateFilter,
    districtFilter,
    panchayatFilter,
    zoneFilter,
    wardFilter,
  ]);

  useEffect(() => {
    void loadTableRows(
      first / rowsPerPage + 1,
      rowsPerPage,
      searchTerm,
      ordering,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    first,
    rowsPerPage,
    searchTerm,
    ordering,
    companyUniqueId,
    selectedProjectId,
    sourceFilter,
    stateFilter,
    districtFilter,
    panchayatFilter,
    zoneFilter,
    wardFilter,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchTerm(query), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const loadCounts = async () => {
    try {
      const response = await complaintTicketApi.action<{
        all: number;
        public: number;
        internal: number;
      }>("counts", undefined, {
        params: {
          ...(stateFilter ? { state: stateFilter } : {}),
          ...(districtFilter ? { district: districtFilter } : {}),
          ...(panchayatFilter ? { panchayat: panchayatFilter } : {}),
          ...(zoneFilter ? { zone: zoneFilter } : {}),
          ...(wardFilter ? { ward: wardFilter } : {}),
        },
      });
      setCounts({
        all: response?.all ?? 0,
        public: response?.public ?? 0,
        internal: response?.internal ?? 0,
      });
    } catch (err) {
      Swal.fire(
        "Error",
        errorText(err, "Unable to load ticket counts"),
        "error",
      );
    }
  };

  useEffect(() => {
    void loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, districtFilter, panchayatFilter, zoneFilter, wardFilter]);

  const filteredDistricts = useMemo(
    () =>
      districts.filter((item) => !stateFilter || item.state_id === stateFilter),
    [districts, stateFilter],
  );
  const filteredPanchayats = useMemo(
    () =>
      panchayats.filter(
        (item) =>
          !districtFilter ||
          !item.district_id ||
          item.district_id === districtFilter,
      ),
    [panchayats, districtFilter],
  );
  const filteredZones = useMemo(
    () =>
      zones.filter(
        (item) =>
          !panchayatFilter ||
          !item.panchayat_id ||
          item.panchayat_id === panchayatFilter,
      ),
    [zones, panchayatFilter],
  );
  const filteredWards = useMemo(() => wards, [wards]);

  const onStateFilterChange = (value: string) => {
    setStateFilter(value);
    setDistrictFilter("");
    setPanchayatFilter("");
    setZoneFilter("");
    setWardFilter("");
    setPanchayats([]);
    setZones([]);
    setWards([]);
  };

  const onDistrictFilterChange = async (value: string) => {
    setDistrictFilter(value);
    setPanchayatFilter("");
    setZoneFilter("");
    setWardFilter("");
    setPanchayats([]);
    setZones([]);
    if (!value) {
      setWards([]);
      return;
    }
    const [panchayatRows, zoneRows] = await Promise.all([
      geoApi.panchayats(value).catch(() => []),
      geoApi.zones(value).catch(() => []),
    ]);
    setPanchayats(panchayatRows);
    setZones(zoneRows);
    setWards([]);
  };

  const onPanchayatFilterChange = async (value: string) => {
    setPanchayatFilter(value);
    setZoneFilter("");
    setWardFilter("");
    const zoneRows = await geoApi
      .zones(districtFilter || undefined, value || undefined)
      .catch(() => []);
    setZones(zoneRows);
    setWards([]);
  };

  const onZoneFilterChange = async (value: string) => {
    setZoneFilter(value);
    setWardFilter("");
    const wardRows = await geoApi
      .wards(value || undefined, panchayatFilter || undefined)
      .catch(() => []);
    setWards(wardRows);
  };

  const feedbackTemplate = (row: ComplaintTicket) => {
    const feedback = feedbackByTicket.get(String(row.unique_id));
    if (!feedback) return <span className="text-xs text-slate-400">-</span>;
    return (
      <span
        className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
        title={feedback.feedback_text ?? undefined}
      >
        {typeof feedback.rating === "number"
          ? `★ ${feedback.rating}`
          : "Feedback"}
      </span>
    );
  };

  const statusTemplate = (row: ComplaintTicket) => (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {row.status_name || row.status_code || "-"}
    </span>
  );

  const sourceTemplate = (row: ComplaintTicket) =>
    isPublic(row) ? (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Public
      </span>
    ) : (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Internal
      </span>
    );

  const slaTemplate = (row: ComplaintTicket) => {
    if (row.sla_breached) {
      return (
        <span className="whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          Breached
        </span>
      );
    }
    if (
      typeof row.sla_time_remaining_seconds === "number" &&
      row.sla_time_remaining_seconds < 0
    ) {
      return (
        <span className="whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          Overdue
        </span>
      );
    }
    return (
      <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        On Track
      </span>
    );
  };

  const contextTemplate = (row: ComplaintTicket) => {
    const context = row.operational_context;
    if (!context) return <span className="text-xs text-slate-400">Other</span>;
    const references = [
      context.trip_reference && `Trip: ${context.trip_reference}`,
      context.vehicle_reference && `Vehicle: ${context.vehicle_reference}`,
      context.driver_reference && `Driver: ${context.driver_reference}`,
      context.operator_reference && `Operator: ${context.operator_reference}`,
      context.other_reference,
    ].filter(Boolean);
    return (
      <div className="min-w-44">
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-indigo-700">
          {context.incident_type || "other"}
        </span>
        {references.length > 0 && (
          <p
            className="mt-1 max-w-56 truncate text-xs text-slate-500"
            title={references.join(" · ")}
          >
            {references.join(" · ")}
          </p>
        )}
      </div>
    );
  };

  // "All data" re-fetches every ticket matching the active filters, since the
  // table is lazily paginated and only holds one page.
  const loadAllExportRows = async () =>
    toRecordList(
      await complaintTicketApi.readAllForExport({
        params: buildTicketParams(),
      }),
    ) as unknown as Record<string, unknown>[];

  return (
    <div className="p-3">
      <ListPageHeader
        title="Complaint Tickets"
        subtitle="Track submitted complaints and operational actions"
        actions={
          <Button
            label="Add Ticket"
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(newPath)}
          />
        }
        className="mb-4"
        filters={
          <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: `All (${counts.all})` },
              { key: "public", label: `Public Grievances (${counts.public})` },
              { key: "internal", label: `Internal (${counts.internal})` },
            ] as { key: SourceFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              // Green, matching the tab strip on the Complaint Types screen
              // and the shared form/list template.
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                sourceFilter === tab.key
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <FilterBar
          searchValue={query}
          onSearchChange={(value) => setQuery(value)}
          searchPlaceholder="Search tickets"
        >
          <FilterBarSelect
            value={companyUniqueId || ""}
            onChange={(value) => onCompanyChange(value)}
            options={companies}
            placeholder="All Companies"
            disabled={!isSuperAdmin || companies.length === 0}
          />
          <FilterBarSelect
            value={selectedProjectId}
            onChange={(value) => setProjectId(value)}
            options={projects.map((project) => ({
              value: String(project.value),
              label: project.label || project.value,
            }))}
            placeholder={showAllProjectsOption ? "All Projects" : undefined}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
          />
          <FilterBarSelect
            value={stateFilter}
            onChange={(value) => onStateFilterChange(value)}
            options={states.map((item) => ({
              value: String(item.unique_id),
              label: item.name,
            }))}
            placeholder={"All states"}
          />
          <FilterBarSelect
            value={districtFilter}
            onChange={(value) => onDistrictFilterChange(value)}
            options={filteredDistricts.map((item) => ({
              value: String(item.unique_id),
              label: item.name,
            }))}
            placeholder={"All districts"}
          />
          <FilterBarSelect
            value={panchayatFilter}
            onChange={(value) => onPanchayatFilterChange(value)}
            options={filteredPanchayats.map((item) => ({
              value: String(item.unique_id),
              label: item.name,
            }))}
            placeholder={"All panchayats"}
            disabled={!districtFilter}
          />
          <FilterBarSelect
            value={zoneFilter}
            onChange={(value) => onZoneFilterChange(value)}
            options={filteredZones.map((item) => ({
              value: String(item.unique_id),
              label: item.name,
            }))}
            placeholder={"All zones"}
            disabled={!districtFilter}
          />
          <FilterBarSelect
            value={wardFilter}
            onChange={(value) => setWardFilter(value)}
            options={filteredWards.map((item) => ({
              value: String(item.unique_id),
              label: item.name,
            }))}
            placeholder={"All wards"}
            disabled={!zoneFilter && !panchayatFilter}
          />
        </FilterBar>
          </div>
        }
      />

      <DataTable
        loadExportRows={loadAllExportRows}
        value={tableRows}
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
        loading={tableLoading}
        stripedRows
        showGridlines
        emptyMessage="No tickets found"
        className="p-datatable-sm"
      >
        <Column
          header="S.No"
          body={(_, options) => options.rowIndex + 1}
          style={{ width: "80px" }}
        />
        <Column field="ticket_no" header="Ticket No" sortable />
        <Column
          field="created"
          header="Created"
          body={(row) => formatDateTime(row.created)}
          sortable
        />
        <Column header="Source" body={sourceTemplate} />
        <Column
          header="Customer"
          body={(row) => row.customer_name || row.profile_name || "-"}
        />
        <Column field="wa_phone" header="Phone" />
        <Column field="category_name" header="Category" />
        <Column header="Operational Context" body={contextTemplate} />
        <Column field="waste_type_name" header="Waste Type" />
        <Column field="subcategory_name" header="Subcategory" />
        <Column header="District" body={(row) => row.district_name || "-"} />
        <Column
          header="Panchayat"
          body={(row) => row.panchayat_name || "-"}
        />
        <Column header="Zone" body={(row) => row.zone_name || "-"} />
        <Column header="Ward" body={(row) => row.ward_name || "-"} />
        <Column field="priority_code" header="Priority" />
        <Column header="Status" body={statusTemplate} />
        <Column field="assigned_team_name" header="Assigned Team" />
        <Column
          header="SLA Due"
          body={(row) => formatDateTime(row.sla_due_at)}
        />
        <Column header="SLA" body={slaTemplate} style={{ width: "120px" }} />
        <Column header="Feedback" body={feedbackTemplate} />
        <Column
          header="Actions"
          body={(row) => (
            <button
              className="inline-flex text-blue-600"
              onClick={() => navigate(editPath(row.unique_id))}
              title="Open ticket"
            >
              <Eye className="h-5 w-5" />
            </button>
          )}
          style={{ width: "100px" }}
        />
      </DataTable>
    </div>
  );
}
