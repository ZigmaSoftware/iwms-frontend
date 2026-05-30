import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import type { DataTableFilterEvent } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon } from "@/icons";
import { adminApi } from "@/helpers/admin/registry";
import { tripDefinitionApi } from "@/helpers/admin";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { useCompanyProjectSelection } from "@/hooks/useCompanyProjectSelection";
import { normalizeList } from "@/utils/forms";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripDefinitionRecord = {
  unique_id: string;
  routeplan_id: string;
  routeplan?: { display_code?: string };
  staff_template_id: string;
  staff_template?: { display_code?: string };
  property_id?: string;
  sub_property_id?: string;
  property?: { unique_id?: string; property_name?: string };
  sub_property?: { unique_id?: string; sub_property_name?: string };
  trip_trigger_weight_kg: number;
  max_vehicle_capacity_kg: number;
  approval_status: string;
  status: string;
  created_at: string;
  _routeplan_name?: string;
  _staff_template_name?: string;
  _property_name?: string;
  _sub_property_name?: string;
  company_id?: string | null;
  company_unique_id?: string | null;
  company_name?: string | null;
  project_id?: string | null;
  project_unique_id?: string | null;
  project_name?: string | null;
  [key: string]: unknown;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  unique_id: { value: string | null; matchMode: FilterMatchMode };
  _routeplan_name: { value: string | null; matchMode: FilterMatchMode };
  _staff_template_name: { value: string | null; matchMode: FilterMatchMode };
  _property_name: { value: string | null; matchMode: FilterMatchMode };
  _sub_property_name: { value: string | null; matchMode: FilterMatchMode };
  approval_status: { value: string | null; matchMode: FilterMatchMode };
  status: { value: string | null; matchMode: FilterMatchMode };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value).trim();

const filterByCompanyProject = (
  rows: TripDefinitionRecord[],
  companyId: string,
  projectId: string
) => {
  const hasContextFields = rows.some((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    return Boolean(rowCompanyId || rowProjectId);
  });

  if (!hasContextFields) return rows;

  return rows.filter((item) => {
    const rowCompanyId = normalizeId(item?.company_id ?? item?.company_unique_id);
    const rowProjectId = normalizeId(item?.project_id ?? item?.project_unique_id);
    const companyMatches = !companyId || rowCompanyId === companyId;
    const projectMatches = !projectId || rowProjectId === projectId;
    return companyMatches && projectMatches;
  });
};

const buildLookup = (
  items: Record<string, unknown>[],
  keyField: string,
  valueField: string
): Record<string, string> =>
  items.reduce<Record<string, string>>(
    (acc, item) => {
      if (item[keyField] !== undefined && item[keyField] !== null) {
        acc[String(item[keyField])] = String(item[valueField] ?? item[keyField]);
      }
      return acc;
    },
    {} as Record<string, string>
  );

