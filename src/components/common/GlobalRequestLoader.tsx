import { LoadingCard } from "@/components/common/LoadingCard";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";

import { getPendingMutations, subscribePendingMutations } from "@/api";

// Quick saves finish before this, so the spinner doesn't flash.
const SHOW_DELAY_MS = 250;

/**
 * Blocks the screen while a Save/Update/Delete request is in flight, so a
 * slow response can't be answered with repeat clicks (and repeat API calls).
 * Clicks are blocked from the first moment; the spinner card appears only
 * if the request takes longer than SHOW_DELAY_MS.
 */
export function GlobalRequestLoader() {
  const pending = useSyncExternalStore(
    subscribePendingMutations,
    getPendingMutations,
  );
  // Sign-in pages show progress on their own buttons, so no overlay there.
  const onAuthPage = useLocation().pathname.startsWith("/auth");
  const busy = pending > 0 && !onAuthPage;
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!busy) return;
    // Enter on a still-focused button would re-submit the form.
    (document.activeElement as HTMLElement | null)?.blur();
    const timer = window.setTimeout(() => setShowSpinner(true), SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      setShowSpinner(false);
    };
  }, [busy]);

  if (!busy) return null;

  return (
    <div
      // Above PrimeReact dialogs (z-index 1000+, raised per dialog) so their
      // Save buttons are blocked too; toasts (sonner) still sit on top.
      className={`fixed inset-0 z-[100000] flex cursor-wait items-center justify-center transition-colors duration-200 ${
        showSpinner ? "bg-slate-900/25 backdrop-blur-[2px]" : "bg-transparent"
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {showSpinner && (
        <LoadingCard />
      )}
    </div>
  );
}
