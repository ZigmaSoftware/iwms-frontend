import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getEncryptedRoute } from "@/utils/routeCache";
import { createCrudRoutePaths } from "@/utils/routePaths";
import MasterList from "@/pages/admin/modules/core_modules/complaintManagement/masters/MasterList";
import MasterForm from "@/pages/admin/modules/core_modules/complaintManagement/masters/MasterForm";
import {
  COMPLAINT_TYPE_KINDS,
  COMPLAINT_TYPE_TAB_META,
  MASTER_CONFIG,
  type ComplaintTypeKind,
} from "@/pages/admin/modules/core_modules/complaintManagement/masters/masterConfig";

type Props = {
  /** Which of the 3 tabs this route resolved to. */
  kind: ComplaintTypeKind;
  /** Render the tab's form (Add/Edit) instead of its list. */
  mode?: "list" | "form";
};

/**
 * SUPER ADMIN — "Complaint Types": the whole complaint configuration module.
 *
 * Three tabs over the three tables that define a complaint type — Category,
 * Sub Category, SLA — which used to be separate sidebar entries under CORE
 * MODULES. That buried the dependency order (a sub-category needs its
 * category, an SLA needs both) and let a company-scoped admin edit global
 * configuration.
 *
 * The tables have no company/project FK, so they are served by the
 * superadmin-only `complaint-masters` module. Their `complaint-ticket` twins
 * stay readable for the Desk's dropdowns but are view-only in the middleware.
 *
 * Each tab reuses the existing `MasterList` / `MasterForm` engine, passing
 * `moduleSegment` so Add/Edit/Cancel navigate to the writable routes.
 */
export default function ComplaintTypesScreen({ kind, mode = "list" }: Props) {
  const navigate = useNavigate();
  const routes = getEncryptedRoute();
  const { id } = useParams();

  const moduleSegment = routes.encComplaintMastersModule;

  const tabPath = useMemo(
    () => (target: ComplaintTypeKind) =>
      createCrudRoutePaths(moduleSegment, routes[MASTER_CONFIG[target].routeKey]).listPath,
    [moduleSegment, routes],
  );

  // On an Add/Edit route the tab strip stays visible for orientation, but
  // switching tabs mid-edit would silently discard the form, so the other
  // tabs are disabled until the user saves or cancels.
  const isEditing = mode === "form";

  return (
    <div>
      <div className="px-3 pt-3">
        <h1 className="text-2xl font-semibold text-gray-800">Complaint Types</h1>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 px-3">
        {COMPLAINT_TYPE_KINDS.map((tabKind) => {
          const active = tabKind === kind;
          return (
            <button
              key={tabKind}
              type="button"
              disabled={isEditing && !active}
              onClick={() => !active && navigate(tabPath(tabKind))}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-green-600 text-white"
                  : isEditing
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200")
              }
            >
              {COMPLAINT_TYPE_TAB_META[tabKind].label}
            </button>
          );
        })}
      </div>

      {isEditing ? (
        <MasterForm key={`${kind}-${id ?? "new"}`} kind={kind} moduleSegment={moduleSegment} />
      ) : (
        <MasterList kind={kind} moduleSegment={moduleSegment} hideHeading />
      )}
    </div>
  );
}
