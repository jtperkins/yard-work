/**
 * Test-only helpers for the calendar / log / insights / handoff screens: mounts a screen at a
 * route with a fake API, a fresh query client, the language provider and the toast provider.
 * Not imported by app code.
 */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ApiClientProvider, createApiClient } from '../../api';
import {
  createFakeApi,
  createTestQueryClient,
  jsonResponse,
  type FakeApi,
} from '../../api/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider, type Lang } from '../../i18n';
import { ToastProvider } from '../../ui';

export interface RenderScreenOptions {
  /** URL to start at, e.g. `/log?person=JT`. */
  path: string;
  /** Route pattern the screen is mounted on, e.g. `/calendar/:ym?`. Defaults to the path. */
  route?: string;
  lang?: Lang;
  /** Signed-in name, or null for a signed-out session. */
  user?: string | null;
  /** Registers fake API routes before the first render (queries start on mount). */
  routes?: (api: FakeApi) => void;
}

export function renderScreen(screen: ReactElement, options: RenderScreenOptions) {
  const api = createFakeApi();
  api.on('GET /api/me', () => jsonResponse({ name: options.user ?? null }));
  options.routes?.(api);
  const client = createApiClient({ fetch: api.fetch });
  const qc = createTestQueryClient();
  const route = options.route ?? options.path.split('?')[0]!;
  const result = render(
    <QueryClientProvider client={qc}>
      <ApiClientProvider client={client}>
        <LanguageProvider initialLang={options.lang ?? 'en'}>
          <ToastProvider>
            <MemoryRouter initialEntries={[options.path]}>
              <Routes>
                <Route path={route} element={screen} />
                <Route path="*" element={null} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </LanguageProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
  return { ...result, api, qc };
}
