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
    <div className="min-h-full bg-gray-50/60 px-3 py-4 sm:px-5">
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                <i className="pi pi-sitemap" />
              </span>
              Complaint setup
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Complaint Types</h1>
            <p className="mt-1 text-sm text-gray-500">
              Define the categories, subcategories, and service-level rules used by complaint workflows.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
        {COMPLAINT_TYPE_KINDS.map((tabKind) => {
          const active = tabKind === kind;
          return (
            <button
              key={tabKind}
              type="button"
              disabled={isEditing && !active}
              onClick={() => !active && navigate(tabPath(tabKind))}
              className={
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "bg-emerald-600 text-white shadow-sm"
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
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <MasterList kind={kind} moduleSegment={moduleSegment} hideHeading />
        </div>
      )}
    </div>
  );
}
