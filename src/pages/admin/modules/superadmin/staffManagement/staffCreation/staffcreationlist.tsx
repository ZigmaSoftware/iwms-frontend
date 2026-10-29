import type { Staff } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminApi } from "@/helpers/admin/registry";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";

import { DataTable } from "@/components/common/SafeDataTable";
import { StackCell } from "@/components/common/TableCells";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useTranslation } from "react-i18next";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";

import { Switch } from "@/components/ui/switch";
import QrPreviewDialog from "@/components/common/QrPreviewDialog";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { FilterBar } from "@/components/common/FilterBar";
import { FormSelect } from "@/components/common/FormSelect";
import { FilterSection } from "@/components/common/ListToolbar";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import {
  combineFilters,
  useOptionFilter,
  type FilterPart,
} from "@/components/filters/useOptionFilter";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";
import { Can } from "@/contexts/ScreenPermissionContext";
import { useScreenAccess } from "@/contexts/screenPermission";

const STAFF_CREATION_COLUMN_FIELDS: Record<string, string[]> = {
  unique_id: ["staff_id", "unique_id", "staff_unique_id", "zigma_id"],
  employee_name: ["employee_name", "name"],
  designation: ["designation"],
  doj: ["doj", "date_of_joining"],
  site_name: ["site_name", "site"],
  salary_type: ["salary_type"],
  contact_mobile: ["contact_mobile", "mobile"],
  active_status: ["active_status", "is_active"],
  qr_code: ["qr_code"],
};

const cap = (val?: string | number | null) => {
  if (val === undefined || val === null || val === "") return "";
  const s = String(val);
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toRecordList = (value: unknown): Staff[] => {
  if (Array.isArray(value)) return value as Staff[];
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { results?: unknown }).results)
  ) {
    return (value as { results: Staff[] }).results;
  }
  return [];
};

// Backend `ordering_fields` are ["staff_unique_id", "employee_name", "created_at"];
// only staff_unique_id/employee_name map to visible, sortable columns here.
const SORTABLE_FIELDS = new Set(["staff_unique_id", "employee_name"]);

// The "unique_id" column body is `unique_id`, but the backend orders on `staff_unique_id`.
const BACKEND_ORDER_FIELD: Record<string, string> = {
  unique_id: "staff_unique_id",
};

