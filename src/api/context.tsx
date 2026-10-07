/**
 * Optional providers for the API layer. Both have working defaults, so the app shell does not
 * need to mount them: tests (or a future app shell) use them to inject a client or a catalog.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { getCatalog, type Catalog } from '../domain/catalog';
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

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const CatalogContext = createContext<Catalog | null>(null);

export interface CatalogProviderProps {
  /** Defaults to the bundled data/*.json catalog (validated once via `loadCatalog`). */
  catalog?: Catalog;
  children: ReactNode;
}

export function CatalogProvider({ catalog, children }: CatalogProviderProps) {
  return (
    <CatalogContext.Provider value={catalog ?? getCatalog()}>{children}</CatalogContext.Provider>
  );
}

/**
 * The task/supply/house catalog: `{ tasks, supplies, house, taskById, supplyById }`.
 * Uses the nearest `CatalogProvider`, else the bundled catalog.
 */
export function useCatalog(): Catalog {
  return useContext(CatalogContext) ?? getCatalog();
}
