import { useEffect, useState } from "react";
import Swal from "@/lib/notify";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { complaintFeedbackApi } from "@/features/complaintTicketing/api";
import type { ComplaintFeedback } from "@/features/complaintTicketing/types";
import { asArray, errorText, formatDateTime, yesNo } from "../utils";

const SORTABLE_FIELDS = new Set(["rating", "submitted_at"]);

export default function FeedbackList() {
  const [rows, setRows] = useState<ComplaintFeedback[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);

  // Feedback has no company column of its own — it hangs off a ticket, which
  // does — so `ComplaintFeedbackViewSet` filters through `ticket__company_id`.
  // The pickers are the same ones every company-scoped list uses.
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
  const scopeParams = {
    ...(companyUniqueId ? { company_id: companyUniqueId } : {}),
    ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
  };

  const ordering =
    sortField && SORTABLE_FIELDS.has(sortField)
      ? `${sortOrder === -1 ? "-" : ""}${sortField}`
      : undefined;

  const loadRows = async (
    page: number,
    limit: number,
    search: string,
    orderingParam?: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await complaintFeedbackApi.readAllwithPaginated(
        page,
        limit,
        {
          params: {
            ...scopeParams,
            ...(search ? { search } : {}),
            ...(orderingParam ? { ordering: orderingParam } : {}),
          },
        },
      );
      setRows(asArray<ComplaintFeedback>(response));
      setTotalRecords(
        typeof response?.count === "number"
          ? response.count
          : asArray<ComplaintFeedback>(response).length,
      );
    } catch (err) {
      Swal.fire("Error", errorText(err, "Unable to load feedback"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(first / rowsPerPage + 1, rowsPerPage, searchTerm, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, rowsPerPage, searchTerm, ordering, companyUniqueId, selectedProjectId]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  // "All data" re-fetches every feedback row matching the active search,
  // since the table is lazily paginated and only holds one page.
  const loadAllExportRows = async () =>
    asArray<ComplaintFeedback>(
      await complaintFeedbackApi.readAllForExport({
        params: { ...scopeParams, ...(searchTerm ? { search: searchTerm } : {}) },
      }),
    ) as unknown as Record<string, unknown>[];

  return (
    <div className="p-3">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Complaint Feedback
        </h1>
        <p className="text-sm text-gray-500">
          Citizen feedback captured after resolution
        </p>
      </div>
      <DataTable
        loadExportRows={loadAllExportRows}
        value={rows}
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
        loading={isLoading}
        header={
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={(value) => setGlobalFilterValue(value)}
            searchPlaceholder="Search Feedback..."
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
          </FilterBar>
        }
        stripedRows
        showGridlines
        emptyMessage="No feedback found"
        className="p-datatable-sm"
      >
        <Column
          header="S.No"
          body={(_, options) => options.rowIndex + 1}
          style={{ width: "80px" }}
        />
        <Column
          field="ticket_no"
          header="Ticket"
          body={(row) => row.ticket_no || row.ticket || "-"}
        />
        <Column
          field="customer_name"
          header="Customer"
          body={(row) => row.customer_name || row.customer || "-"}
        />
        <Column field="rating" header="Rating" sortable />
        <Column
          header="Issue Solved"
          body={(row) => yesNo(row.is_issue_solved)}
        />
        <Column field="feedback_text" header="Feedback" />
        <Column
          field="submitted_at"
          header="Submitted"
          sortable={SORTABLE_FIELDS.has("submitted_at")}
          body={(row) => formatDateTime(row.submitted_at)}
        />
      </DataTable>
    </div>
  );
}
