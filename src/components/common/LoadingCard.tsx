import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/** The "Please wait…" card shared by every loader (route, save, list, form),
 *  so all loading states look the same. index.css draws the same card for
 *  the PrimeReact DataTable overlay. */
export function LoadingCard({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/70 bg-white/90 px-5 py-4 shadow-[0_20px_50px_-20px_rgba(15,60,70,0.45)] dark:border-white/10 dark:bg-[#15302f]/95",
        className,
      )}
    >
      <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-teal-500/25 border-t-teal-500 dark:border-teal-300/20 dark:border-t-teal-300" />
      <span className="text-sm font-semibold text-gray-800 dark:text-white">
        {message ?? t("common.please_wait")}
      </span>
    </div>
  );
}
