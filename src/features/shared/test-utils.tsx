/**
 * Test-only helpers for screen tests: mounts a screen with a fake API, a fresh QueryClient,
 * language, toasts and a memory router. Not imported by app code.
 *
 *   const { api, user } = renderScreen(<BoardScreen />, { me: 'JT' });
 *   api.on('GET /api/completions/latest', { completions: [...] });
 */
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ApiClientProvider, createApiClient } from '../../api';
import { createFakeApi, createTestQueryClient, type FakeApi } from '../../api/test-utils';
import { LanguageProvider, type Lang } from '../../i18n';
import { AppToastProvider } from './AppToastProvider';

export interface RenderScreenOptions {
  /** Initial URL (default `/`). */
  path?: string;
  /** Route pattern the screen is mounted at (default `*`), e.g. `/week/:weekStart?`. */
  route?: string;
  lang?: Lang;
  /** Signed-in name for `GET /api/me`; `null` = signed out (default). */
  me?: string | null;
  /** Pre-built fake API (handlers can also be added after render). */
  api?: FakeApi;
}

export interface RenderScreenResult extends RenderResult {
  api: FakeApi;
  qc: QueryClient;
  user: UserEvent;
  /** The router's current location (pathname + search), for navigation assertions. */
  location: () => string;
}

/** Provider stack shared by every screen test. */
export function TestProviders({
  api,
  qc,
  lang = 'en',
  children,
}: {
  api: FakeApi;
  qc: QueryClient;
  lang?: Lang;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={qc}>
      <ApiClientProvider client={createApiClient({ fetch: api.fetch })}>
        <LanguageProvider initialLang={lang} storageKey="yw.test.lang">
          <AppToastProvider>{children}</AppToastProvider>
        </LanguageProvider>
      </ApiClientProvider>
    </QueryClientProvider>
  );
}

export function renderScreen(
  ui: ReactElement,
  options: RenderScreenOptions = {},
): RenderScreenResult {
  const api = options.api ?? createFakeApi();
  api.on('GET /api/me', { name: options.me ?? null });
  const qc = createTestQueryClient();
  const user = userEvent.setup();
  const current = { value: options.path ?? '/' };

  function LocationProbe() {
    const location = useLocation();
    useEffect(() => {
      current.value = `${location.pathname}${location.search}`;
    }, [location]);
    return null;
  }

  const result = render(
    <TestProviders api={api} qc={qc} lang={options.lang}>
      <MemoryRouter initialEntries={[options.path ?? '/']}>
        <LocationProbe />
        <Routes>
          <Route path={options.route ?? '*'} element={ui} />
          {options.route && <Route path="*" element={<p>other route</p>} />}
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
  return { ...result, api, qc, user, location: () => current.value };
}
