import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getStoredProjects, getStoredProfile, isAccessTokenValid } from "@/utils/authStorage";
import type { ProjectConfig } from "@/utils/authStorage";
import { projectApi, companyApi } from "@/helpers/admin";

const SESSION_KEY = "ps_project_id";

type CompanyOption = { unique_id: string; name: string };

interface ProjectSelectorContextValue {
  /* company */
  companyId: string;
  companyName: string;
  companies: CompanyOption[];
  setCompanyId: (id: string) => void;

  /* project */
  projectId: string;
  projects: ProjectConfig[];
  selectedProject: ProjectConfig | null;
  setProjectId: (id: string) => void;

  /* re-seed company/project state from localStorage after login/logout,
     since the provider is mounted once at the app root and won't otherwise
     pick up a freshly persisted session without a full page reload */
  reloadFromSession: () => void;

  /* resolved API URLs (project-specific, env-fallback) */
  gpsApiUrl: string;
  gpsVehicleHistoryApi: string;
  gpsVehicleTrackingApi: string;
  gpsTripSummaryApi: string;
  gpsUserId: string;
  gpsGroupName: string;
  gpsProviderName: string;
  gpsFcode: string;
  gpsTripUserId: string;
  weighmentApiUrl: string;
  dayWiseWeighmentApiUrl: string;

  /* loading state for async fetch */
  loading: boolean;
}

const ProjectSelectorContext = createContext<ProjectSelectorContextValue | null>(null);

