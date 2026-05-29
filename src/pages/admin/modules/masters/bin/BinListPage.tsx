import { useEffect, useState } from "react";
import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
import ReactDOM from "react-dom/client";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { Switch } from "@/components/ui/switch";
import { encryptSegment } from "@/utils/routeCrypto";
import { PencilIcon } from "@/icons";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { useBinsQuery, useUpdateBinMutation, type BinRecord } from "@/helpers/admin/directQueries";

type Bin = {
  unique_id: string;
  bin_name: string;
  bin_capacity: number;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  panchayat_name?: string;
  panchayat?: string;
  ward_name: string;
  ward?: string;
  bin_type?: string;
  waste_type_name?: string;
  wastetype_name?: string;
  waste_type?: string;
  bin_status?: string;
  latitude?: number | string;
  longitude?: number | string;
  is_active: boolean;
};

type BinApiRow = BinRecord & {
  bin_status?: string | number | null;
};

type QrPayload = {
  id: string;
  name: string;
  ward: string;
  bin_capacity: number;
  bin_type?: string;
  waste_type?: string;
  bin_status?: string;
  is_active: boolean;
  status: "active" | "inactive";
  latitude?: number | string;
  longitude?: number | string;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  bin_name: { value: string | null; matchMode: FilterMatchMode };
  bin_capacity: { value: string | null; matchMode: FilterMatchMode };
  ward_name: { value: string | null; matchMode: FilterMatchMode };
  panchayat_name: { value: string | null; matchMode: FilterMatchMode };
  waste_type_name: { value: string | null; matchMode: FilterMatchMode };
  company_name?: { value: string | null; matchMode: FilterMatchMode };
  project_name?: { value: string | null; matchMode: FilterMatchMode };
};

const encMasters = encryptSegment("masters");
const encBins = encryptSegment("bins");
const ENC_NEW_PATH = `/${encMasters}/${encBins}/new`;
const ENC_EDIT_PATH = (id: string) => `/${encMasters}/${encBins}/${id}/edit`;

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

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
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const location = useLocation();
  const restoredState = location.state as { companyUniqueId?: string; projectId?: string } | null;
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    setProjectId,
    onCompanyChange,
  } = useCompanyProjectSelection({ isEdit: false, initialCompanyId: restoredState?.companyUniqueId, initialProjectId: restoredState?.projectId });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    bin_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    bin_capacity: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    ward_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    panchayat_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    waste_type_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
  });

  const navigate = useNavigate();
  const binsQuery = useBinsQuery(companyUniqueId ? { company_id: companyUniqueId, project_id: projectId || undefined } : null);
  const updateBinMutation = useUpdateBinMutation();
  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "assets",
    "bins",
    BIN_COLUMN_FIELDS,
  );

  useEffect(() => {
    if (!binsQuery.isError) return;
    const data = (binsQuery.error as { response?: { data?: unknown } })?.response?.data;
    Swal.fire(t("common.error"), String(data ?? binsQuery.error), "error");
  }, [binsQuery.error, binsQuery.isError, t]);

  const bins = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as Bin[];
    if (!companyUniqueId) return [] as Bin[];

    const rows = Array.isArray(binsQuery.data) ? (binsQuery.data as BinApiRow[]) : [];
    const mapped: Bin[] = rows.map((row) => ({
      unique_id: String(row.unique_id ?? ""),
      bin_name: String(row.bin_name ?? ""),
      bin_capacity: Number(row.bin_capacity ?? 0),
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

    return mapped.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;
      return companyMatches && projectMatches;
    });
  })();

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
    setGlobalFilterValue(value);
  };

  const statusBodyTemplate = (row: Bin) => {
    const updateStatus = async (checked: boolean) => {
      try {
        setPendingStatusId(row.unique_id);
        await updateBinMutation.mutateAsync({
          id: row.unique_id,
          payload: filterPayload({
            bin_name: row.bin_name,
            bin_capacity: row.bin_capacity,
            is_active: checked,
          }) as { bin_name: string; bin_capacity: number; is_active: boolean },
        });
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      } finally {
        setPendingStatusId(null);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        disabled={updateBinMutation.isPending && pendingStatusId === row.unique_id}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionBodyTemplate = (row: Bin) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
        title={t("common.edit")}
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  const indexTemplate = (_: Bin, options: { rowIndex: number }) => options.rowIndex + 1;

  const header = (
    <div className="flex justify-end">
      <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-gray-300 shadow-sm">
        <i className="pi pi-search text-gray-500" />
        <InputText
          value={globalFilterValue}
          onChange={onGlobalFilterChange}
          placeholder={t("common.search_item_placeholder", { item: t("admin.nav.bin_master") })}
          className="p-inputtext-sm border-0 shadow-none"
        />
      </div>
    </div>
  );

  const buildBinQrPayload = (bin: Bin): QrPayload => ({
    id: bin.unique_id,
    name: bin.bin_name,
    ward: bin.ward_name || bin.ward || "",
    bin_capacity: bin.bin_capacity,
    bin_type: bin.bin_type,
    waste_type: bin.waste_type_name ?? bin.wastetype_name ?? bin.waste_type,
    bin_status: bin.bin_status,
    is_active: bin.is_active,
    status: bin.is_active ? "active" : "inactive",
    latitude: bin.latitude,
    longitude: bin.longitude,
  });

  const openQrPopup = (payload: QrPayload) => {
    Swal.fire({
      title: t("admin.bin.qr_title"),
      html: `<div id="bin-qr-holder" class="flex justify-center"></div>`,
      width: 350,
      didOpen: () => {
        const div = document.getElementById("bin-qr-holder");
        if (div) {
          const root = ReactDOM.createRoot(div);
          root.render(<QRCode value={JSON.stringify(payload)} size={200} />);
        }
      },
    });
  };

  const qrTemplate = (bin: Bin) => {
    const payload = buildBinQrPayload(bin);
    return (
      <button
        className="p-1 border rounded bg-white shadow-sm hover:bg-gray-50"
        onClick={() => openQrPopup(payload)}
        title={t("admin.bin.qr_show")}
      >
        <QRCode value={JSON.stringify(payload)} size={45} />
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
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.company") })}
            </option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={!companyUniqueId || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              {t("common.select_item_placeholder", { item: t("admin.nav.project") })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("common.add_item", { item: t("admin.nav.bin_creation") })}
            icon="pi pi-plus"
            className="p-button-success"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

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
        header={header}
        stripedRows
        showGridlines
        loading={binsQuery.isPending || binsQuery.isFetching}
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
    </div>
  );
}
