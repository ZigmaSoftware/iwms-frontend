import type { WasteCollection } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { adminApi } from "@/helpers/admin/registry";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";
import { downloadRecordsPdf } from "@/utils/exportPdf";
import { formatTimeOnly } from "@/utils/formatTime";
import { WASTE_TYPE_COLORS } from "@/utils/wasteTypeColors";

// ─── Types ────────────────────────────────────────────────────────────────────


// ─── Helpers ──────────────────────────────────────────────────────────────────

const cap = (str?: string) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

const today = new Date().toISOString().split("T")[0];

// Fields the per-column PrimeReact filters + global search can target.
const FILTERABLE_FIELDS = [
  "customer_name",
  "zone_name",
  "ward_name",
  "panchayat_name",
  "city_name",
  "company_name",
  "project_name",
  "status",
] as const;
type FilterableField = (typeof FILTERABLE_FIELDS)[number];
const isFilterableField = (field: string): field is FilterableField =>
  (FILTERABLE_FIELDS as readonly string[]).includes(field);

// ─── Component ────────────────────────────────────────────────────────────────

export default function WasteCollectedDataList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;

  const { encScheduleOperations, encWasteCollectedData } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleOperations,
    encWasteCollectedData,
  );

  const {
    companyUniqueId, projectId, projects, companies,
    isSuperAdmin, showAllProjectsOption, setProjectId, onCompanyChange,
  } = useCompanyProjectSelection({
    isEdit: false,
    defaultToAll: true,
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });

  const [wasteCollections, setWasteCollections] = useState<WasteCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [collectionDateFilter, setCollectionDateFilter] = useState("");
  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      customer_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      company_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      project_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    },
  });

  /* ── load data ── */
  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) { setWasteCollections([]); return; }
    if (!companyUniqueId && !isSuperAdmin) { setWasteCollections([]); return; }
    let mounted = true;
    setLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    adminApi.wasteCollections.readAll({ params })
      .then((res: any) => {
        if (!mounted) return;
        const rows: WasteCollection[] = Array.isArray(res) ? res : res?.results ?? [];
        setWasteCollections(rows);
      })
      .catch((err) => { if (mounted) Swal.fire({ icon: "error", title: t("common.error"), text: String(err) }); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, t]);

  /* ── apply filters locally to get the visible subset ─────────────────────
     PrimeReact filters internally but doesn't expose the result. We replicate
     the same CONTAINS/EQUALS logic so the summary pills and export always
     match what's on screen — same pattern as Bin Collection Event. */
  const filteredRows = useMemo(() => {
    return wasteCollections.filter((row) => {
      if (collectionDateFilter && row.collection_date !== collectionDateFilter) return false;
      for (const [field, filter] of Object.entries(filters)) {
        const val = (filter as { value: unknown })?.value;
        if (val === null || val === undefined || val === "") continue;
        if (field === "global") {
          const needle = String(val).toLowerCase();
          const hit = FILTERABLE_FIELDS.some((f) =>
            String(row[f] ?? "").toLowerCase().includes(needle)
          );
          if (!hit) return false;
        } else if (field === "is_active") {
          if (Boolean(row.is_active) !== Boolean(val)) return false;
        } else if (isFilterableField(field)) {
          const needle = String(val).toLowerCase();
          if (!String(row[field] ?? "").toLowerCase().includes(needle)) return false;
        }
      }
      return true;
    });
  }, [wasteCollections, filters, collectionDateFilter]);

  /* ── summary stats — computed from filtered rows only, same pattern as
     Bin Collection Event's Daily / Overall / Records pills ── */
  const { dailyWeight, overallWeight, totalRecords } = useMemo(() => {
    let daily = 0;
    let overall = 0;
    filteredRows.forEach((row) => {
      const qty = Number(row.total_quantity ?? 0);
      overall += qty;
      if (row.collection_date === today) daily += qty;
    });
    return {
      dailyWeight: daily.toFixed(2),
      overallWeight: overall.toFixed(2),
      totalRecords: filteredRows.length,
    };
  }, [filteredRows]);

  const buildExportRows = () =>
    filteredRows.map((row) => ({
      "Customer Name": cap(row.customer_name) || "-",
      "Dry Waste (kg)": row.dry_waste ?? 0,
      "Wet Waste (kg)": row.wet_waste ?? 0,
      "Mixed Waste (kg)": row.mixed_waste ?? 0,
      "Sanitary Waste (kg)": row.sanitary_waste ?? 0,
      "Quantity (kg)": row.total_quantity ?? 0,
      "Collection Date": row.collection_date || "-",
      "Collection Time": formatTimeOnly(row.collection_time),
      Status: row.status || "Pending",
      Zone: cap(row.zone_name) || "-",
      Ward: cap(row.ward_name) || "-",
      Panchayat: cap(row.panchayat_name) || "-",
      City: cap(row.city_name) || "-",
    }));

  const handleDownload = (format: "excel" | "pdf") => {
    setIsExporting(true);
    try {
      if (filteredRows.length === 0) {
        Swal.fire(t("common.warning"), t("admin.waste_collected_data.empty_message"), "warning");
        return;
      }
      const exportRows = buildExportRows();
      if (format === "excel") {
        exportRecordsToExcel(exportRows, getAdminScreenExcelFilename("all"), "Household Collections");
      } else {
        downloadRecordsPdf({
          title: "Household Collections",
          filename: "household_collections.pdf",
          rows: exportRows,
          columns: Object.keys(exportRows[0]).map((key) => ({ key, label: key })),
        });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: t("common.error"), text: err?.message ?? String(err) });
    } finally {
      setIsExporting(false);
    }
  };

  /* ── status toggle ── */
  const statusTemplate = (row: WasteCollection) => {
    const updateStatus = async (value: boolean) => {
      try {
        await adminApi.wasteCollections.update(row.unique_id, { is_active: value });
        setWasteCollections((prev) =>
          prev.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };
    return <Switch checked={!!row.is_active} onCheckedChange={updateStatus} />;
  };

  const actionTemplate = (row: WasteCollection) => (
    <div className="flex gap-3 justify-center">
      <button
        title={t("common.edit")}
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            // Existing records may have null company/project (saved before this fix).
            // Always pass the currently selected company+project from the list dropdowns.
            state: { companyUniqueId, projectId },
          })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: WasteCollection, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const wasteBadge = (value: number | undefined, colorClass: string) => (
    <span className={`inline-flex min-w-[3rem] justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      {value ?? 0} kg
    </span>
  );

  return (
    <div className="p-3">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">
          {t("admin.waste_collected_data.title")}
        </h1>
        <p className="text-sm text-gray-500">
          {t("admin.waste_collected_data.subtitle")}
        </p>
      </div>

      {/* Daily / Overall / Records — same pattern as Bin Collection Event */}
      <div className="flex flex-wrap gap-3 text-sm mb-4">
        <span className="bg-slate-100 px-4 py-2 rounded-full">Daily: {dailyWeight}</span>
        <span className="bg-slate-100 px-4 py-2 rounded-full">Overall: {overallWeight}</span>
        <span className="bg-slate-100 px-4 py-2 rounded-full">Records: {totalRecords}</span>
      </div>

      {/* All filter dropdowns in a single line */}
      <FilterBar
        hideSearch
        searchValue=""
        onSearchChange={() => {}}
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
        className="mb-3"
      >
        <FilterBarSelect
          value={companyUniqueId || ""}
          onChange={onCompanyChange}
          options={companies}
          placeholder="All Companies"
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FilterBarSelect
          value={projectId || ""}
          onChange={setProjectId}
          options={projects}
          placeholder={showAllProjectsOption ? "All Projects" : undefined}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
        <input
          type="date"
          value={collectionDateFilter}
          onChange={(e) => setCollectionDateFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700"
          title="Filter by collection date"
        />
      </FilterBar>

      {/* Global search + Add button + export actions */}
      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("admin.waste_collected_data.search_placeholder")}
        className="mb-4"
        trailing={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              label={t("admin.waste_collected_data.add_new")}
              icon="pi pi-plus"
              className="p-button-success"
              onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
            />
            <Button
              label={isExporting ? "Exporting..." : "Download Excel"}
              icon="pi pi-file-excel"
              className="p-button-outlined"
              disabled={isExporting}
              onClick={() => handleDownload("excel")}
            />
            <Button
              label={isExporting ? "Exporting..." : "Download PDF"}
              icon="pi pi-file-pdf"
              className="p-button-outlined"
              disabled={isExporting}
              onClick={() => handleDownload("pdf")}
            />
          </div>
        }
      />

      <DataTable
        value={wasteCollections}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading && wasteCollections.length === 0}
        filters={filters}
        onFilter={onFilter}
        exportable={false}
        stripedRows
        showGridlines
        emptyMessage={t("admin.waste_collected_data.empty_message")}
        className="p-datatable-sm"
        globalFilterFields={["customer_name", "zone_name", "ward_name", "panchayat_name", "city_name", "company_name", "project_name"]}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "60px" }} />
        <Column
          field="customer_name"
          header={t("admin.waste_collected_data.customer_name")}
          body={(row: WasteCollection) => cap(row.customer_name) || "-"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="dry_waste"
          header={t("admin.waste_collected_data.dry_waste")}
          sortable
          body={(row: WasteCollection) => wasteBadge(row.dry_waste, WASTE_TYPE_COLORS.dry)}
        />
        <Column
          field="wet_waste"
          header={t("admin.waste_collected_data.wet_waste")}
          sortable
          body={(row: WasteCollection) => wasteBadge(row.wet_waste, WASTE_TYPE_COLORS.wet)}
        />
        <Column
          field="mixed_waste"
          header={t("admin.waste_collected_data.mixed_waste")}
          sortable
          body={(row: WasteCollection) => wasteBadge(row.mixed_waste, WASTE_TYPE_COLORS.mixed)}
        />
        <Column
          field="sanitary_waste"
          header={t("admin.waste_collected_data.sanitary_waste", "Sanitary Waste")}
          sortable
          body={(row: WasteCollection) => wasteBadge(row.sanitary_waste, WASTE_TYPE_COLORS.sanitary)}
        />
        <Column
          field="total_quantity"
          header={t("admin.waste_collected_data.quantity")}
          sortable
        />
        <Column
          field="collection_date"
          header={t("admin.waste_collected_data.collection_date", "Collection Date")}
          sortable
          body={(row: WasteCollection) => row.collection_date || "-"}
        />
        <Column
          field="collection_time"
          header={t("admin.waste_collected_data.collection_time", "Collection Time")}
          sortable
          body={(row: WasteCollection) => formatTimeOnly(row.collection_time)}
        />
        <Column
          field="status"
          header={t("common.status")}
          sortable
          filter
          showFilterMatchModes={false}
          body={(row: WasteCollection) => row.status || "Pending"}
        />
        <Column
          field="zone_name"
          header={t("common.zone")}
          body={(row: WasteCollection) => cap(row.zone_name) || "-"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="ward_name"
          header={t("common.ward")}
          body={(row: WasteCollection) => cap(row.ward_name) || "-"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="panchayat_name"
          header={t("admin.nav.panchayat")}
          body={(row: WasteCollection) => cap(row.panchayat_name) || "-"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="city_name"
          header={t("common.city")}
          body={(row: WasteCollection) => cap(row.city_name) || "-"}
          sortable filter showFilterMatchModes={false}
        />
        <Column
          field="is_active"
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "120px" }}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "120px", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
