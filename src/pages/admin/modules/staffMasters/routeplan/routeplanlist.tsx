// import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
// import {
//   getStoredPermissions,
//   hasPermission as checkPermission,
//   type PermissionsMap,
//   type PermissionAction,
// } from "@/utils/permissions";

// type PermissionContextValue = {
//   permissions: PermissionsMap;
//   hasPermission: (moduleName: string, screenName: string, action?: PermissionAction) => boolean;
//   updatePermissions: (permissions: PermissionsMap) => void;
// };

// const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

// export const PermissionProvider = ({ children }: { children: ReactNode }) => {
//   const [permissions, setPermissions] = useState<PermissionsMap>(() =>
//     getStoredPermissions()
//   );

//   // ✅ Sync permissions when localStorage changes (for multi-tab scenarios)
//   useEffect(() => {
//     const stored = getStoredPermissions();
//     console.log("[PermissionContext] Initial load - permissions:", stored); 
//     setPermissions(stored);

//     // Listen for storage changes
//     const handleStorageChange = () => {
//       const updated = getStoredPermissions();
//       console.log("[PermissionContext] Storage changed - updating permissions:", updated);
//       setPermissions(updated);
//     };

//     window.addEventListener("storage", handleStorageChange);
//     return () => window.removeEventListener("storage", handleStorageChange);
//   }, []);

//   // ✅ Allow explicit permission updates (useful for same-tab updates like login)
//   const updatePermissions = useCallback((newPermissions: PermissionsMap) => {
//     console.log("[PermissionContext] Explicit permission update:", newPermissions);
//     setPermissions(newPermissions);
//   }, []);

//   const hasPermission = (
//     moduleName: string,
//     screenName: string,
//     action: PermissionAction = "view"
//   ): boolean => {
//     const result = checkPermission(moduleName, screenName, action, permissions);
//     console.log(
//       `[PermissionContext] Checking ${moduleName}/${screenName} (${action}): ${result}`
//     );
//     return result;
//   };

//   return (
//     <PermissionContext.Provider 
//       value={{ permissions, hasPermission, updatePermissions }}
//     >
//       {children}
//     </PermissionContext.Provider>
//   );
// };

// export const usePermission = () => {
//   const ctx = useContext(PermissionContext);
//   if (!ctx) {
//     throw new Error("usePermission must be used within PermissionProvider");
//   }
//   return ctx;
// };