const extractErrorMessage = (error: unknown): string | null => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof (data as Record<string, unknown>)?.detail === "string") return (data as Record<string, unknown>).detail as string;
  if (typeof (data as Record<string, unknown>)?.error === "string") return (data as Record<string, unknown>).error as string;
  if (typeof data === "object") {
    const firstValue = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TripDefinitionList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const routePlanApi = adminApi.routePlans;
  const staffTemplateApi = adminApi.staffTemplateCreation;
  const propertyApi = adminApi.properties;
  const subPropertyApi = adminApi.subProperties;

  // ── Company / project selection ───────────────────────────────────────────
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

  // ── Routes ────────────────────────────────────────────────────────────────
  const { encTransportMaster, encTripDefinition } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encTransportMaster}/${encTripDefinition}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encTransportMaster}/${encTripDefinition}/${id}/edit`;

  // ── Data state ────────────────────────────────────────────────────────────
  const [allTripDefinitions, setAllTripDefinitions] = useState<TripDefinitionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [propertyLookup, setPropertyLookup] = useState<Record<string, string>>({});
  const [subPropertyLookup, setSubPropertyLookup] = useState<Record<string, string>>({});

  // ── Filter state ──────────────────────────────────────────────────────────
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    unique_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _routeplan_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _staff_template_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _property_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    _sub_property_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    approval_status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  // ── Load trip definitions ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    tripDefinitionApi.list()
      .then((data: unknown) => {
        if (mounted) setAllTripDefinitions(Array.isArray(data) ? (data as TripDefinitionRecord[]) : []);
      })
      .catch((error: unknown) => {
        if (mounted) {
          Swal.fire(t("common.error"), extractErrorMessage(error) ?? t("common.fetch_failed"), "error");
        }
      })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [t]);

  // ── Fetch lookup data for property/sub-property name enrichment ───────────
  useEffect(() => {
    if (!companyUniqueId || !projectId) {
      setPropertyLookup({});
      setSubPropertyLookup({});
      return;
    }

    const params: Record<string, string> = {
      company_id: companyUniqueId,
      project: projectId,
    };

    Promise.all([
      routePlanApi.list({ params }),
      staffTemplateApi.list({ params }),
      propertyApi.list({ params }),
      subPropertyApi.list({ params }),
    ])
      .then(([, , propertyRes, subPropertyRes]) => {
        const propertyRows = filterByCompanyProject(
          normalizeList(propertyRes) as TripDefinitionRecord[],
          companyUniqueId,
          projectId
        );
        const subPropertyRows = filterByCompanyProject(
          normalizeList(subPropertyRes) as TripDefinitionRecord[],
          companyUniqueId,
          projectId
        );

        setPropertyLookup(
          buildLookup(propertyRows as Record<string, unknown>[], "unique_id", "property_name")
        );
        setSubPropertyLookup(
          buildLookup(subPropertyRows as Record<string, unknown>[], "unique_id", "sub_property_name")
        );
      })
      .catch((error: unknown) => {
        const message = extractErrorMessage(error) ?? t("common.fetch_failed");
        Swal.fire(t("common.error"), message, "error");
      });
  }, [companyUniqueId, projectId, t]);

  // ── Derived rows ──────────────────────────────────────────────────────────
  const rows = (() => {
    if (isSuperAdmin && companies.length === 0) return [] as TripDefinitionRecord[];
    if (!companyUniqueId) return [] as TripDefinitionRecord[];

    const filtered = allTripDefinitions.filter((row) => {
      const rowCompanyId = normalizeId(row.company_id || row.company_unique_id);
      const rowProjectId = normalizeId(row.project_id || row.project_unique_id);
      const companyMatches = !companyUniqueId || rowCompanyId === companyUniqueId;
      const projectMatches = !projectId || rowProjectId === projectId;
      return companyMatches && projectMatches;
    });

    return filtered.map((rec) => ({
      ...rec,
      _routeplan_name: rec.routeplan?.display_code ?? rec.routeplan_id ?? "",
      _staff_template_name: rec.staff_template?.display_code ?? rec.staff_template_id ?? "",
      _property_name:
        rec.property?.property_name ??
        propertyLookup[rec.property_id ?? rec.property?.unique_id ?? ""] ??
        rec.property_id ??
        "",
      _sub_property_name:
        rec.sub_property?.sub_property_name ??
        subPropertyLookup[rec.sub_property_id ?? rec.sub_property?.unique_id ?? ""] ??
        rec.sub_property_id ??
        "",
    }));
  })();

  // ── Filter handlers ───────────────────────────────────────────────────────
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

  // ── Status toggle ─────────────────────────────────────────────────────────
  const statusBodyTemplate = (row: TripDefinitionRecord) => {
    const updateStatus = async (checked: boolean) => {
      setIsUpdating(true);
      try {
        await tripDefinitionApi.update(row.unique_id, {
          status: checked ? "ACTIVE" : "INACTIVE",
        });
        setAllTripDefinitions((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id
              ? { ...item, status: checked ? "ACTIVE" : "INACTIVE" }
              : item
          )
        );
      } catch (error: unknown) {
        const message = extractErrorMessage(error) ?? t("common.update_status_failed");
        Swal.fire(t("common.error"), message, "error");
      } finally {
        setIsUpdating(false);
      }
    };

    return (
      <Switch
        checked={row.status === "ACTIVE"}
        disabled={isUpdating}
        onCheckedChange={updateStatus}
      />
    );
  };

  // ── Table header ──────────────────────────────────────────────────────────
  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.trip_definition.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.trip_definition.list_subtitle")}
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
              {t("common.select_item_placeholder", {
                item: t("admin.nav.company"),
              })}
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
              {t("common.select_item_placeholder", {
                item: t("admin.nav.project"),
              })}
            </option>
            {projects.map((project) => (
              <option key={project.value} value={project.value}>
                {project.label}
              </option>
            ))}
          </select>

          <Button
            label={t("admin.trip_definition.create_button")}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            disabled={!companyUniqueId || !projectId}
            onClick={() => navigate(ENC_NEW_PATH, { state: { companyUniqueId, projectId } })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-white">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("admin.trip_definition.search_placeholder")}
            className="border-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  // ── Action buttons ────────────────────────────────────────────────────────
  const actionTemplate = (row: TripDefinitionRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.edit")}
        onClick={() =>
          navigate(ENC_EDIT_PATH(row.unique_id), { state: { record: row, companyUniqueId, projectId } })
        }
        className="text-blue-600 hover:text-blue-800"
      >
        <PencilIcon className="size-5" />
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3">
      <DataTable
        value={rows}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={isLoading && rows.length === 0}
        filters={filters}
        onFilter={onFilter}
        globalFilterFields={[
          "unique_id",
          "_routeplan_name",
          "_staff_template_name",
          "_property_name",
          "_sub_property_name",
          "approval_status",
          "status",
          "company_name",
          "project_name",
        ]}
        header={header}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.trip_definition.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />

        <Column
          field="unique_id"
          header="ID"
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_routeplan_name"
          header={t("admin.trip_definition.route_plan")}
          body={(row: TripDefinitionRecord) =>
            row.routeplan?.display_code ?? row.routeplan_id
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_staff_template_name"
          header={t("admin.trip_definition.staff_template")}
          body={(row: TripDefinitionRecord) =>
            row.staff_template?.display_code ?? row.staff_template_id
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_property_name"
          header={t("admin.trip_definition.property")}
          body={(row: TripDefinitionRecord) =>
            row.property?.property_name ??
            propertyLookup[row.property_id ?? row.property?.unique_id ?? ""] ??
            row.property_id ??
            row.property?.unique_id ??
            ""
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="_sub_property_name"
          header={t("admin.trip_definition.sub_property")}
          body={(row: TripDefinitionRecord) =>
            row.sub_property?.sub_property_name ??
            subPropertyLookup[
              row.sub_property_id ?? row.sub_property?.unique_id ?? ""
            ] ??
            row.sub_property_id ??
            row.sub_property?.unique_id ??
            ""
          }
          filter
          showFilterMatchModes={false}
        />

        <Column
          field="trip_trigger_weight_kg"
          header={t("admin.trip_definition.trigger_weight")}
        />

        <Column
          field="max_vehicle_capacity_kg"
          header={t("admin.trip_definition.max_capacity")}
        />

        <Column
          field="approval_status"
          header={t("admin.trip_definition.approval_status")}
          filter
          showFilterMatchModes={false}
        />

        <Column
          header={t("admin.trip_definition.status")}
          body={statusBodyTemplate}
          style={{ width: 120 }}
        />

        <Column
          header={t("common.actions")}
          body={actionTemplate}
          style={{ width: 120 }}
        />
      </DataTable>
    </div>
  );
}
