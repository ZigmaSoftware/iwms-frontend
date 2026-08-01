import type { Bin, BinApiRow } from "./types";
import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useState } from "react";
import { useEffect } from "react";
import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { Switch } from "@/components/ui/switch";
import QrPreviewDialog from "@/components/common/QrPreviewDialog";
import { PencilIcon } from "@/icons";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { binApi, zoneApi, wardApi } from "@/helpers/admin";
import { FilterBar, FilterBarSelect } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { exportRecordsToExcel, getAdminScreenExcelFilename } from "@/utils/exportExcel";

type LookupOption = { value: string; label: string };

const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") {
    const results = (value as { results?: unknown }).results;
    if (Array.isArray(results)) return results as Record<string, unknown>[];
  }
  return [];
};


const { encMasters, encBins } = getEncryptedRoute();
const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
  encMasters,
  encBins,
);

const BIN_COLUMN_FIELDS: Record<string, string[]> = {
  bin_name: ["bin_name", "name"],
  bin_capacity: ["bin_capacity", "capacity_liters"],
  ward_name: ["ward_id", "ward", "ward_name"],
  panchayat_name: ["panchayat_id", "panchayat", "panchayat_name"],
  waste_type_name: ["wastetype_id", "waste_type_id", "waste_type", "waste_type_name"],
  qr_code: ["bin_qr", "qr_code"],
  is_active: ["is_active"],
};

