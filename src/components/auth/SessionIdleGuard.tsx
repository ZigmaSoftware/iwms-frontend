import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { ACCESS_TOKEN_STORAGE_KEY, clearAuthSession } from "@/utils/authStorage";
import { useIdleLogout, type SessionEndCause } from "@/hooks/useIdleLogout";

// The leader portals keep their own tokens and run their own guard.
const UNGUARDED_PREFIXES = ["/auth", "/localbody", "/district"];

const SESSION_END_MESSAGES: Partial<Record<SessionEndCause, string>> = {
  idle_timeout: "You were logged out automatically due to inactivity. Please sign in again.",
  token_expired: "Your session has expired. Please sign in again.",
  ended: "Your session has ended. Please sign in again.",
};

/** Auto-logout for the main (admin / dashboard) app session. */
export default function SessionIdleGuard() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const onSessionEnd = useCallback(
    (cause: SessionEndCause) => {
      clearAuthSession();
      setUser(null);
      if (UNGUARDED_PREFIXES.some((p) => window.location.pathname.startsWith(p))) return;
      navigate("/auth", {
        replace: true,
        state: { sessionMessage: SESSION_END_MESSAGES[cause] },
      });
    },
    [navigate, setUser],
  );

  useIdleLogout({ tokenKey: ACCESS_TOKEN_STORAGE_KEY, onSessionEnd });
  return null;
}
