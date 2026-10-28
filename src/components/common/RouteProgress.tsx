import { LoadingCard } from "@/components/common/LoadingCard";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

import {
  getPendingRoute,
  setPendingRoute,
  startRouteProgress,
  subscribePendingRoute,
} from "@/components/common/routeProgressStore";

/* Navigation loader.
   React Router runs navigations as transitions, so while a lazily loaded
   page downloads React keeps the old page on screen and no Suspense
   fallback appears; a menu click looks like it did nothing. A click on an
   in-app link (or a call to startRouteProgress) marks the navigation
   pending until the new location commits. */

// Short waits finish before this, so the overlay doesn't flash.
const SHOW_OVERLAY_DELAY_MS = 200;
// Never leave the loader up if a navigation is abandoned or redirected.
const FAILSAFE_MS = 15000;

// Plain left-clicks on in-app links that open in this tab.
const handleDocumentClick = (event: MouseEvent) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== "_self") return;
  if (anchor.hasAttribute("download")) return;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  startRouteProgress(url.pathname + url.search);
};

/** Top progress bar plus a loading overlay on the page area while a menu
 *  navigation is pending. Render inside a `relative` container. */
export function RouteProgress() {
  const location = useLocation();
  const pending =
    useSyncExternalStore(subscribePendingRoute, getPendingRoute) !== null;
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // The new page has committed.
  useEffect(() => {
    setPendingRoute(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!pending) return;
    const overlayTimer = window.setTimeout(
      () => setShowOverlay(true),
      SHOW_OVERLAY_DELAY_MS,
    );
    const failsafe = window.setTimeout(
      () => setPendingRoute(null),
      FAILSAFE_MS,
    );
    return () => {
      window.clearTimeout(overlayTimer);
      window.clearTimeout(failsafe);
      setShowOverlay(false);
    };
  }, [pending]);

  if (!pending) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden">
        <div className="route-progress-bar h-full w-1/3 rounded-full bg-linear-to-r from-teal-400 via-teal-500 to-indigo-400" />
      </div>
      {showOverlay && (
        <div
          className="absolute inset-0 z-20 flex cursor-wait items-start justify-center rounded-[inherit] bg-(--admin-surface)/55 pt-32 backdrop-blur-[1.5px]"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <LoadingCard />
        </div>
      )}
    </>
  );
}
