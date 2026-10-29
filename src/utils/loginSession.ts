import { isAxiosError } from "axios";
import { apiForPortal, type Portal } from "@/api";
import { sessionStore } from "@/utils/sessionStore";

/* --------------------------------------------------------
   Login session lifecycle (logout audit + idle timeout).

   The backend stamps logout time, logout type and used hours on the
   LoginAudit row behind the portal's auth cookie. The token itself is
   HttpOnly, so the session facts the browser needs (expiry, idle limit)
   come from the login / me response and are kept in memory per portal.
-------------------------------------------------------- */

export type LogoutReason = "manual" | "idle_timeout" | "token_expired";

export type SessionInfo = {
  /** Token expiry, epoch seconds. */
  exp?: number | null;
  login_audit_id?: string | null;
  /** Idle limit in seconds; null for sessions without one. */
  idle_timeout?: number | null;
};

/** The login / me response fields describing the session. */
export type SessionResponse = {
  expires_at?: number | null;
  login_audit_id?: string | null;
  idle_timeout_seconds?: number | null;
};

/** Fired when another tab ends a portal's session (detail: { portal }). */
export const SESSION_ENDED_EVENT = "iwms:session-ended";

/** Fallback when the session carries no idle limit. */
export const DEFAULT_IDLE_TIMEOUT_SECONDS = 40 * 60;

const LOGOUT_REQUEST_TIMEOUT_MS = 5000;

const sessionKey = (portal: Portal) => `${portal}__session`;
// Activity timestamps are not user data, so they stay in localStorage where
// every tab shares them: activity in any tab keeps the session alive.
const lastActivityKey = (portal: Portal) => `${portal}__last_activity`;
const lastHeartbeatKey = (portal: Portal) => `${portal}__last_heartbeat`;

const readNumber = (key: string): number | null => {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const writeNumber = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable — idle tracking degrades to per-tab */
  }
};

// Memory is per tab, so a logout is announced to the portal's other tabs.
const channel =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("iwms-auth") : null;

channel?.addEventListener("message", (event: MessageEvent<{ portal?: Portal }>) => {
  const portal = event.data?.portal;
  if (!portal) return;
  sessionStore.removeItem(sessionKey(portal));
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: { portal } }));
});

export const getSessionInfo = (portal: Portal): SessionInfo | null => {
  const raw = sessionStore.getItem(sessionKey(portal));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionInfo;
  } catch {
    return null;
  }
};

export const hasSession = (portal: Portal): boolean => getSessionInfo(portal) !== null;

export const getIdleTimeoutMs = (info: SessionInfo | null): number =>
  (info?.idle_timeout ?? DEFAULT_IDLE_TIMEOUT_SECONDS) * 1000;

export const getLastActivity = (portal: Portal): number | null =>
  readNumber(lastActivityKey(portal));

export const recordActivity = (portal: Portal, at = Date.now()) =>
  writeNumber(lastActivityKey(portal), at);

export const getLastHeartbeat = (portal: Portal): number | null =>
  readNumber(lastHeartbeatKey(portal));

export const markHeartbeat = (portal: Portal, at = Date.now()) =>
  writeNumber(lastHeartbeatKey(portal), at);

/** Remember the session's facts (after login, or after a reload's restore). */
export const setSessionInfo = (portal: Portal, response: SessionResponse) => {
  const info: SessionInfo = {
    exp: response.expires_at ?? null,
    login_audit_id: response.login_audit_id ?? null,
    idle_timeout: response.idle_timeout_seconds ?? null,
  };
  sessionStore.setItem(sessionKey(portal), JSON.stringify(info));
};

/** Call right after a successful login. */
export const startLoginSession = (portal: Portal, response: SessionResponse) => {
  setSessionInfo(portal, response);
  recordActivity(portal);
  markHeartbeat(portal);
};

/** Forget the portal's session here and in the portal's other tabs. */
export const clearLoginSessionTracking = (portal: Portal) => {
  const hadSession = hasSession(portal);
  sessionStore.removeItem(sessionKey(portal));
  try {
    localStorage.removeItem(lastActivityKey(portal));
    localStorage.removeItem(lastHeartbeatKey(portal));
  } catch {
    /* ignore */
  }
  if (hadSession) channel?.postMessage({ portal });
};

/**
 * Tell the backend this session ended so the logout date/time and used hours
 * are audited, and so it drops the auth cookie. Never throws: the caller
 * always clears the in-memory session after.
 */
export const endLoginSession = async (
  portal: Portal,
  reason: LogoutReason = "manual",
): Promise<void> => {
  const lastActivity = getLastActivity(portal);
  clearLoginSessionTracking(portal);
  try {
    await apiForPortal(portal).post(
      "/login/logout/",
      {
        reason,
        last_activity_at: lastActivity ? new Date(lastActivity).toISOString() : null,
      },
      { timeout: LOGOUT_REQUEST_TIMEOUT_MS, silent: true },
    );
  } catch (error) {
    console.warn("[Session] Logout audit request failed:", error);
  }
};

/**
 * Report user activity to the backend. Resolves to false when the server
 * says the session has already ended (logged out elsewhere / idle).
 */
export const sendSessionHeartbeat = async (portal: Portal): Promise<boolean> => {
  if (!hasSession(portal)) return false;
  const lastActivity = getLastActivity(portal);
  markHeartbeat(portal);
  try {
    await apiForPortal(portal).post(
      "/login/heartbeat/",
      { last_activity_at: lastActivity ? new Date(lastActivity).toISOString() : null },
      // Background ping: never block the screen for it.
      { silent: true },
    );
    return true;
  } catch (error) {
    // Network hiccups must not log the user out; only an explicit 401 does.
    return !(isAxiosError(error) && error.response?.status === 401);
  }
};