export default function StaffCreationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canEdit } = useScreenAccess();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "staff-masters",
    "staff-creation",
    STAFF_CREATION_COLUMN_FIELDS,
  );
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>(undefined);
  const [selectedQrStaff, setSelectedQrStaff] = useState<Staff | null>(null);
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;
  const resetPage = () => setFirst(0);
  const companyProject = useCompanyProjectFilter(resetPage, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const { companyId: companyUniqueId, projectId } = companyProject;
  const { companies, isSuperAdmin } = companyProject.selection;

  const salaryTypeOptions = [
    { value: "Monthly", label: t("admin.staff_creation.salary_monthly") },
    { value: "Daily", label: t("admin.staff_creation.salary_daily") },
    { value: "Contract", label: t("admin.staff_creation.salary_contract") },
  ];

  // Salary type / site / employee, edited in the Filters panel and sent once
  // applied (they used to wait for the "Go" button).
  const staffFilter = useDraftFilter({
    empty: { salary_type: "", site_name: "", employee_name: "" },
    chips: {
      salary_type: {
        label: t("admin.staff_creation.salary_type"),
        format: (value) =>
          salaryTypeOptions.find((option) => option.value === value)?.label ??
          value,
      },
      site_name: { label: t("admin.staff_creation.site_name") },
      employee_name: { label: t("admin.staff_creation.employee_name") },
    },
    onAppliedChange: resetPage,
  });

  // Active / Inactive → `?active_status=1|0`.
  const statusFilter = useOptionFilter({
    param: "active_status",
    label: "Status",
    options: [
      { label: "Active", value: "1" },
      { label: "Inactive", value: "0" },
    ],
    onAppliedChange: resetPage,
  });

  const filterParams = {
    ...staffFilter.applied,
    active_status: statusFilter.value,
  };

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");

  const { encStaffMasters, encStaffCreation } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encStaffMasters, encStaffCreation);

  const globalFilterFields = [
    "unique_id",
    "staff_unique_id",
    "staff_id",
    "employee_name",
    "employee_id",
    "designation",
    "site_name",
    "contact_mobile",
    "company_name",
    "project_name",
  ];

  const requestIdRef = useRef(0);

  const requestParams = {
    salary_type: filterParams.salary_type,
    active_status: filterParams.active_status,
    site_name: filterParams.site_name,
    employee_name: filterParams.employee_name,
    company_id: companyUniqueId,
    ...(projectId ? { project_id: projectId } : {}),
  };

  const mappedSortField = sortField
    ? (BACKEND_ORDER_FIELD[sortField] ?? sortField)
    : undefined;
  const ordering =
    mappedSortField && SORTABLE_FIELDS.has(mappedSortField)
      ? `${sortOrder === -1 ? "-" : ""}${mappedSortField}`
      : undefined;

  const loadRows = async (
    page: number,
    limit: number,
    params: Record<string, unknown>,
    orderingParam?: string,
  ) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setStaffs([]);
    try {
      const response = await adminApi.staffCreation.readAllwithPaginated(
        page,
        limit,
        {
          params: {
            ...params,
            ...(orderingParam ? { ordering: orderingParam } : {}),
          },
        },
      );
      if (requestId !== requestIdRef.current) return;

      const rows = toRecordList(response);

      const hasContextFields = rows.some((row) => {
        const rowCompanyId = normalizeId(
          row.company_id || row.company_unique_id,
        );
        const rowProjectId = normalizeId(
          row.project_id || row.project_unique_id,
        );
        return Boolean(rowCompanyId || rowProjectId);
      });

      const filtered = !hasContextFields
        ? rows
        : rows.filter((row) => {
            const rowCompanyId = normalizeId(
              row.company_id || row.company_unique_id,
            );
            const rowProjectId = normalizeId(
              row.project_id || row.project_unique_id,
            );

            const companyMatches =
              !companyUniqueId || rowCompanyId === companyUniqueId;
            const projectMatches = !projectId || rowProjectId === projectId;

            return companyMatches && projectMatches;
          });

      setStaffs(filtered);
      setTotalRecords(
        typeof (response as { count?: number })?.count === "number"
          ? (response as { count: number }).count
          : filtered.length,
      );
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      Swal.fire(t("common.error"), t("common.load_failed"), "error");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) {
      requestIdRef.current += 1;
      setStaffs([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    if (!companyUniqueId && !isSuperAdmin) {
      requestIdRef.current += 1;
      setStaffs([]);
      setTotalRecords(0);
      setLoading(false);
      return;
    }

    const params: Record<string, unknown> = { ...requestParams };
    if (globalSearchTerm) params.search = globalSearchTerm;
    void loadRows(first / rowsPerPage + 1, rowsPerPage, params, ordering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    companyUniqueId,
    companies.length,
    isSuperAdmin,
    projectId,
    first,
    rowsPerPage,
    globalSearchTerm,
    sortField,
    sortOrder,
    filterParams.salary_type,
    filterParams.site_name,
    filterParams.employee_name,
    filterParams.active_status,
  ]);

  const onPage = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRowsPerPage(event.rows);
  };

  const onSort = (event: DataTableSortEvent) => {
    setFirst(0);
    setSortField(event.sortField);
    setSortOrder(event.sortOrder);
  };

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    setGlobalFilterValue(e.target.value);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFirst(0);
      setGlobalSearchTerm(globalFilterValue);
    }, 400);
    return () => clearTimeout(timeout);
  }, [globalFilterValue]);

  const fetchExportRows = async (): Promise<Staff[]> => {
    const exportParams: Record<string, unknown> = { ...requestParams };
    if (globalSearchTerm) exportParams.search = globalSearchTerm;
    const response = await adminApi.staffCreation.readAllForExport({
      params: exportParams,
    });
    const rows = toRecordList(response);

    const hasContextFields = rows.some((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      return Boolean(rowCompanyId || rowProjectId);
    });

    if (!hasContextFields) return rows;

    return rows.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);

      const companyMatches =
        !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;

      return companyMatches && projectMatches;
    });
  };

  // Feeds the table's single "Download Excel" button: the "All data" option
  // fetches every row matching the current filters, while "Current page"
  // uses the rows already on screen.
  const loadAllExportRows = async () => fetchExportRows();

  const statusTemplate = (row: Staff) => {
    const updateStatus = async (value: boolean) => {
      try {
        const formData = new FormData();
        const payload = filterPayload({ active_status: value });
        Object.entries(payload).forEach(([key, entryValue]) => {
          formData.append(key, String(entryValue));
        });

        await adminApi.staffCreation.update(row.unique_id, formData);
        setStaffs((prev) =>
          prev.map((s) =>
            s.unique_id === row.unique_id ? { ...s, active_status: value } : s,
          ),
        );
      } catch (err) {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return (
      <Switch
        checked={row.active_status}
        disabled={!canEdit}
        onCheckedChange={updateStatus}
      />
    );
  };

  const qrTemplate = (row: Staff) => {
    if (!row.qr_code) {
      return <span className="text-gray-400 text-xs">No QR</span>;
    }
    return (
      <button
        type="button"
        className="p-1 border rounded hover:bg-gray-50 flex justify-center"
        onClick={() => setSelectedQrStaff(row)}
        title={t("admin.staff_creation.qr_show")}
      >
        <img src={row.qr_code} alt="QR" className="w-12 h-12 object-contain" />
      </button>
    );
  };

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await adminApi.staffCreation.delete(id, withDeleteReason(reason));
      setStaffs((current) => current.filter((item) => item.unique_id !== id));
      Swal.fire({
        icon: "success",
        title: t("common.deleted_success"),
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: t("common.delete_failed"),
        text: String(error ?? t("common.request_failed")),
      });
    }
  };

  const actionTemplate = (row: Staff) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        onDelete={() => void handleDelete(String(row.unique_id))}
      />
    </div>
  );

  const indexTemplate = (_: Staff, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const staffFilterField = (
    <FilterSection label="Staff">
      <div className="grid grid-cols-2 gap-2">
        {showCol("salary_type") && (
          <FormSelect
            label={t("admin.staff_creation.salary_type")}
            value={staffFilter.draft.salary_type}
            onChange={(value) => staffFilter.setField("salary_type", value)}
            options={salaryTypeOptions}
            placeholder={t("common.all")}
          />
        )}
        {showCol("site_name") && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold">
              {t("admin.staff_creation.site_name")}
            </span>
            <input
              value={staffFilter.draft.site_name}
              onChange={(e) => staffFilter.setField("site_name", e.target.value)}
              placeholder={t("admin.staff_creation.site_placeholder")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
        )}
        {showCol("employee_name") && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-semibold">
              {t("admin.staff_creation.employee_name")}
            </span>
            <input
              value={staffFilter.draft.employee_name}
              onChange={(e) =>
                staffFilter.setField("employee_name", e.target.value)
              }
              placeholder={t("admin.staff_creation.employee_placeholder")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
        )}
      </div>
    </FilterSection>
  );

  const filterParts: FilterPart[] = [
    companyProject,
    ...(showCol("salary_type") || showCol("site_name") || showCol("employee_name")
      ? [{ ...staffFilter, field: staffFilterField }]
      : []),
    ...(showCol("active_status") ? [statusFilter] : []),
  ];

  // Title + Create button, then the search with the Filters button and the
  // Documents menu beside it.
  const renderHeader = (actions: ReactNode) => (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.staff_creation.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.staff_creation.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Can action="add">
            <Button
              label={t("admin.staff_creation.create")}
              icon="pi pi-plus"
              className="p-button-success p-button-sm"
              onClick={() =>
                navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
              }
            />
          </Can>
        </div>
      </div>

      {/* Search + Filters / Documents */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        <div className="min-w-0 flex-1">
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={(value) =>
              onGlobalFilterChange({
                target: { value },
              } as ChangeEvent<HTMLInputElement>)
            }
            searchPlaceholder={t("admin.staff_creation.search_placeholder")}
          />
        </div>
        <div className="ml-auto shrink-0">{actions}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-full bg-gray-50/60 p-3 sm:p-5">
        <DataTable
          loadExportRows={loadAllExportRows}
          value={staffs}
          lazy
          paginator
          first={first}
          rows={rowsPerPage}
          totalRecords={totalRecords}
          onPage={onPage}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={onSort}
          loading={loading}
          renderHeaderWithActions={renderHeader}
          filterPanel={combineFilters(...filterParts)}
          emptyMessage={t("common.no_items_found", {
            item: t("admin.staff_creation.staff_label"),
          })}
          stripedRows
          showGridlines
          className="p-datatable-sm"
          fitWidth
        >
          <Column
            header={t("common.s_no")}
            body={indexTemplate}
            style={{ width: "5%" }}
          />

          <Column
            field="unique_id"
            header="Unique ID"
            sortable
            style={{ width: "16%" }}
            body={(row: Staff) => (
              <StackCell
                primary={row.unique_id || row.staff_unique_id || "-"}
                lines={[{ label: "Staff ID", value: row.staff_id }]}
              />
            )}
          />

          {(showCol("employee_name") ||
            showCol("designation") ||
            showCol("contact_mobile")) && (
            <Column
              field="employee_name"
              header={t("admin.staff_creation.employee_name")}
              sortable={
                showCol("employee_name") && SORTABLE_FIELDS.has("employee_name")
              }
              style={{ width: "28%" }}
              body={(row: Staff) => (
                <StackCell
                  primary={showCol("employee_name") && cap(row.employee_name)}
                  lines={[
                    showCol("designation") && {
                      icon: "pi-briefcase",
                      value: row.designation,
                      title: t("admin.staff_creation.designation"),
                    },
                    showCol("contact_mobile") && {
                      icon: "pi-phone",
                      value: row.contact_mobile,
                      title: t("admin.staff_creation.contact"),
                    },
                  ]}
                />
              )}
            />
          )}

          {(showCol("site_name") || showCol("doj")) && (
            <Column
              field="site_name"
              header={t("admin.staff_creation.site_name")}
              style={{ width: "24%" }}
              body={(row: Staff) => (
                <StackCell
                  primary={showCol("site_name") && row.site_name}
                  lines={[
                    showCol("doj") && {
                      label: t("admin.staff_creation.doj"),
                      value: row.doj,
                    },
                  ]}
                />
              )}
            />
          )}

          {showCol("active_status") && (
            <Column
              header={t("common.status")}
              body={statusTemplate}
              style={{ width: "9%" }}
            />
          )}

          {showCol("qr_code") && (
            <Column
              header={t("admin.staff_creation.qr_label")}
              body={qrTemplate}
              style={{ width: "10%" }}
            />
          )}

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "8%" }}
          />
        </DataTable>
      </div>

      <QrPreviewDialog
        open={Boolean(selectedQrStaff)}
        onOpenChange={(open) => !open && setSelectedQrStaff(null)}
        title={t("admin.staff_creation.qr_title")}
        qrImageUrl={selectedQrStaff?.qr_code}
        fileName={`${selectedQrStaff?.staff_id || selectedQrStaff?.unique_id || selectedQrStaff?.employee_name || "staff"}_qr`}
        description={
          selectedQrStaff && (
            <>
              <p className="font-semibold text-gray-800">
                {selectedQrStaff.employee_name}
              </p>
              <p className="text-sm text-gray-500">
                {selectedQrStaff.staff_id || "-"}
              </p>
            </>
          )
        }
      />
    </>
  );
}
