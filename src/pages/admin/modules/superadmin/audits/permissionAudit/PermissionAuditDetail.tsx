import type {
  AccessSnapshot,
  PermissionAuditRecord,
  SnapshotItem,
} from "./types";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

const METHOD_COLORS: Record<string, string> = {
  POST: "border-green-200 bg-green-50 text-green-700",
  PUT: "border-amber-200 bg-amber-50 text-amber-700",
  PATCH: "border-amber-200 bg-amber-50 text-amber-700",
  DELETE: "border-red-200 bg-red-50 text-red-700",
};

export const MethodBadge = ({ method }: { method?: string | null }) =>
  method ? (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-xs font-semibold ${
        METHOD_COLORS[method] ?? "border-gray-200 bg-gray-50 text-gray-700"
      }`}
    >
      {method}
    </span>
  ) : (
    <span>-</span>
  );

/** "kept" was held before and after the save; "granted" / "revoked" are
 *  what this save changed. */
type Status = "kept" | "granted" | "revoked";

type Chip = SnapshotItem & { status: Status };

type ScreenRow = { key: string; name: string; permissions: Chip[] };

type ModuleRow = {
  key: string;
  name: string;
  screens: ScreenRow[];
  changed: boolean;
};

const EMPTY: AccessSnapshot = { app_modules: [], modules: [] };

/** Screen -> the permissions it grants. A citizen app screen has no actions:
 *  the screen itself is the permission. */
const screenGrants = (
  screen: AccessSnapshot["modules"][number]["screens"][number],
) =>
  screen.actions.length > 0
    ? screen.actions
    : [{ id: screen.id, name: screen.name }];

/** The permissions held after the save, plus the ones it revoked. */
const mergePermissions = (
  before: SnapshotItem[],
  after: SnapshotItem[],
): Chip[] => {
  const beforeIds = new Set(before.map((i) => i.id));
  const afterIds = new Set(after.map((i) => i.id));
  return [
    ...after.map((i) => ({
      ...i,
      status: (beforeIds.has(i.id) ? "kept" : "granted") as Status,
    })),
    ...before
      .filter((i) => !afterIds.has(i.id))
      .map((i) => ({ ...i, status: "revoked" as Status })),
  ];
};

/** Module -> screen -> permissions, across both sides of the save. */
const buildModules = (
  oldSnap: AccessSnapshot,
  newSnap: AccessSnapshot,
): ModuleRow[] => {
  const modules = new Map<
    string,
    {
      name: string;
      screens: Map<
        string,
        { name: string; old: SnapshotItem[]; next: SnapshotItem[] }
      >;
    }
  >();
  const add = (snap: AccessSnapshot, side: "old" | "next") => {
    snap.modules.forEach((module) => {
      const key = module.id ?? module.name;
      const entry = modules.get(key) ?? {
        name: module.name,
        screens: new Map(),
      };
      module.screens.forEach((screen) => {
        const row = entry.screens.get(screen.id) ?? {
          name: screen.name,
          old: [],
          next: [],
        };
        row[side] = screenGrants(screen);
        entry.screens.set(screen.id, row);
      });
      modules.set(key, entry);
    });
  };
  // New first, so modules and screens keep the order the person now has.
  add(newSnap, "next");
  add(oldSnap, "old");

  return [...modules.entries()].map(([key, module]) => {
    const screens = [...module.screens.entries()].map(([screenKey, row]) => ({
      key: screenKey,
      name: row.name,
      permissions: mergePermissions(row.old, row.next),
    }));
    return {
      key,
      name: module.name,
      screens,
      changed: screens.some((s) =>
        s.permissions.some((p) => p.status !== "kept"),
      ),
    };
  });
};

const CHIP_STYLES: Record<Status, string> = {
  kept: "border-gray-200 bg-gray-50 text-gray-700",
  granted: "border-green-200 bg-green-50 font-medium text-green-700",
  revoked: "border-red-200 bg-red-50 text-red-700 line-through",
};

const PermissionChips = ({ items }: { items: Chip[] }) =>
  items.length === 0 ? (
    <span className="text-xs text-gray-400">—</span>
  ) : (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item.id}
          className={`rounded-full border px-2 py-0.5 text-xs ${CHIP_STYLES[item.status]}`}
        >
          {item.name}
        </span>
      ))}
    </div>
  );

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="wrap-break-word font-medium text-gray-800">{children}</div>
  </div>
);

const AccessPermissions = ({ record }: { record: PermissionAuditRecord }) => {
  const { t } = useTranslation();

  const oldSnap = record.old_permissions ?? EMPTY;
  const newSnap = record.new_permissions ?? EMPTY;
  const modules = useMemo(
    () => buildModules(oldSnap, newSnap),
    [oldSnap, newSnap],
  );
  const apps = mergePermissions(oldSnap.app_modules, newSnap.app_modules);
  const appsChanged = apps.some((p) => p.status !== "kept");

  // Only what the save changed by default; the checkbox shows everything
  // the person holds.
  const [showUnchanged, setShowUnchanged] = useState(false);
  const visibleModules = showUnchanged
    ? modules
    : modules.filter((m) => m.changed);
  const showApps = apps.length > 0 && (showUnchanged || appsChanged);

  const legend = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className={`rounded-full border px-2 ${CHIP_STYLES.granted}`}>
            +
          </span>
          {t("admin.permission_audit.granted")} ({record.granted_count ?? 0})
        </span>
        <span className="flex items-center gap-1">
          <span className={`rounded-full border px-2 ${CHIP_STYLES.revoked}`}>
            −
          </span>
          {t("admin.permission_audit.revoked")} ({record.revoked_count ?? 0})
        </span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={showUnchanged}
          onChange={(e) => setShowUnchanged(e.target.checked)}
        />
        {t("admin.permission_audit.show_unchanged")}
      </label>
    </div>
  );

  return (
    <div className="space-y-3">
      {legend}

      {showApps && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="bg-gray-100 px-3 py-2 font-semibold text-gray-800">
            {t("admin.permission_audit.app_access")}
          </div>
          <div className="p-2">
            <PermissionChips items={apps} />
          </div>
        </div>
      )}

      {visibleModules.length === 0 && !showApps && (
        <p className="text-sm text-gray-500">
          {showUnchanged
            ? t("admin.permission_audit.no_permissions")
            : t("admin.permission_audit.no_module_changes")}
        </p>
      )}

      {visibleModules.map((module) => (
        <div
          key={module.key}
          className="overflow-hidden rounded-lg border border-gray-200"
        >
          <div className="bg-gray-100 px-3 py-2 font-semibold text-gray-800">
            {module.name}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="w-1/4 p-2 font-medium">
                  {t("admin.permission_audit.sub_screen")}
                </th>
                <th className="p-2 font-medium">
                  {t("admin.permission_audit.permissions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {module.screens.map((screen) => (
                <tr
                  key={screen.key}
                  className="border-t border-gray-100 align-top"
                >
                  <td className="p-2 text-gray-700">{screen.name}</td>
                  <td className="p-2">
                    <PermissionChips items={screen.permissions} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

/** A single company screen/column permission change. */
const SingleChange = ({ record }: { record: PermissionAuditRecord }) => {
  const { t } = useTranslation();
  const state = (active?: boolean | null) =>
    active === true
      ? t("admin.permission_audit.active")
      : active === false
        ? t("admin.permission_audit.inactive")
        : "-";
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-3">
      <Field label={t("admin.permission_audit.main_screen")}>
        {record.mainscreen_name ?? "-"}
      </Field>
      <Field label={t("admin.permission_audit.sub_screen")}>
        {record.userscreen_name ?? "-"}
      </Field>
      <Field label={t("admin.permission_audit.action")}>
        {record.userscreenaction_name ?? record.column_name ?? "-"}
      </Field>
      <Field label={t("admin.permission_audit.previous_state")}>
        {state(record.previous_is_active)}
      </Field>
      <Field label={t("admin.permission_audit.new_state")}>
        {state(record.is_active)}
      </Field>
    </div>
  );
};

export default function PermissionAuditDetail({
  record,
  onClose,
}: {
  record: PermissionAuditRecord | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isAccessSave = Boolean(
    record?.old_permissions || record?.new_permissions,
  );

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("admin.permission_audit.detail_title")}</DialogTitle>
        </DialogHeader>

        {record && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-4">
              <Field label={t("admin.permission_audit.source")}>
                {record.source_label ?? "-"}
              </Field>
              <Field label={t("admin.permission_audit.granted_to")}>
                {record.target_name ?? "-"}
              </Field>
              <Field label={t("admin.permission_audit.company")}>
                {record.company_name ?? "-"}
              </Field>
              <Field label={t("admin.permission_audit.project")}>
                {record.project_name ?? "-"}
              </Field>
              <Field label={t("admin.permission_audit.http_method")}>
                <MethodBadge method={record.http_method} />
              </Field>
              <Field label={t("admin.permission_audit.action_type")}>
                {record.action_type ?? "-"}
              </Field>
              <Field label={t("admin.permission_audit.updated_by")}>
                {record.updated_by_name ?? "-"}
              </Field>
              <Field label={t("admin.permission_audit.timestamp")}>
                {formatDateTime(record.timestamp)}
              </Field>
            </div>

            {isAccessSave ? (
              <AccessPermissions record={record} />
            ) : (
              <SingleChange record={record} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
