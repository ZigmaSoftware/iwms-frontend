import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";

const DEFAULT_STALE_TIME = 1000 * 60 * 5;

export type EnterpriseQueryConfig<TData, TError = unknown> =
  Omit<
    UseQueryOptions<TData, TError, TData, readonly unknown[]>,
    "queryKey" | "queryFn"
  > & {
    queryKey: readonly unknown[];
    queryFn: () => Promise<TData>;
  };

export function enterpriseQuery<TData, TError = unknown>({
  queryKey,
  queryFn,
  ...options
}: EnterpriseQueryConfig<TData, TError>) {
  return useQuery<TData, TError, TData, readonly unknown[]>({
    queryKey,
    queryFn,
    staleTime: DEFAULT_STALE_TIME,
    ...options,
  });
}