import { type ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { FilterMatchMode } from "primereact/api";

import { PencilIcon, TrashBinIcon } from "@/icons";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { usePermission } from "@/contexts/PermissionContext";

// TODO: Replace with actual API import when available
// import { routePlansApi } from "@/helpers/admin";

type RoutePlan = {
  unique_id: string;
  display_code?: string | null;
  district_name?: string | null;
  city_name?: string | null;
  zone_name?: string | null;
  vehicle_no?: string | null;
  supervisor_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
};

type TableFilters = {
  global: { value: string | null; matchMode: FilterMatchMode };
  display_code?: { value: string | null; matchMode: FilterMatchMode };
  district_name?: { value: string | null; matchMode: FilterMatchMode };
  city_name?: { value: string | null; matchMode: FilterMatchMode };
  zone_name?: { value: string | null; matchMode: FilterMatchMode };
  vehicle_no?: { value: string | null; matchMode: FilterMatchMode };
  supervisor_name?: { value: string | null; matchMode: FilterMatchMode };
  is_active?: { value: string | null; matchMode: FilterMatchMode };
};

// Temporary mock data - Replace with actual API calls
const mockRoutePlans: RoutePlan[] = [];

const normalize = (payload: any): RoutePlan[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : payload?.results ?? [];

export default function RoutePlanList() {
  const { t } = useTranslation();
  const { hasPermission } = usePermission();
  const navigate = useNavigate();
  const [list, setList] = useState<RoutePlan[]>(mockRoutePlans);
  const [loading, setLoading] = useState(false);

  // Check permissions for this module
  const canView = hasPermission("user-creations", "RoutePlan", "view");
  const canAdd = hasPermission("user-creations", "RoutePlan", "add");
  const canEdit = hasPermission("user-creations", "RoutePlan", "edit");
  const canDelete = hasPermission("user-creations", "RoutePlan", "delete");

  const { encStaffMasters, encRoutePlans } = getEncryptedRoute();
  const ENC_NEW_PATH = `/${encStaffMasters}/${encRoutePlans}/new`;
  const ENC_EDIT_PATH = (id: string) =>
    `/${encStaffMasters}/${encRoutePlans}/${id}/edit`;

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  // const [filters, setFilters] = useState<any>({
  //   global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  // });

  const [filters, setFilters] = useState<TableFilters>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    display_code: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    district_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    city_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    zone_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    vehicle_no: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    supervisor_name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
    is_active: { value: null, matchMode: FilterMatchMode.EQUALS },
  });

  const fetchList = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const res = await routePlansApi.list();
      // setList(normalize(res));
      setList(mockRoutePlans);
    } catch {
      Swal.fire(t("common.error"), t("common.fetch_failed"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchList();
    }
  }, [canView]);

  const statusBodyTemplate = (row: RoutePlan) => {
    const updateStatus = async (checked: boolean) => {
      try {
        // TODO: Replace with actual API call
        // await routePlansApi.update(row.unique_id, { is_active: checked });
        fetchList();
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      }
    };

    return (
      <Switch
        checked={!!row.is_active}
        onCheckedChange={updateStatus}
      />
    );
  };

  const actionTemplate = (row: RoutePlan) => (
    <div className="flex justify-center gap-3">
      {canEdit && (
        <button
          onClick={() => navigate(ENC_EDIT_PATH(row.unique_id))}
          className="text-blue-600 hover:text-blue-800"
          title={t("common.edit")}
        >
          <PencilIcon className="size-5" />
        </button>
      )}
      {canDelete && (
        <button
          onClick={() => handleDelete(row.unique_id)}
          className="text-red-600 hover:text-red-800"
          title={t("common.delete")}
        >
          <TrashBinIcon className="size-5" />
        </button>
      )}
    </div>
  );

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: t("common.confirm_title"),
      text: "Are you sure you want to delete this route plan?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
    });

    if (!confirm.isConfirmed) return;

    try {
      // TODO: Replace with actual API call
      // await routePlansApi.remove(id);
      fetchList();
      Swal.fire(t("common.deleted_success"), t("common.record_removed"), "success");
    } catch {
      Swal.fire(t("common.error"), "Failed to delete route plan", "error");
    }
  };

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const header = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("admin.route_plan.title") || "Route Plans"}
          </h1>
          <p className="text-sm text-gray-500">
            {t("admin.route_plan.subtitle") || "Manage route plans"}
          </p>
        </div>

        {canAdd && (
          <Button
            label={t("admin.route_plan.add") || "Add Route Plan"}
            icon="pi pi-plus"
            className="p-button-success p-button-sm"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        )}
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-2 border rounded-full px-3 py-1">
          <i className="pi pi-search text-gray-500" />
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder={t("common.search") || "Search..."}
            className="border-0 outline-none text-sm"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <DataTable
        value={list}
        loading={loading}
        filters={filters}
        globalFilterFields={["display_code", "zone_name", "vehicle_no", "supervisor_name"]}
        header={header}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 20, 50]}
        className="p-datatable-striped"
      >
        <Column field="display_code" header={t("common.code") || "Code"} sortable filter showFilterMatchModes={false} />
        <Column field="zone_name" header={t("common.zone") || "Zone"} sortable filter showFilterMatchModes={false} />
        <Column field="city_name" header={t("common.city") || "City"} sortable filter showFilterMatchModes={false} />
        <Column field="district_name" header={t("common.district") || "District"} sortable filter showFilterMatchModes={false} />
        <Column field="vehicle_no" header={t("common.vehicle") || "Vehicle"} sortable filter showFilterMatchModes={false} />
        <Column field="supervisor_name" header={t("common.supervisor") || "Supervisor"} sortable filter showFilterMatchModes={false} />
        <Column
          field="is_active"
          header={t("common.status") || "Status"}
          body={statusBodyTemplate}
          className="text-center"
        />
        <Column
          header={t("common.actions") || "Actions"}
          body={actionTemplate}
          className="text-center"
          style={{ width: "100px" }}
        />
      </DataTable>
    </div>
  );
}