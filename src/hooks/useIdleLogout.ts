import { useEffect, useRef } from "react";
import {
  endLoginSession,
  getIdleTimeoutMs,
  getLastActivity,
  getLastHeartbeat,
  readSessionClaims,
  recordActivity,
  sendSessionHeartbeat,
  type LogoutReason,
} from "@/utils/loginSession";

/** Fired by the API client on any 401 so the guard can confirm the session. */
export const SESSION_UNAUTHORIZED_EVENT = "auth:unauthorized";

// Only real user input counts as activity. Background polling (dashboards,
// live tracking) calls the API every few seconds and would otherwise keep an
// abandoned session alive forever.
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const;

const ACTIVITY_WRITE_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 15_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const FORCED_CHECK_THROTTLE_MS = 10_000;

/**
 * "ended"      = the server says the session is already closed.
 * "logged_out" = the token was removed (logout in this or another tab).
 */
export type SessionEndCause = LogoutReason | "ended" | "logged_out";

type Options = {
  /** localStorage key holding this portal's access token. */
  tokenKey: string;
  /** Clear the portal's storage and leave the page. */
  onSessionEnd: (cause: SessionEndCause) => void;
};

/**
 * Auto-logout after the idle limit carried in the token (`idle_timeout`
 * claim, 40 min by default), audit the logout on the backend, and keep the
 * backend's last-activity in step through heartbeats.
 */
export function useIdleLogout({ tokenKey, onSessionEnd }: Options) {
  const onSessionEndRef = useRef(onSessionEnd);
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  useEffect(() => {
    let busy = false;
    let lastWrite = 0;
    let lastForcedCheck = 0;
    let trackedToken = localStorage.getItem(tokenKey);

    // Stays mounted across logins: after a session ends, tracking resets and
    // picks up the next token that appears.
    const finish = (cause: SessionEndCause) => {
      trackedToken = null;
      busy = false;
      onSessionEndRef.current(cause);
    };

    const expire = async (reason: LogoutReason) => {
      if (busy) return;
      busy = true;
      await endLoginSession(tokenKey, reason);
      finish(reason);
    };

    const verifyWithServer = () => {
      void sendSessionHeartbeat(tokenKey).then((alive) => {
        if (!alive && !busy && localStorage.getItem(tokenKey)) finish("ended");
      });
    };

    const check = () => {
      if (busy) return;
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        if (trackedToken) finish("logged_out");
        return;
      }
      trackedToken = token;

      const now = Date.now();
      const { exp } = readSessionClaims(token);
      if (exp && exp * 1000 <= now) {
        void expire("token_expired");
        return;
      }

      const lastActivity = getLastActivity(tokenKey);
      if (lastActivity === null) {
        recordActivity(tokenKey, now);
        return;
      }
      if (now - lastActivity >= getIdleTimeoutMs(token)) {
        void expire("idle_timeout");
        return;
      }

      const lastHeartbeat = getLastHeartbeat(tokenKey) ?? 0;
      if (lastActivity > lastHeartbeat && now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        verifyWithServer();
      }
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
      const token = localStorage.getItem(tokenKey);
      if (!token) return;
      // Activity after the limit doesn't revive the session; the next
      // check logs it out.
      const lastActivity = getLastActivity(tokenKey);
      if (lastActivity && now - lastActivity >= getIdleTimeoutMs(token)) {
        check();
        return;
      }
      lastWrite = now;
      recordActivity(tokenKey, now);
    };

    const onUnauthorized = () => {
      const now = Date.now();
      if (busy || !localStorage.getItem(tokenKey)) return;
      if (now - lastForcedCheck < FORCED_CHECK_THROTTLE_MS) return;
      lastForcedCheck = now;
      verifyWithServer();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === tokenKey || event.key === null) check();
    };

    const onVisibility = () => {
      // Timers are throttled in background tabs; re-check on return.
      if (document.visibilityState === "visible") check();
    };

    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    ACTIVITY_EVENTS.forEach((name) =>
      window.addEventListener(name, onActivity, { passive: true, capture: true }),
    );
    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, onActivity, { capture: true }),
      );
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tokenKey]);
}
