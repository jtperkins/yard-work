import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi, createTestQueryClient, type FakeApi } from '../api/test-utils';
import { TestProviders } from '../features/shared/test-utils';
import type { Lang } from '../i18n';
import { AppRoutes } from './routes';
import { paths } from './paths';

function renderAt(path: string, { lang = 'en' as Lang, me = null as string | null } = {}) {
  const api: FakeApi = createFakeApi();
  api.on('GET /api/me', { name: me });
  api.on('GET /api/completions/latest', { completions: [] });
  api.on('GET /api/completions', { completions: [] });
  api.on('GET /api/plan', { items: [] });
  api.on('GET /api/notes', { notes: [] });
  const qc = createTestQueryClient();
  const result = render(
    <TestProviders api={api} qc={qc} lang={lang}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </TestProviders>,
  );
  return { ...result, api };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T15:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('app routes', () => {
  it.each([
    ['/', /^Good (morning|afternoon|evening)$/],
    ['/week', 'This week'],
    ['/week/2026-10-05', 'This week'],
    ['/week/2026-10-12', 'Next week'],
    ['/tasks', 'Tasks'],
    ['/tasks/mow-lawn', 'Mow the lawn (chapia)'],
    ['/login', 'Sign in'],
    ['/nope', 'Page not found'],
  ])('%s renders its screen', async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it.each(['/calendar', '/calendar/2026-10', '/log', '/insights'])(
    '%s renders a page heading',
    async (path) => {
      renderAt(path);
      expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    },
  );

  it('gates /handoff behind sign-in', async () => {
    renderAt('/handoff');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in to see this page' }),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'Sign in' })) {
      expect(link).toHaveAttribute('href', '/login?next=%2Fhandoff');
    }
  });

  it('renders navigation in Spanish with the current page marked', async () => {
    renderAt('/tasks', { lang: 'es' });
    const navs = screen.getAllByRole('navigation', { name: 'Navegación principal' });
    expect(navs.length).toBeGreaterThan(0);
    for (const nav of navs) {
      expect(within(nav).getByRole('link', { name: 'Tablero' })).toHaveAttribute('href', '/');
      expect(within(nav).getByRole('link', { name: 'Tareas' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  it('switches language from the header toggle', async () => {
    const user = userEvent.setup();
    renderAt('/tasks');
    expect(await screen.findByRole('heading', { level: 1, name: 'Tasks' })).toBeInTheDocument();
    await user.click(screen.getAllByRole('radio', { name: 'Español' })[0]!);
    expect(screen.getByRole('heading', { level: 1, name: 'Tareas' })).toBeInTheDocument();
  });

  it('shows the signed-in name with a sign-out control, or a sign-in link', async () => {
    const signedIn = renderAt('/', { me: 'JT' });
    expect(await screen.findAllByRole('button', { name: 'Sign out' })).not.toHaveLength(0);
    expect(screen.getAllByText('Signed in as JT').length).toBeGreaterThan(0);
    signedIn.unmount();

    renderAt('/week');
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute(
        'href',
        '/login?next=%2Fweek',
      ),
    );
  });

  it('path builders', () => {
    expect(paths.week('2026-10-05')).toBe('/week/2026-10-05');
    expect(paths.calendar()).toBe('/calendar');
    expect(paths.login('/week')).toBe('/login?next=%2Fweek');
  });
});
