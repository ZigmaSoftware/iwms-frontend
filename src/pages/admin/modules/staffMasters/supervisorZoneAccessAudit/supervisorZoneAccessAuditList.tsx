import type { SupervisorZoneAccessAuditRecord } from "./types";
import type { TableFilters } from "./types";
import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";

import { adminApi } from "@/helpers/admin/registry";
import { getEncryptedRoute } from "@/utils/routeCache";
import { normalizeList } from "@/utils/forms";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import {
  exportRecordsToExcel,
  getAdminScreenExcelFilename,
} from "@/utils/exportExcel";

const buildLookup = (items: any[], key: string, label: string) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const lookupKey = item?.[key];
    if (lookupKey !== undefined && lookupKey !== null) {
      acc[String(lookupKey)] = String(item?.[label] ?? lookupKey);
    }
    return acc;
  }, {});

export default function SupervisorZoneAccessAuditList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const auditApi = adminApi.supervisorZoneAccessAudits;
  const zoneApi = adminApi.zones;
  const userCreationApi = adminApi.usersCreation;

  const [records, setRecords] = useState<SupervisorZoneAccessAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const { filters, globalFilterValue, onGlobalFilterChange } =
    useFilterBarFilters({
      withStatusFilter: false,
      initialFilters: {
        supervisor_id: { value: null, matchMode: FilterMatchMode.CONTAINS },
        performed_by: { value: null, matchMode: FilterMatchMode.CONTAINS },
        performed_role: { value: null, matchMode: FilterMatchMode.CONTAINS },
        remarks: { value: null, matchMode: FilterMatchMode.CONTAINS },
        old_zone_ids: { value: null, matchMode: FilterMatchMode.CONTAINS },
        new_zone_ids: { value: null, matchMode: FilterMatchMode.CONTAINS },
      } as TableFilters,
    });

  const [zoneLookup, setZoneLookup] = useState<Record<string, string>>({});
  const [userLookup, setUserLookup] = useState<Record<string, string>>({});

  const { encStaffMasters, encSupervisorZoneAccessAudit } = getEncryptedRoute();
  const { editPath: ENC_VIEW_PATH } = createCrudRoutePaths(
    encStaffMasters,
    encSupervisorZoneAccessAudit,
  );

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const [auditRes, zoneRes, userRes] = await Promise.all([
        auditApi.readAll(),
        zoneApi.readAll(),
        userCreationApi.readAll(),
      ]);

      const users = normalizeList(userRes).filter(
        (u: any) => u?.user_type_name?.toLowerCase() === "staff",
      );

      setRecords(normalizeList(auditRes));
      setZoneLookup(buildLookup(normalizeList(zoneRes), "unique_id", "name"));
      setUserLookup(buildLookup(users, "unique_id", "staff_name"));
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const resolveUser = (id: string) => userLookup[id] ?? id ?? "-";

  const resolveZones = (zoneIds?: Array<number | string> | null) => {
    if (!Array.isArray(zoneIds) || zoneIds.length === 0) return "-";
    return zoneIds
      .map((zoneId) => zoneLookup[String(zoneId)] ?? zoneId)
      .join(", ");
  };

  const filteredExportRows = (): SupervisorZoneAccessAuditRecord[] => {
    const search = globalFilterValue.trim().toLowerCase();
    if (!search) return records;
    return records.filter((record) =>
      [
        resolveUser(record.supervisor_id),
        resolveUser(record.performed_by),
        record.performed_role,
        record.remarks,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  };

  const actionTemplate = (row: SupervisorZoneAccessAuditRecord) => (
    <div className="flex justify-center">
      <button
        title={t("common.view")}
        onClick={() => navigate(ENC_VIEW_PATH(row.unique_id))}
        className="text-blue-600 hover:text-blue-800"
      >
        {t("common.view")}
      </button>
    </div>
  );

  return (
    <div className="p-3">
      <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t("admin.supervisor_zone_access_audit.list_title")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.supervisor_zone_access_audit.list_subtitle")}
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <FilterBar
          searchValue={globalFilterValue}
          onSearchChange={onGlobalFilterChange}
          searchPlaceholder={t("common.search_placeholder")}
        />
      </div>

      <DataTable
        loadExportRows={async () => filteredExportRows()}
        value={records}
        dataKey="unique_id"
        paginator
        rows={10}
        loading={loading}
        filters={filters}
        globalFilterFields={[
          "unique_id",
          "supervisor_id",
          "performed_by",
          "performed_role",
        ]}
        stripedRows
        showGridlines
        className="p-datatable-sm"
        emptyMessage={t("admin.supervisor_zone_access_audit.empty_message")}
      >
        <Column
          header={t("common.s_no")}
          body={(_, { rowIndex }) => rowIndex + 1}
          style={{ width: 70 }}
        />
        <Column
          field="supervisor_id"
          header={t("admin.supervisor_zone_access_audit.supervisor")}
          body={(r: SupervisorZoneAccessAuditRecord) =>
            resolveUser(r.supervisor_id)
          }
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="performed_by"
          header={t("admin.supervisor_zone_access_audit.performed_by")}
          body={(r: SupervisorZoneAccessAuditRecord) =>
            resolveUser(r.performed_by)
          }
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="performed_role"
          header={t("admin.supervisor_zone_access_audit.performed_role")}
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="old_zone_ids"
          header={t("admin.supervisor_zone_access_audit.old_zones")}
          body={(r: SupervisorZoneAccessAuditRecord) =>
            resolveZones(r.old_zone_ids)
          }
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="new_zone_ids"
          header={t("admin.supervisor_zone_access_audit.new_zones")}
          body={(r: SupervisorZoneAccessAuditRecord) =>
            resolveZones(r.new_zone_ids)
          }
          filter
          showFilterMatchModes={false}
        />
        <Column
          field="remarks"
          header={t("admin.supervisor_zone_access_audit.remarks")}
          filter
          showFilterMatchModes={false}
        />
        <Column
          header={t("common.created_at")}
          body={(r: SupervisorZoneAccessAuditRecord) =>
            r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"
          }
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
