import type { Staff } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminApi } from "@/helpers/admin/registry";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import type {
  DataTablePageEvent,
  DataTableSortEvent,
  SortOrder,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useTranslation } from "react-i18next";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";

import { Switch } from "@/components/ui/switch";
import QrPreviewDialog from "@/components/common/QrPreviewDialog";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import {
  FilterBar,
  FilterBarSelect,
  type StatusFilterValue,
} from "@/components/common/FilterBar";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

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

  const [filterParams, setFilterParams] = useState({
    salary_type: "",
    active_status: "",
    site_name: "",
    employee_name: "",
  });

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

  const [refetchTrigger, setRefetchTrigger] = useState(0);
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
    refetchTrigger,
  ]);

  const applyFilter = () => {
    setFirst(0);
    setRefetchTrigger((n) => n + 1);
  };

  const handleFilterChange = (
    ev: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = ev.target;
    setFilterParams((prev) => ({ ...prev, [name]: value }));
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

  const statusFilterValue: StatusFilterValue =
    filterParams.active_status === "1"
      ? "active"
      : filterParams.active_status === "0"
        ? "inactive"
        : "all";

  const onStatusFilterChange = (value: StatusFilterValue) => {
    setFilterParams((prev) => ({
      ...prev,
      active_status: value === "all" ? "" : value === "active" ? "1" : "0",
    }));
    setFirst(0);
    setRefetchTrigger((n) => n + 1);
  };

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
      <Switch checked={row.active_status} onCheckedChange={updateStatus} />
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

  const actionTemplate = (row: Staff) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Staff, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const header = (
    <div className="space-y-4">
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
          <Button
            label={t("admin.staff_creation.create")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            onClick={() =>
              navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })
            }
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showCol("salary_type") && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold">
              {t("admin.staff_creation.salary_type")}
            </span>
            <FilterBarSelect
              className="w-full sm:w-full"
              value={filterParams.salary_type}
              onChange={(value) =>
                handleFilterChange({
                  target: { name: "salary_type", value },
                } as ChangeEvent<HTMLInputElement>)
              }
              options={[
                {
                  value: "Monthly",
                  label: t("admin.staff_creation.salary_monthly"),
                },
                {
                  value: "Daily",
                  label: t("admin.staff_creation.salary_daily"),
                },
                {
                  value: "Contract",
                  label: t("admin.staff_creation.salary_contract"),
                },
              ]}
              placeholder={t("common.all")}
            />
          </div>
        )}

        {showCol("site_name") && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold">
              {t("admin.staff_creation.site_name")}
            </span>
            <input
              name="site_name"
              value={filterParams.site_name}
              onChange={handleFilterChange}
              placeholder={t("admin.staff_creation.site_placeholder")}
              className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm"
            />
          </div>
        )}

        {showCol("employee_name") && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold">
              {t("admin.staff_creation.employee_name")}
            </span>
            <input
              name="employee_name"
              value={filterParams.employee_name}
              onChange={handleFilterChange}
              placeholder={t("admin.staff_creation.employee_placeholder")}
              className="h-10 w-full min-w-0 rounded-lg border px-3 text-sm"
            />
          </div>
        )}

        <div className="flex items-end">
          <button
            onClick={applyFilter}
            className="h-10 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white"
          >
            {t("common.go")}
          </button>
        </div>
      </div>

      {/* Search + Status */}
      <div className="flex justify-end">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={(value) =>
            onGlobalFilterChange({
              target: { value },
            } as ChangeEvent<HTMLInputElement>)
          }
          searchPlaceholder={t("admin.staff_creation.search_placeholder")}
          statusValue={showCol("active_status") ? statusFilterValue : undefined}
          onStatusChange={
            showCol("active_status") ? onStatusFilterChange : undefined
          }
        >
          <FilterBarSelect
            value={companyUniqueId || ""}
            onChange={(value) => onCompanyChange(value)}
            options={companies}
            placeholder="All Companies"
            disabled={!isSuperAdmin || companies.length === 0}
          />
          <FilterBarSelect
            value={projectId || ""}
            onChange={(value) => setProjectId(value)}
            options={projects}
            placeholder={showAllProjectsOption ? "All Projects" : undefined}
            disabled={
              (!companyUniqueId && !isSuperAdmin) || projects.length === 0
            }
          />
        </FilterBar>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-3">
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
          header={header}
          emptyMessage={t("common.no_items_found", {
            item: t("admin.staff_creation.staff_label"),
          })}
          stripedRows
          showGridlines
          className="p-datatable-sm"
        >
          <Column
            header={t("common.s_no")}
            body={indexTemplate}
            style={{ width: 70 }}
          />

          <Column
            field="unique_id"
            header="Unique ID"
            sortable
            body={(row: Staff) => row.unique_id || row.staff_unique_id || "-"}
          />

          <Column
            field="staff_id"
            header="Staff ID"
            sortable
            body={(row: Staff) => row.staff_id || "-"}
          />

          {showCol("employee_name") && (
            <Column
              field="employee_name"
              header={t("admin.staff_creation.employee_name")}
              sortable={SORTABLE_FIELDS.has("employee_name")}
              body={(row: Staff) => cap(row.employee_name)}
            />
          )}

          {showCol("designation") && (
            <Column
              field="designation"
              header={t("admin.staff_creation.designation")}
            />
          )}

          {showCol("doj") && (
            <Column field="doj" header={t("admin.staff_creation.doj")} />
          )}

          {showCol("site_name") && (
            <Column
              field="site_name"
              header={t("admin.staff_creation.site_name")}
            />
          )}

          {showCol("contact_mobile") && (
            <Column
              header={t("admin.staff_creation.contact")}
              body={(row: Staff) => row.contact_mobile || "-"}
            />
          )}

          {showCol("active_status") && (
            <Column
              header={t("common.status")}
              body={statusTemplate}
              style={{ width: 120 }}
            />
          )}

          {showCol("qr_code") && (
            <Column
              header={t("admin.staff_creation.qr_label")}
              body={qrTemplate}
              style={{ width: 120 }}
            />
          )}

          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: 140 }}
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
