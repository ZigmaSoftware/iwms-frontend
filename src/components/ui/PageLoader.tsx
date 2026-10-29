import { LoadingCard } from "@/components/common/LoadingCard";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  fullHeight?: boolean;
  className?: string;
}

export function PageLoader({
  message,
  fullHeight = false,
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullHeight ? "h-[calc(100vh-80px)]" : "py-16",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingCard message={message} />
    </div>
  );
}
