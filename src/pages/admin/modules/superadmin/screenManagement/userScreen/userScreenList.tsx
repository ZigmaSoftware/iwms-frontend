import { createCrudRoutePaths } from "@/utils/routePaths";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "@/lib/notify";

import { DataTable } from "@/components/common/SafeDataTable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useTranslation } from "react-i18next";

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import { ActionMenu } from "@/components/ui/ActionMenu";
import { getEncryptedRoute } from "@/utils/routeCache";
import { Switch } from "@/components/ui/switch";
import { userScreenApi } from "@/helpers/admin";
import { FilterBar } from "@/components/common/FilterBar";
import { useFilterBarFilters } from "@/hooks/useFilterBarFilters";
import { filterRowsForExport } from "@/utils/adminListExport";

import type { UserScreen } from "../shared/admin.types";

const USER_SCREEN_SEARCH_FIELDS = ["userscreen_name", "mainscreen_name", "folder_name"];

export default function UserScreenList() {
  const { t } = useTranslation();
  const [screens, setScreens] = useState<UserScreen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const {
    filters,
    onFilter,
    globalFilterValue,
    onGlobalFilterChange,
    statusValue,
    onStatusFilterChange,
  } = useFilterBarFilters();

  const navigate = useNavigate();
  const { encAdmins, encUserScreen } = getEncryptedRoute();

  const { newPath: ENC_NEW_PATH, editPath: ENC_EDIT_PATH } = createCrudRoutePaths(
    encAdmins,
    encUserScreen,
  );

  useEffect(() => {
    let mounted = true;

    const loadScreens = async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const data = await userScreenApi.readAll();
        if (!mounted || requestId !== requestIdRef.current) return;
        setScreens(data as UserScreen[]);
      } catch {
        if (!mounted || requestId !== requestIdRef.current) return;
        Swal.fire(t("common.error"), t("common.load_failed"), "error");
      } finally {
        if (mounted && requestId === requestIdRef.current) setIsLoading(false);
      }
    };

    void loadScreens();

    return () => {
      mounted = false;
    };
  }, [t]);

  const indexTemplate = (_: UserScreen, { rowIndex }: { rowIndex: number }) =>
    rowIndex + 1;

  const statusTemplate = (row: UserScreen) => {
    const updateStatus = async (value: boolean) => {
      const id = String(row.unique_id);
      setPendingStatusId(id);

      try {
        await userScreenApi.update(row.unique_id, { is_active: value });
        setScreens((current) =>
          current.map((item) =>
            item.unique_id === row.unique_id ? { ...item, is_active: value } : item
          )
        );
      } catch {
        Swal.fire(t("common.error"), t("common.update_status_failed"), "error");
      } finally {
        setPendingStatusId(null);
      }
    };

    return (
      <Switch
        checked={row.is_active}
        disabled={pendingStatusId === String(row.unique_id)}
        onCheckedChange={updateStatus}
      />
    );
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = await Swal.fire({
      title: t("common.confirm_title"),
      text: t("common.confirm_delete_text"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });
    if (!confirmDelete.isConfirmed) return;

    try {
      await userScreenApi.delete(id);
      setScreens((current) => current.filter((item) => item.unique_id !== id));
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

  const actionTemplate = (row: UserScreen) => (
    <div className="flex justify-center">
      <ActionMenu
        onEdit={() => navigate(ENC_EDIT_PATH(row.unique_id))}
        onDelete={() => void handleDelete(row.unique_id)}
      />
    </div>
  );

  const header = (
    <FilterBar
      searchValue={globalFilterValue}
      onSearchChange={onGlobalFilterChange}
      searchPlaceholder={t("common.search_placeholder", {
        item: t("admin.nav.user_screen"),
      })}
      statusValue={statusValue}
      onStatusChange={onStatusFilterChange}
    />
  );

  const exportRows = useMemo(
    () => filterRowsForExport(screens, USER_SCREEN_SEARCH_FIELDS, globalFilterValue, statusValue),
    [screens, globalFilterValue, statusValue],
  );

  return (
    <div className="px-3 py-3 w-full">
      
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              {t("admin.nav.user_screen")}
            </h1>
            <p className="text-sm text-gray-500">
              {t("common.manage_item_records", {
                item: t("admin.nav.user_screen"),
              })}
            </p>
          </div>

          <Button
            label={t("common.add_item", {
              item: t("admin.nav.user_screen"),
            })}
            icon="pi pi-plus"
            className="p-button-success"
            onClick={() => navigate(ENC_NEW_PATH)}
          />
        </div>

        <DataTable
          value={screens}
          exportRows={exportRows}
          paginator
          rows={10}
          loading={isLoading}
          filters={filters}
          onFilter={onFilter}
          globalFilterFields={USER_SCREEN_SEARCH_FIELDS}
          rowsPerPageOptions={[5, 10, 25, 50]}
          stripedRows
          showGridlines
          className="p-datatable-sm"
          header={header}
          emptyMessage={t("common.no_items_found", {
            item: t("admin.nav.user_screen"),
          })}
        >
          <Column
            header={t("common.s_no")}
            body={indexTemplate}
            style={{ width: "70px" }}
          />
          <Column
            field="mainscreen_name"
            header={t("admin.nav.main_screen")}
            sortable
            style={{ minWidth: "150px" }}
          />
          <Column
            field="userscreen_name"
            header={t("admin.nav.user_screen")}
            sortable
            style={{ minWidth: "150px" }}
          />
          <Column
            field="folder_name"
            header={t("common.folder")}
            sortable
            style={{ minWidth: "120px" }}
          />
          <Column
            field="icon_name"
            header={t("common.icon")}
            sortable
            style={{ minWidth: "100px" }}
          />
          <Column
            field="order_no"
            header={t("common.order")}
            sortable
            style={{ width: "100px" }}
          />
          <Column
            header={t("common.status")}
            body={statusTemplate}
            style={{ width: "120px" }}
          />
          <Column
            header={t("common.actions")}
            body={actionTemplate}
            style={{ width: "150px" }}
          />
        </DataTable>
     
    </div>
  );
}
