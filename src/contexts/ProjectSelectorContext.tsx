import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getStoredProjects, getStoredProfile } from "@/utils/authStorage";
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

  // Re-seed company/project state from localStorage. Needed after
  // login/logout since this provider lives above the router and isn't
  // remounted on navigation — only a hard refresh would otherwise pick up a
  // freshly persisted session.
  const reloadFromSession = useCallback(() => {
    const profile = getStoredProfile();
    const freshProjects = getStoredProjects();
    setCompanyIdState((profile?.company_unique_id as string) ?? "");
    setCompanyName((profile?.company_name as string) ?? "");
    setCompanies([]);
    setProjects(freshProjects);
    sessionStorage.removeItem(SESSION_KEY);
    setProjectIdState(resolveInitialProjectId(freshProjects));
  }, []);

  // ── For superadmin / empty stored list — fetch via API ─────────────────────
  useEffect(() => {
    if (getStoredProjects().length > 0) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Fetch all accessible companies
        const companyRecords = await companyApi.readAll();
        if (cancelled) return;
        const companyList: CompanyOption[] = (companyRecords as CompanyOption[]).map(
          (c) => ({ unique_id: c.unique_id, name: c.name })
        );
        setCompanies(companyList);

        // Use existing companyId or default to first company
        const targetCompany = companyId || companyList[0]?.unique_id || "";
        if (targetCompany && !companyId) setCompanyIdState(targetCompany);

        if (targetCompany) {
          const projectRecords = await (projectApi as any).readAll({
            params: { company_unique_id: targetCompany },
          });
          if (cancelled) return;
          const projectList: ProjectConfig[] = (projectRecords as any[]).map((p) => ({
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
          }));
          setProjects(projectList);
          setProjectIdState(resolveInitialProjectId(projectList));
        }
      } catch {
        // non-fatal — pages still work with env-var fallbacks
      } finally {
        if (!cancelled) setLoading(false);
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
      const projectList: ProjectConfig[] = (projectRecords as any[]).map((p) => ({
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
      }));
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

  // Only expose GPS values when the project has a GPS API URL configured.
  // If gps_api_url is empty the project has no GPS — return "" for every
  // GPS field so modules show "not configured" instead of falling back to
  // another project's (or the env-var) credentials.
  const hasGps = Boolean(gpsApiUrl);

  // gps_api_url in the project form is the vehicle HISTORY endpoint.
  // For tracking and trip summary the specific DB fields were removed from the form,
  // so we fall through env vars → Vamosys hardcoded defaults (same host, different paths).
  // Hardcoded defaults only apply when hasGps=true; non-GPS projects stay on "".
  const gpsVehicleHistoryApi = hasGps
    ? (selectedProject?.gps_vehicle_history_api ?? gpsApiUrl)
    : "";
  const gpsVehicleTrackingApi = hasGps
    ? (selectedProject?.gps_vehicle_tracking_api
        ?? import.meta.env.VITE_GPS_VEHICLE_TRACKING_API
        ?? "https://api.vamosys.com/mobile/getGrpDataForTrustedClients")
    : "";
  const gpsTripSummaryApi = hasGps
    ? (selectedProject?.gps_trip_summary_api
        ?? import.meta.env.VITE_GPS_TRIP_SUMMARY_API
        ?? "https://gpsvtsprobend.vamosys.com/v2/getTripSummary")
    : "";
  // Auth params — per-project values with hardcoded Vamosys defaults as last resort.
  // Hardcoded fallbacks are intentional: they are the only active GPS credentials and
  // the hasGps gate above already prevents non-GPS projects from reaching this path.
  const gpsUserId = hasGps ? (selectedProject?.gps_user_id ?? import.meta.env.VITE_GPS_USER_ID ?? "BLUEPLANET") : "";
  const gpsGroupName = hasGps ? (selectedProject?.gps_group_name ?? import.meta.env.VITE_GPS_GROUP_NAME ?? "BLUEPLANET:VAM") : "";
  const gpsProviderName = hasGps ? (selectedProject?.gps_provider_name ?? import.meta.env.VITE_GPS_PROVIDER_NAME ?? "BLUEPLANET") : "";
  const gpsFcode = hasGps ? (selectedProject?.gps_fcode ?? import.meta.env.VITE_GPS_FCODE ?? "VAM") : "";
  const gpsTripUserId = hasGps ? (selectedProject?.gps_trip_user_id ?? import.meta.env.VITE_GPS_TRIP_USER_ID ?? "NMCP2DISPOSAL") : "";

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
