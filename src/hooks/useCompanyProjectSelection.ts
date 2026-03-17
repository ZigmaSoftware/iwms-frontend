import { useCallback, useEffect, useMemo, useState } from "react";
import { companyApi, projectApi } from "@/helpers/admin";
import { getCurrentCompanyUniqueId } from "@/utils/projectContext";
import { USER_ROLE_STORAGE_KEY, normalizeRole } from "@/types/roles";

export type CompanyProjectOption = {
  value: string;
  label: string;
};

type LoginProfile = {
  role?: string;
  company_name?: string;
  company?: {
    name?: string;
  };
};

type UseCompanyProjectSelectionArgs = {
  isEdit: boolean;
};

const toStringId = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toRecordList = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item)
    );
  }

  if (value && typeof value === "object") {
    const maybeResults = (value as { results?: unknown }).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults.filter(
        (item): item is Record<string, unknown> =>
          !!item && typeof item === "object" && !Array.isArray(item)
      );
    }
  }

  return [];
};

const readLoginProfile = (): LoginProfile | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("profile");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LoginProfile;
  } catch {
    return null;
  }
};

export const useCompanyProjectSelection = ({
  isEdit,
}: UseCompanyProjectSelectionArgs) => {
  const [companyUniqueId, setCompanyUniqueId] = useState(
    () => getCurrentCompanyUniqueId() ?? ""
  );
  const [projectId, setProjectId] = useState("");
  const [apiCompanies, setApiCompanies] = useState<CompanyProjectOption[]>([]);
  const [projects, setProjects] = useState<CompanyProjectOption[]>([]);
  const [resolvedLoggedInCompanyLabel, setResolvedLoggedInCompanyLabel] =
    useState("");

  const profile = useMemo(() => readLoginProfile(), []);
  const loggedInCompanyUniqueId = useMemo(() => getCurrentCompanyUniqueId(), []);
  
  const isSuperAdmin = useMemo(() => {
    if (typeof window === "undefined") return false;

    const roleFromStorage = normalizeRole(
      localStorage.getItem(USER_ROLE_STORAGE_KEY)
    );
    const roleFromProfile = normalizeRole(profile?.role);
    return (roleFromStorage ?? roleFromProfile) === "superadmin";
  }, [profile]);

  const profileCompanyLabel = useMemo(() => {
    const directName =
      typeof profile?.company_name === "string"
        ? profile.company_name.trim()
        : "";
    const nestedName =
      typeof profile?.company?.name === "string"
        ? profile.company.name.trim()
        : "";

    return directName || nestedName || "";
  }, [profile]);

  useEffect(() => {
    if (!loggedInCompanyUniqueId || profileCompanyLabel) {
      return;
    }

    let active = true;

    companyApi
      .get(loggedInCompanyUniqueId)
      .then((company) => {
        if (!active) return;

        const name =
          (typeof company?.name === "string" && company.name.trim()) ||
          (typeof company?.company_name === "string" &&
            company.company_name.trim()) ||
          "";

        setResolvedLoggedInCompanyLabel(name);
      })
      .catch(() => {
        if (!active) return;
        setResolvedLoggedInCompanyLabel("");
      });

    return () => {
      active = false;
    };
  }, [loggedInCompanyUniqueId, profileCompanyLabel]);

  const loggedInCompanyLabel = useMemo(() => {
    return (
      profileCompanyLabel ||
      resolvedLoggedInCompanyLabel ||
      loggedInCompanyUniqueId ||
      ""
    );
  }, [
    profileCompanyLabel,
    resolvedLoggedInCompanyLabel,
    loggedInCompanyUniqueId,
  ]);

  const companies = useMemo<CompanyProjectOption[]>(() => {
    if (loggedInCompanyUniqueId) {
      return [
        {
          value: loggedInCompanyUniqueId,
          label: loggedInCompanyLabel,
        },
      ];
    }

    if (!isSuperAdmin) {
      return [];
    }

    return apiCompanies;
  }, [
    apiCompanies,
    isSuperAdmin,
    loggedInCompanyLabel,
    loggedInCompanyUniqueId,
  ]);

  useEffect(() => {
    if (loggedInCompanyUniqueId || !isSuperAdmin) {
      return;
    }

    companyApi
      .list()
      .then((res) => {
        const options: CompanyProjectOption[] = toRecordList(res).map((x) => ({
          value: toStringId(x.unique_id),
          label: String(x.name ?? ""),
        }));

        setApiCompanies(options);
        if (!isEdit && options.length > 0) {
          setCompanyUniqueId((prev) => prev || options[0].value);
        }
      })
      .catch(() => {
        setApiCompanies([]);
      });
  }, [isEdit, isSuperAdmin, loggedInCompanyUniqueId]);

  useEffect(() => {
    if (!companyUniqueId) {
      return;
    }

    projectApi
      .list({ params: { company_unique_id: companyUniqueId } })
      .then((res) => {
        const options: CompanyProjectOption[] = toRecordList(res).map((x) => ({
          value: toStringId(x.unique_id),
          label: String(x.name ?? ""),
        }));

        setProjects(options);

        if (options.length === 0) {
          setProjectId("");
          return;
        }

        setProjectId((prev) => {
          if (prev && options.some((option) => option.value === prev)) {
            return prev;
          }
          return options[0].value;
        });
      })
      .catch(() => {
        setProjects([]);
        setProjectId("");
      });
  }, [companyUniqueId]);

  const onCompanyChange = useCallback((value: string) => {
    setCompanyUniqueId(value);
    setProjects([]);
    setProjectId("");
  }, []);

  const applyCompanyProjectFromRecord = useCallback(
    (record: Record<string, unknown>) => {
      const companyCandidate =
        record.company_unique_id ??
        record.company_id ??
        ((record.company as Record<string, unknown> | undefined)?.unique_id ??
          null);
      const projectCandidate =
        record.project_id ??
        record.project_unique_id ??
        ((record.project as Record<string, unknown> | undefined)?.unique_id ??
          null);

      const recordCompanyId = toStringId(companyCandidate);
      if (recordCompanyId && !loggedInCompanyUniqueId) {
        setCompanyUniqueId(recordCompanyId);
      }

      setProjectId(toStringId(projectCandidate));
    },
    [loggedInCompanyUniqueId]
  );

  return {
    companyUniqueId,
    projectId,
    projects,
    companies,
    isSuperAdmin,
    loggedInCompanyUniqueId,
    setProjectId,
    onCompanyChange,
    applyCompanyProjectFromRecord,
  };
};
