import { useProjectSelector } from "@/contexts/ProjectSelectorContext";
import { Building2, FolderOpen } from "lucide-react";

/**
 * Compact company + project filter bar.
 * Drop this at the top of any dashboard or report page.
 * It reads/writes from ProjectSelectorContext — no props needed.
 */
export function ProjectSelectorBar() {
  const {
    companyId,
    companyName,
    companies,
    setCompanyId,
    projectId,
    projects,
    setProjectId,
    loading,
  } = useProjectSelector();

  // When the company list hasn't been fetched (regular, non-superadmin users),
  // fall back to the single company from the login profile so the select has
  // a matching <option> instead of defaulting to "All Companies".
  const companyOptions =
    companies.length > 0 ? companies : companyId ? [{ unique_id: companyId, name: companyName }] : [];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/70 px-4 py-2.5 backdrop-blur-sm shadow-sm mb-4">
      {/* Company */}
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px]"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          disabled={loading || companyOptions.length <= 1}
        >
          {companies.length > 1 && <option value="">All Companies</option>}
          {companyOptions.map((c) => (
            <option key={c.unique_id} value={c.unique_id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <span className="text-muted-foreground/40 hidden sm:block">|</span>

      {/* Project */}
      <div className="flex items-center gap-2 min-w-0">
        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[140px]"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={loading || projects.length <= 1}
        >
          {projects.map((p) => (
            <option key={p.unique_id} value={p.unique_id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <span className="ml-auto text-xs text-muted-foreground animate-pulse">
          Loading…
        </span>
      )}
    </div>
  );
}
