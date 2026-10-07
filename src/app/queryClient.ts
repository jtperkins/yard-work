import { QueryClient } from '@tanstack/react-query';

/** App-wide query defaults (the API layer may tune per query). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => {
          // Don't retry client errors (validation/auth); do retry flaky connections a bit.
          const status = (error as { status?: unknown } | null)?.status;
          if (typeof status === 'number' && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });
}
