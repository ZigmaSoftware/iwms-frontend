import type { WasteCollection } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "@/lib/notify";
import { confirmDeleteWithReason, withDeleteReason } from "@/utils/deleteReason";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { Switch } from "@/components/ui/switch";
import { getEncryptedRoute } from "@/utils/routeCache";
import { adminApi } from "@/helpers/admin/registry";
import { FilterBar } from "@/components/common/FilterBar";
import { locationColumn } from "@/components/common/LocationColumn";
import { StackCell } from "@/components/common/TableCells";
import { KpiCard } from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripLog/tripLogDisplay";
import { formatKg } from "@/pages/admin/modules/core_modules/dailyOperations/dailyTripLog/tripLogSummary";
import { FilterSection } from "@/components/common/ListToolbar";
import { useCompanyProjectFilter } from "@/components/filters/useCompanyProjectFilter";
import { useDraftFilter } from "@/components/filters/useDraftFilter";
import { combineFilters } from "@/components/filters/useOptionFilter";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { downloadRecordsPdf } from "@/utils/exportPdf";
import { formatTimeOnly } from "@/utils/formatTime";
import { WASTE_TYPE_COLORS } from "@/utils/wasteTypeColors";
import { useScreenAccess } from "@/contexts/screenPermission";

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
  const { canAdd, canEdit } = useScreenAccess();
  const location = useLocation();
  const restoredState = location.state as {
    companyUniqueId?: string;
    projectId?: string;
  } | null;

  const { encScheduleOperations, encWasteCollectedData } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } =
    createCrudRoutePaths(encScheduleOperations, encWasteCollectedData);

  const companyProject = useCompanyProjectFilter(undefined, {
    initialCompanyId: restoredState?.companyUniqueId,
    initialProjectId: restoredState?.projectId,
  });
  const companyUniqueId = companyProject.companyId;
  const projectId = companyProject.projectId;
  const { companies, isSuperAdmin } = companyProject.selection;

  const [wasteCollections, setWasteCollections] = useState<WasteCollection[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const collectionDate = useDraftFilter({
    empty: { collection_date: "" },
    chips: { collection_date: { label: "Collection date" } },
  });
  const collectionDateFilter = collectionDate.applied.collection_date;
  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusFilter,
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
    if (isSuperAdmin && companies.length === 0) {
      setWasteCollections([]);
      return;
    }
    if (!companyUniqueId && !isSuperAdmin) {
      setWasteCollections([]);
      return;
    }
    let mounted = true;
    setLoading(true);
    const params: Record<string, string> = {};
    if (companyUniqueId) params.company_id = companyUniqueId;
    if (projectId) params.project_id = projectId;
    adminApi.wasteCollections
      .readAll({ params })
      .then((res: any) => {
        if (!mounted) return;
        const rows: WasteCollection[] = Array.isArray(res)
          ? res
          : (res?.results ?? []);
        setWasteCollections(rows);
      })
      .catch((err) => {
        if (mounted)
          Swal.fire({
            icon: "error",
            title: t("common.error"),
            text: String(err),
          });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, t]);

  /* ── apply filters locally to get the visible subset ─────────────────────
     PrimeReact filters internally but doesn't expose the result. We replicate
     the same CONTAINS/EQUALS logic so the summary pills and export always
     match what's on screen — same pattern as Bin Collection Event. */
  // The date filter isn't a PrimeReact column filter, so the table has to be
  // handed rows that are already narrowed to the selected date.
  const dateFilteredRows = useMemo(
    () =>
      collectionDateFilter
        ? wasteCollections.filter(
            (row) => row.collection_date === collectionDateFilter,
          )
        : wasteCollections,
    [wasteCollections, collectionDateFilter],
  );

  const filteredRows = useMemo(() => {
    return dateFilteredRows.filter((row) => {
      for (const [field, filter] of Object.entries(filters)) {
        const val = (filter as { value: unknown })?.value;
        if (val === null || val === undefined || val === "") continue;
        if (field === "global") {
          const needle = String(val).toLowerCase();
          const hit = FILTERABLE_FIELDS.some((f) =>
            String(row[f] ?? "")
              .toLowerCase()
              .includes(needle),
          );
          if (!hit) return false;
        } else if (field === "is_active") {
          if (Boolean(row.is_active) !== Boolean(val)) return false;
        } else if (isFilterableField(field)) {
          const needle = String(val).toLowerCase();
          if (
            !String(row[field] ?? "")
              .toLowerCase()
              .includes(needle)
          )
            return false;
        }
      }
      return true;
    });
  }, [dateFilteredRows, filters]);

  /* ── summary stats — computed from filtered rows only, same pattern as
     Bin Collection Event's Daily / Overall / Records pills ── */
  const { dailyWeight, dailyCount, overallWeight, totalRecords } = useMemo(() => {
    let daily = 0;
    let dailyRecords = 0;
    let overall = 0;
    filteredRows.forEach((row) => {
      const qty = Number(row.total_quantity ?? 0);
      overall += qty;
      if (row.collection_date === today) {
        daily += qty;
        dailyRecords += 1;
      }
    });
    return {
      dailyWeight: daily,
      dailyCount: dailyRecords,
      overallWeight: overall,
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

  const handleDownloadPdf = async () => {
    if (filteredRows.length === 0) {
      Swal.fire(
        t("common.warning"),
        t("admin.waste_collected_data.empty_message"),
        "warning",
      );
      return;
    }
    const exportRows = buildExportRows();
    await downloadRecordsPdf({
      title: "Household Collections",
      filename: "household_collections.pdf",
      rows: exportRows,
      columns: Object.keys(exportRows[0]).map((key) => ({
        key,
        label: key,
      })),
    });
  };

  /* ── status toggle ── */
  const statusTemplate = (row: WasteCollection) => {
    const updateStatus = async (value: boolean) => {
      try {
        await adminApi.wasteCollections.update(row.unique_id, {
          is_active: value,
        });
        setWasteCollections((prev) =>
          prev.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, is_active: value }
              : item,
          ),
        );
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };
    return (
      <Switch
        checked={!!row.is_active}
        disabled={!canEdit}
        onCheckedChange={updateStatus}
      />
    );
  };

  const handleDelete = async (id: string) => {
    const reason = await confirmDeleteWithReason();
    if (reason === null) return;

    try {
      await adminApi.wasteCollections.delete(id, withDeleteReason(reason));
      setWasteCollections((current) =>
        current.filter((item) => item.unique_id !== id),
      );
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

  const actionTemplate = (row: WasteCollection) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            // Existing records may have null company/project (saved before this fix).
            // Always pass the currently selected company+project from the list dropdowns.
            state: { companyUniqueId, projectId },
          })
        }
        onDelete={() => void handleDelete(row.unique_id)}
      />
    </div>
  );

  const indexTemplate = (
    _: WasteCollection,
    { rowIndex }: { rowIndex: number },
  ) => rowIndex + 1;

  const wasteBadge = (value: number | undefined, colorClass: string) => (
    <span
      className={`inline-flex min-w-[3rem] justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
    >
      {value ?? 0} kg
    </span>
  );

  return (
    <div className="p-3">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">
          {t("admin.waste_collected_data.title")}
        </h1>
        <p className="text-sm text-gray-500">
          {t("admin.waste_collected_data.subtitle")}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="pi pi-box"
          tone="bg-emerald-50 text-emerald-600"
          label="Overall weight"
          value={formatKg(overallWeight)}
          hint={`${totalRecords.toLocaleString()} collections`}
        />
        <KpiCard
          icon="pi pi-calendar"
          tone="bg-cyan-50 text-cyan-600"
          label="Today's weight"
          value={formatKg(dailyWeight)}
          hint={`${dailyCount.toLocaleString()} collections today`}
        />
      </div>

      <DataTable
        header={
          /* Global search + Add button */
          <FilterBar
            searchValue={globalFilterValue}
            onSearchChange={onGlobalFilterChange}
            searchPlaceholder={t("admin.waste_collected_data.search_placeholder")}
            trailing={
              canAdd ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    label={t("admin.waste_collected_data.add_new")}
                    icon="pi pi-plus"
                    className="p-button-success"
                    onClick={() =>
                      navigate(ENC_NEW_PATH, {
                        state: { companyUniqueId, projectId },
                      })
                    }
                  />
                </div>
              ) : undefined
            }
          />
        }
        filterPanel={combineFilters(
          companyProject,
          {
            ...collectionDate,
            field: (
              <FilterSection label="Collection date">
                <input
                  type="date"
                  value={collectionDate.draft.collection_date}
                  onChange={(e) =>
                    collectionDate.setField("collection_date", e.target.value)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  aria-label="Collection date"
                />
              </FilterSection>
            ),
          },
          statusFilter,
        )}
        loadExportRows={async () => buildExportRows()}
        onPdfRequest={handleDownloadPdf}
        value={dateFilteredRows}
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
        fitWidth
        emptyMessage={t("admin.waste_collected_data.empty_message")}
        className="p-datatable-sm"
        globalFilterFields={[
          "customer_name",
          "zone_name",
          "ward_name",
          "panchayat_name",
          "city_name",
          "company_name",
          "project_name",
        ]}
      >
        <Column
          header={t("common.s_no")}
          body={indexTemplate}
          style={{ width: "5%" }}
        />
        <Column
          field="customer_name"
          header={t("admin.waste_collected_data.customer_name")}
          body={(row: WasteCollection) => cap(row.customer_name) || "-"}
          sortable
          filter
          showFilterMatchModes={false}
          style={{ width: "20%" }}
        />
        <Column
          field="collection_date"
          header={t(
            "admin.waste_collected_data.collection_date",
            "Collection Date",
          )}
          sortable
          style={{ width: "12%" }}
          body={(row: WasteCollection) => (
            <StackCell
              primary={row.collection_date}
              lines={[
                {
                  icon: "pi-clock",
                  title: t(
                    "admin.waste_collected_data.collection_time",
                    "Collection Time",
                  ),
                  value: formatTimeOnly(row.collection_time),
                },
              ]}
            />
          )}
        />
        <Column
          field="total_quantity"
          header={t("admin.waste_collected_data.quantity")}
          sortable
          style={{ width: "23%" }}
          body={(row: WasteCollection) => (
            <StackCell
              primary={
                row.total_quantity == null
                  ? null
                  : Number(Number(row.total_quantity).toFixed(2))
              }
              lines={[
                {
                  label: t("admin.waste_collected_data.dry_waste"),
                  value: wasteBadge(row.dry_waste, WASTE_TYPE_COLORS.dry),
                },
                {
                  label: t("admin.waste_collected_data.wet_waste"),
                  value: wasteBadge(row.wet_waste, WASTE_TYPE_COLORS.wet),
                },
                {
                  label: t("admin.waste_collected_data.mixed_waste"),
                  value: wasteBadge(row.mixed_waste, WASTE_TYPE_COLORS.mixed),
                },
                {
                  label: t(
                    "admin.waste_collected_data.sanitary_waste",
                    "Sanitary Waste",
                  ),
                  value: wasteBadge(
                    row.sanitary_waste,
                    WASTE_TYPE_COLORS.sanitary,
                  ),
                },
              ]}
            />
          )}
        />
        <Column
          field="status"
          header={t("common.status")}
          sortable
          filter
          showFilterMatchModes={false}
          style={{ width: "10%" }}
          body={(row: WasteCollection) => row.status || "Pending"}
        />
        {locationColumn<WasteCollection>({
          header: t("common.location"),
          style: { width: "15%" },
          levels: [
            { label: t("common.city"), value: (row) => cap(row.city_name) },
            {
              label: t("common.panchayat"),
              value: (row) => cap(row.panchayat_name),
            },
            { label: t("common.zone"), value: (row) => cap(row.zone_name) },
            { label: t("common.ward"), value: (row) => cap(row.ward_name) },
          ],
        })}
        <Column
          field="is_active"
          header={t("common.status")}
          body={statusTemplate}
          style={{ width: "8%" }}
        />
        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: "7%", textAlign: "center" }}
        />
      </DataTable>
    </div>
  );
}