export function useProjectSelector(): ProjectSelectorContextValue {
  const ctx = useContext(ProjectSelectorContext);
  if (!ctx) throw new Error("useProjectSelector must be used inside ProjectSelectorProvider");
  return ctx;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveInitialProjectId(projects: ProjectConfig[]): string {
  const saved = sessionStorage.getItem(SESSION_KEY) ?? "";
  if (saved && projects.some((p) => p.unique_id === saved)) return saved;
  return projects[0]?.unique_id ?? "";
}

function mapProjectRecord(p: any): ProjectConfig {
  return {
    unique_id: p.unique_id,
    name: p.name,
    gps_api_url: p.gps_api_url ?? null,
    gps_vehicle_history_api: p.gps_vehicle_history_api ?? null,
    gps_vehicle_tracking_api: p.gps_vehicle_tracking_api ?? null,
    gps_trip_summary_api: p.gps_trip_summary_api ?? null,
    gps_user_id: p.gps_user_id ?? null,
    gps_group_name: p.gps_group_name ?? null,
    gps_provider_name: p.gps_provider_name ?? null,
    gps_fcode: p.gps_fcode ?? null,
    gps_trip_user_id: p.gps_trip_user_id ?? null,
    weighment_api_url: p.weighment_api_url ?? null,
    day_wise_weighment_api_url: p.day_wise_weighment_api_url ?? null,
  };
}

// ─── provider ────────────────────────────────────────────────────────────────

export function ProjectSelectorProvider({ children }: { children: ReactNode }) {
  // Company state — seeded from the user's login profile
  const [companyId, setCompanyIdState] = useState<string>(
    () => (getStoredProfile()?.company_unique_id as string) ?? ""
  );
  const [companyName, setCompanyName] = useState<string>(
    () => (getStoredProfile()?.company_name as string) ?? ""
  );
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  // Project state — seeded from the login response projects list. For a
  // regular (non-superadmin) login this is already scoped server-side to the
  // user's own company, so it's used as-is.
  const [projects, setProjects] = useState<ProjectConfig[]>(() => getStoredProjects());
  const [projectId, setProjectIdState] = useState<string>(() =>
    resolveInitialProjectId(getStoredProjects())
  );
  const [loading, setLoading] = useState(false);

  // ── For superadmin / empty stored list — fetch via API ─────────────────────
  // Extracted so it can be re-run both on provider mount and after
  // reloadFromSession() (post-login), since the provider lives above the
  // router and isn't remounted on navigation.
  const fetchCompaniesAndProjects = useCallback(async (currentCompanyId: string) => {
    setLoading(true);

    try {
      // Fetch all accessible companies
      const companyRecords = await companyApi.readAll();
      const companyList: CompanyOption[] = (companyRecords as CompanyOption[]).map(
        (c) => ({ unique_id: c.unique_id, name: c.name })
      );
      setCompanies(companyList);

      // Use existing companyId or default to first company
      const targetCompany = currentCompanyId || companyList[0]?.unique_id || "";
      if (targetCompany && !currentCompanyId) setCompanyIdState(targetCompany);

      if (targetCompany) {
        const projectRecords = await (projectApi as any).readAll({
          params: { company_unique_id: targetCompany },
        });
        const projectList: ProjectConfig[] = (projectRecords as any[]).map(mapProjectRecord);
        setProjects(projectList);
        setProjectIdState(resolveInitialProjectId(projectList));
      }
    } catch {
      // non-fatal — pages still work with env-var fallbacks
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-seed company/project state from localStorage. Needed after
  // login/logout since this provider lives above the router and isn't
  // remounted on navigation — only a hard refresh would otherwise pick up a
  // freshly persisted session.
  const reloadFromSession = useCallback(() => {
    const profile = getStoredProfile();
    const freshProjects = getStoredProjects();
    const freshCompanyId = (profile?.company_unique_id as string) ?? "";
    setCompanyIdState(freshCompanyId);
    setCompanyName((profile?.company_name as string) ?? "");
    setCompanies([]);
    setProjects(freshProjects);
    sessionStorage.removeItem(SESSION_KEY);
    setProjectIdState(resolveInitialProjectId(freshProjects));

    // Superadmin logins (and any session with nothing cached) still need
    // the company/project lists fetched — the mount-time effect below only
    // ever runs once, so without this the dropdowns stay empty until a
    // hard refresh.
    if (freshProjects.length === 0) {
      fetchCompaniesAndProjects(freshCompanyId);
    }
  }, [fetchCompaniesAndProjects]);

  useEffect(() => {
    if (getStoredProjects().length > 0) return;
    // Guard against firing before the access token is committed to storage
    // (e.g. landing here right after a redirect) — an unguarded call here
    // races the axios interceptor and goes out with no Authorization header,
    // 401ing the very first company/project fetch of the session.
    if (!isAccessTokenValid()) return;
    fetchCompaniesAndProjects(companyId);
  }, []);

  // ── For staff/company logins — the projects list is seeded once from the
  // login response and never refetched, so edits a superadmin makes to a
  // project's API config (e.g. day_wise_weighment_api_url) after this user
  // logged in would stay invisible until they log out and back in. Refresh
  // each stored project from the backend on mount to pick up such edits. ───
  useEffect(() => {
    const stored = getStoredProjects();
    if (stored.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const fresh = await Promise.all(
          stored.map((p) => (projectApi as any).read(p.unique_id).catch(() => null))
        );
        if (cancelled) return;
        const refreshed = fresh.map((record, i) =>
          record ? mapProjectRecord(record) : stored[i]
        );
        setProjects(refreshed);
      } catch {
        // non-fatal — keep the cached snapshot
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── When company changes (superadmin switching) — reload projects ──────────
  const setCompanyId = useCallback(async (id: string) => {
    const matched = companies.find((c) => c.unique_id === id);
    setCompanyIdState(id);
    setCompanyName(matched?.name ?? "");

    if (!id) return;
    try {
      setLoading(true);
      const projectRecords = await (projectApi as any).readAll({
        params: { company_unique_id: id },
      });
      const projectList: ProjectConfig[] = (projectRecords as any[]).map(mapProjectRecord);
      setProjects(projectList);
      const newProjectId = resolveInitialProjectId(projectList);
      setProjectIdState(newProjectId);
      sessionStorage.setItem(SESSION_KEY, newProjectId);
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, [companies]);

  const setProjectId = useCallback((id: string) => {
    setProjectIdState(id);
    sessionStorage.setItem(SESSION_KEY, id);
  }, []);

  const selectedProject = projects.find((p) => p.unique_id === projectId) ?? null;

  const gpsApiUrl = selectedProject?.gps_api_url ?? "";

  // Each GPS URL is strictly per-project and independent of the others: if a
  // project hasn't set gps_vehicle_tracking_api, gpsVehicleTrackingApi is ""
  // — no falling back to another field, another project, or an env var/
  // hardcoded default. gpsVehicleHistoryApi is the one exception: the
  // legacy gps_api_url field WAS the history endpoint before the dedicated
  // field existed, so it still serves as history's fallback for projects
  // set up before that field was added.
  const gpsVehicleHistoryApi = selectedProject?.gps_vehicle_history_api || gpsApiUrl;
  const gpsVehicleTrackingApi = selectedProject?.gps_vehicle_tracking_api ?? "";
  const gpsTripSummaryApi = selectedProject?.gps_trip_summary_api ?? "";

  // Auth params are shared across whichever GPS endpoints this project has
  // configured — exposed whenever any GPS URL above is set, purely from the
  // project's own record, with model defaults only (no env/hardcoded).
  const hasAnyGps = Boolean(gpsVehicleHistoryApi || gpsVehicleTrackingApi || gpsTripSummaryApi);
  const gpsUserId = hasAnyGps ? (selectedProject?.gps_user_id ?? "") : "";
  const gpsGroupName = hasAnyGps ? (selectedProject?.gps_group_name ?? "") : "";
  const gpsProviderName = hasAnyGps ? (selectedProject?.gps_provider_name ?? "") : "";
  const gpsFcode = hasAnyGps ? (selectedProject?.gps_fcode ?? "") : "";
  const gpsTripUserId = hasAnyGps ? (selectedProject?.gps_trip_user_id ?? "") : "";

  const weighmentApiUrl = selectedProject?.weighment_api_url ?? "";
  const dayWiseWeighmentApiUrl = selectedProject?.day_wise_weighment_api_url ?? "";

  return (
    <ProjectSelectorContext.Provider
      value={{
        companyId,
        companyName,
        companies,
        setCompanyId,
        projectId,
        projects,
        selectedProject,
        setProjectId,
        reloadFromSession,
        gpsApiUrl,
        gpsVehicleHistoryApi,
        gpsVehicleTrackingApi,
        gpsTripSummaryApi,
        gpsUserId,
        gpsGroupName,
        gpsProviderName,
        gpsFcode,
        gpsTripUserId,
        weighmentApiUrl,
        dayWiseWeighmentApiUrl,
        loading,
      }}
    >
      {children}
    </ProjectSelectorContext.Provider>
  );
}
