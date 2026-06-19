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
  const profile = getStoredProfile();
  const storedProjects = getStoredProjects();

  // Company state — seeded from the user's login profile
  const [companyId, setCompanyIdState] = useState<string>(
    () => (profile?.company_unique_id as string) ?? ""
  );
  const [companyName, setCompanyName] = useState<string>(
    () => (profile?.company_name as string) ?? ""
  );
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  // Project state — seeded from the login response projects list
  const [projects, setProjects] = useState<ProjectConfig[]>(storedProjects);
  const [projectId, setProjectIdState] = useState<string>(() =>
    resolveInitialProjectId(storedProjects)
  );
  const [loading, setLoading] = useState(false);

  // ── For superadmin / empty stored list — fetch via API ─────────────────────
  useEffect(() => {
    if (storedProjects.length > 0) return;

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
  const gpsVehicleHistoryApi = selectedProject?.gps_vehicle_history_api ?? import.meta.env.VITE_GPS_VEHICLE_HISTORY_API ?? "";
  const gpsVehicleTrackingApi = selectedProject?.gps_vehicle_tracking_api ?? import.meta.env.VITE_GPS_VEHICLE_TRACKING_API ?? "";
  const gpsTripSummaryApi = selectedProject?.gps_trip_summary_api ?? import.meta.env.VITE_GPS_TRIP_SUMMARY_API ?? "";
  const gpsUserId = selectedProject?.gps_user_id ?? import.meta.env.VITE_GPS_USER_ID ?? "BLUEPLANET";
  const gpsGroupName = selectedProject?.gps_group_name ?? import.meta.env.VITE_GPS_GROUP_NAME ?? "BLUEPLANET:VAM";
  const gpsProviderName = selectedProject?.gps_provider_name ?? import.meta.env.VITE_GPS_PROVIDER_NAME ?? "BLUEPLANET";
  const gpsFcode = selectedProject?.gps_fcode ?? import.meta.env.VITE_GPS_FCODE ?? "VAM";
  const gpsTripUserId = selectedProject?.gps_trip_user_id ?? import.meta.env.VITE_GPS_TRIP_USER_ID ?? "NMCP2DISPOSAL";
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