export default function BinList() {
  const { t } = useTranslation();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [selectedQrBin, setSelectedQrBin] = useState<Bin | null>(null);
  const location = useLocation();
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
    defaultToAll: true, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters({
    initialFilters: {
      bin_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      bin_capacity: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
      waste_type_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    },
  });

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [zoneFilterId, setZoneFilterId] = useState("");
  const [wardFilterId, setWardFilterId] = useState("");
  const [zoneOptions, setZoneOptions] = useState<LookupOption[]>([]);
  const [wardOptions, setWardOptions] = useState<LookupOption[]>([]);

  const navigate = useNavigate();
  const [binRows, setBinRows] = useState<BinApiRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "assets",
    "bins",
    BIN_COLUMN_FIELDS,
  );

  // Load zone/ward filter options (scoped by company/project, mirrors A1's bin filters)
  useEffect(() => {
    if (!companyUniqueId) return;
    let cancelled = false;
    const params = { company_id: companyUniqueId, project_id: projectId || undefined };
    Promise.all([zoneApi.readAll({ params }), wardApi.readAll({ params })])
      .then(([zoneRes, wardRes]) => {
        if (cancelled) return;
        setZoneOptions(
          toRecordList(zoneRes)
            .filter((z) => z.is_active !== false)
            .map((z) => ({
              value: String(z.unique_id ?? ""),
              label: String(z.zone_name ?? z.name ?? z.unique_id ?? ""),
            }))
            .filter((z) => z.value)
        );
        setWardOptions(
          toRecordList(wardRes)
            .filter((w) => w.is_active !== false)
            .map((w) => ({
              value: String(w.unique_id ?? ""),
              label: String(w.ward_name ?? w.name ?? w.unique_id ?? ""),
            }))
            .filter((w) => w.value)
        );
      })
      .catch(() => {
        if (cancelled) return;
        setZoneOptions([]);
        setWardOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [companyUniqueId, projectId]);

  useEffect(() => {
    if (isSuperAdmin && companies.length === 0) return;
    if (!companyUniqueId && !isSuperAdmin) return;

    let mounted = true;

    const loadBins = async () => {
      setIsLoading(true);
      try {
        const data = await binApi.readAll({
          params: {
            company_id: companyUniqueId,
            project_id: projectId || undefined,
            zone_id: zoneFilterId || undefined,
            ward_id: wardFilterId || undefined,
          },
        });
        if (mounted) setBinRows(data as BinApiRow[]);
      } catch (error) {
        if (mounted) {
          const data = (error as { response?: { data?: unknown } })?.response?.data;
          Swal.fire(t("common.error"), String(data ?? error), "error");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadBins();

    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId, isSuperAdmin, companies.length, zoneFilterId, wardFilterId, t]);

  // Company/project scoping is now applied server-side (tenant users are
  // scoped automatically by the backend; superadmin scoping is passed via
  // company_id/project_id params above) — no client-side narrowing needed.
  const bins = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as Bin[];
    if (!companyUniqueId && !isSuperAdmin) return [] as Bin[];

    const rows = Array.isArray(binRows) ? binRows : [];
    const mapped: Bin[] = rows.map((row) => ({
      unique_id: String(row.unique_id ?? ""),
      bin_name: String(row.bin_name ?? ""),
      bin_capacity: Number(row.bin_capacity ?? 0),
      bin_qr: row.bin_qr ? String(row.bin_qr) : null,
      company_id: row.company_id ? String(row.company_id) : null,
      company_unique_id: row.company_unique_id ? String(row.company_unique_id) : null,
      company_name: row.company_name ? String(row.company_name) : null,
      project_id: row.project_id ? String(row.project_id) : null,
      project_unique_id: row.project_unique_id ? String(row.project_unique_id) : null,
      project_name: row.project_name ? String(row.project_name) : null,
      panchayat_name: row.panchayat_name ? String(row.panchayat_name) : undefined,
      panchayat: row.panchayat ? String(row.panchayat) : undefined,
      ward_name: String(row.ward_name ?? row.ward ?? ""),
      ward: row.ward ? String(row.ward) : undefined,
      bin_type: row.bin_type ? String(row.bin_type) : undefined,
      waste_type_name: row.waste_type_name ? String(row.waste_type_name) : undefined,
      wastetype_name: row.wastetype_name ? String(row.wastetype_name) : undefined,
      waste_type: row.waste_type ? String(row.waste_type) : undefined,
      bin_status: row.bin_status ? String(row.bin_status) : undefined,
      latitude: row.latitude as number | string | undefined,
      longitude: row.longitude as number | string | undefined,
      is_active: Boolean(row.is_active),
    }));

    return mapped;
  })();

  const getFilteredExportRows = (): Bin[] => {
    const search = globalFilterValue.trim().toLowerCase();
    return bins.filter((bin) => {
      if (statusValue !== "all") {
        const wantActive = statusValue === "active";
        if (Boolean(bin.is_active) !== wantActive) return false;
      }
      if (!search) return true;
      return [
        bin.bin_name,
        bin.ward_name,
        bin.ward,
        bin.panchayat_name,
        bin.panchayat,
        bin.waste_type_name,
        bin.wastetype_name,
        bin.waste_type,
        bin.company_name,
        bin.project_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  };

  const handleDownloadExcel = () => {
    setIsExportingExcel(true);
    try {
      const rows = getFilteredExportRows();
      if (rows.length === 0) {
        Swal.fire(t("common.warning") || "Warning", "No bins to export", "warning");
        return;
      }
      exportRecordsToExcel(rows, getAdminScreenExcelFilename("all"), "Bins");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const statusBodyTemplate = (row: Bin) => {
    const updateStatus = async (checked: boolean) => {
      try {
        setPendingStatusId(row.unique_id);
        setIsUpdating(true);
        await binApi.update(
          row.unique_id,
          filterPayload({
            bin_name: row.bin_name,
            bin_capacity: row.bin_capacity,
            is_active: checked,
          }) as { bin_name: string; bin_capacity: number; is_active: boolean }
        );
        setBinRows((current) =>
          current.map((item) =>
            String(item.unique_id ?? "") === row.unique_id
              ? { ...item, is_active: checked }
              : item
          )
        );
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        disabled={isUpdating && pendingStatusId === row.unique_id}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionBodyTemplate = (row: Bin) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), {
            state: { companyUniqueId, projectId },
          })
        }
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Bin, options: { rowIndex: number }) => options.rowIndex + 1;

  const qrTemplate = (bin: Bin) => {
    if (!bin.bin_qr) {
      return <span className="text-gray-400 text-xs">No QR</span>;
    }
    return (
      <button
        type="button"
        className="p-1 border rounded bg-white shadow-sm hover:bg-gray-50"
        onClick={() => setSelectedQrBin(bin)}
        title={t("admin.bin.qr_show")}
      >
        <img src={bin.bin_qr} alt="QR" className="w-12 h-12 object-contain" />
      </button>
    );
  };

  const wasteTypeTemplate = (row: Bin) =>
    row.waste_type_name ?? row.wastetype_name ?? row.waste_type ?? "-";

  const cap = (str?: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t("admin.nav.bin_master")}</h1>
          <p className="text-gray-500 text-sm">
            {t("common.manage_item_records", { item: t("admin.nav.bin_master") })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            label={t("common.add_item", { item: t("admin.nav.bin_creation") })}
            icon="pi pi-plus"
            className="p-button-success"

            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <FilterBar
        searchValue={globalFilterValue}
        onSearchChange={onGlobalFilterChange}
        searchPlaceholder={t("common.search_placeholder", { item: t("admin.nav.bin_master") })}
        statusValue={statusValue}
        onStatusChange={onStatusFilterChange}
        className="mb-4"
        trailing={
          <Button
            label={isExportingExcel ? "Downloading..." : "Download Excel"}
            icon="pi pi-file-excel"
            className="p-button-outlined"
            disabled={isExportingExcel}
            onClick={handleDownloadExcel}
          />
        }
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
        <FilterBarSelect
          value={zoneFilterId}
          onChange={setZoneFilterId}
          options={zoneOptions}
          placeholder={t("common.select_item_placeholder", { item: t("admin.nav.zone") }) || "All Zones"}
          disabled={!companyUniqueId || zoneOptions.length === 0}
        />
        <FilterBarSelect
          value={wardFilterId}
          onChange={setWardFilterId}
          options={wardOptions}
          placeholder={t("common.select_item_placeholder", { item: t("common.ward") }) || "All Wards"}
          disabled={!companyUniqueId || wardOptions.length === 0}
        />
      </FilterBar>

      <DataTable
        value={bins}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={[
          "bin_name",
          "panchayat_name",
          "panchayat",
          "ward_name",
          "waste_type_name",
          "wastetype_name",
          "waste_type",
          "company_name",
          "project_name",
        ]}
        stripedRows
        showGridlines
        loading={isLoading}
        className="p-datatable-sm"
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        {showCol("bin_name") && (
          <Column
            field="bin_name"
            header={t("common.item_name", { item: t("admin.nav.bin_master") })}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: Bin) => cap(row.bin_name)}
            style={{ minWidth: "200px" }}
          />
        )}
        {showCol("bin_capacity") && (
          <Column
            field="bin_capacity"
            header={t("common.bin_capacity")}
            sortable
            filter
            showFilterMatchModes={false}
            style={{ minWidth: "150px" }}
          />
        )}
        {showCol("ward_name") && (
          <Column
            field="ward_name"
            header={t("admin.nav.ward")}
            body={(row: Bin) => cap(row.ward_name || row.ward || "-")}
            sortable
            filter
            showFilterMatchModes={false}
            style={{ minWidth: "120px" }}
          />
        )}
        {showCol("panchayat_name") && (
          <Column
            field="panchayat_name"
            header={t("admin.nav.panchayat")}
            body={(row: Bin) => cap(row.panchayat_name || row.panchayat || "-")}
            sortable
            filter
            showFilterMatchModes={false}
            style={{ minWidth: "140px" }}
          />
        )}
        {showCol("waste_type_name") && (
          <Column
            field="waste_type_name"
            header={t("common.waste_type")}
            body={(row: Bin) => cap(wasteTypeTemplate(row))}
            sortable
            filter
            showFilterMatchModes={false}
            style={{ minWidth: "160px" }}
          />
        )}
        {showCol("qr_code") && (
          <Column
            field="qr_code"
            header={t("admin.bin.qr_label")}
            body={(row: Bin) => qrTemplate(row)}
            style={{ width: "100px", textAlign: "center" }}
          />
        )}
        {showCol("is_active") && (
          <Column
            field="is_active"
            header={t("common.status")}
            body={(row: Bin) => statusBodyTemplate(row)}
            style={{ width: "150px", textAlign: "center" }}
          />
        )}
        <Column
          field="actions"
          header={t("common.actions")}
          body={(row: Bin) => actionBodyTemplate(row)}
          style={{ width: "150px", textAlign: "center" }}
        />
      </DataTable>

      <QrPreviewDialog
        open={Boolean(selectedQrBin)}
        onOpenChange={(open) => !open && setSelectedQrBin(null)}
        title={t("admin.bin.qr_title")}
        qrImageUrl={selectedQrBin?.bin_qr}
        fileName={`${selectedQrBin?.unique_id || selectedQrBin?.bin_name || "bin"}_qr`}
        description={
          selectedQrBin && (
            <>
              <p className="font-semibold text-gray-800">{cap(selectedQrBin.bin_name)}</p>
              <p className="text-sm text-gray-500">{selectedQrBin.unique_id}</p>
            </>
          )
        }
      />
    </div>
  );
}
