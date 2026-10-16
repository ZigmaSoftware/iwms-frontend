import { useEffect, useState } from "react";
import { FormSelect } from "@/components/common/FormSelect";
import { FilterSection, type ActiveFilterChip } from "@/components/common/ListToolbar";
import type { FilterPart } from "@/components/filters/useOptionFilter";
import {
  useCompanyProjectSelection,
  type CompanyProjectOption,
} from "@/hooks/useCompanyProjectSelection";
import { setListCompanyProjectContext } from "@/utils/listQueryContext";

type Applied = {
  companyId: string;
  projectId: string;
  companyLabel: string;
  projectLabel: string;
};

const labelOf = (options: CompanyProjectOption[], value: string) =>
  options.find((option) => option.value === value)?.label || value;

/**
 * Company → Project filter for the list-page Filters panel (SafeDataTable
 * `filterPanel`). The panel's dropdowns are a draft; `apply()` commits them.
 *
 * Until the user applies something, the applied value follows the selection's
 * own defaults (a company user's own company, their only project …), so the
 * list opens narrowed exactly as it did with the old toolbar dropdowns.
 *
 * The applied pair is published as the list query context, so tables in
 * route-driven server mode pick it up without the page passing it on.
 *
 *   const cp = useCompanyProjectFilter(() => setFirst(0), { initialCompanyId, initialProjectId });
 *   params = { ...cp.applied, … }                 // company_id / project_id
 *   <DataTable filterPanel={combineFilters(cp, status)} … />
 */
export function useCompanyProjectFilter(
  onAppliedChange?: () => void,
  {
    initialCompanyId,
    initialProjectId,
    defaultToAll = true,
  }: {
    /** e.g. the company/project a form hands back via location.state */
    initialCompanyId?: string;
    initialProjectId?: string;
    /**
     * false: a company and project are always selected (the first ones by
     * default) — for lists that can't load without both. No "All" choice,
     * and their chips can't be removed.
     */
    defaultToAll?: boolean;
  } = {},
) {
  const selection = useCompanyProjectSelection({
    isEdit: false,
    initialCompanyId,
    initialProjectId,
    defaultToAll,
    publishContext: false,
  });
  const {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    showAllProjectsOption,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
  } = selection;

  // A project id is only meaningful once the current company's list holds it.
  const draftProjectId =
    projectId && projects.some((project) => project.value === projectId)
      ? projectId
      : "";
  const live: Applied = {
    companyId: companyUniqueId,
    projectId: draftProjectId,
    companyLabel: companyUniqueId ? labelOf(companies, companyUniqueId) : "",
    projectLabel: draftProjectId ? labelOf(projects, draftProjectId) : "",
  };

  // null: nothing applied by the user yet — follow the defaults (`live`).
  const [pinned, setPinned] = useState<Applied | null>(null);
  const applied = pinned ?? live;

  // Published during render for the same reason as useCompanyProjectSelection:
  // the table below reads it while rendering.
  setListCompanyProjectContext({
    companyId: applied.companyId,
    projectId: applied.projectId,
  });
  useEffect(
    () => () => setListCompanyProjectContext({ companyId: "", projectId: "" }),
    [],
  );

  // The first edit freezes what is applied, so a draft never leaks into the list.
  const freeze = () => {
    if (!pinned) setPinned(live);
  };

  const commit = (next: Applied) => {
    setPinned(next);
    if (next.companyId !== applied.companyId || next.projectId !== applied.projectId) {
      onAppliedChange?.();
    }
  };

  // Move the draft to `companyId` / `nextProjectId`. onCompanyChange clears and
  // reloads the project list, so it is only called when the company differs.
  const setDraft = (companyId: string, nextProjectId: string) => {
    if (companyId !== companyUniqueId) onCompanyChange(companyId);
    else setProjectId(nextProjectId);
  };

  const defaultCompanyId = isSuperAdmin
    ? defaultToAll
      ? ""
      : (companies[0]?.value ?? "")
    : loggedInCompanyUniqueId;
  const defaultProjectId = defaultToAll
    ? !isSuperAdmin && projects.length === 1
      ? projects[0].value
      : ""
    : (projects[0]?.value ?? "");

  const field = (
    <FilterSection label="Company & project">
      <div className="grid grid-cols-2 gap-2">
        <FormSelect
          label="Company"
          value={companyUniqueId}
          onChange={(value) => {
            freeze();
            onCompanyChange(value);
          }}
          options={companies}
          placeholder={isSuperAdmin && defaultToAll ? "All companies" : null}
          disabled={!isSuperAdmin || companies.length === 0}
        />
        <FormSelect
          label="Project"
          value={draftProjectId}
          onChange={(value) => {
            freeze();
            setProjectId(value);
          }}
          options={projects}
          placeholder={showAllProjectsOption && defaultToAll ? "All projects" : null}
          disabled={(!companyUniqueId && !isSuperAdmin) || projects.length === 0}
        />
      </div>
    </FilterSection>
  );

  const chips: ActiveFilterChip[] = [
    ...(applied.companyId
      ? [
          {
            key: "company_id",
            label: "Company",
            value: applied.companyLabel,
            // a company user can't leave their own company
            onRemove: isSuperAdmin && defaultToAll
              ? () => {
                  setDraft("", "");
                  commit({ companyId: "", projectId: "", companyLabel: "", projectLabel: "" });
                }
              : undefined,
          },
        ]
      : []),
    ...(applied.projectId
      ? [
          {
            key: "project_id",
            label: "Project",
            value: applied.projectLabel,
            onRemove: showAllProjectsOption && defaultToAll
              ? () => {
                  setDraft(applied.companyId, "");
                  commit({ ...applied, projectId: "", projectLabel: "" });
                }
              : undefined,
          },
        ]
      : []),
  ];

  return {
    /** applied company ("" for all) */
    companyId: applied.companyId,
    /** applied project ("" for all) */
    projectId: applied.projectId,
    /** applied pair as query params — spread into the API call */
    applied: {
      ...(applied.companyId ? { company_id: applied.companyId } : {}),
      ...(applied.projectId ? { project_id: applied.projectId } : {}),
    } as Record<string, string>,
    /** the underlying (draft) selection, for options lists etc. */
    selection,
    field,
    chips,
    count: chips.length,
    apply: () => commit(live),
    reset: () => {
      setDraft(defaultCompanyId, defaultProjectId);
      // back to following the defaults
      setPinned(null);
      if (applied.companyId !== defaultCompanyId || applied.projectId !== defaultProjectId) {
        onAppliedChange?.();
      }
    },
  } satisfies FilterPart & Record<string, unknown>;
}
