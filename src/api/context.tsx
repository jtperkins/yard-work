/**
 * Optional provider for the API layer. It has a working default, so the app shell does not need
 * to mount it: tests use it to inject a client.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from './client';

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

/** Same-origin client using the global `fetch` (looked up per request). */
export const defaultApiClient: ApiClient = createApiClient();

const ApiClientContext = createContext<ApiClient | null>(null);

export interface ApiClientProviderProps {
  client: ApiClient;
  children: ReactNode;
}

export function ApiClientProvider({ client, children }: ApiClientProviderProps) {
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

/** The injected client, or the default same-origin client. */
export function useApiClient(): ApiClient {
  return useContext(ApiClientContext) ?? defaultApiClient;
}
