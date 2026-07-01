import type { CollectionPointRecord, TableFilters } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { renderListSearchHeader } from "@/utils/listSearchHeader";
import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { useFieldVisibility } from "@/hooks/useFieldVisibility";
import { collectionPointApi } from "@/helpers/admin";


const toDisplay = (value: unknown): string =>
  value === null || value === undefined || String(value).trim() === "" ? "-" : String(value);

const toOptionalString = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const COLLECTION_POINT_COLUMN_FIELDS: Record<string, string[]> = {
  cp_name: ["cp_name", "collection_point_name", "name"],
  company_name: ["company_id", "company_name"],
  project_name: ["project_id", "project_name"],
  state_name: ["state_id", "state_name"],
  district_name: ["district_id", "district_name"],
  city_name: ["city_id", "city_name"],
  panchayat_name: ["panchayat_id", "panchayat_name"],
  ward_name: ["ward_id", "ward_name"],
  latitude: ["latitude"],
  longitude: ["longitude"],
  is_active: ["is_active"],
};

export default function CollectionPointListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [records, setRecords] = useState<CollectionPointRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [collectionTypeFilter, setCollectionTypeFilter] = useState<"all" | "bin_collection" | "household_collection">("all");
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null as string | null, matchMode: FilterMatchMode.CONTAINS },
    cp_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    company_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    project_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    state_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    district_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    panchayat_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
    ward_name: { value: null as string | null, matchMode: FilterMatchMode.STARTS_WITH },
  });
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

  const { encScheduleMasters, encCollectionPoints } = getEncryptedRoute();
  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encScheduleMasters,
    encCollectionPoints,
  );

  const { showColumn: showCol, filterPayload } = useFieldVisibility(
    "masters",
    "collection-points",
    COLLECTION_POINT_COLUMN_FIELDS,
  );

  useEffect(() => {
    let mounted = true;

    const loadCollectionPoints = async () => {
      if (!companyUniqueId && !isSuperAdmin) {
        setRecords([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await collectionPointApi.readAll({
          params: { company_id: companyUniqueId, project_id: projectId || undefined },
        });
        if (mounted) setRecords(data as CollectionPointRecord[]);
      } catch (error) {
        console.error("Failed to fetch collection points", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadCollectionPoints();

    return () => {
      mounted = false;
    };
  }, [companyUniqueId, projectId]);

  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as CollectionPointRecord[];
    if (!companyUniqueId && !isSuperAdmin) return [] as CollectionPointRecord[];

    return records.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;
      const typeMatches = collectionTypeFilter === "all" || (row as any).collection_type === collectionTypeFilter;
      return companyMatches && projectMatches && typeMatches;
    });
  })();

  const onFilter = (e: DataTableFilterEvent) => {
    setFilters(e.filters as TableFilters);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prev) => ({
      ...prev,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    }));
  };

  const renderHeader = () =>
    renderListSearchHeader({
      value: globalFilterValue,
      onChange: onGlobalFilterChange,
      placeholder: t("common.search_placeholder", { item: t("admin.nav.collection_point") }),
    });

  const indexTemplate = (_: CollectionPointRecord, { rowIndex }: { rowIndex: number }) => rowIndex + 1;

  const actionTemplate = (row: CollectionPointRecord) => (
    <div className="flex gap-3 justify-center">
      <button
        onClick={() =>
          navigate(ENC_EDIT_PATH(String(row.unique_id)), {
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

  const statusTemplate = (row: CollectionPointRecord) => {
    const updateStatus = async (value: boolean) => {
      try {
        setPendingStatusId(String(row.unique_id));
        setIsUpdating(true);
        await collectionPointApi.update(
          row.unique_id,
          filterPayload({ is_active: value }) as { is_active: boolean }
        );
        setRecords((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch (error) {
        console.error("Failed to update collection point status", error);
      } finally {
        setPendingStatusId(null);
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={Boolean(row.is_active)}
        disabled={isUpdating && pendingStatusId === String(row.unique_id)}
        onCheckedChange={updateStatus}
      />
    );
  };

  const cap = (str?: string | null) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  return (
    <div className="p-3">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{t("admin.nav.collection_point")}</h1>
          <p className="text-sm text-gray-500">
            {t("common.manage_item_records", { item: t("admin.nav.collection_point") })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={companyUniqueId || ""}
            onChange={(e) => onCompanyChange(e.target.value)}
            disabled={!isSuperAdmin || companies.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.value} value={company.value}>
                {company.label}
              </option>
            ))}
          </select>

          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
            className="border rounded px-3 py-2 text-sm"
          >
            {showAllProjectsOption && <option value="">All Projects</option>}
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <select
            value={collectionTypeFilter}
            onChange={(e) => setCollectionTypeFilter(e.target.value as "all" | "bin_collection" | "household_collection")}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="bin_collection">Bin Collection</option>
            <option value="household_collection">Household Collection</option>
          </select>

          <Button
            label={t("common.add_item", { item: t("admin.nav.collection_point") })}
            icon="pi pi-plus"
            className="p-button-success"

            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={isLoading}
        filters={filters}
        onFilter={onFilter}
        header={renderHeader()}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        globalFilterFields={[
          "unique_id",
          "cp_name",
          "company_id",
          "company_name",
          "project_id",
          "project_name",
          "state_id",
          "state_name",
          "district_id",
          "district_name",
          "city_id",
          "city_name",
          "panchayat_id",
          "panchayat_name",
          "ward_id",
          "ward_name",
        ]}
        emptyMessage={t("common.no_items_found", { item: t("admin.nav.collection_point") })}
      >
        <Column header={t("common.s_no")} body={indexTemplate} style={{ width: "80px" }} />
        <Column
          header="Collection Type"
          style={{ minWidth: 160 }}
          body={(row: CollectionPointRecord) => {
            const type = (row as any).collection_type as string | undefined;
            const isBin = !type || type === "bin_collection";
            return (
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${isBin ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                {isBin ? "Bin Collection" : "Household Collection"}
              </span>
            );
          }}
        />
        {showCol("cp_name") && (
          <Column
            field="cp_name"
            header={t("admin.nav.collection_point")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.cp_name ?? row.collection_point_name))}
          />
        )}
        {showCol("state_name") && (
          <Column
            field="state_name"
            header={t("common.state")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.state_name))}
          />
        )}
        {showCol("district_name") && (
          <Column
            field="district_name"
            header={t("common.district")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.district_name))}
          />
        )}
        {showCol("city_name") && (
          <Column
            field="city_name"
            header={t("common.city")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: CollectionPointRecord) => cap(toOptionalString(row.city_name))}
          />
        )}
        {showCol("panchayat_name") && (
          <Column
            field="panchayat_name"
            header={t("admin.nav.panchayat")}
            sortable
            filter
            showFilterMatchModes={false}
            body={(row: CollectionPointRecord) => toDisplay(row.panchayat_name)}
          />
        )}
        {showCol("ward_name") && (
          <Column
            field="ward_name"
            header={t("admin.nav.ward")}
            filter
            showFilterMatchModes={false}
            body={(row: CollectionPointRecord) => {
              const wards = row.wards as { unique_id: string; ward_name: string }[] | undefined;
              if (wards && wards.length > 0) {
                return (
                  <div className="flex flex-wrap gap-1">
                    {wards.map((w) => (
                      <span
                        key={w.unique_id}
                        className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full"
                      >
                        {cap(w.ward_name)}
                      </span>
                    ))}
                  </div>
                );
              }
              return <span>{toDisplay(row.ward_name)}</span>;
            }}
          />
        )}
        {showCol("latitude") && (
          <Column field="latitude" header="Latitude" body={(row: CollectionPointRecord) => toDisplay(row.latitude)} />
        )}
        {showCol("longitude") && (
          <Column field="longitude" header="Longitude" body={(row: CollectionPointRecord) => toDisplay(row.longitude)} />
        )}
        {showCol("is_active") && (
          <Column header={t("common.status")} body={statusTemplate} style={{ width: "140px" }} />
        )}
        <Column header={t("common.actions")} body={actionTemplate} style={{ width: "150px", textAlign: "center" }} />
      </DataTable>
    </div>
  );
}
