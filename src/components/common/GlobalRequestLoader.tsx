import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const pending = useSyncExternalStore(
    subscribePendingMutations,
    getPendingMutations,
  );
  const busy = pending > 0;
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
        <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-5 py-4 shadow-[0_20px_50px_-20px_rgba(15,60,70,0.45)] dark:border-white/10 dark:bg-[#15302f]/95">
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-teal-500/25 border-t-teal-500 dark:border-teal-300/20 dark:border-t-teal-300" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white">
            {t("common.please_wait")}
          </span>
        </div>
      )}
    </div>
  );
}
