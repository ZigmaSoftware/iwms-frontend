import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Swal from "@/lib/notify";
import { adminApi } from "@/helpers/admin/registry";
import { normalizeList } from "@/utils/forms";
import type { LoginAuditRecord } from "./types";

type Params = {
  companyUniqueId?: string | null;
  projectId?: string | null;
  sessionState?: string;
  isSuperAdmin: boolean;
};

/** Loads login audit rows for the selected company / project / logout type. */
export function useLoginAudits({ companyUniqueId, projectId, sessionState, isSuperAdmin }: Params) {
  const { t } = useTranslation();
  // Non-superadmins see nothing until a company is selected.
  const enabled = Boolean(companyUniqueId) || isSuperAdmin;

  const params = useMemo(() => {
    const next: Record<string, string> = {};
    if (companyUniqueId) next.company_id = companyUniqueId;
    if (projectId) next.project_id = projectId;
    if (sessionState) next.session_state = sessionState;
    return next;
  }, [companyUniqueId, projectId, sessionState]);
  const requestKey = JSON.stringify(params);

  // Rows tagged with the request they answer: still loading while the tag
  // doesn't match the current filters.
  const [result, setResult] = useState<{ key: string; rows: LoginAuditRecord[] } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    adminApi.loginAudits
      .readAll({ params })
      .then((data: LoginAuditRecord[]) => {
        if (mounted) setResult({ key: requestKey, rows: normalizeList(data) as LoginAuditRecord[] });
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setResult({ key: requestKey, rows: [] });
        Swal.fire(t("common.error"), String(err), "error");
      });

    return () => {
      mounted = false;
    };
  }, [enabled, params, requestKey, t]);

  return {
    rows: enabled ? result?.rows ?? [] : [],
    isLoading: enabled && result?.key !== requestKey,
  };
}
