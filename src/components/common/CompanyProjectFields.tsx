import { FormSelect } from "@/components/common/FormSelect";
import type { CompanyProjectOption } from "@/hooks/useCompanyProjectSelection";

export interface CompanyProjectFieldsProps {
  /** Everything below comes straight from `useCompanyProjectSelection`. */
  companyUniqueId: string;
  projectId: string;
  companies: CompanyProjectOption[];
  projects: CompanyProjectOption[];
  isSuperAdmin: boolean;
  loggedInCompanyUniqueId?: string | null;
  onCompanyChange: (value: string) => void;
  setProjectId: (value: string) => void;
  companyLabel?: string;
  projectLabel?: string;
}

/**
 * The Company + Project pair every company-scoped create/edit form needs.
 *
 * Extracted from `WasteTypeForm`, which had the canonical ~70 lines of it
 * inline. Each form that grew its own copy also grew its own subtly different
 * disabled rules and placeholder text, so the same login could see the
 * company preselected on one screen and blank on another. One component keeps
 * those rules in a single place:
 *
 *   - A login mapped to a company has it preselected and locked — tenancy is
 *     not theirs to change.
 *   - Only a super admin may pick a company; anyone else unmapped is told so
 *     rather than shown an empty dropdown with no explanation.
 *   - Project stays disabled until a company is chosen, since the project list
 *     is derived from it.
 */
export function CompanyProjectFields({
  companyUniqueId,
  projectId,
  companies,
  projects,
  isSuperAdmin,
  loggedInCompanyUniqueId,
  onCompanyChange,
  setProjectId,
  companyLabel = "Company",
  projectLabel = "Project",
}: CompanyProjectFieldsProps) {
  const companyDisabled =
    Boolean(loggedInCompanyUniqueId) ||
    (!isSuperAdmin && !loggedInCompanyUniqueId) ||
    companies.length === 0;

  return (
    <>
      <div>
        <FormSelect
          label={companyLabel}
          required
          value={companyUniqueId}
          onChange={onCompanyChange}
          options={companies}
          disabled={companyDisabled}
          placeholder={
            loggedInCompanyUniqueId
              ? "Company from logged-in profile"
              : isSuperAdmin
                ? "Select Company"
                : "Only super admin can select company"
          }
        />
        {!loggedInCompanyUniqueId && !isSuperAdmin && (
          <p className="mt-1 text-xs text-red-500">
            Company is not mapped to this login. Only super admin can view all companies.
          </p>
        )}
      </div>

      <div>
        <FormSelect
          label={projectLabel}
          required
          value={projectId}
          onChange={setProjectId}
          options={projects}
          disabled={!companyUniqueId || projects.length === 0}
          placeholder="Select Project"
        />
        {companyUniqueId && projects.length === 0 && (
          <p className="mt-1 text-xs text-red-500">No projects found for this company.</p>
        )}
      </div>
    </>
  );
}

export default CompanyProjectFields;
