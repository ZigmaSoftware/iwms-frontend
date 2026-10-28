import { useEffect, useRef } from "react";
import {
  endLoginSession,
  getIdleTimeoutMs,
  getLastActivity,
  getLastHeartbeat,
  getSessionInfo,
  hasSession,
  recordActivity,
  sendSessionHeartbeat,
  SESSION_ENDED_EVENT,
  type LogoutReason,
} from "@/utils/loginSession";
import type { Portal } from "@/api";

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
 * "logged_out" = the session was cleared (logout in this or another tab).
 */
export type SessionEndCause = LogoutReason | "ended" | "logged_out";

type Options = {
  /** Which portal's session to guard. */
  portal: Portal;
  /** Clear the portal's session and leave the page. */
  onSessionEnd: (cause: SessionEndCause) => void;
};

/**
 * Auto-logout after the session's idle limit (from the login response,
 * 40 min by default), audit the logout on the backend, and keep the
 * backend's last-activity in step through heartbeats.
 */
export function useIdleLogout({ portal, onSessionEnd }: Options) {
  const onSessionEndRef = useRef(onSessionEnd);
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  }, [onSessionEnd]);

  useEffect(() => {
    let busy = false;
    let lastWrite = 0;
    let lastForcedCheck = 0;
    let tracking = hasSession(portal);

    // Stays mounted across logins: after a session ends, tracking resets and
    // picks up the next session that starts.
    const finish = (cause: SessionEndCause) => {
      tracking = false;
      busy = false;
      onSessionEndRef.current(cause);
    };

    const expire = async (reason: LogoutReason) => {
      if (busy) return;
      busy = true;
      await endLoginSession(portal, reason);
      finish(reason);
    };

    const verifyWithServer = () => {
      void sendSessionHeartbeat(portal).then((alive) => {
        if (!alive && !busy && hasSession(portal)) finish("ended");
      });
    };

    const check = () => {
      if (busy) return;
      const info = getSessionInfo(portal);
      if (!info) {
        if (tracking) finish("logged_out");
        return;
      }
      tracking = true;

      const now = Date.now();
      if (info.exp && info.exp * 1000 <= now) {
        void expire("token_expired");
        return;
      }

      const lastActivity = getLastActivity(portal);
      if (lastActivity === null) {
        recordActivity(portal, now);
        return;
      }
      if (now - lastActivity >= getIdleTimeoutMs(info)) {
        void expire("idle_timeout");
        return;
      }

      const lastHeartbeat = getLastHeartbeat(portal) ?? 0;
      if (lastActivity > lastHeartbeat && now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        verifyWithServer();
      }
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return;
      const info = getSessionInfo(portal);
      if (!info) return;
      // Activity after the limit doesn't revive the session; the next
      // check logs it out.
      const lastActivity = getLastActivity(portal);
      if (lastActivity && now - lastActivity >= getIdleTimeoutMs(info)) {
        check();
        return;
      }
      lastWrite = now;
      recordActivity(portal, now);
    };

    const onUnauthorized = (event: Event) => {
      // Each portal's API tags its 401s; only ours concern this guard.
      if ((event as CustomEvent<{ portal?: Portal }>).detail?.portal !== portal) return;
      const now = Date.now();
      if (busy || !hasSession(portal)) return;
      if (now - lastForcedCheck < FORCED_CHECK_THROTTLE_MS) return;
      lastForcedCheck = now;
      verifyWithServer();
    };

    const onSessionEnded = (event: Event) => {
      if ((event as CustomEvent<{ portal?: Portal }>).detail?.portal === portal) check();
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
    window.addEventListener(SESSION_ENDED_EVENT, onSessionEnded);
    window.addEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach((name) =>
        window.removeEventListener(name, onActivity, { capture: true }),
      );
      window.removeEventListener(SESSION_ENDED_EVENT, onSessionEnded);
      window.removeEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [portal]);
}
